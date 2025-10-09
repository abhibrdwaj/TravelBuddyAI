import React from 'react';
import useDirections from '../../hooks/useDirections';
import '../../styles/map-viewer/TransitOptions.css'; // IGNORE

const TransitOptions = ({ transitModes, itineraryResult }) => {
  const directionsData = useDirections(itineraryResult.base_plan.legs, transitModes);

  return (
    <div className="transit-options-container">
      <h2 className="transit-title">Transit Options</h2>
      <div className="transit-modes-row">
        <span className="transit-modes-label">Preferred modes:</span>
        <span className="transit-modes-badges">
          {transitModes.length ? transitModes.map((mode, i) => (
            <span key={i} className={`transit-mode-badge transit-mode-${mode}`}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
          )) : <span className="transit-mode-badge transit-mode-none">None selected</span>}
        </span>
      </div>
      <ul className="transit-list">
        {directionsData.length === 0 && <li className="transit-loading">Loading routes...</li>}
        {directionsData.map((route, idx) => (
          <li key={idx} className="transit-leg-card">
            <div className="transit-leg-header">
              <span className="transit-leg-locations">
                <strong>{route.origin}</strong>
                <span className="transit-leg-arrow">→</span>
                <strong>{route.destination}</strong>
              </span>
              <span className="transit-leg-mode">{route.transitMode}</span>
            </div>
            {route.error ? (
              <span className="transit-error">{route.error}</span>
            ) : (
              <div className="transit-leg-details">
                <span className="transit-leg-duration">Duration: {route.duration}</span>
                <ul className="transit-steps-list">
                  {route.steps.map((step, i) => (
                    <li key={i} className="transit-step" dangerouslySetInnerHTML={{ __html: step }} />
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransitOptions;
