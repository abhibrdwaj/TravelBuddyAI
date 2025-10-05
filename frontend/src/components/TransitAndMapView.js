import React from 'react';
import ItineraryMap from './ItineraryMap';
import TransitOptions from './TransitOptions';
import '../styles/TransitAndMapView.css';

const TransitAndMapView = ({ transitModes, itineraryResult }) => (
  <div className="itinerary-transit-row">
    <div className="itinerary-map-side">
      <ItineraryMap itineraryResult={itineraryResult} />
    </div>
    <div className="transit-options-side">
      <TransitOptions transitModes={transitModes} itineraryResult={itineraryResult} />
    </div>
  </div>
);

export default TransitAndMapView;