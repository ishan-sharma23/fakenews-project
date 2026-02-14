import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Navbar Component
 * - App title: "Fake News Detector"
 * - Navigation links: Home | History
 * - Login button on the right side
 */
const Navbar = () => {
  const location = useLocation();

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path;

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

        {/* Login Button */}
        <Link to="/login" className="login-btn">
          Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
