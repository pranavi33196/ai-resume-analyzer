const fs = require("fs");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ATS SCORE
const calculateATSScore = (resumeText, jobDescription) => {
  const resume = resumeText.toLowerCase();
  const job = jobDescription.toLowerCase();

  const keywords = job.split(/\W+/);
  let matchCount = 0;

  keywords.forEach(word => {
    if (resume.includes(word)) matchCount++;
  });

  return Math.round((matchCount / keywords.length) * 100);
};

// JOB MATCH
const calculateJobMatch = (skills, jobDescription) => {
  const job = jobDescription.toLowerCase();
  let matched = 0;

  skills.forEach(skill => {
    if (job.includes(skill.toLowerCase())) matched++;
  });

  return Math.round((matched / skills.length) * 100);
};

exports.analyzeResume = async (req, res) => {
  try {
    const dataBuffer = req.file.buffer;
    if (!req.file) {
  return res.status(400).send("No file uploaded");
}
    const pdfData = await pdfParse(dataBuffer);

    const resumeText = pdfData.text;
    const jobDescription = req.body.jobDescription || "";

    // 🔹 Skill Extraction
    const skillPrompt = `
    Extract ONLY technical skills in JSON format:
    { "skills": [] }

    Resume:
    ${resumeText}
    `;

    const skillRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: skillPrompt }]
    });

   let skills = [];

try {
  const skillsData = JSON.parse(skillRes.choices[0].message.content);
  skills = skillsData.skills || [];
} catch (err) {
  console.log("JSON parse error:", err);
}

    // 🔹 ATS Score
    const atsScore = calculateATSScore(resumeText, jobDescription);

    // 🔹 Job Match
    const jobMatch = calculateJobMatch(skills, jobDescription);

    // 🔹 Suggestions
    const suggestionPrompt = `
    Give 3 short suggestions to improve this resume:
    ${resumeText}
    `;

    const suggestionRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: suggestionPrompt }]
    });

    res.json({
      atsScore,
      jobMatch,
      skills,
      suggestions: suggestionRes.choices[0].message.content
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
};