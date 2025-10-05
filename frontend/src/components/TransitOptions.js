import React from 'react';
import dummyData from '../dummy_itinerary.json';
import useDirections from '../hooks/useDirections';

const TransitOptions = ({ transitModes }) => {
  // Fetch directions using the shared hook
  const directionsData = useDirections(dummyData.itinerary, transitModes);

  return (
    <div className="transit-options-container">
      <h2>Transit Options</h2>
      <p>Preferred modes: {transitModes.length ? transitModes.join(', ') : 'None selected'}</p>
      <ul>
        {directionsData.length === 0 && <li>Loading routes...</li>}
        {directionsData.map((route, idx) => (
          <li key={idx}>
            <strong>{route.origin}</strong> → <strong>{route.destination}</strong> via <em>{route.transitMode}</em><br />
            {route.error ? (
              <span style={{ color: 'red' }}>{route.error}</span>
            ) : (
              <>
                <span>Duration: {route.duration}</span>
                <ul>
                  {route.steps.map((step, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransitOptions;
