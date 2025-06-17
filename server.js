const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataFilePath = path.join(__dirname, 'data.json');

// Ensure data.json exists
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, '[]');
}

// Retrieve saved boxes
app.get('/api/data', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data');
    res.json(JSON.parse(data));
  });
});

// Add box or clear all
app.post('/api/data', (req, res) => {
  const incoming = req.body;
  if (incoming.clear) {
    fs.writeFile(dataFilePath, '[]', err => {
      if (err) return res.status(500).send('Error clearing data');
      res.send('Cleared');
    });
  } else {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
      let arr = [];
      if (!err) arr = JSON.parse(data || '[]');
      arr.push(incoming);
      fs.writeFile(dataFilePath, JSON.stringify(arr, null, 2), err => {
        if (err) return res.status(500).send('Error saving data');
        res.send('Saved');
      });
    });
  }
});

// Serve UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
