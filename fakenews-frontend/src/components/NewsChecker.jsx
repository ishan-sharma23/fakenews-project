import React, { useState } from 'react';

/**
 * NewsChecker Component
 * - Large textarea for pasting news articles
 * - Character counter (minimum 50 chars required)
 * - Maximum character limit (requires login to extend)
 * - "Check News" button (disabled if text too short)
 * - Loading spinner when checking
 * 
 * Props:
 * - onCheck: callback function when user clicks check (receives the text)
 * - isLoading: boolean to show loading state
 * - maxChars: maximum character limit (default 500 for guests, higher for logged in)
 * - onLimitExceeded: callback when user tries to exceed character limit
 * - isLoggedIn: boolean to show if user is logged in
 */
const NewsChecker = ({ onCheck, isLoading = false, maxChars = 500, onLimitExceeded, isLoggedIn = false }) => {
  const [newsText, setNewsText] = useState('');
  const MIN_CHARS = 50;

  // Check if text meets minimum character requirement
  const isValidLength = newsText.length >= MIN_CHARS;
  const charsRemaining = MIN_CHARS - newsText.length;
  const charsUsed = newsText.length;
  const isAtLimit = charsUsed >= maxChars;

  // Handle text change
  const handleTextChange = (e) => {
    const newText = e.target.value;
    
    // If user tries to exceed limit and not logged in
    if (newText.length > maxChars && !isLoggedIn) {
      // Show login popup
      if (onLimitExceeded) {
        onLimitExceeded();
      }
      return; // Don't update text beyond limit
    }
    
    setNewsText(newText);
  };

  // Handle check button click
  const handleCheck = () => {
    if (isValidLength && !isLoading) {
      onCheck(newsText);
    }
  };

  // Clear the textarea
  const handleClear = () => {
    setNewsText('');
  };

  return (
    <div className="news-checker">
      <div className="checker-header">
        <h2>Check Your News</h2>
        <p className="checker-subtitle">
          Paste a news article below to verify its authenticity
        </p>
      </div>

      {/* Textarea for news input */}
      <div className="textarea-container">
        <textarea
          className="news-textarea"
          placeholder="Paste news article here..."
          value={newsText}
          onChange={handleTextChange}
          disabled={isLoading}
          rows={8}
        />
        
        {/* Character counter */}
        <div className="char-counter-container">
          <div className={`char-counter ${isValidLength ? 'valid' : 'invalid'}`}>
            {isValidLength ? (
              <span>✓ {newsText.length} characters</span>
            ) : (
              <span>Need {charsRemaining} more characters (minimum {MIN_CHARS})</span>
            )}
          </div>
          <div className={`char-limit ${isAtLimit ? 'at-limit' : ''}`}>
            <span>{charsUsed}/{maxChars}</span>
            {!isLoggedIn && (
              <span className="limit-hint">Login for more</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="checker-actions">
        <button
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={isLoading || newsText.length === 0}
        >
          Clear
        </button>
        
        <button
          className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
          onClick={handleCheck}
          disabled={!isValidLength || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Analyzing...
            </>
          ) : (
            <>
              <span className="btn-icon">🔍</span>
              Check News
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default NewsChecker;
