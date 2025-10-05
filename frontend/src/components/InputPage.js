import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaWheelchair, FaUtensils, FaLeaf, FaHiking, FaMoneyBillWave } from 'react-icons/fa';
import '../styles/InputPage.css';
import LoadingScreen from './LoadingScreen';

const InputPage = ({ onPlanItinerary }) => {
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [transportMode, setTransportMode] = useState(['subways']);
    const [startTime, setStartTime] = useState(getLocalDateTimeString());
    const [endTime, setEndTime] = useState('');
    const [tripDuration, setTripDuration] = useState('');
    const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [cuisines, setCuisines] = useState('');
    const [dietPreferences, setDietPreferences] = useState('');
    const [activityPreferences, setActivityPreferences] = useState('');
    const [budgetPreferences, setBudgetPreferences] = useState('');
    
    const startLocationRef = useRef(null);
    const endLocationRef = useRef(null);
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (onPlanItinerary) onPlanItinerary('loading'); // Explicitly set loading step
        const data = {
            startLocation,
            endLocation,
            transportMode,
            startTime,
            endTime,
            tripDuration,
            wheelchairAccessible,
            cuisines,
            dietPreferences,
            activityPreferences,
            budgetPreferences
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/itinerary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                setLoading(false);
                if (onPlanItinerary) onPlanItinerary('map', result); // Pass result to next step
            } else {
                setLoading(false);
                console.error('Error:', response.statusText);
            }
        } catch (err) {
            setLoading(false);
            console.error('Network error:', err);
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
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
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

    // Persist transportMode to localStorage
    useEffect(() => {
        localStorage.setItem('transitModes', JSON.stringify(transportMode));
    }, [transportMode]);

    return (
        <div className="input-page">
            <h1 className="input-title">
                <FaMapMarkerAlt className="branding-icon" /> TravelBuddyAI
            </h1>
            <h2 className="input-subheader">Your sustainable budget friendly Travel Assistant</h2>
            {loading ? (
                <LoadingScreen />
            ) : (
                <form className="input-form-card" onSubmit={handleSubmit}>
                    <div className="input-row">
                        <label><FaMapMarkerAlt /> Start Location:</label>
                        <div className="location-input-container">
                            <input
                                ref={startLocationRef}
                                type="text"
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                                placeholder="Search for a location..."
                                required
                                className="input-text"
                            />
                            <div className="tooltip-container">
                                <button type="button" onClick={handleGetLocation} className="location-btn">
                                    <FaMapMarkerAlt style={{ marginRight: 4 }} />
                                </button>
                                <span className="custom-tooltip">Use Current location (permission required)</span>
                            </div>
                        </div>
                    </div>
                    <div className="input-row">
                        <label><FaMapMarkerAlt /> End Location:</label>
                        <input
                            ref={endLocationRef}
                            type="text"
                            value={endLocation}
                            onChange={(e) => setEndLocation(e.target.value)}
                            placeholder="Search for destination..."
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label>Mode of Transport:</label>
                        <div className="transport-mode-container">
                            {['subways', 'buses', 'driving', 'cycling', 'walking'].map((mode) => (
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
                    </div>
                    <div className="input-row">
                        <label>Start Time:</label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label>Trip Duration (in hours):</label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={tripDuration}
                            onChange={(e) => setTripDuration(e.target.value)}
                            placeholder="e.g. 2.5"
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label>End Time (optional):</label>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label><FaUtensils /> Cuisines (optional):</label>
                        <input
                            type="text"
                            value={cuisines}
                            onChange={(e) => setCuisines(e.target.value)}
                            placeholder="e.g. Italian, Chinese"
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label><FaLeaf /> Diet Preferences (optional):</label>
                        <input
                            type="text"
                            value={dietPreferences}
                            onChange={(e) => setDietPreferences(e.target.value)}
                            placeholder="e.g. Vegetarian, Gluten-Free"
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label><FaHiking /> Activity Preferences (optional):</label>
                        <input
                            type="text"
                            value={activityPreferences}
                            onChange={(e) => setActivityPreferences(e.target.value)}
                            placeholder="e.g. Sightseeing, Hiking"
                            className="input-text"
                        />
                    </div>
                    <div className="input-row">
                        <label><FaMoneyBillWave /> Budget Preferences (optional):</label>
                        <input
                            type="text"
                            value={budgetPreferences}
                            onChange={(e) => setBudgetPreferences(e.target.value)}
                            placeholder="e.g. $100 - $300"
                            className="input-text"
                        />
                    </div>
                    <div className="input-row input-row-checkbox">
                        <label><FaWheelchair /> Wheelchair Accessible:</label>
                        <input
                            type="checkbox"
                            checked={wheelchairAccessible}
                            onChange={(e) => setWheelchairAccessible(e.target.checked)}
                        />
                    </div>
                    <div className="input-row">
                        <button type="submit" className="input-submit-btn">Plan Itinerary</button>
                    </div>
                </form>
            )}
        </div>
    );
};

const getLocalDateTimeString = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
};

export default InputPage;