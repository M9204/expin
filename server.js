const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to store the data file
const dataFilePath = path.join(__dirname, 'data.json');

// Endpoint to retrieve data from the JSON file
app.get('/api/data', (req, res) => {
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading data');
    }
    // Send parsed data as JSON
    res.json(JSON.parse(data));
  });
});

// Endpoint to save new data to the JSON file
app.post('/api/data', (req, res) => {
  const newData = req.body;

  // Read current data
  fs.readFile(dataFilePath, 'utf8', (err, data) => {
    let dataArr = [];
    if (err && err.code === 'ENOENT') {
      // If file doesn't exist, create an empty array
      dataArr = [];
    } else if (err) {
      return res.status(500).send('Error reading data');
    } else {
      // Parse current data
      dataArr = JSON.parse(data);
    }

    // Add new data to the array
    dataArr.push(newData);

    // Write updated data back to file
    fs.writeFile(dataFilePath, JSON.stringify(dataArr, null, 2), 'utf8', (err) => {
      if (err) {
        return res.status(500).send('Error writing data');
      }
      // Respond with success
      res.status(200).send('Data saved successfully');
    });
  });
});

// Serve the index.html page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
