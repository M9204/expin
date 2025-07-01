const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { google } = require("googleapis");
const { Readable } = require("stream");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

// Simple in-memory cache implementation
const cache = {
  store: {},
  get(key) {
    const entry = this.store[key];
    if (!entry) return null;
    
    // Check if entry is expired
    if (entry.expiry && Date.now() > entry.expiry) {
      delete this.store[key];
      return null;
    }
    
    return entry.value;
  },
  put(key, value, ttl = 5000) {
    this.store[key] = {
      value,
      expiry: ttl ? Date.now() + ttl : null
    };
  },
  del(key) {
    delete this.store[key];
  }
};

const DRIVE_FOLDER_ID = "1E4qgwXzo4NwvlVktF7xCWuhJgosrXrPD";
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("❌ Missing credentials.json.");
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function setAuthCredentials(req, res, next) {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    if (!token.refresh_token) {
      return res.status(401).json({ error: "Missing refresh token. Please re-authenticate at /auth." });
    }
    oauth2Client.setCredentials(token);
    next();
  } else {
    console.warn("No token.json found. Redirect to /auth.");
    return res.status(401).json({ error: "Not authenticated. Please visit /auth first." });
  }
}

app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code.");
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    // HTML with 2-second redirect
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Authentication Successful</title>
          <meta http-equiv="refresh" content="2; url=https://expin-rwyq.onrender.com/" />
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; }
          </style>
        </head>
        <body>
          <h2>✅ Authentication successful!</h2>
          <p>Redirecting to main app...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Failed to retrieve access token:", error);
    res.status(500).send("Failed to retrieve access token.");
  }
});


async function uploadJsonFile(filename, data) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and trashed=false`;
  const listRes = await drive.files.list({ q: query, fields: "files(id, name)" });
  const stream = Readable.from([JSON.stringify(data, null, 2)]);

  if (listRes.data.files.length > 0) {
    const fileId = listRes.data.files[0].id;
    await drive.files.update({
      fileId,
      media: {
        mimeType: "application/json",
        body: stream,
      },
    });
    cache.del('files');
    return fileId;
  } else {
    const fileMetadata = {
      name: filename,
      mimeType: "application/json",
      parents: [DRIVE_FOLDER_ID],
    };
    const file = await drive.files.create({
      resource: fileMetadata,
      media: { mimeType: "application/json", body: stream },
      fields: "id",
    });
    cache.del('files');
    return file.data.id;
  }
}


async function downloadJsonFile(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and mimeType='application/json' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: "files(id, name)" });
  const files = res.data.files;
  if (files.length === 0) throw new Error("File not found");
  const fileId = files[0].id;
  const stream = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return new Promise((resolve, reject) => {
    let data = "";
    stream.data
      .on("data", (chunk) => (data += chunk))
      .on("end", () => resolve(JSON.parse(data)))
      .on("error", reject);
  });
}

async function listJsonFiles(force = false) {
  if (!force) {
    const cached = cache.get('files');
    if (cached) return cached;
  }

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const query = `'${DRIVE_FOLDER_ID}' in parents and trashed = false`;

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, modifiedTime)",
    spaces: "drive",
    orderBy: "modifiedTime desc"
  });

  const allFiles = res.data.files || [];

  console.log("📂 All files in folder:");
  allFiles.forEach(file => {
    console.log(` - ${file.name} (${file.mimeType})`);
  });

  const jsonFiles = allFiles.filter(file =>
    file.name && file.name.toLowerCase().endsWith(".json")
  );

  const fileNames = jsonFiles.map(f => f.name);
  cache.put('files', fileNames, 5000); // optional but recommended

  return fileNames;
}


async function deleteFileByName(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: "files(id, name)" });
  const files = res.data.files;
  if (files.length === 0) throw new Error("File not found");
  await drive.files.delete({ fileId: files[0].id });
  cache.del('files');
}

app.get("/api/invoices/check", setAuthCredentials, async (req, res) => {
  try {
    const files = await listJsonFiles();
    res.json({ files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check for updates." });
  }
});

app.post("/api/invoice/:filename", setAuthCredentials, async (req, res) => {
  try {
    const filename = req.params.filename.replace(/[^\w\-\.]/g, "");
    await uploadJsonFile(filename, req.body);
    res.json({ message: `${filename} saved to Google Drive.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save invoice." });
  }
});

app.get("/api/invoices", setAuthCredentials, async (req, res) => {
  try {
    const forceRefresh = req.query.nocache === "1";
    const files = await listJsonFiles(forceRefresh);
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list invoices." });
  }
});


app.get("/api/invoices/:name", setAuthCredentials, async (req, res) => {
  try {
    const filename = req.params.name;
    const data = await downloadJsonFile(filename);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Invoice not found." });
  }
});

app.delete("/api/invoice/:filename", setAuthCredentials, async (req, res) => {
  try {
    await deleteFileByName(req.params.filename);
    res.json({ message: `${req.params.filename} deleted.` });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Invoice not found." });
  }
});

const DATA_PATH = path.join(__dirname, "data.json");

app.post("/api/data", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data." });
  }
  fs.writeFile(DATA_PATH, JSON.stringify(body, null, 2), (err) => {
    if (err) return res.status(500).json({ error: "Failed to save local data." });
    res.json({ message: "Local data saved." });
  });
});

app.post("/api/clear", (req, res) => {
  fs.writeFile(DATA_PATH, JSON.stringify([], null, 2), (err) => {
    if (err) return res.status(500).json({ error: "Failed to clear local data." });
    res.json({ message: "Local data cleared." });
  });
});

app.get("/data.json", (req, res) => {
  res.sendFile(DATA_PATH);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 Visit http://localhost:${PORT}/auth to authenticate`);
});
