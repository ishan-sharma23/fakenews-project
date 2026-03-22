const express = require('express');
const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// @route   GET /api/realtime/status
// @desc    Proxy ML realtime service status through backend
// @access  Public
router.get('/status', async (_req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/realtime/status`);
    if (!response.ok) {
      return res.status(response.status).json({
        message: 'Failed to fetch ML realtime status'
      });
    }

    const payload = await response.json();
    return res.json(payload);
  } catch (error) {
    return res.status(502).json({
      message: 'ML realtime status unavailable',
      error: error.message
    });
  }
});

module.exports = router;
