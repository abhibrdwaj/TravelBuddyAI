import React, { useEffect, useRef, useState } from 'react';
import '../styles/ItineraryMap.css';
import dummyData from '../dummy_itinerary.json';
import useDirections from '../hooks/useDirections';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY'; // Replace with your key

const transitModes = ['subways', 'buses', 'walking', 'taxis', 'e-bikes']; // Example, replace with user selection if needed
// ...existing imports and setup...

const ItineraryMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const itinerary = dummyData.itinerary;

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
    if (!scriptLoaded || !window.google || !window.google.maps || !mapRef.current) return;

    // Center on first location
    const center = {
      lat: itinerary[0].latitude,
      lng: itinerary[0].longitude,
    };
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center,
      mapTypeControl: false,
      streetViewControl: false,
    });

    // Add markers and info windows
    itinerary.forEach((item, idx) => {
      const marker = new window.google.maps.Marker({
        position: { lat: item.latitude, lng: item.longitude },
        map: mapInstance,
        label: `${idx + 1}`,
        title: item.location_name,
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div><strong>${item.location_name}</strong><br/>${item.event_description}<br/><em>${item.event_type}</em><br/>${item.start_time} - ${item.end_time}</div>`
      });
      marker.addListener('click', () => infoWindow.open(mapInstance, marker));
    });

    // Request and render transit directions for first leg
    if (itinerary.length > 1) {
      const origin = { lat: itinerary[0].latitude, lng: itinerary[0].longitude };
      const dest = { lat: itinerary[1].latitude, lng: itinerary[1].longitude };
      const ds = new window.google.maps.DirectionsService();
      const dr = new window.google.maps.DirectionsRenderer({
        map: mapInstance,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeWeight: 6, strokeColor: '#4285F4' }
      });

      ds.route(
        {
          origin,
          destination: dest,
          travelMode: 'TRANSIT',
          provideRouteAlternatives: true,
          transitOptions: {
            modes: [window.google.maps.TransitMode.SUBWAY, window.google.maps.TransitMode.BUS],
            routingPreference: window.google.maps.TransitRoutePreference.LESS_WALKING
          }
        },
        (res, status) => {
          if (status !== 'OK' || !res || !res.routes || !res.routes.length) return;
          // Find a route that actually uses transit
          const transitIdx = res.routes.findIndex(r =>
            r.legs && r.legs.some(leg =>
              leg.steps && leg.steps.some(s =>
                s.travel_mode === 'TRANSIT' &&
                (s.transit?.line?.vehicle?.type === 'SUBWAY' || s.transit?.line?.vehicle?.type === 'BUS')
              )
            )
          );
          const routeToShow = transitIdx >= 0 ? res.routes[transitIdx] : res.routes[0];
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
                destination: dest,
                travelMode: window.google.maps.TravelMode.TRANSIT,
                transitOptions: {
                  modes: [window.google.maps.TransitMode.SUBWAY, window.google.maps.TransitMode.BUS],
                  routingPreference: window.google.maps.TransitRoutePreference.LESS_WALKING
                }
              }
            });
          } else {
            console.error('Invalid route structure:', routeToShow);
          }
        }
      );
    }

    setMap(mapInstance);
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
