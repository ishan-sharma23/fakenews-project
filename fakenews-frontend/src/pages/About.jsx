import React from 'react';
import { Link } from 'react-router-dom';

/**
 * About Page
 * - Project overview and mission
 * - How it works section
 * - Technology stack
 */
const About = () => {
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Detection',
      description: 'Advanced machine learning models trained on thousands of verified news articles to identify misinformation patterns.'
    },
    {
      icon: '📊',
      title: 'Detailed Analysis',
      description: 'Get comprehensive reports including sentiment analysis, objectivity scores, and clickbait detection.'
    },
    {
      icon: '⚡',
      title: 'Real-Time Results',
      description: 'Instant analysis with results delivered in seconds, helping you make informed decisions quickly.'
    },
    {
      icon: '🔒',
      title: 'Privacy Focused',
      description: 'Your data is processed securely and we don\'t store any personal information without consent.'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Input Content',
      description: 'Paste article text, enter a URL, or upload a document containing the news you want to verify.'
    },
    {
      step: 2,
      title: 'AI Analysis',
      description: 'Our NLP model analyzes the content for linguistic patterns, sentiment, sources, and credibility indicators.'
    },
    {
      step: 3,
      title: 'Get Results',
      description: 'Receive a detailed report with prediction, confidence score, and specific flags for potential issues.'
    }
  ];

  return (
    <div className="page about-page">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1>About Fake News Detector</h1>
          <p className="about-subtitle">
            Empowering users to identify misinformation and make informed decisions 
            in the digital age using cutting-edge AI technology.
          </p>
        </div>

        {/* Mission Section */}
        <div className="about-section mission-section">
          <div className="mission-content">
            <h2>Our Mission</h2>
            <p>
              In an era of information overload, distinguishing fact from fiction has become 
              increasingly challenging. Fake News Detector was created to combat the spread of 
              misinformation by providing accessible, AI-powered tools that help users verify 
              the credibility of news content.
            </p>
            <p>
              We believe that everyone deserves access to accurate information, and our goal 
              is to promote media literacy while providing practical tools for news verification.
            </p>
          </div>
          <div className="mission-stats">
            <div className="stat-item">
              <span className="stat-number">85%+</span>
              <span className="stat-label">Accuracy Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Articles Analyzed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="about-section">
          <h2 className="section-title">Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="about-section how-it-works">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            {howItWorks.map((item) => (
              <div key={item.step} className="step-card">
                <div className="step-number">{item.step}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Section */}
        <div className="about-section tech-section">
          <h2 className="section-title">Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-item">
              <span className="tech-icon">⚛️</span>
              <span>React</span>
            </div>
            <div className="tech-item">
              <span className="tech-icon">🐍</span>
              <span>Python</span>
            </div>
            <div className="tech-item">
              <span className="tech-icon">🧠</span>
              <span>TensorFlow</span>
            </div>
            <div className="tech-item">
              <span className="tech-icon">📚</span>
              <span>NLP</span>
            </div>
            <div className="tech-item">
              <span className="tech-icon">🚀</span>
              <span>FastAPI</span>
            </div>
            <div className="tech-item">
              <span className="tech-icon">🗄️</span>
              <span>MongoDB</span>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="about-cta">
          <h2>Ready to Verify News?</h2>
          <p>Start analyzing articles now and help combat misinformation.</p>
          <div className="cta-buttons">
            <Link to="/" className="btn btn-primary">Try It Now</Link>
            <Link to="/team" className="btn btn-secondary">Meet The Team</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
