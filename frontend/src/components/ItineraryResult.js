import React from 'react';
import '../styles/InputPage.css';

const ItineraryResult = ({ result }) => {
  if (!result) return <div className="empty-result">No itinerary yet. Submit the form to get started.</div>;
  if (!result.ok) return <div className="result error">Error: {result.error}</div>;

  return (
    <div className="result success">
      <h3>Itinerary Preview</h3>
      <pre className="result-json">{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
};

export default ItineraryResult;
