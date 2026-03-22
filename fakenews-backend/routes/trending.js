const express = require('express');
const router = express.Router();
const { getTrending, fetchAndAnalyze } = require('../services/newsFetcher');

// @route   GET /api/trending
// @desc    Get cached trending news with analysis
// @access  Public
router.get('/', (req, res) => {
  const filter = req.query.filter || 'ALL';
  const data = getTrending(filter);
  res.json(data);
});

// @route   POST /api/trending/refresh
// @desc    Force refresh trending news (rate limited)
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const query = req.body.query || 'India news OR Bollywood OR technology';
    const filter = req.body.filter || req.query.filter || 'ALL';
    await fetchAndAnalyze(query);
    const data = getTrending(filter);
    res.json(data);
  } catch (error) {
    console.error('Refresh error:', error.message);
    res.status(500).json({ message: 'Failed to refresh trending news' });
  }
});

module.exports = router;
