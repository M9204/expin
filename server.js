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

const DRIVE_FOLDER_ID = "1E4qgwXzo4NwvlVktF7xCWuhJgosrXrPD";
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("Missing credentials.json.");
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
    oauth2Client.setCredentials(token);
  }
  next();
}

app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code.");
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send("✅ Authentication successful. You may now close this tab.");
  } catch (error) {
    console.error("❌ Error retrieving access token:", error);
    res.status(500).send("Failed to retrieve access token.");
  }
});

async function uploadJsonFile(filename, data) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and mimeType='application/json' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = listRes.data.files;
  const stream = Readable.from([JSON.stringify(data, null, 2)]);

  if (files.length > 0) {
    const fileId = files[0].id;
    await drive.files.update({
      fileId,
      media: {
        mimeType: "application/json",
        body: stream,
      },
    });
    return fileId;
  } else {
    const fileMetadata = {
      name: filename,
      mimeType: "application/json",
      parents: [DRIVE_FOLDER_ID],
    };
    const media = {
      mimeType: "application/json",
      body: stream,
    };
    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });
    return file.data.id;
  }
}

async function downloadJsonFile(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and mimeType='application/json' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = listRes.data.files;
  if (files.length === 0) throw new Error("File not found");
  const fileId = files[0].id;
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return new Promise((resolve, reject) => {
    let data = "";
    res.data
      .on("data", (chunk) => (data += chunk))
      .on("end", () => resolve(JSON.parse(data)))
      .on("error", reject);
  });
}

async function listJsonFiles() {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = `'${DRIVE_FOLDER_ID}' in parents and mimeType='application/json' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return res.data.files.map((f) => f.name);
}

async function deleteFileByName(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = `'${DRIVE_FOLDER_ID}' in parents and name='${filename}' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });
  const files = listRes.data.files;
  if (files.length === 0) throw new Error("File not found");
  const fileId = files[0].id;
  await drive.files.delete({ fileId });
}

// ========== API ROUTES ==========

app.post("/api/invoice/:filename", setAuthCredentials, async (req, res) => {
  try {
    const filename = req.params.filename.replace(/[^\w\-\.]/g, "");
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid data format." });
    }
    await uploadJsonFile(filename, req.body);
    res.json({ message: `${filename} saved successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save invoice data." });
  }
});

app.get("/api/invoices", setAuthCredentials, async (req, res) => {
  try {
    const files = await listJsonFiles();
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
    const filename = req.params.filename;
    await deleteFileByName(filename);
    res.json({ message: `${filename} deleted successfully.` });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Invoice not found." });
  }
});

// ========== Local Backup Routes ==========

const DATA_PATH = path.join(__dirname, "data.json");

app.post("/api/data", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data format." });
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 Visit /auth to authenticate with Google Drive`);
});
