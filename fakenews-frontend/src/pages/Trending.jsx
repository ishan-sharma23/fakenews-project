import React, { useState, useEffect, useCallback } from 'react';
import { trendingAPI } from '../services/api';

const Trending = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, fake, real

  const fetchTrending = useCallback(async () => {
    try {
      setError('');
      const data = await trendingAPI.getTrending();
      setArticles(data.articles || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError('Failed to load trending news. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchTrending, 120000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await trendingAPI.refresh();
      setArticles(data.articles || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError('Refresh failed. Try again later.');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredArticles = articles.filter(a => {
    if (filter === 'fake') return a.analysis?.prediction === 'FAKE';
    if (filter === 'real') return a.analysis?.prediction === 'REAL';
    return true;
  });

  const fakeCount = articles.filter(a => a.analysis?.prediction === 'FAKE').length;
  const realCount = articles.filter(a => a.analysis?.prediction === 'REAL').length;

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
          <p style={{ color: '#6b7280' }}>Analyzing trending news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '2rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
          📡 Real-Time News Analysis
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Live news articles analyzed by our ML model for authenticity
        </p>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{
            background: '#f0fdf4', color: '#166534', padding: '6px 14px',
            borderRadius: 20, fontSize: '0.875rem', fontWeight: 600
          }}>
            ✅ {realCount} Real
          </span>
          <span style={{
            background: '#fef2f2', color: '#991b1b', padding: '6px 14px',
            borderRadius: 20, fontSize: '0.875rem', fontWeight: 600
          }}>
            ⚠️ {fakeCount} Suspicious
          </span>
          <span style={{
            background: '#f3f4f6', color: '#6b7280', padding: '6px 14px',
            borderRadius: 20, fontSize: '0.875rem'
          }}>
            {articles.length} total articles
          </span>

          {lastUpdated && (
            <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 'auto' }}>
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'fake', 'real'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: filter === f ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                background: filter === f ? '#eff6ff' : '#fff',
                color: filter === f ? '#1d4ed8' : '#374151',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              {f === 'all' ? '🔍 All' : f === 'fake' ? '⚠️ Suspicious' : '✅ Real'}
            </button>
          ))}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: '2px solid #e5e7eb', background: '#fff',
              color: '#374151', fontWeight: 600, fontSize: '0.875rem',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1, marginLeft: 'auto'
            }}
          >
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
          padding: '12px 16px', borderRadius: 8, marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p style={{ fontSize: '1.25rem', marginBottom: 8 }}>No articles found</p>
          <p>Try refreshing or changing the filter</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredArticles.map((article, index) => (
            <ArticleCard key={index} article={article} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Individual article card
 */
const ArticleCard = ({ article }) => {
  const isFake = article.analysis?.prediction === 'FAKE';
  const confidence = article.analysis?.confidence || 0;

  const borderColor = isFake ? '#ef4444' : '#22c55e';
  const bgColor = isFake ? '#fef2f2' : '#f0fdf4';
  const badgeColor = isFake ? '#991b1b' : '#166534';
  const badgeBg = isFake ? '#fecaca' : '#bbf7d0';

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `2px solid ${borderColor}20`,
      borderTop: `4px solid ${borderColor}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      {/* Badge */}
      <div style={{ background: bgColor, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          background: badgeBg, color: badgeColor,
          padding: '4px 10px', borderRadius: 12,
          fontSize: '0.75rem', fontWeight: 700
        }}>
          {isFake ? '⚠️ SUSPICIOUS' : '✅ CREDIBLE'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
          {confidence.toFixed(1)}% confidence
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
          {article.title}
        </h3>
        <p style={{ fontSize: '0.825rem', color: '#6b7280', lineHeight: 1.5, flex: 1, marginBottom: 12 }}>
          {article.description?.length > 150
            ? article.description.substring(0, 150) + '...'
            : article.description}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            📰 {article.source}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            {new Date(article.publishedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Flags */}
        {article.analysis?.details?.flags && article.analysis.details.flags.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {article.analysis.details.flags.slice(0, 2).map((flag, i) => (
              <span key={i} style={{
                fontSize: '0.7rem', background: '#f3f4f6', color: '#6b7280',
                padding: '2px 8px', borderRadius: 8
              }}>
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trending;
