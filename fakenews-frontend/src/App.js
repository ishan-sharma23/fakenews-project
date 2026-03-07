import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';

// Import AuthProvider
import { AuthProvider } from './context/AuthContext';

// Import components
import Navbar from './components/Navbar';

// Import pages
import Home from './pages/Home';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import Team from './pages/Team';
import Analyze from './pages/Analyze';
import About from './pages/About';
import Trending from './pages/Trending';

// Google OAuth Client ID (from environment variables)
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

/**
 * App Component
 * - Sets up React Router
 * - Wraps with Google OAuth Provider
 * - Navbar appears on all pages
 * - Routes: / (Home), /history (History), /login (Login)
 */
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <div className="App">
            {/* Navbar - appears on all pages */}
            <Navbar />
            
            {/* Main content area */}
            <main className="main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/history" element={<History />} />
                <Route path="/about" element={<About />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/team" element={<Team />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="footer">
              <p>© 2024 Fake News Detector | Built for a safer digital space</p>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
