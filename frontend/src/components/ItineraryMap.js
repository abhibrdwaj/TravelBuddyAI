import React, { useEffect, useRef, useState } from 'react';
import '../styles/ItineraryMap.css';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY'; // Replace with your key

const ItineraryMap = ({ itineraryResult }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const itinerary = itineraryResult.base_plan.legs;

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

    // Helper to get lat/lng from address
    function geocodeAddress(address) {
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
    }

    // Center on first location using geocoding
    geocodeAddress(itinerary[0].fromLocation).then(center => {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        mapTypeControl: false,
        streetViewControl: false,
      });

      // Helper to get lat/lng from address (already defined above)
      let i = 0;
      Promise.all(itinerary.map(item => {
        let itStop = item.fromLocation == item.toLocation;
        if (itStop) return null;
        // Get lat/lng from address
        return geocodeAddress(item.fromLocation).then(({ lat, lng }) => ({ item, lat, lng }));
      })).then(markerDataArr => {
        markerDataArr.forEach((data, idx) => {
          if (!data) return;
          const { item, lat, lng } = data;
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            label: `${i + 1}`,
            title: item.fromLocation,
          });
          i++;

          // Format ISO time to readable format
          function formatTime(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return iso;
            return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
          }
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div>
              ${item.departTime || item.departureTime ? `<span style='color:#4a90e2;font-weight:500;'>Departs: ${formatTime(item.departTime || item.departureTime)}</span><br/>` : ''}
              ${item.arriveTime || item.arrivalTime ? `<span style='color:#4a90e2;font-weight:500;'>Arrives: ${formatTime(item.arriveTime || item.arrivalTime)}</span><br/>` : ''}
              <strong>${item.fromLocation}</strong><br/>
              <span style='color:#388e3c;font-size:0.98em;'>${item.choiceReasoning || ''}</span>
              ${item.accessibilityNotes ? `<br/><span style='color:#4a90e2;font-size:0.95em;'>${item.accessibilityNotes}</span>` : ''}
            </div>`
          });
          marker.addListener('click', () => infoWindow.open(mapInstance, marker));
        });
      });

      // Request and render transit directions for each leg
      (async () => {
        for (let i = 0; i < itinerary.length - 1; i++) {
          // Get origin and destination lat/lng from address
          const origin = await geocodeAddress(itinerary[i].fromLocation);
          const destination = await geocodeAddress(itinerary[i + 1].fromLocation);
          const ds = new window.google.maps.DirectionsService();
          const dr = new window.google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: { strokeWeight: 6, strokeColor: '#4285F4' }
          });
          if (itinerary[i].mode !== 'walk' && itinerary[i].mode !== 'subway') continue;
          let travelMode = (itinerary[i].mode == 'walk') ? 'WALKING' : 'TRANSIT';
          ds.route(
            {
              origin,
              destination,
              travelMode: window.google.maps.TravelMode[travelMode],
              ...(travelMode === 'TRANSIT' ? {
                transitOptions: {
                  modes: [window.google.maps.TransitMode.SUBWAY]
                }
              } : {})
            },
            (res, status) => {
              if (status !== 'OK' || !res || !res.routes || !res.routes.length) return;
              const routeToShow = res.routes[0];
              // Validate routeToShow structure
              if (
                routeToShow &&
                Array.isArray(routeToShow.legs) &&
                routeToShow.legs.length > 0 &&
                routeToShow.legs.every(leg =>
                  Array.isArray(leg.steps) &&
                  leg.steps.every(s => typeof s.travel_mode === 'string')
                )
              ) {
                dr.setDirections({
                  geocoded_waypoints: res.geocoded_waypoints,
                  routes: [routeToShow],
                  request: {
                    origin,
                    destination,
                    travelMode: travelMode,
                    ...(travelMode === 'TRANSIT' ? {
                      transitOptions: {
                        modes: [window.google.maps.TransitMode.SUBWAY]
                      }
                    } : {})
                  }
                });
              } else {
                console.error('Invalid route structure:', routeToShow);
              }
            }
          );
        }
      })();

      setMap(mapInstance);
    });
  }, [scriptLoaded, itinerary]);

  return (
    <div className="itinerary-map-container">
      {!scriptLoaded ? (
        <div className="map-loading">Loading map and itinerary...</div>
      ) : (
        <div ref={mapRef} className="map" />
      )}
    </div>
  );
};

export default ItineraryMap;
