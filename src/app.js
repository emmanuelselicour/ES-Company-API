const express = require('express');
const path = require('path');

const app = express();

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../public')));

// API routes will be added here

// For any request that doesn't match one above, send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
