const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for guest users
  },
  content: {
    type: String,
    required: [true, 'Please provide content to analyze'],
    trim: true
  },
  contentType: {
    type: String,
    enum: ['text', 'url'],
    default: 'text'
  },
  prediction: {
    type: String,
    enum: ['FAKE', 'REAL', 'UNCERTAIN'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  details: {
    sentimentScore: {
      type: Number,
      default: 0
    },
    objectivityScore: {
      type: Number,
      default: 0
    },
    clickbaitScore: {
      type: Number,
      default: 0
    },
    sourceCredibility: {
      type: Number,
      default: 0
    },
    flags: [{
      type: String
    }],
    // Voting Classifier results
    votes: {
      rf: { type: String, enum: ['FAKE', 'REAL', 'UNCERTAIN'] },
      lr: { type: String, enum: ['FAKE', 'REAL', 'UNCERTAIN'] },
      nb: { type: String, enum: ['FAKE', 'REAL', 'UNCERTAIN'] }
    },
    probabilities: {
      fake: { type: Number, default: 0 },
      real: { type: Number, default: 0 }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries by user
analysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
