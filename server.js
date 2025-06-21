const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

// Ensure data.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Save incoming box data to data.json
app.post("/api/data", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data format." });
  }

  fs.writeFile(DATA_FILE, JSON.stringify(body, null, 2), err => {
    if (err) {
      console.error("Failed to write data:", err);
      return res.status(500).json({ error: "Failed to save data." });
    }
    res.json({ message: "Data saved successfully." });
  });
});

app.post("/api/export", (req, res) => {
  const { title, data } = req.body;

  // Validate title
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: "Invalid or missing title." });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: "Invalid or missing data." });
  }

  const sanitizedTitle = title.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const exportFilename = `${sanitizedTitle}.json`;
  const exportPath = path.join(__dirname, exportFilename);
  const currentDataPath = path.join(__dirname, "data.json");

  // Create the file if it doesn't exist
  if (!fs.existsSync(currentDataPath)) {
    fs.writeFileSync(currentDataPath, JSON.stringify([]));
  }

  // Move old file and reset
  fs.rename(currentDataPath, exportPath, err => {
    if (err) return res.status(500).json({ error: "Failed to rename file.", details: err });

    fs.writeFile(currentDataPath, JSON.stringify([], null, 2), err2 => {
      if (err2) return res.status(500).json({ error: "Failed to reset data.json.", details: err2 });

      res.json(`{ message: Exported as ${exportFilename} and reset data.json. }`);
    });
  });
});
const DATA_PATH = path.join(__dirname, "data.json");
// Clear the data.json file
app.post("/api/clear", (req, res) => {
  fs.writeFile(DATA_PATH, JSON.stringify([], null, 2), err => {
    if (err) {
      console.error("Failed to clear file:", err);
      return res.status(500).json({ error: "Failed to clear data.json." });
    }
    res.json({ message: "Server data cleared." });
  });
});

app.get("/data.json", (req, res) => {
  res.sendFile(DATA_PATH); // DATA_PATH is your full path to data.json
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
