const axios = require("axios");

const OLLAMA_API = "http://localhost:11434/api/generate";

const analyzeResumeWithOllama = async (resumeText) => {
  // Use full text for better analysis
  const text = resumeText.substring(0, 4000);
  
  const prompt = `You are an expert resume reviewer and HR specialist. Analyze the following resume carefully and provide detailed insights.

Resume Text:
${text}

Provide your response as ONLY valid JSON (no markdown, no explanation). Use exactly these keys:

{
  "skills": [list of 8-15 specific technical and soft skills found in the resume],
  "missingSkills": [list of 5-8 important skills that should be added based on the experience level shown],
  "atsScore": [number 0-100 based on resume formatting, keywords, and ATS compatibility],
  "strengths": [list of 5-8 key strengths and achievements highlighted in the resume],
  "improvements": [list of 5-8 specific, actionable improvements to make the resume better],
  "recommendedRoles": [list of 5-10 specific job titles this person is well-suited for],
  "experience": ["Junior" if less than 2 years, "Mid" if 2-5 years, "Senior" if 5+ years]
}

Make the analysis detailed and specific. Include actual skills mentioned in the resume, not generic ones.`;

  try {
    console.log("📊 Analyzing resume with Ollama...");
    
    const response = await axios.post(OLLAMA_API, {
      model: "mistral",
      prompt: prompt,
      stream: false,
      temperature: 0.3,
    }, {
      timeout: 180000,
    });

    console.log("Response received, length:", response.data.response.length);
    
    const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ No JSON found in response");
      return getDefaultAnalysis();
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    // Ensure all fields are arrays where expected
    const result = {
      skills: Array.isArray(analysisData.skills) ? analysisData.skills.filter(s => s && typeof s === 'string') : [],
      missingSkills: Array.isArray(analysisData.missingSkills) ? analysisData.missingSkills.filter(s => s && typeof s === 'string') : [],
      atsScore: typeof analysisData.atsScore === "number" ? Math.min(100, Math.max(0, analysisData.atsScore)) : 65,
      strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths.filter(s => s && typeof s === 'string') : [],
      improvements: Array.isArray(analysisData.improvements) ? analysisData.improvements.filter(s => s && typeof s === 'string') : [],
      recommendedRoles: Array.isArray(analysisData.recommendedRoles) ? analysisData.recommendedRoles.filter(s => s && typeof s === 'string') : [],
      experience: ["Junior", "Mid", "Senior"].includes(analysisData.experience) ? analysisData.experience : "Mid",
    };

    console.log("✅ Analysis complete");
    return result;
  } catch (error) {
    console.error("❌ Ollama Error:", error.message);
    return getDefaultAnalysis();
  }
};

const getDefaultAnalysis = () => ({
  skills: ["Problem Solving", "Communication", "Leadership"],
  missingSkills: ["Cloud Architecture", "DevOps", "AI/ML"],
  atsScore: 65,
  strengths: ["Strong background", "Good communication", "Team player"],
  improvements: ["Add certifications", "More project experience", "Technical depth"],
  recommendedRoles: ["Software Engineer", "Technical Lead", "Project Manager"],
  experience: "Mid",
});

module.exports = { analyzeResumeWithOllama };
