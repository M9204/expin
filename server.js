const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

/**
 * Load Google OAuth2 credentials
 * Place your downloaded credentials.json file in the project root
 */
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

// Load client secrets
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("Missing credentials.json. Please add it to project root.");
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const { client_secret, client_id, redirect_uris } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Scopes needed to read/write user files in Drive
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// Middleware to set credentials from token.json (if exists)
function setAuthCredentials(req, res, next) {
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oauth2Client.setCredentials(token);
  }
  next();
}

// Redirect user to Google consent page to authorize your app
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // important for refresh token
    scope: SCOPES,
  });
  res.redirect(authUrl);
});

// Google OAuth2 callback to receive auth code and exchange for tokens
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing authorization code.");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // Save token for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send(
      "Authentication successful! You can now close this tab and use the API."
    );
  } catch (error) {
    console.error("Error retrieving access token", error);
    res.status(500).send("Failed to retrieve access token.");
  }
});

/**
 * Helper: Upload or overwrite a JSON file to Google Drive
 * If a file with the same name exists, it will be replaced
 */
async function uploadJsonFile(filename, data) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Find if file already exists on Drive
  const query = `name='${filename}' and mimeType='application/json' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = listRes.data.files;

  if (files.length > 0) {
    // Update existing file
    const fileId = files[0].id;
    await drive.files.update({
      fileId,
      media: {
        mimeType: "application/json",
        body: Buffer.from(JSON.stringify(data, null, 2), "utf-8"),
      },
    });
    return fileId;
  } else {
    // Create new file
    const fileMetadata = {
      name: filename,
      mimeType: "application/json",
    };
    const media = {
      mimeType: "application/json",
      body: Buffer.from(JSON.stringify(data, null, 2), "utf-8"),
    };
    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });
    return file.data.id;
  }
}

/**
 * Helper: Download JSON file content from Google Drive by filename
 */
async function downloadJsonFile(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const query = `name='${filename}' and mimeType='application/json' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const files = listRes.data.files;

  if (files.length === 0) {
    throw new Error("File not found");
  }

  const fileId = files[0].id;

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    let data = "";
    res.data
      .on("data", (chunk) => (data += chunk))
      .on("end", () => resolve(JSON.parse(data)))
      .on("error", (err) => reject(err));
  });
}

/**
 * Helper: List JSON files in Google Drive
 */
async function listJsonFiles() {
  const drive = google.drive({ version: "v3", auth: oauth2Client });
  const query = "mimeType='application/json' and trashed=false";
  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return res.data.files.map((f) => f.name);
}

/**
 * Helper: Delete file from Google Drive by filename
 */
async function deleteFileByName(filename) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const query = `name='${filename}' and trashed=false`;
  const listRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
  });
  const files = listRes.data.files;

  if (files.length === 0) {
    throw new Error("File not found");
  }

  const fileId = files[0].id;
  await drive.files.delete({ fileId });
}

/**
 * API ROUTES using Google Drive for invoice files
 */

// Save or update invoice JSON on Drive
app.post(
  "/api/invoice/:filename",
  setAuthCredentials,
  async (req, res) => {
    try {
      const filename = req.params.filename;
      const sanitized = filename.replace(/[^\w\-\.]/g, "");
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ error: "Invalid data format." });
      }
      await uploadJsonFile(sanitized, req.body);
      res.json({ message: `${sanitized} saved successfully.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save invoice data." });
    }
  }
);

// List all invoice JSON filenames on Drive
app.get("/api/invoices", setAuthCredentials, async (req, res) => {
  try {
    const files = await listJsonFiles();
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list invoices." });
  }
});

// Get invoice JSON file by name from Drive
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

// Delete invoice file by name from Drive (optional route)
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

/**
 * Your existing /api/data and /api/clear routes remain local for now
 */

const DATA_PATH = path.join(__dirname, "data.json");

app.post("/api/data", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data format." });
  }

  fs.writeFile(DATA_PATH, JSON.stringify(body, null, 2), (err) => {
    if (err) {
      console.error("Failed to write data:", err);
      return res.status(500).json({ error: "Failed to save data." });
    }
    res.json({ message: "Data saved successfully." });
  });
});

app.post("/api/clear", (req, res) => {
  fs.writeFile(DATA_PATH, JSON.stringify([], null, 2), (err) => {
    if (err) {
      console.error("Failed to clear file:", err);
      return res.status(500).json({ error: "Failed to clear data.json." });
    }
    res.json({ message: "Server data cleared." });
  });
});

app.get("/data.json", (req, res) => {
  res.sendFile(DATA_PATH);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Go to /auth to authenticate Google Drive access`);
});
