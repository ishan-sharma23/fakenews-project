import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page
 * - Login form with email and password
 * - Uses AuthContext for authentication
 */
const Login = () => {
  const navigate = useNavigate();
  const { login, googleLogin, isAuthenticated, loading, error: authError, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [localError, setLocalError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setLocalError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      navigate('/');
    }
  };

  // Handle Google OAuth success
  const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Google OAuth Success - Credential received');
    console.log('Credential length:', credentialResponse.credential?.length);
    
    const result = await googleLogin(credentialResponse.credential);
    
    if (result.success) {
      console.log('Navigation to home...');
      navigate('/');
    } else {
      console.error('Google login failed:', result.error);
      setLocalError(result.error || 'Google login failed. Please try again.');
    }
  };

  // Handle Google OAuth error
  const handleGoogleError = () => {
    console.error('Google OAuth Error - Button callback failed');
    setLocalError('Google login failed. Please check your Google Cloud Console configuration.');
  };

  const displayError = localError || authError;

  return (
    <div className="page login-page">
      <div className="login-container">
        {/* Login Card */}
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <span className="login-icon">🔐</span>
            <h1>Welcome Back</h1>
            <p>Sign in to your account</p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="error-message">
              {displayError}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#forgot" className="forgot-link">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className={`btn btn-primary btn-full ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* Social Login - Google OAuth */}
          <div className="social-login">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              size="large"
              width={400}
              text="continue_with"
              shape="rectangular"
            />
          </div>

          {/* Sign Up Link */}
          <p className="signup-link">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
