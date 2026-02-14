import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

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

/**
 * App Component
 * - Sets up React Router
 * - Navbar appears on all pages
 * - Routes: / (Home), /history (History), /login (Login)
 */
function App() {
  return (
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
  );
}

export default App;
