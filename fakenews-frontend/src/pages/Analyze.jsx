import React, { useState } from 'react';

/**
 * Analyze Page
 * - Advanced analysis with multiple input options
 * - URL input, text input, file upload
 * - Detailed analysis results
 */
const Analyze = () => {
  const [inputType, setInputType] = useState('text'); // 'text', 'url', 'file'
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      // Read file content (for demo)
      const reader = new FileReader();
      reader.onload = (event) => {
        setTextInput(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Handle analyze submission
  const handleAnalyze = () => {
    const content = inputType === 'url' ? urlInput : textInput;
    
    if (!content.trim()) {
      alert('Please provide content to analyze');
      return;
    }

    setIsAnalyzing(true);

    // Simulate analysis (placeholder)
    setTimeout(() => {
      setResult({
        prediction: Math.random() > 0.5 ? 'FAKE' : 'REAL',
        confidence: Math.floor(Math.random() * 25) + 75,
        details: {
          sentimentScore: (Math.random() * 2 - 1).toFixed(2),
          objectivityScore: Math.floor(Math.random() * 100),
          clickbaitScore: Math.floor(Math.random() * 100),
          sourceCredibility: Math.floor(Math.random() * 40) + 60,
          flags: [
            'Emotional language detected',
            'Missing source citations',
            'Sensationalist headline pattern'
          ].slice(0, Math.floor(Math.random() * 3) + 1)
        }
      });
      setIsAnalyzing(false);
    }, 2500);
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

            {/* Detailed Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Sentiment Score</h4>
                <div className="metric-value">{result.details.sentimentScore}</div>
                <p className="metric-desc">Range: -1 (negative) to 1 (positive)</p>
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
