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
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer Setup
const upload = multer({
  dest: "uploads/",
});

// Upload + Analyze Route
app.post("/api/resume/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log(`📄 File received: ${req.file.originalname}`);
    
    const originalName = req.file.originalname;
    const fileExt = path.extname(originalName).toLowerCase();
    
    console.log(`Extension: ${fileExt}`);

    let resumeText = "";

    // Extract text based on file type
    if (fileExt === ".pdf") {
      console.log("Reading PDF...");
      const buffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(buffer);
      resumeText = pdfData.text;
    } else if (fileExt === ".docx" || fileExt === ".doc") {
      console.log("Reading Word...");
      const buffer = fs.readFileSync(req.file.path);
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value || "";
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: `Unsupported file type: ${fileExt}` 
      });
    }

    if (!resumeText || resumeText.trim().length < 10) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: "Could not extract text from file" 
      });
    }

    console.log("Analyzing with Ollama...");
    const analysis = await analyzeResumeWithOllama(resumeText);

    // Save to database
    const resumeData = {
      fileName: originalName,
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
        console.error("DB Error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      console.log("✅ Success!");
      res.json({
        success: true,
        id: result.id,
        analysis,
      });

      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn("Could not delete temp file");
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message || "Error processing resume",
    });
  }
});

app.get("/api/resumes", (req, res) => {
  Resume.findAll((err, resumes) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching resumes" });
    }
    res.json({ success: true, resumes: resumes || [] });
  });
});

app.get("/api/resume/:id", (req, res) => {
  Resume.findById(req.params.id, (err, resume) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error fetching resume" });
    }
    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }
    res.json({ success: true, resume });
  });
});

app.delete("/api/resume/:id", (req, res) => {
  Resume.deleteById(req.params.id, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error deleting resume" });
    }
    res.json({ success: true, message: "Resume deleted" });
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Resume Analyzer Running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
