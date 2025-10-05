import React, { useState } from 'react';
import ItineraryMap from './ItineraryMap';
import TransitOptions from './TransitOptions';
import '../styles/TransitAndMapView.css';

const TransitAndMapView = ({ transitModes, itineraryResult, onReplan, startReplanLoading }) => {
  const [optimizeWeather, setOptimizeWeather] = useState(false);
  const [budget, setBudget] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReplanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (startReplanLoading) startReplanLoading(); // Show loading in parent
    // Prepare payload for backend
    const payload = {
      signal: {
        weather: optimizeWeather ? itineraryResult.weather_overlay : null,
        tripBudgetUSD: budget,
        user_notes: preferences
      },
      itinerary: itineraryResult
    };
    try {
      const response = await fetch('http://127.0.0.1:5000/api/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const result = await response.json();
        setLoading(false);
        if (onReplan) onReplan(result); // Pass result to parent
      } else {
        setLoading(false);
        alert('Error replanning itinerary.');
      }
    } catch (err) {
      setLoading(false);
      alert('Network error while replanning.');
    }
  };

  return (
    <>
      <div className="itinerary-transit-row">
        <div className="itinerary-map-side">
          <ItineraryMap itineraryResult={itineraryResult} />
        </div>
        <div className="transit-options-side">
          <TransitOptions transitModes={transitModes} itineraryResult={itineraryResult} />
        </div>
      </div>
      <div className='transit-optimizer'>
        <form className="options-box" onSubmit={handleReplanSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label>
              <input
                type="checkbox"
                checked={optimizeWeather}
                onChange={e => setOptimizeWeather(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Optimize Based on Weather
            </label>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label>
              Budget:
              <input
                type="text"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="Enter New budget"
                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>
          </div>
          <div>
            <label>
              Additional Preferences:
              <input
                type="text"
                value={preferences}
                onChange={e => setPreferences(e.target.value)}
                placeholder="e.g. vegan food, museums, or any other preferences"
                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', width: '60%' }}
              />
            </label>
          </div>
          <button type="submit" className="replan-btn" disabled={loading} style={{ marginTop: '18px' }}>
            {loading ? 'Replanning...' : 'Replan Based on Weather'}
          </button>
        </form>
      </div>
    </>
  );
};

export default TransitAndMapView;