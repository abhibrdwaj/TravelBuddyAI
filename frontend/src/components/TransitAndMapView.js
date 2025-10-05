import React from 'react';
import ItineraryMap from './ItineraryMap';
import TransitOptions from './TransitOptions';
import '../styles/TransitAndMapView.css';

const TransitAndMapView = ({ transitModes }) => (
  <div className="itinerary-transit-row">
    <div className="itinerary-map-side">
      <ItineraryMap />
    </div>
    <div className="transit-options-side">
      <TransitOptions transitModes={transitModes} />
    </div>
  </div>
);

export default TransitAndMapView;