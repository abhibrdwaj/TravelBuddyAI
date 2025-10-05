import React, { useEffect, useRef, useState } from 'react';
import '../styles/ItineraryMap.css';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY'; // Replace with your key

const ItineraryMap = ({ itineraryResult }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const itinerary = itineraryResult?.base_plan?.legs || [];
  const dummyData = itineraryResult; // Use the passed itineraryResult directly

  // Load Google Maps script if not already loaded
  useEffect(() => {
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !window.google || !window.google.maps || !mapRef.current || !itinerary.length) return;

    // Helper: geocode address
    const geocodeAddress = (address) => {
      return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
          reject('Google Maps JS API not loaded.');
          return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            resolve({ lat: location.lat(), lng: location.lng() });
          } else {
            reject(`Geocoding failed: ${status}`);
          }
        });
      });
    };

    // Initialize map centered at first location
    geocodeAddress(itinerary[0].fromLocation).then(async (center) => {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Place markers
      let i = 0;
      const markerDataArr = await Promise.all(
        itinerary.map(async (item) => {
          if (item.fromLocation === item.toLocation) return null;
          const { lat, lng } = await geocodeAddress(item.fromLocation);
          return { item, lat, lng };
        })
      );

      markerDataArr.forEach((data) => {
        if (!data) return;
        const { item, lat, lng } = data;

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance,
          label: `${i + 1}`,
          title: item.fromLocation,
        });
        i++;

        const formatTime = (iso) => {
          if (!iso) return '';
          const d = new Date(iso);
          return isNaN(d.getTime()) ? iso : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        };

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div>
            ${item.departTime ? `<span style='color:#4a90e2;font-weight:500;'>Departs: ${formatTime(item.departTime)}</span><br/>` : ''}
            ${item.arriveTime ? `<span style='color:#4a90e2;font-weight:500;'>Arrives: ${formatTime(item.arriveTime)}</span><br/>` : ''}
            <strong>${item.fromLocation}</strong><br/>
            <span style='color:#388e3c;font-size:0.98em;'>${item.choiceReasoning || ''}</span>
            ${item.accessibilityNotes ? `<br/><span style='color:#4a90e2;font-size:0.95em;'>${item.accessibilityNotes}</span>` : ''}
          </div>`
        });

        marker.addListener('click', () => infoWindow.open(mapInstance, marker));
      });

      // Render transit directions
      for (let i = 0; i < itinerary.length - 1; i++) {
        const origin = await geocodeAddress(itinerary[i].fromLocation);
        const destination = await geocodeAddress(itinerary[i + 1].fromLocation);

        const ds = new window.google.maps.DirectionsService();
        const dr = new window.google.maps.DirectionsRenderer({
          map: mapInstance,
          suppressMarkers: true,
          preserveViewport: false,
          polylineOptions: { strokeWeight: 6, strokeColor: '#4285F4' },
        });

        let travelMode = (itinerary[i].mode === 'walk') ? 'WALKING' : 'TRANSIT';
        if (itinerary[i].mode !== 'walk' && itinerary[i].mode !== 'subway') continue;

        ds.route(
          {
            origin,
            destination,
            travelMode: window.google.maps.TravelMode[travelMode],
            ...(travelMode === 'TRANSIT'
              ? { transitOptions: { modes: [window.google.maps.TransitMode.SUBWAY] } }
              : {}),
          },
          (res, status) => {
            if (status !== 'OK' || !res?.routes?.length) return;
            dr.setDirections(res);
          }
        );
      }

      setMap(mapInstance);
    });
  }, [scriptLoaded, itinerary]);

  // Handle Read Itinerary button
  const handleReadItinerary = async () => {
    try {
      setIsReading(true);
      const response = await fetch('http://localhost:5000/tts/stream-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_plan: dummyData.base_plan }),
      });

      if (!response.ok) throw new Error('Failed to fetch TTS audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsReading(false);
      audio.play();
    } catch (err) {
      console.error(err);
      setIsReading(false);
    }
  };

  return (
    <div className="itinerary-map-container">
      {!scriptLoaded ? (
        <div className="map-loading">Loading map and itinerary...</div>
      ) : (
        <>
          <div ref={mapRef} className="map" />
          <button
            onClick={handleReadItinerary}
            disabled={isReading}
            style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
          >
            {isReading ? 'Reading...' : 'Read Itinerary'}
          </button>
        </>
      )}
    </div>
  );
};

export default ItineraryMap;