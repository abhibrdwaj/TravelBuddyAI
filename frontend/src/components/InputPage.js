import React, { useState, useEffect, useRef } from 'react';
import '../styles/InputPage.css';

const InputPage = () => {
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [transportMode, setTransportMode] = useState(['subways']);
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [tripDuration, setTripDuration] = useState('');
    const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
    
    const startLocationRef = useRef(null);
    const endLocationRef = useRef(null);
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            startLocation,
            endLocation,
            transportMode,
            startTime,
            tripDuration,
            wheelchairAccessible,
        };

        const response = await fetch('http://localhost:5000/api/itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Success:', result);
        } else {
            console.error('Error:', response.statusText);
        }
    };

    // Load Google Maps API
    useEffect(() => {
        const loadGoogleMapsAPI = () => {
            if (window.google && window.google.maps) {
                setIsGoogleMapsLoaded(true);
                initializeAutocomplete();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                setIsGoogleMapsLoaded(true);
                initializeAutocomplete();
            };
            document.head.appendChild(script);
        };

        loadGoogleMapsAPI();
    }, []);

    const initializeAutocomplete = () => {
        if (window.google && startLocationRef.current && endLocationRef.current) {
            // Initialize autocomplete for start location
            const startAutocomplete = new window.google.maps.places.Autocomplete(
                startLocationRef.current,
                { types: ['geocode'], componentRestrictions: { country: 'us' } }
            );
            
            startAutocomplete.addListener('place_changed', () => {
                const place = startAutocomplete.getPlace();
                if (place.formatted_address) {
                    setStartLocation(place.formatted_address);
                }
            });

            // Initialize autocomplete for end location
            const endAutocomplete = new window.google.maps.places.Autocomplete(
                endLocationRef.current,
                { types: ['geocode'], componentRestrictions: { country: 'us' } }
            );
            
            endAutocomplete.addListener('place_changed', () => {
                const place = endAutocomplete.getPlace();
                if (place.formatted_address) {
                    setEndLocation(place.formatted_address);
                }
            });
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // Check if Google Maps API is loaded before using reverse geocoding
                    if (window.google && window.google.maps && window.google.maps.Geocoder) {
                        const geocoder = new window.google.maps.Geocoder();
                        const latlng = { lat: latitude, lng: longitude };
                        
                        geocoder.geocode({ location: latlng }, (results, status) => {
                            if (status === 'OK' && results[0]) {
                                setStartLocation(results[0].formatted_address);
                            } else {
                                console.error('Geocoder failed due to: ' + status);
                                setStartLocation(`${latitude}, ${longitude}`);
                            }
                        });
                    } else {
                        // If Google Maps isn't loaded yet, wait a bit and try again
                        setTimeout(() => {
                            if (window.google && window.google.maps && window.google.maps.Geocoder) {
                                const geocoder = new window.google.maps.Geocoder();
                                const latlng = { lat: latitude, lng: longitude };
                                
                                geocoder.geocode({ location: latlng }, (results, status) => {
                                    if (status === 'OK' && results[0]) {
                                        setStartLocation(results[0].formatted_address);
                                    } else {
                                        setStartLocation(`${latitude}, ${longitude}`);
                                    }
                                });
                            } else {
                                // Fallback to coordinates if Google Maps still not loaded
                                setStartLocation(`${latitude}, ${longitude}`);
                            }
                        }, 1000);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Unable to retrieve your location: ' + error.message);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    const handleTransportModeChange = (mode) => {
        setTransportMode(prev => {
            if (prev.includes(mode)) {
                // Remove the mode if it's already selected
                return prev.filter(m => m !== mode);
            } else {
                // Add the mode if it's not selected
                return [...prev, mode];
            }
        });
    };

    return (
        <div className="input-page">
            <h1>TravelBuddyAI</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    Start Location:
                    <div className="location-input-container">
                        <input
                            ref={startLocationRef}
                            type="text"
                            value={startLocation}
                            onChange={(e) => setStartLocation(e.target.value)}
                            placeholder="Search for a location..."
                            required
                        />
                        <button type="button" onClick={handleGetLocation} className="location-btn">
                            Use Current Location
                        </button>
                    </div>
                </label>
                <label>
                    End Location:
                    <input
                        ref={endLocationRef}
                        type="text"
                        value={endLocation}
                        onChange={(e) => setEndLocation(e.target.value)}
                        placeholder="Search for destination..."
                    />
                </label>
                <label>
                    Mode of Transport:
                    <div className="transport-mode-container">
                        {['subways', 'buses', 'taxis', 'e-bikes', 'walking'].map((mode) => (
                            <label key={mode} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={transportMode.includes(mode)}
                                    onChange={() => handleTransportModeChange(mode)}
                                />
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </label>
                        ))}
                    </div>
                </label>
                <label>
                    Start Time:
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                </label>
                <label>
                    Trip Duration (in minutes):
                    <input
                        type="number"
                        value={tripDuration}
                        onChange={(e) => setTripDuration(e.target.value)}
                    />
                </label>
                <label>
                    Wheelchair Accessible:
                    <input
                        type="checkbox"
                        checked={wheelchairAccessible}
                        onChange={(e) => setWheelchairAccessible(e.target.checked)}
                    />
                </label>
                <button type="submit">Plan Itinerary</button>
            </form>
        </div>
    );
};

export default InputPage;