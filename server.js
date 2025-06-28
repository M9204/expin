const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  db, collection, addDoc, getDocs, getDoc, setDoc, doc
} = require("./firebase");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

/**
 * Save temporary box data to Firestore
 */
app.post("/api/data", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid data format." });
  }

  try {
    await addDoc(collection(db, "box_data"), body);
    res.json({ message: "Data saved to Firestore successfully." });
  } catch (error) {
    console.error("Firestore write failed:", error);
    res.status(500).json({ error: "Failed to save data to Firestore." });
  }
});

/**
 * Export invoice by title (replaces export to file)
 */
app.post("/api/export", async (req, res) => {
  const { title, data } = req.body;

  if (typeof title !== 'string' || !title.trim() || typeof data !== 'object') {
    return res.status(400).json({ error: "Invalid or missing title or data." });
  }

  const sanitizedTitle = title.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");

  try {
    await setDoc(doc(db, "invoices", sanitizedTitle), data);
    res.json({ message: `Exported as ${sanitizedTitle} in Firestore.` });
  } catch (error) {
    console.error("Firestore export error:", error);
    res.status(500).json({ error: "Failed to export to Firestore." });
  }
});

/**
 * List all invoice titles
 */
app.get("/api/invoices", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "invoices"));
    const names = snapshot.docs.map(doc => doc.id);
    res.json(names);
  } catch (error) {
    console.error("Firestore read error:", error);
    res.status(500).json({ error: "Failed to fetch invoice list." });
  }
});

/**
 * Get invoice data by name
 */
app.get("/api/invoices/:name", async (req, res) => {
  try {
    const invoiceRef = doc(db, "invoices", req.params.name);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    res.json(invoiceSnap.data());
  } catch (error) {
    console.error("Firestore read error:", error);
    res.status(500).json({ error: "Failed to fetch invoice." });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
