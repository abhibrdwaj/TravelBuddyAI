import React, { useState, useEffect, useRef } from 'react';
import '../styles/InputPage.css';
import LoadingScreen from './LoadingScreen';

const InputPage = ({ onPlanItinerary }) => {
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [transportMode, setTransportMode] = useState(['subways']);
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
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
        };

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
            console.log('Success:', result);
            if (onPlanItinerary) onPlanItinerary();
        } else {
            setLoading(false);
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

    // Persist transportMode to localStorage
    useEffect(() => {
        localStorage.setItem('transitModes', JSON.stringify(transportMode));
    }, [transportMode]);

    return (
        <div className="input-page">
            <h1>TravelBuddyAI</h1>
            {loading ? (
                <LoadingScreen />
            ) : (
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
                        Trip Duration (in hours):
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={tripDuration}
                            onChange={(e) => setTripDuration(e.target.value)}
                            placeholder="e.g. 2.5"
                        />
                    </label>
                    <label>
                        End Time (optional):
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </label>
                    <label>
                        Cuisines (optional):
                        <input
                            type="text"
                            value={cuisines}
                            onChange={(e) => setCuisines(e.target.value)}
                            placeholder="e.g. Italian, Chinese"
                        />
                    </label>
                    <label>
                        Diet Preferences (optional):
                        <input
                            type="text"
                            value={dietPreferences}
                            onChange={(e) => setDietPreferences(e.target.value)}
                            placeholder="e.g. Vegetarian, Gluten-Free"
                        />
                    </label>
                    <label>
                        Activity Preferences (optional):
                        <input
                            type="text"
                            value={activityPreferences}
                            onChange={(e) => setActivityPreferences(e.target.value)}
                            placeholder="e.g. Sightseeing, Hiking"
                        />
                    </label>
                    <label>
                        Budget Preferences (optional):
                        <input
                            type="text"
                            value={budgetPreferences}
                            onChange={(e) => setBudgetPreferences(e.target.value)}
                            placeholder="e.g. $100 - $300"
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
            )}
        </div>
    );
};

export default InputPage;