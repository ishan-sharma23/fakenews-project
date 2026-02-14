import React from 'react';
import HistoryList from '../components/HistoryList';

/**
 * History Page
 * - Displays list of previously checked articles
 * - Uses sample data for now (no backend)
 */
const History = () => {
  // Sample history data for testing UI
  const sampleHistory = [
    { 
      id: 1, 
      date: "2024-02-10", 
      text: "Breaking news: Scientists have discovered a new species of deep-sea fish that can survive extreme pressure at the bottom of the ocean. The discovery was made during a recent expedition...", 
      result: "REAL" 
    },
    { 
      id: 2, 
      date: "2024-02-09", 
      text: "SHOCKING: Government secretly planning to ban all social media by next month! Anonymous sources reveal the truth about the upcoming internet shutdown...", 
      result: "FAKE" 
    },
    { 
      id: 3, 
      date: "2024-02-08", 
      text: "Local community raises $50,000 for children's hospital renovation. The fundraising event brought together over 500 volunteers from across the city...", 
      result: "REAL" 
    },
    { 
      id: 4, 
      date: "2024-02-07", 
      text: "MIRACLE CURE: This one simple trick will cure all diseases! Doctors hate this discovery made by a local man in his garage...", 
      result: "FAKE" 
    },
    { 
      id: 5, 
      date: "2024-02-06", 
      text: "Stock market reaches new high as tech companies report strong quarterly earnings. Analysts predict continued growth in the coming months...", 
      result: "REAL" 
    }
  ];

  return (
    <div className="page history-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1>Check History</h1>
          <p className="page-subtitle">
            View your previously analyzed articles
          </p>
        </div>

        {/* Stats Summary */}
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-number">{sampleHistory.length}</span>
            <span className="stat-label">Total Checks</span>
          </div>
          <div className="stat-card fake">
            <span className="stat-number">
              {sampleHistory.filter(h => h.result === 'FAKE').length}
            </span>
            <span className="stat-label">Fake Detected</span>
          </div>
          <div className="stat-card real">
            <span className="stat-number">
              {sampleHistory.filter(h => h.result === 'REAL').length}
            </span>
            <span className="stat-label">Real Verified</span>
          </div>
        </div>

        {/* History List */}
        <HistoryList history={sampleHistory} />
      </div>
    </div>
  );
};

export default History;
