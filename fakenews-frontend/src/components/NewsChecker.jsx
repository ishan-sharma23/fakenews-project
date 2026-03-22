import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';

/**
 * NewsChecker Component
 * - Large textarea for pasting news articles
 * - Character counter (minimum 50 chars required)
 * - Maximum character limit (requires login to extend)
 * - "Check News" button (disabled if text too short)
 * - Loading spinner when checking
 * - Real-time analysis with WebSocket
 * 
 * Props:
 * - onCheck: callback function when user clicks check (receives the text)
 * - isLoading: boolean to show loading state
 * - maxChars: maximum character limit (default 500 for guests, higher for logged in)
 * - onLimitExceeded: callback when user tries to exceed character limit
 * - isLoggedIn: boolean to show if user is logged in
 * - onAnalysisResult: callback when analysis result is received
 */
const NewsChecker = ({ 
  onCheck, 
  isLoading = false, 
  maxChars = 500, 
  onLimitExceeded, 
  isLoggedIn = false,
  onAnalysisResult
}) => {
  const [newsText, setNewsText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const MIN_CHARS = 50;

  // Setup WebSocket listeners on mount
  useEffect(() => {
    socketService.connect();

    // Listen for analysis started
    socketService.onAnalysisStarted(() => {
      setAnalysisProgress('Analysis started...');
    });

    // Listen for analysis complete
    socketService.onAnalysisComplete((data) => {
      console.log('Analysis complete:', data);
      setIsAnalyzing(false);
      setAnalysisProgress('');
      
      // Call onAnalysisResult if provided
      if (onAnalysisResult) {
        onAnalysisResult(data.result);
      }
      
      // Clear the input after successful analysis
      setNewsText('');
    });

    // Listen for analysis errors
    socketService.onAnalysisError((error) => {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(`Error: ${error.error}`);
      alert(`Analysis failed: ${error.error}`);
    });

    // Cleanup on unmount
    return () => {
      socketService.off('analysis-started');
      socketService.off('analysis-complete');
      socketService.off('analysis-error');
    };
  }, [onAnalysisResult]);

  // Check if text meets minimum character requirement
  const isValidLength = newsText.length >= MIN_CHARS;
  const charsRemaining = MIN_CHARS - newsText.length;
  const charsUsed = newsText.length;
  const isAtLimit = charsUsed >= maxChars;
  const usedPct = (charsUsed / maxChars) * 100;
  const limitColor = usedPct >= 95 ? '#dc2626'
    : usedPct >= 80 ? '#d97706'
    : charsUsed >= MIN_CHARS ? '#16a34a'
    : '#6b7280';

  useEffect(() => {
    if (!isLoading && !isAnalyzing) {
      setAnalysisProgress('');
    }
  }, [isLoading, isAnalyzing]);

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

  // Handle check button click - use WebSocket
  const handleCheck = () => {
    if (isValidLength && !isAnalyzing && !isLoading) {
      setIsAnalyzing(true);
      setAnalysisProgress('Preprocessing text...');
      setTimeout(() => setAnalysisProgress('Extracting NLP features...'), 600);
      setTimeout(() => setAnalysisProgress('Running voting classifiers...'), 1200);
      setTimeout(() => setAnalysisProgress('Finalising result...'), 1800);

      // Use HTTP REST path only (onCheck handles the API call in Home.jsx)
      if (onCheck) {
        onCheck(newsText);
      }

      // WebSocket is used for progress updates only, not triggering analysis
    }
  };

  // Clear the textarea
  const handleClear = () => {
    setNewsText('');
    setAnalysisProgress('');
    setIsAnalyzing(false);
  };

  const isDisabled = isLoading || isAnalyzing;

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
          disabled={isDisabled}
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
            <span style={{ color: limitColor, fontWeight: usedPct >= 80 ? 600 : 400 }}>{charsUsed}/{maxChars}</span>
            {!isLoggedIn && (
              <span className="limit-hint">Login for more</span>
            )}
          </div>
        </div>

        {/* Analysis progress indicator */}
        {analysisProgress && (
          <div className="analysis-progress">
            <span className="spinner-small"></span>
            <span>{analysisProgress}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="checker-actions">
        <button
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={isDisabled || newsText.length === 0}
        >
          Clear
        </button>
        
        <button
          className={`btn btn-primary ${isDisabled ? 'loading' : ''}`}
          onClick={handleCheck}
          disabled={!isValidLength || isDisabled}
        >
          {isDisabled ? (
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
