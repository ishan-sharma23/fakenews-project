import React from 'react';
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

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path;

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* App Title/Logo */}
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📰</span>
          Fake News Detector
        </Link>

        {/* Navigation Links */}
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/analyze" 
            className={`nav-link ${isActive('/analyze') ? 'active' : ''}`}
          >
            Analyze
          </Link>
          <Link 
            to="/history" 
            className={`nav-link ${isActive('/history') ? 'active' : ''}`}
          >
            History
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
          >
            About
          </Link>
          <Link 
            to="/team" 
            className={`nav-link ${isActive('/team') ? 'active' : ''}`}
          >
            Team
          </Link>
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
