import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryList from '../components/HistoryList';
import { useAuth } from '../context/AuthContext';
import { analyzeAPI } from '../services/api';

/**
 * History Page
 * - Displays list of previously checked articles
 * - Requires authentication
 * - Fetches data from backend API
 */
const History = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Fetch history on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const data = await analyzeAPI.getHistory(page, 10);
      
      // Transform data for HistoryList component
      const formattedHistory = data.analyses.map(item => ({
        id: item._id,
        date: new Date(item.createdAt).toLocaleDateString(),
        text: item.content || 'Content not available',
        result: item.prediction,
        confidence: item.confidence
      }));
      
      setHistory(formattedHistory);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await analyzeAPI.deleteAnalysis(id);
      setHistory(history.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Failed to delete item');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="page history-page">
        <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
          <span className="spinner"></span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem', color: '#dc3545', padding: '1rem', background: '#ffe6e6', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {/* Stats Summary */}
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-number">{pagination.total}</span>
            <span className="stat-label">Total Checks</span>
          </div>
          <div className="stat-card fake">
            <span className="stat-number">
              {history.filter(h => h.result === 'FAKE').length}
            </span>
            <span className="stat-label">Fake Detected</span>
          </div>
          <div className="stat-card real">
            <span className="stat-number">
              {history.filter(h => h.result === 'REAL').length}
            </span>
            <span className="stat-label">Real Verified</span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <span className="spinner"></span>
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <p>No analysis history yet. Start by checking some news!</p>
          </div>
        ) : (
          /* History List */
          <HistoryList history={history} onDelete={handleDelete} />
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`btn ${page === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => fetchHistory(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
