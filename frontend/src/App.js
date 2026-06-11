import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      if (!file) {
        alert("Please upload a resume");
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("resume", file);

      const res = await axios.post(
        "http://localhost:5000/api/resume/upload",
        formData
      );

      setResult(res.data.analysis);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error analyzing resume");
    }
  };

  return (
    <div className="container">
      <h1>🚀 AI Resume Analyzer</h1>

      <input
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleUpload}>
        {loading ? "Analyzing..." : "Analyze Resume"}
      </button>

      {result && (
        <div className="result-box">
          <h2>📊 Analysis Result</h2>
          
          <div className="analysis-section">
            <h3>📈 ATS Score</h3>
            <p className="ats-score">{result.atsScore}/100</p>
          </div>

          <div className="analysis-section">
            <h3>💼 Experience Level</h3>
            <p>{result.experience}</p>
          </div>

          <div className="analysis-section">
            <h3>🎯 Skills Found</h3>
            <ul>
              {result.skills && result.skills.length > 0 ? (
                result.skills.map((skill, idx) => <li key={idx}>{skill}</li>)
              ) : (
                <li>No skills found</li>
              )}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>⚠️ Missing Skills (Recommended)</h3>
            <ul>
              {result.missingSkills && result.missingSkills.length > 0 ? (
                result.missingSkills.map((skill, idx) => <li key={idx}>{skill}</li>)
              ) : (
                <li>No missing skills identified</li>
              )}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>💪 Strengths</h3>
            <ul>
              {result.strengths && result.strengths.length > 0 ? (
                result.strengths.map((strength, idx) => <li key={idx}>{strength}</li>)
              ) : (
                <li>No strengths identified</li>
              )}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>🔧 Areas to Improve</h3>
            <ul>
              {result.improvements && result.improvements.length > 0 ? (
                result.improvements.map((improvement, idx) => <li key={idx}>{improvement}</li>)
              ) : (
                <li>No improvements suggested</li>
              )}
            </ul>
          </div>

          <div className="analysis-section">
            <h3>🎓 Recommended Roles</h3>
            <ul>
              {result.recommendedRoles && result.recommendedRoles.length > 0 ? (
                result.recommendedRoles.map((role, idx) => (
                  <li key={idx}>
                    {typeof role === "string" ? role : role.roleName || JSON.stringify(role)}
                  </li>
                ))
              ) : (
                <li>No roles recommended</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;