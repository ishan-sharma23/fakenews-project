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
 * - details: optional analysis details object
 */
const ResultDisplay = ({ prediction, confidence, onReset, details = {} }) => {
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

      {details && (
        details.sentimentScore !== undefined
        || (details.votes && Object.keys(details.votes).length > 0)
        || (Array.isArray(details.linguisticFlags) && details.linguisticFlags.length > 0)
        || details.featureBreakdown
      ) && (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          {/* Section 1 — Sentiment indicator */}
          {details.sentimentScore !== undefined && (
            <div style={{ marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                <span>Sentiment</span>
                <span>
                  {(() => {
                    const score = Number(details.sentimentScore) || 0;
                    const tone = score > 10 ? 'Positive' : score < -10 ? 'Negative' : 'Neutral';
                    const signed = score > 0 ? `+${Math.round(score)}` : `${Math.round(score)}`;
                    return `Sentiment: ${signed} (${tone})`;
                  })()}
                </span>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '12px', borderRadius: '6px', background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: '#9ca3af' }} />
                {(() => {
                  const score = Number(details.sentimentScore) || 0;
                  if (score > 10) {
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          height: '100%',
                          width: `${Math.min(score, 100) / 2}%`,
                          background: '#16a34a'
                        }}
                      />
                    );
                  }
                  if (score < -10) {
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          right: '50%',
                          top: 0,
                          height: '100%',
                          width: `${Math.min(Math.abs(score), 100) / 2}%`,
                          background: '#dc2626'
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: '45%',
                        top: 0,
                        height: '100%',
                        width: '10%',
                        background: '#9ca3af'
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          )}

          {/* Section 2 — Classifier votes */}
          {details.votes && Object.keys(details.votes).length > 0 && (
            <div style={{ marginBottom: '0.9rem' }}>
              <div style={{ marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                🗳️ Classifier votes
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {['rf', 'lr', 'nb'].map((key) => {
                  const vote = details.votes[key];
                  if (!vote) return null;
                  const isFakeVote = vote === 'FAKE';
                  return (
                    <span
                      key={key}
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        background: isFakeVote ? '#fee2e2' : '#dcfce7',
                        color: isFakeVote ? '#991b1b' : '#166534'
                      }}
                    >
                      {key.toUpperCase()}: {vote}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3 — Linguistic flags */}
          {Array.isArray(details.linguisticFlags) && details.linguisticFlags.length > 0 && (
            <div style={{ marginBottom: '0.9rem' }}>
              <div style={{ marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                ⚠️ Detected patterns
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {details.linguisticFlags.slice(0, 3).map((flag, idx) => (
                  <span
                    key={`${flag}-${idx}`}
                    style={{
                      fontSize: '0.7rem',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 — Feature breakdown mini meters */}
          {details.featureBreakdown && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem' }}>
                {[
                  {
                    label: 'Subjectivity',
                    value: Math.max(0, Math.min(100, (Number(details.featureBreakdown.subjectivity) || 0) * 100))
                  },
                  {
                    label: 'Caps ratio',
                    value: Math.max(0, Math.min(100, (Number(details.featureBreakdown.caps_ratio) || 0) * 100))
                  },
                  {
                    label: 'Exclamation',
                    value: Math.max(0, Math.min(100, (Number(details.featureBreakdown.exclamation_ratio) || 0) * 1000))
                  }
                ].map((meter) => (
                  <div key={meter.label}>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                      {meter.label}: {Math.round(meter.value)}%
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: '#e5e7eb', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${meter.value}%`,
                          height: '100%',
                          background: '#6366f1',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
