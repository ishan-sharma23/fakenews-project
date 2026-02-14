import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewsChecker from '../components/NewsChecker';
import ResultDisplay from '../components/ResultDisplay';

/**
 * Home Page
 * - Main page with NewsChecker and ResultDisplay
 * - Manages state for checking news
 * - Character limit feature: guests have 500 chars, logged in users get 5000
 */
const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalReason, setModalReason] = useState('trial'); // 'trial' or 'limit'
  
  // Simulated auth state (replace with actual auth context later)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Trial tracking for guests (persisted in localStorage)
  const FREE_TRIALS = 2;
  const getTrialCount = () => parseInt(localStorage.getItem('trialCount') || '0');
  const [trialCount, setTrialCount] = useState(getTrialCount());
  
  // Character limits
  const GUEST_CHAR_LIMIT = 500;
  const USER_CHAR_LIMIT = 5000;
  const currentLimit = isLoggedIn ? USER_CHAR_LIMIT : GUEST_CHAR_LIMIT;

  // Simulate checking news (placeholder - no actual API call)
  const handleCheck = (text) => {
    // Check if guest has exceeded trial limit
    if (!isLoggedIn && trialCount >= FREE_TRIALS) {
      setModalReason('trial');
      setShowLoginModal(true);
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API delay (2 seconds)
    setTimeout(() => {
      // Sample result for testing UI
      // In future, this will be replaced with actual API call
      const sampleResult = {
        prediction: Math.random() > 0.5 ? 'FAKE' : 'REAL',
        confidence: Math.floor(Math.random() * 30) + 70 // Random 70-100
      };
      
      setResult(sampleResult);
      setIsLoading(false);
      
      // Increment trial count for guests
      if (!isLoggedIn) {
        const newCount = trialCount + 1;
        setTrialCount(newCount);
        localStorage.setItem('trialCount', newCount.toString());
      }
    }, 2000);
  };

  // Reset to check another article
  const handleReset = () => {
    setResult(null);
  };

  // Handle when character limit is exceeded
  const handleLimitExceeded = () => {
    setModalReason('limit');
    setShowLoginModal(true);
  };

  // Close login modal
  const closeLoginModal = () => {
    setShowLoginModal(false);
  };

  // Go to login page
  const goToLogin = () => {
    setShowLoginModal(false);
    navigate('/login');
  };

  return (
    <div className="page home-page">
      <div className="container">
        {/* Hero Section */}
        <div className="hero">
          <h1>Detect Fake News Instantly</h1>
          <p className="hero-subtitle">
            Powered by AI and NLP technology to help you identify misinformation
          </p>
          {/* Trial Counter for Guests */}
          {!isLoggedIn && (
            <div className="trial-indicator">
              <span className={`trial-badge ${trialCount >= FREE_TRIALS ? 'expired' : ''}`}>
                {trialCount >= FREE_TRIALS 
                  ? '⚠️ No free trials left' 
                  : `✨ ${FREE_TRIALS - trialCount} free trial${FREE_TRIALS - trialCount !== 1 ? 's' : ''} remaining`
                }
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="main-content">
          {result ? (
            // Show result if we have one
            <ResultDisplay
              prediction={result.prediction}
              confidence={result.confidence}
              onReset={handleReset}
            />
          ) : (
            // Show checker if no result yet
            <NewsChecker
              onCheck={handleCheck}
              isLoading={isLoading}
              maxChars={currentLimit}
              onLimitExceeded={handleLimitExceeded}
              isLoggedIn={isLoggedIn}
            />
          )}
        </div>

        {/* Login Modal for Trial/Character Limit */}
        {showLoginModal && (
          <div className="modal-overlay" onClick={closeLoginModal}>
            <div className="login-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeLoginModal}>×</button>
              <div className="modal-icon">{modalReason === 'trial' ? '🔐' : '🔒'}</div>
              <h3>{modalReason === 'trial' ? 'Free Trials Used Up' : 'Character Limit Reached'}</h3>
              <p>
                {modalReason === 'trial' ? (
                  <>
                    You've used all <strong>{FREE_TRIALS} free checks</strong> available for guests.
                    Login to get <strong>unlimited checks</strong> and more features!
                  </>
                ) : (
                  <>
                    You've reached the <strong>{GUEST_CHAR_LIMIT} character</strong> limit for guests.
                    Login to unlock up to <strong>{USER_CHAR_LIMIT.toLocaleString()} characters</strong> for longer articles!
                  </>
                )}
              </p>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={closeLoginModal}>
                  Stay as Guest
                </button>
                <button className="btn btn-primary" onClick={goToLogin}>
                  Login Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="features">
          <div className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3>AI Powered</h3>
            <p>Advanced machine learning algorithms analyze text patterns</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">⚡</span>
            <h3>Fast Results</h3>
            <p>Get instant analysis of any news article</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🛡️</span>
            <h3>Stay Safe</h3>
            <p>Protect yourself from misinformation online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
