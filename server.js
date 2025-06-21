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


app.post("/api/invoice/:filename", (req, res) => {
  const filename = req.params.filename;
  const sanitized = filename.replace(/[^\w\-\.]/g, ''); // prevent injection
  const fullPath = path.join(INVOICES_DIR, sanitized);

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data format." });
  }

  fs.writeFile(fullPath, JSON.stringify(body, null, 2), err => {
    if (err) {
      console.error("Failed to write invoice data:", err);
      return res.status(500).json({ error: "Failed to save invoice data." });
    }
    res.json({ message: `${sanitized} saved successfully.` });
  });
});
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

// Second server (static page server on another port)
const app2 = express();
const PORT2 = 30002;

app2.use(express.static(path.join(__dirname)));

app2.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "my-page-name.html"));
});

app2.listen(PORT2, () => {
  console.log(`Static Server running on port ${PORT2}`);
});



const INVOICE_DIR = path.join(__dirname, 'invoices');
const DOWNLOAD_DIR = path.join(__dirname, 'download_invoice');

app.get('/api/invoices', (req, res) => {
  fs.readdir(INVOICE_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list invoices' });
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    res.json(jsonFiles);
  });
});

app.post('/api/move-invoices', (req, res) => {
  const files = req.body.files;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'Invalid files list' });

  const movedFiles = [];

  files.forEach(filename => {
    const src = path.join(INVOICE_DIR, filename);
    const dest = path.join(DOWNLOAD_DIR, filename);
    if (fs.existsSync(src)) {
      try {
        fs.renameSync(src, dest);
        movedFiles.push(filename);
      } catch (e) {
        console.error(`Failed to move ${filename}:`, e);
      }
    }
  });

  res.json({ movedFiles });
});