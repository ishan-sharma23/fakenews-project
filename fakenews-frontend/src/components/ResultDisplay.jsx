import React from 'react';

/**
 * ResultDisplay Component
 * - Shows prediction result with colored badge
 * - Displays confidence percentage with progress bar
 * - "Check Another Article" button to reset
 * 
 * Props:
 * - prediction: "FAKE" or "REAL"
 * - confidence: number 0-100
 * - onReset: callback to check another article
 */
const ResultDisplay = ({ prediction, confidence, onReset }) => {
  // Determine styling based on prediction
  const isFake = prediction === 'FAKE';
  const resultClass = isFake ? 'fake' : 'real';
  
  return (
    <div className={`result-display ${resultClass}`}>
      {/* Result Header */}
      <div className="result-header">
        <span className="result-icon">
          {isFake ? '⚠️' : '✅'}
        </span>
        <h2>Analysis Complete</h2>
      </div>

      {/* Main Result Badge */}
      <div className={`result-badge ${resultClass}`}>
        {prediction}
      </div>

      {/* Confidence Text */}
      <p className="result-text">
        This news is <strong>{confidence}%</strong> likely to be{' '}
        <span className={`highlight ${resultClass}`}>{prediction}</span>
      </p>

      {/* Confidence Progress Bar */}
      <div className="confidence-section">
        <div className="confidence-label">
          <span>Confidence Level</span>
          <span>{confidence}%</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className={`progress-bar ${resultClass}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="result-info">
        {isFake ? (
          <p className="info-text warning">
            ⚠️ Be cautious! This article shows signs of misinformation. 
            Verify from trusted sources before sharing.
          </p>
        ) : (
          <p className="info-text success">
            ✓ This article appears to be from a reliable source. 
            Always cross-check important news with multiple sources.
          </p>
        )}
      </div>

      {/* Reset Button */}
      <button className="btn btn-primary" onClick={onReset}>
        <span className="btn-icon">🔄</span>
        Check Another Article
      </button>
    </div>
  );
};

export default ResultDisplay;
