const express = require("express");
const router = express.Router();
const multer = require("multer");

// storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// test route
router.get("/", (req, res) => {
  res.send("Resume API Working");
});

// upload route (FIXED)
const { analyzeResume } = require("../controllers/resumeController");

router.post("/upload", upload.single("resume"), analyzeResume); // check file coming


module.exports = router;