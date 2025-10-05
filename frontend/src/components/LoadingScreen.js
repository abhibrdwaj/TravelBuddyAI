import React from 'react';
import '../styles/LoadingScreen.css';

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Loading your optimized itinerary...</p>
  </div>
);

export default LoadingScreen;
