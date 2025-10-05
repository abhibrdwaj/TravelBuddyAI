import React, { useEffect, useRef, useState } from 'react';
import '../styles/ItineraryMap.css';
import dummyData from '../dummy2.json';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY'; // Replace with your key

const transitModes = ['subways', 'buses', 'walking', 'taxis', 'e-bikes']; // Example, replace with user selection if needed
// ...existing imports and setup...

const ItineraryMap = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const itinerary = dummyData.legs;

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
      lat: itinerary[0].fromLat,
      lng: itinerary[0].fromLng,
    };
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center,
      mapTypeControl: false,
      streetViewControl: false,
    });

    // Add markers and info windows
    let i = 0;
    itinerary.forEach((item, idx) => {
        if (item.fromLocation == item.toLocation) return;
        const marker = new window.google.maps.Marker({
            position: { lat: item.fromLat, lng: item.fromLng },
            map: mapInstance,
            label: `${i + 1}`,
            title: item.fromLocation,
        });
        i++;
        const infoWindow = new window.google.maps.InfoWindow({
            content: `<div><strong>${item.fromLocation}</strong>`
        });
        marker.addListener('click', () => infoWindow.open(mapInstance, marker));
    });

    // Request and render transit directions for first leg
    for (let i = 0; i < itinerary.length - 1; i++) {
        const origin = { lat: itinerary[i].fromLat, lng: itinerary[i].fromLng };
        const destination = { lat: itinerary[i + 1].fromLat, lng: itinerary[i + 1].fromLng };
        const ds = new window.google.maps.DirectionsService();
        const dr = new window.google.maps.DirectionsRenderer({
            map: mapInstance,
            suppressMarkers: true,
            preserveViewport: false,
            polylineOptions: { strokeWeight: 6, strokeColor: '#4285F4' }
        });
      
        if (itinerary[i].mode !== 'walking' && itinerary[i].mode !== 'subways') continue;
        let travelMode = itinerary[i].mode == 'walking' ? 'WALKING' : 'TRANSIT';

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
