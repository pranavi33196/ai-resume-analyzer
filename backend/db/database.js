const sqlite3 = require("sqlite3").verbose();

const dbPath = process.env.DB_PATH || "./resumes.db";

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ SQLite Connected Successfully");
    initializeDatabase();
  }
});

const initializeDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName TEXT NOT NULL,
        originalText TEXT NOT NULL,
        skills TEXT,
        missingSkills TEXT,
        atsScore INTEGER,
        strengths TEXT,
        improvements TEXT,
        recommendedRoles TEXT,
        experience TEXT,
        analysisData TEXT NOT NULL,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("❌ Error creating resumes table:", err.message);
      } else {
        console.log("✅ Resumes table initialized");
      }
    });
  });
};

module.exports = db;
