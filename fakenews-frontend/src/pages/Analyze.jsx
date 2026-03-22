import React, { useState } from 'react';
import { analyzeAPI } from '../services/api';

/**
 * Analyze Page
 * - Advanced analysis with multiple input options
 * - URL input, text input, file upload
 * - Detailed analysis results using ML backend (Voting Classifier + NLP + RF)
 */
const Analyze = () => {
  const [inputType, setInputType] = useState('text'); // 'text', 'url', 'file'
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      // Read file content
      const reader = new FileReader();
      reader.onload = (event) => {
        setTextInput(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Handle analyze submission - calls real backend API
  const handleAnalyze = async () => {
    const content = inputType === 'url' ? urlInput : textInput;
    
    if (!content.trim()) {
      setError('Please provide content to analyze');
      return;
    }

    if (inputType !== 'url' && content.length < 50) {
      setError('Please provide at least 50 characters for accurate analysis');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    try {
      // Call backend API (which uses ML Voting Classifier + NLP + RF)
      let data;
      if (inputType === 'url') {
        data = await analyzeAPI.analyze(urlInput, 'url');
      } else {
        data = await analyzeAPI.analyze(content, inputType);
      }
      
      setResult({
        prediction: data.prediction,
        modelPrediction: data.modelPrediction,
        reason: data.reason,
        confidence: data.confidence,
        details: {
          sentimentScore: data.details?.sentimentScore || 0,
          objectivityScore: data.details?.objectivityScore || 0,
          clickbaitScore: data.details?.clickbaitScore || 0,
          sourceCredibility: data.details?.sourceCredibility || 0,
          linguisticFlags: data.details?.linguisticFlags || [],
          featureBreakdown: data.details?.featureBreakdown || {},
          subjectivity: data.details?.featureBreakdown?.subjectivity || 0,
          flags: data.details?.flags || [],
          votes: data.details?.votes || {},
          probabilities: data.details?.probabilities || {}
        }
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset analysis
  const handleReset = () => {
    setResult(null);
    setTextInput('');
    setUrlInput('');
    setFileName('');
  };

  return (
    <div className="page analyze-page">
      <div className="container">
        {/* Header */}
        <div className="analyze-header">
          <h1>Advanced Analysis</h1>
          <p>Get detailed insights about news articles with our comprehensive analysis tool</p>
        </div>

        {!result ? (
          <div className="analyze-form-container">
            {/* Input Type Tabs */}
            <div className="input-tabs">
              <button
                className={`tab-btn ${inputType === 'text' ? 'active' : ''}`}
                onClick={() => setInputType('text')}
              >
                <span className="tab-icon">📝</span>
                Text
              </button>
              <button
                className={`tab-btn ${inputType === 'url' ? 'active' : ''}`}
                onClick={() => setInputType('url')}
              >
                <span className="tab-icon">🔗</span>
                URL
              </button>
              <button
                className={`tab-btn ${inputType === 'file' ? 'active' : ''}`}
                onClick={() => setInputType('file')}
              >
                <span className="tab-icon">📄</span>
                File
              </button>
            </div>

            {/* Input Area */}
            <div className="analyze-input-area">
              {inputType === 'text' && (
                <textarea
                  className="analyze-textarea"
                  placeholder="Paste the news article text here for analysis..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={10}
                />
              )}

              {inputType === 'url' && (
                <div className="url-input-wrapper">
                  <span className="url-icon">🌐</span>
                  <input
                    type="url"
                    className="url-input"
                    placeholder="Enter article URL (e.g., https://example.com/article)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
              )}

              {inputType === 'file' && (
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={handleFileChange}
                    hidden
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <span className="upload-icon">📁</span>
                    <span className="upload-text">
                      {fileName || 'Click to upload or drag and drop'}
                    </span>
                    <span className="upload-hint">TXT, DOC, DOCX, PDF (Max 5MB)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="error-message" style={{ marginBottom: '1rem', color: '#dc3545', padding: '1rem', background: '#ffe6e6', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Analyze Now
                </>
              )}
            </button>
          </div>
        ) : (
          /* Results Section */
          <div className="analyze-results">
            {/* Main Result */}
            <div className={`result-card main-result ${result.prediction.toLowerCase()}`}>
              <div className="result-badge-large">
                {result.prediction === 'FAKE' ? '⚠️' : '✅'} {result.prediction}
              </div>
              {(result.modelPrediction || result.reason) && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#4b5563' }}>
                  {result.modelPrediction && <div><strong>Model:</strong> {result.modelPrediction}</div>}
                  {result.reason && <div><strong>Why:</strong> {result.reason}</div>}
                </div>
              )}
              <div className="confidence-meter">
                <span>Confidence</span>
                <div className="meter-bar">
                  <div 
                    className="meter-fill" 
                    style={{ width: `${result.confidence}%` }}
                  ></div>
                </div>
                <span className="confidence-value">{result.confidence}%</span>
              </div>
            </div>

            {/* Voting Classifier Results */}
            {result.details.votes && Object.keys(result.details.votes).length > 0 && (
              <div className="votes-section" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem' }}>🗳️ Voting Classifier Results</h3>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div className="vote-card" style={{ padding: '0.5rem 1rem', background: result.details.votes.rf === 'FAKE' ? '#ffe6e6' : '#e6ffe6', borderRadius: '4px' }}>
                    <strong>Random Forest:</strong> {result.details.votes.rf}
                  </div>
                  <div className="vote-card" style={{ padding: '0.5rem 1rem', background: result.details.votes.lr === 'FAKE' ? '#ffe6e6' : '#e6ffe6', borderRadius: '4px' }}>
                    <strong>Logistic Regression:</strong> {result.details.votes.lr}
                  </div>
                  <div className="vote-card" style={{ padding: '0.5rem 1rem', background: result.details.votes.nb === 'FAKE' ? '#ffe6e6' : '#e6ffe6', borderRadius: '4px' }}>
                    <strong>Naive Bayes:</strong> {result.details.votes.nb}
                  </div>
                </div>
                {result.details.probabilities && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                    Probability: {(result.details.probabilities.fake * 100).toFixed(1)}% Fake, {(result.details.probabilities.real * 100).toFixed(1)}% Real
                  </p>
                )}
              </div>
            )}

            {/* Detailed Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Sentiment Score</h4>
                {(() => {
                  const score = result.details.sentimentScore || 0;
                  const sentLabel = score > 10 ? 'Positive' : score < -10 ? 'Negative' : 'Neutral';
                  const sentColor = score > 10 ? '#166534' : score < -10 ? '#991b1b' : '#6b7280';

                  return (
                    <>
                      <div className="metric-value" style={{ color: sentColor }}>
                        {score > 0 ? '+' : ''}{score}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: sentColor, marginBottom: '0.25rem' }}>
                        {sentLabel}
                      </div>
                      <p className="metric-desc">-100 (negative) to +100 (positive)</p>
                    </>
                  );
                })()}
              </div>
              <div className="metric-card">
                <h4>Objectivity</h4>
                <div className="metric-value">{result.details.objectivityScore}%</div>
                <p className="metric-desc">How factual vs opinionated</p>
              </div>
              <div className="metric-card">
                <h4>Clickbait Score</h4>
                <div className="metric-value">{result.details.clickbaitScore}%</div>
                <p className="metric-desc">Likelihood of sensationalism</p>
              </div>
              <div className="metric-card">
                <h4>Source Credibility</h4>
                <div className="metric-value">{result.details.sourceCredibility}%</div>
                <p className="metric-desc">Based on source analysis</p>
              </div>
            </div>

            {result.details.featureBreakdown && Object.keys(result.details.featureBreakdown).length > 0 && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>📊 Feature Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Subjectivity', value: Math.round((result.details.featureBreakdown.subjectivity || 0) * 100) },
                    { label: 'Caps ratio', value: Math.round((result.details.featureBreakdown.caps_ratio || 0) * 100) },
                    { label: 'Exclamation', value: Math.min(100, Math.round((result.details.featureBreakdown.exclamation_ratio || 0) * 1000)) }
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.8rem', color: '#4b5563', marginBottom: '0.3rem' }}>
                        {label}: {value}%
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: '#e5e7eb', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${value}%`,
                            height: '100%',
                            background: '#6366f1'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flags Section */}
            {result.details.flags.length > 0 && (
              <div className="flags-section">
                <h3>⚠️ Potential Issues Detected</h3>
                <ul className="flags-list">
                  {result.details.flags.map((flag, index) => (
                    <li key={index} className="flag-item">{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.details.linguisticFlags && result.details.linguisticFlags.length > 0 && (
              <div className="flags-section">
                <h3>🔬 Linguistic Analysis Flags</h3>
                <ul className="flags-list">
                  {result.details.linguisticFlags.map((flag, i) => (
                    <li key={i} className="flag-item">
                      🔍 {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="result-actions">
              <button className="btn btn-secondary" onClick={handleReset}>
                Analyze Another
              </button>
              <button className="btn btn-primary">
                Save to History
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyze;
