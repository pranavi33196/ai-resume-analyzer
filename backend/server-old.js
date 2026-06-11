const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const db = require("./db/database");
const Resume = require("./models/Resume");
const { analyzeResumeWithOllama } = require("./utils/ollamaAnalyzer");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Multer Setup
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed"));
    }
  },
});

// Helper function removed - logic moved to upload route// Upload + Analyze Route
app.post("/api/resume/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    console.log(`📄 Processing file: ${req.file.originalname}`);
    console.log(`📋 Original filename: ${req.file.originalname}`);
    console.log(`📋 File path: ${req.file.path}`);
    
    // Get extension from originalname (which has the real filename)
    let ext = path.extname(req.file.originalname).toLowerCase();
    console.log(`📋 Detected extension: "${ext}"`);
    
    // Fallback: try to get from filename
    if (!ext || ext === "") {
      const nameparts = req.file.originalname.split('.');
      if (nameparts.length > 1) {
        ext = "." + nameparts[nameparts.length - 1].toLowerCase();
        console.log(`📋 Fallback extension: "${ext}"`);
      }
    }
    
    let resumeText = "";
    
    try {
      if (ext === ".pdf") {
        console.log("📖 Reading PDF...");
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        resumeText = pdfData.text;
        console.log(`✅ Extracted ${resumeText.length} characters from PDF`);
      } else if (ext === ".docx" || ext === ".doc") {
        console.log("📖 Reading Word document...");
        const buffer = fs.readFileSync(req.file.path);
        const result = await mammoth.extractRawText({ buffer });
        if (!result.value) {
          throw new Error("Could not extract text from Word document");
        }
        resumeText = result.value;
        console.log(`✅ Extracted ${resumeText.length} characters from Word`);
      } else {
        throw new Error(`Unsupported file format: "${ext}" (filename: ${req.file.originalname})`);
      }
    } catch (extractErr) {
      console.error("❌ File extraction error:", extractErr.message);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Could not extract text: " + extractErr.message,
      });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Document is empty or no text could be extracted",
      });
    }

    // Use Ollama for AI analysis
    console.log("🤖 Sending to Ollama for analysis...");
    const analysis = await analyzeResumeWithOllama(resumeText);

    // Save to SQLite database
    const resumeData = {
      fileName: req.file.originalname,
      originalText: resumeText,
      skills: analysis.skills,
      missingSkills: analysis.missingSkills,
      atsScore: analysis.atsScore,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      recommendedRoles: analysis.recommendedRoles,
      experience: analysis.experience,
      analysisData: analysis,
    };

    Resume.create(resumeData, (err, result) => {
      if (err) {
        console.error("❌ Database error:", err);
        res.status(500).json({
          success: false,
          message: "Error saving resume to database",
        });
      } else {
        console.log("✅ Resume saved successfully!");
        res.json({
          success: true,
          id: result.id,
          analysis,
        });
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.warn("Could not delete temp file:", e.message);
        }
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn("Could not delete temp file:", e.message);
      }
    }
    res.status(500).json({
      success: false,
      message: error.message || "Error analyzing resume",
    });
  }
});

// Get all resumes
app.get("/api/resumes", (req, res) => {
  Resume.findAll((err, resumes) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: "Error fetching resumes",
      });
    } else {
      res.json({
        success: true,
        resumes: resumes || [],
      });
    }
  });
});

// Get single resume by ID
app.get("/api/resume/:id", (req, res) => {
  Resume.findById(req.params.id, (err, resume) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: "Error fetching resume",
      });
    } else if (!resume) {
      res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    } else {
      res.json({
        success: true,
        resume,
      });
    }
  });
});

// Delete resume by ID
app.delete("/api/resume/:id", (req, res) => {
  Resume.deleteById(req.params.id, (err) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: "Error deleting resume",
      });
    } else {
      res.json({
        success: true,
        message: "Resume deleted successfully",
      });
    }
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Resume Analyzer Server Running (PDF & DOCX support)...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});