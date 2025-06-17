const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataFilePath = path.join(__dirname, 'data.json');

// Get data
app.get('/api/data', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err && err.code === 'ENOENT') {
      return res.json([]);
    } else if (err) {
      return res.status(500).send('Error reading data');
    }
    res.json(JSON.parse(data));
  });
});

// Save or overwrite data
app.post('/api/data', (req, res) => {
  fs.writeFile(dataFilePath, JSON.stringify(req.body, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).send('Error writing data');
    res.status(200).send('Data saved successfully');
  });
});

// Export data as Excel
app.get('/api/export/:title', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading data');
    const jsonData = JSON.parse(data);
    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

    const filename = `${req.params.title || 'Invoice'}.xlsx`;
    const filepath = path.join(__dirname, filename);
    XLSX.writeFile(workbook, filepath);

    res.download(filepath, filename, () => {
      fs.unlinkSync(filepath); // Clean up file after download
    });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
