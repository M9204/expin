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
const INVOICES_DIR = path.join(__dirname, "invoices");

// Ensure directory exists
if (!fs.existsSync(INVOICES_DIR)) fs.mkdirSync(INVOICES_DIR);

// Save incoming box data to data.json
// Save export without moving/renaming data.json
app.post("/api/export", (req, res) => {
  const { title, data } = req.body;
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: "Invalid or missing title." });

  const sanitizedTitle = title.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const exportPath = path.join(INVOICES_DIR, `${sanitizedTitle}.json`);

  fs.writeFile(exportPath, JSON.stringify(data, null, 2), err => {
    if (err) return res.status(500).json({ error: "Failed to write export file." });
    res.json({ message: `Exported as ${sanitizedTitle}.json` });
  });
});

app.get("/api/invoices", (req, res) => {
  fs.readdir(INVOICES_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to list invoices." });
    const jsonFiles = files.filter(file => file.endsWith(".json"));
    res.json(jsonFiles);
  });
});

app.get("/api/invoices/:name", (req, res) => {
  const file = req.params.name;
  const filePath = path.join(INVOICES_DIR, file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Invoice not found." });
  res.sendFile(filePath);
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

      res.json({ message: `Exported as ${exportFilename} and reset data.json.` });
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
