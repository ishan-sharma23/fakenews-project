const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/debug/db-status
// @desc    Quick DB diagnostics (connection + users count)
// @access  Public (debug utility)
router.get('/db-status', async (_req, res) => {
  try {
    const userCount = await User.countDocuments();

    return res.json({
      service: 'fakenews-backend',
      mongo: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null
      },
      usersCount: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch DB status',
      error: error.message
    });
  }
});

module.exports = router;
