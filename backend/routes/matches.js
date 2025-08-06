const express = require('express');
const router = express.Router();

// Sample match data (this can come from a database or static file)
const matchData = require('../data/matches.json');

// GET /api/matches - Return a list of matches
router.get('/', (req, res) => {
  res.json(matchData);  // Send the match data as JSON response
});

module.exports = router;