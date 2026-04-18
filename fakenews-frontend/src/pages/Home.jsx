import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NewsChecker from '../components/NewsChecker';
import ResultDisplay from '../components/ResultDisplay';
import { useAuth } from '../context/AuthContext';
import { analyzeAPI } from '../services/api';

/**
 * Home Page
 * - Main page with NewsChecker and ResultDisplay
 * - Manages state for checking news
 * - Character limit feature: guests have 500 chars, logged in users get 5000
 * - Uses real backend API with Voting Classifier + NLP + RF
 */
const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalReason, setModalReason] = useState('trial'); // 'trial' or 'limit'
  
  // Trial tracking for guests (persisted in localStorage)
  const FREE_TRIALS = 5;
  const TRIAL_STORAGE_KEY = 'guestTrialState';
  const LEGACY_TRIAL_STORAGE_KEY = 'trialCount';
  const TRIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

  const writeTrialState = (count) => {
    const safeCount = Math.max(0, Math.min(FREE_TRIALS, Number(count) || 0));
    localStorage.setItem(
      TRIAL_STORAGE_KEY,
      JSON.stringify({ count: safeCount, updatedAt: Date.now() })
    );
  };

  const getTrialCount = () => {
    const now = Date.now();

    try {
      const stored = localStorage.getItem(TRIAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedCount = Number(parsed?.count);
        const updatedAt = Number(parsed?.updatedAt);
        const isRecent = Number.isFinite(updatedAt) && now - updatedAt < TRIAL_WINDOW_MS;

        if (Number.isFinite(storedCount) && isRecent) {
          return Math.max(0, Math.min(FREE_TRIALS, Math.floor(storedCount)));
        }
      }
    } catch {
      // Corrupt localStorage should not block users from free trials.
    }

    // Migrate legacy key to expiring model by resetting stale permanent counters.
    localStorage.removeItem(LEGACY_TRIAL_STORAGE_KEY);
    writeTrialState(0);
    return 0;
  };

  const [trialCount, setTrialCount] = useState(() => getTrialCount());
  
  // Character limits
  const GUEST_CHAR_LIMIT = 500;
  const USER_CHAR_LIMIT = 5000;
  const currentLimit = isAuthenticated ? USER_CHAR_LIMIT : GUEST_CHAR_LIMIT;

  // Check news using real backend API
  const handleCheck = async (text) => {
    // Check if guest has exceeded trial limit
    if (!isAuthenticated && trialCount >= FREE_TRIALS) {
      setModalReason('trial');
      setShowLoginModal(true);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call real backend API (uses ML Voting Classifier + NLP + RF)
      const data = await analyzeAPI.analyze(text, 'text');
      
      setResult({
        prediction: data.prediction,
        confidence: data.confidence,
        details: data.details
      });
      
      // Increment trial count for guests
      if (!isAuthenticated) {
        const newCount = Math.min(FREE_TRIALS, trialCount + 1);
        setTrialCount(newCount);
        writeTrialState(newCount);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Analysis failed. Make sure backend is running.');
    } finally {
      setIsLoading(false);
    }
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
          {!isAuthenticated && (
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

        {/* Error display */}
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem', color: '#dc3545', padding: '1rem', background: '#ffe6e6', borderRadius: '8px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="main-content">
          {result ? (
            // Show result if we have one
            <ResultDisplay
              prediction={result.prediction}
              confidence={result.confidence}
              details={result.details}
              onReset={handleReset}
            />
          ) : (
            // Show checker if no result yet
            <NewsChecker
              onCheck={handleCheck}
              isLoading={isLoading}
              maxChars={currentLimit}
              onLimitExceeded={handleLimitExceeded}
              isLoggedIn={isAuthenticated}
              onAnalysisResult={(result) => {
                setResult(result);
              }}
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
