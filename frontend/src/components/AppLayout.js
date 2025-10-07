import React, { useState } from 'react';
import '../styles/AboutPage.css';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

// Custom two-line hamburger icon
const TwoLineMenuIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect y="7" width="28" height="3.5" rx="1.75" fill="#222" />
    <rect y="17.5" width="20" height="3.5" rx="1.75" fill="#222" />
  </svg>
);

const AppLayout = ({ children }) => {
  const history = useHistory();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleGetStarted = () => {
    history.push('/get-started');
  };
  return (
    <div className="about-root">
      <header className="about-header">
        <button
          className="sidebar-toggle custom-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <TwoLineMenuIcon size={32} />
        </button>
        <div className="about-logo-brand">
          <FaMapMarkerAlt className="about-logo-icon" />
          <span className="about-brand">Voyalytics AI</span>
        </div>
        <nav className="about-nav">
          <a href="#for-creators">For Creators</a>
          <a href="#for-business">For Business</a>
          <a href="#get-inspired">Get Inspired</a>
          <button className="about-get-started" onClick={handleGetStarted}>Get started</button>
        </nav>
      </header>
      {/* Sidebar Drawer */}
      <div className={`sidebar-drawer${sidebarOpen ? ' open' : ''}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <span style={{fontSize: '2.2rem', lineHeight: 1}}>&times;</span>
        </button>
        <aside className="about-sidebar">
          <div className="about-sidebar-section">
            <h3>Company</h3>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#team">Team</a></li>
              <li><a href="#press">Press</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="about-sidebar-section">
            <h3>For Creators</h3>
            <ul>
              <li><a href="#become-creator">Become a Creator</a></li>
              <li><a href="#quiz">Take our travel quiz</a></li>
            </ul>
          </div>
          <div className="about-sidebar-section">
            <h3>For Business</h3>
            <ul>
              <li><a href="#overview">Overview</a></li>
              <li><a href="#packages">Packages</a></li>
              <li><a href="#demo">Book a demo</a></li>
            </ul>
          </div>
        </aside>
      </div>
      {/* Overlay when sidebar is open */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="about-main">
        {/* Hide static sidebar on small screens, show only in drawer */}
        <aside className="about-sidebar static-sidebar">
          <div className="about-sidebar-section">
            <h3>Company</h3>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#team">Team</a></li>
              <li><a href="#press">Press</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#help">Help</a></li>
            </ul>
          </div>
          <div className="about-sidebar-section">
            <h3>For Creators</h3>
            <ul>
              <li><a href="#become-creator">Become a Creator</a></li>
              <li><a href="#quiz">Take our travel quiz</a></li>
            </ul>
          </div>
          <div className="about-sidebar-section">
            <h3>For Business</h3>
            <ul>
              <li><a href="#overview">Overview</a></li>
              <li><a href="#packages">Packages</a></li>
              <li><a href="#demo">Book a demo</a></li>
            </ul>
          </div>
        </aside>
        <section className="about-content">
          {children}
        </section>
      </main>
      <footer className="about-footer">
        <span>© 2025 Voyalytics AI. Privacy Policy · Terms of Service</span>
      </footer>
    </div>
  );
};

export default AppLayout;
