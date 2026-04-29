import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component
 * - App title: "Fake News Detector"
 * - Navigation links: Home | Analyze | History | About | Team
 * - Login/Logout button based on auth state
 */
const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path;

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* App Title/Logo */}
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📰</span>
          Fake News Detector
        </Link>

        {/* Navigation Links (desktop) */}
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Home</Link>
          <Link to="/analyze" className={`nav-link ${isActive('/analyze') ? 'active' : ''}`}>Analyze</Link>
          <Link to="/trending" className={`nav-link ${isActive('/trending') ? 'active' : ''}`}>Trending</Link>
          <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>History</Link>
          <Link to="/about" className={`nav-link ${isActive('/about') ? 'active' : ''}`}>About</Link>
          <Link to="/team" className={`nav-link ${isActive('/team') ? 'active' : ''}`}>Developer</Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="mobile-toggle"
          onClick={() => setMenuOpen((s) => !s)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
        </button>

        {/* Mobile menu (visible on small screens) */}
        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={`mobile-link ${isActive('/') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/analyze" className={`mobile-link ${isActive('/analyze') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Analyze</Link>
          <Link to="/trending" className={`mobile-link ${isActive('/trending') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Trending</Link>
          <Link to="/history" className={`mobile-link ${isActive('/history') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>History</Link>
          <Link to="/about" className={`mobile-link ${isActive('/about') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/team" className={`mobile-link ${isActive('/team') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Developer</Link>
          {isAuthenticated ? (
            <button className="mobile-logout mobile-link" onClick={() => { handleLogout(); setMenuOpen(false); }}>
              Logout
            </button>
          ) : (
            <Link to="/login" className={`mobile-link mobile-login ${isActive('/login') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>Login</Link>
          )}
        </div>

        {/* Login/Logout Button */}
        {isAuthenticated ? (
          <div className="user-menu">
            <span className="user-name" style={{ marginRight: '1rem', color: '#fff' }}>
              👤 {user?.name || 'User'}
            </span>
            <button onClick={handleLogout} className="login-btn" style={{ background: '#dc3545' }}>
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="login-btn">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
