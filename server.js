const express = require('express');
const fs = require('fs');
const app = express();
const FILE_PATH = './data.json';

app.use(express.static('public'));
app.use(express.json());

app.get('/data', (req, res) => {
  fs.readFile(FILE_PATH, 'utf8', (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data));
  });
});

app.post('/data', (req, res) => {
  fs.writeFile(FILE_PATH, JSON.stringify(req.body, null, 2), () => {
    res.sendStatus(200);
  });
});

app.post('/reset', (req, res) => {
  fs.writeFile(FILE_PATH, '[]', () => res.sendStatus(200));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
