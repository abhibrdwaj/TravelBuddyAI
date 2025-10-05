import React from 'react';
import '../styles/LoadingScreen.css';

const LoadingScreen = ({ text = "itinerary" }) => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Loading your {text}...</p>
  </div>
);

export default LoadingScreen;
