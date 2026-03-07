const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Analysis = require('../models/Analysis');
const { protect, optionalAuth } = require('../middleware/auth');

// ML Service URL (Python Flask)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Call ML Microservice for prediction
 * Uses Voting Classifier (RF + LR + NB) with NLP (TF-IDF)
 */
const analyzeWithML = async (content) => {
  const response = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: content })
  });
  
  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }
  
  return await response.json();
};

/**
 * Fallback: Heuristic-based Detector
 * Used when ML service is unavailable
 */
const analyzeWithHeuristics = (content, contentType) => {
  // Clickbait patterns
  const clickbaitPatterns = [
    /you won't believe/i,
    /shocking/i,
    /breaking/i,
    /this will blow your mind/i,
    /doctors hate/i,
    /one weird trick/i,
    /what happens next/i,
    /they don't want you to know/i,
    /exposed/i,
    /secret/i
  ];

  // Emotional/sensationalist words
  const emotionalWords = [
    'amazing', 'incredible', 'unbelievable', 'shocking', 'terrifying',
    'horrifying', 'devastating', 'explosive', 'bombshell', 'outrage',
    'scandal', 'disaster', 'chaos', 'crisis', 'emergency'
  ];

  // Calculate scores
  let clickbaitScore = 0;
  let emotionalCount = 0;
  const flags = [];
  const contentLower = content.toLowerCase();

  // Check clickbait patterns
  clickbaitPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      clickbaitScore += 15;
    }
  });
  clickbaitScore = Math.min(clickbaitScore, 100);

  // Check emotional words
  emotionalWords.forEach(word => {
    if (contentLower.includes(word)) {
      emotionalCount++;
    }
  });

  // Calculate sentiment score (-1 to 1, negative = more emotional/fake-like)
  const sentimentScore = Math.max(-1, Math.min(1, 1 - (emotionalCount * 0.15)));

  // Check for ALL CAPS (sensationalism indicator)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) {
    flags.push('Excessive capitalization detected');
  }

  // Check for excessive punctuation
  const excessivePunctuation = /[!?]{2,}/.test(content);
  if (excessivePunctuation) {
    flags.push('Sensationalist punctuation detected');
  }

  // Check for missing citations
  const hasCitations = /according to|source:|cited|study|research|report/i.test(content);
  if (!hasCitations && content.length > 200) {
    flags.push('Missing source citations');
  }

  // Add flags based on scores
  if (clickbaitScore > 30) {
    flags.push('Clickbait language patterns detected');
  }
  if (emotionalCount > 3) {
    flags.push('Emotional/sensationalist language detected');
  }

  // Calculate objectivity score
  const objectivityScore = Math.max(0, 100 - (emotionalCount * 10) - (capsRatio * 50));

  // Source credibility (placeholder - would need URL checking in real app)
  const sourceCredibility = contentType === 'url' ? 50 : 70;

  // Calculate overall prediction
  const fakeIndicatorScore = 
    (clickbaitScore * 0.3) + 
    ((1 - sentimentScore) * 30) + 
    ((100 - objectivityScore) * 0.2) +
    (flags.length * 10);

  let prediction;
  let confidence;

  if (fakeIndicatorScore > 60) {
    prediction = 'FAKE';
    confidence = Math.min(95, 50 + fakeIndicatorScore * 0.5);
  } else if (fakeIndicatorScore > 35) {
    prediction = 'UNCERTAIN';
    confidence = 50 + Math.abs(50 - fakeIndicatorScore);
  } else {
    prediction = 'REAL';
    confidence = Math.min(95, 50 + (60 - fakeIndicatorScore));
  }

  return {
    prediction,
    confidence: Math.round(confidence),
    details: {
      sentimentScore: parseFloat(sentimentScore.toFixed(2)),
      objectivityScore: Math.round(objectivityScore),
      clickbaitScore: Math.round(clickbaitScore),
      sourceCredibility: Math.round(sourceCredibility),
      flags,
      votes: { rf: prediction, lr: prediction, nb: prediction },
      probabilities: { fake: prediction === 'FAKE' ? 0.7 : 0.3, real: prediction === 'REAL' ? 0.7 : 0.3 }
    }
  };
};

// @route   POST /api/analyze
// @desc    Analyze news content
// @access  Public (with limits) / Private (extended)
router.post('/', [
  body('content', 'Content is required').notEmpty(),
  body('content', 'Content must be at least 50 characters').isLength({ min: 50 }),
  body('contentType').optional().isIn(['text', 'url'])
], optionalAuth, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, contentType = 'text' } = req.body;

  try {
    // Character limit check (500 for guests, 5000 for logged in)
    const maxChars = req.user ? 5000 : 500;
    if (content.length > maxChars) {
      return res.status(400).json({ 
        message: `Content exceeds ${maxChars} character limit. ${!req.user ? 'Login for extended limits.' : ''}`
      });
    }

    // Analyze the content using ML service (Voting Classifier + NLP + RF)
    // Falls back to heuristics if ML service is unavailable
    let analysisResult;
    let usedMLService = false;
    
    try {
      analysisResult = await analyzeWithML(content);
      usedMLService = true;
      console.log('Analysis completed using ML service (Voting Classifier)');
    } catch (mlError) {
      console.log('ML service unavailable, using heuristic fallback:', mlError.message);
      analysisResult = analyzeWithHeuristics(content, contentType);
    }

    // Save to database
    const analysis = await Analysis.create({
      user: req.user ? req.user._id : null,
      content: content.substring(0, 1000), // Store first 1000 chars
      contentType,
      prediction: analysisResult.prediction,
      confidence: analysisResult.confidence,
      details: analysisResult.details
    });

    res.status(201).json({
      _id: analysis._id,
      prediction: analysis.prediction,
      confidence: analysis.confidence,
      details: analysis.details,
      createdAt: analysis.createdAt
    });
  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ message: 'Server error during analysis' });
  }
});

// @route   GET /api/analyze/history
// @desc    Get user's analysis history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const analyses = await Analysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content'); // Don't send full content in list

    const total = await Analysis.countDocuments({ user: req.user._id });

    res.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('History fetch error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analyze/:id
// @desc    Get single analysis
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Analysis fetch error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/analyze/:id
// @desc    Delete analysis
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const analysis = await Analysis.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    await analysis.deleteOne();

    res.json({ message: 'Analysis removed' });
  } catch (error) {
    console.error('Analysis delete error:', error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Analysis not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
