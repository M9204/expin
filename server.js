// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_PATH = path.join(__dirname, "data.json");

app.use(express.static("public")); // serve static files
app.use(express.json());

// Ensure data.json exists
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify([]));
}

// Save/update data.json
app.post("/api/data", (req, res) => {
  const newData = req.body;
  fs.writeFile(DATA_PATH, JSON.stringify(newData, null, 2), err => {
    if (err) return res.status(500).json({ error: "Failed to write file." });
    res.json({ message: "Data saved." });
  });
});

// Export with renamed file
app.post("/api/export", (req, res) => {
  const { title, data } = req.body;
  const sanitizedTitle = title.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const filename = `${sanitizedTitle}.json`;
  const exportPath = path.join(__dirname, filename);

  fs.writeFile(exportPath, JSON.stringify(data, null, 2), err => {
    if (err) return res.status(500).json({ error: "Failed to export." });
    // Also reset data.json
    fs.writeFile(DATA_PATH, JSON.stringify([], null, 2), () => {
      res.json({ message: "Exported and reset." });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
