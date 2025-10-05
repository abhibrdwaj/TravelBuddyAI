import React, { useEffect, useRef, useState } from 'react';
import '../styles/ItineraryMap.css';
import dummyData from '../dummy_itinerary.json';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY'; // Replace with your key

const ItineraryMap = () => {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState(null);

//   useEffect(() => {
//     // Mock loading for 3.5 seconds
//     const timer = setTimeout(() => setLoading(false), 3500);
//     return () => clearTimeout(timer);
//   }, []);

  useEffect(() => {
    if (!loading && window.google && window.google.maps && mapRef.current) {
      const center = {
        lat: dummyData.itinerary[0].latitude,
        lng: dummyData.itinerary[0].longitude,
      };
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
      });
      dummyData.itinerary.forEach((item, idx) => {
        const marker = new window.google.maps.Marker({
          position: { lat: item.latitude, lng: item.longitude },
          map: mapInstance,
          label: `${idx + 1}`,
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div><strong>${item.location_name}</strong><br/>${item.event_description}<br/><em>${item.event_type}</em><br/>${item.start_time} - ${item.end_time}</div>`
        });
        marker.addListener('click', () => infoWindow.open(mapInstance, marker));
      });
      setMap(mapInstance);
    }
  }, [loading]);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="itinerary-map-container">
      {loading ? (
        <div className="map-loading">Loading map and itinerary...</div>
      ) : (
        <div ref={mapRef} className="map" />
      )}
    </div>
  );
};

export default ItineraryMap;
