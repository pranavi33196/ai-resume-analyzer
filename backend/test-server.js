const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

app.get("/api/resumes", (req, res) => {
  res.json({ success: true, resumes: [] });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});
