const db = require("../db/database");

const Resume = {
  // Create a new resume record
  create: (resumeData, callback) => {
    const {
      fileName,
      originalText,
      skills,
      missingSkills,
      atsScore,
      strengths,
      improvements,
      recommendedRoles,
      experience,
      analysisData,
    } = resumeData;

    const query = `
      INSERT INTO resumes 
      (fileName, originalText, skills, missingSkills, atsScore, strengths, improvements, recommendedRoles, experience, analysisData)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        fileName,
        originalText,
        JSON.stringify(skills),
        JSON.stringify(missingSkills),
        atsScore,
        JSON.stringify(strengths),
        JSON.stringify(improvements),
        JSON.stringify(recommendedRoles),
        experience,
        JSON.stringify(analysisData),
      ],
      function (err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { id: this.lastID, ...resumeData });
        }
      }
    );
  },

  // Get all resumes
  findAll: (callback) => {
    const query = `SELECT * FROM resumes ORDER BY uploadedAt DESC`;
    db.all(query, [], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Parse JSON fields
        const parsedRows = rows.map((row) => ({
          ...row,
          skills: JSON.parse(row.skills || "[]"),
          missingSkills: JSON.parse(row.missingSkills || "[]"),
          strengths: JSON.parse(row.strengths || "[]"),
          improvements: JSON.parse(row.improvements || "[]"),
          recommendedRoles: JSON.parse(row.recommendedRoles || "[]"),
          analysisData: JSON.parse(row.analysisData || "{}"),
        }));
        callback(null, parsedRows);
      }
    });
  },

  // Get resume by ID
  findById: (id, callback) => {
    const query = `SELECT * FROM resumes WHERE id = ?`;
    db.get(query, [id], (err, row) => {
      if (err) {
        callback(err, null);
      } else if (row) {
        row = {
          ...row,
          skills: JSON.parse(row.skills || "[]"),
          missingSkills: JSON.parse(row.missingSkills || "[]"),
          strengths: JSON.parse(row.strengths || "[]"),
          improvements: JSON.parse(row.improvements || "[]"),
          recommendedRoles: JSON.parse(row.recommendedRoles || "[]"),
          analysisData: JSON.parse(row.analysisData || "{}"),
        };
        callback(null, row);
      } else {
        callback(null, null);
      }
    });
  },

  // Delete resume by ID
  deleteById: (id, callback) => {
    const query = `DELETE FROM resumes WHERE id = ?`;
    db.run(query, [id], function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  },
};

module.exports = Resume;