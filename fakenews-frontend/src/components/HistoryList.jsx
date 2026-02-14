import React from 'react';

/**
 * HistoryList Component
 * - Displays a list of previous news checks
 * - Each card shows: date, text snippet, result badge
 * 
 * Props:
 * - history: array of history items
 *   Each item: { id, date, text, result }
 */
const HistoryList = ({ history = [] }) => {
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Truncate text to 100 characters
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Show empty state if no history
  if (history.length === 0) {
    return (
      <div className="history-empty">
        <span className="empty-icon">📋</span>
        <h3>No History Yet</h3>
        <p>Your checked articles will appear here</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      {history.map((item) => (
        <div key={item.id} className="history-card">
          {/* Card Header with Date and Badge */}
          <div className="history-card-header">
            <span className="history-date">
              📅 {formatDate(item.date)}
            </span>
            <span className={`history-badge ${item.result.toLowerCase()}`}>
              {item.result}
            </span>
          </div>

          {/* Text Preview */}
          <p className="history-text">
            {truncateText(item.text)}
          </p>

          {/* Card Footer */}
          <div className="history-card-footer">
            <button className="btn-link">
              View Details →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryList;
