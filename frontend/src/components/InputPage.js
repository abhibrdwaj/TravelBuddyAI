import React, { useState, useEffect, useRef } from 'react';
import '../styles/InputPage.css';
import ItineraryResult from './ItineraryResult';

const TRANSPORT_OPTIONS = ['subways', 'buses', 'taxis', 'e-bikes', 'walking'];

const InputPage = () => {
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [transportMode, setTransportMode] = useState(['subways']);
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState('');
    const [tripDuration, setTripDuration] = useState('');
    const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
    const [result, setResult] = useState(null);

    const startLocationRef = useRef(null);
    const endLocationRef = useRef(null);

    useEffect(() => {
        const loadGoogleMapsAPI = () => {
            if (window.google && window.google.maps) {
                initializeAutocomplete();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBDnnTPHM5G7-HoKmR2-w1Mz_UBCn3cTBY&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = initializeAutocomplete;
            document.head.appendChild(script);
        };

        loadGoogleMapsAPI();
    }, []);

    const initializeAutocomplete = () => {
        try {
            if (window.google && startLocationRef.current && endLocationRef.current) {
                const startAutocomplete = new window.google.maps.places.Autocomplete(
                    startLocationRef.current,
                    { types: ['geocode'], componentRestrictions: { country: 'us' } }
                );
                startAutocomplete.addListener('place_changed', () => {
                    const place = startAutocomplete.getPlace();
                    if (place && place.formatted_address) setStartLocation(place.formatted_address);
                });

                const endAutocomplete = new window.google.maps.places.Autocomplete(
                    endLocationRef.current,
                    { types: ['geocode'], componentRestrictions: { country: 'us' } }
                );
                endAutocomplete.addListener('place_changed', () => {
                    const place = endAutocomplete.getPlace();
                    if (place && place.formatted_address) setEndLocation(place.formatted_address);
                });
            }
        } catch (err) {
            // ignore silently if Google Maps not available yet
            // console.warn('Autocomplete not available yet', err);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (window.google && window.google.maps && window.google.maps.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();
                    const latlng = { lat: latitude, lng: longitude };
                    geocoder.geocode({ location: latlng }, (results, status) => {
                        if (status === 'OK' && results[0]) setStartLocation(results[0].formatted_address);
                        else setStartLocation(`${latitude}, ${longitude}`);
                    });
                } else {
                    setStartLocation(`${latitude}, ${longitude}`);
                }
            },
            (error) => alert('Unable to retrieve your location: ' + (error.message || error))
        );
    };

    const handleTransportModeChange = (mode) => {
        setTransportMode((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            start_location: startLocation,
            end_location: endLocation,
            mode_of_transport: transportMode,
            start_time: startTime,
            end_time: endTime,
            trip_duration: tripDuration,
            wheelchair_accessible: wheelchairAccessible,
        };

        try {
            const response = await fetch('http://localhost:5000/api/itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const json = await response.json();
                setResult({ ok: true, data: json });
            } else {
                const text = await response.text();
                setResult({ ok: false, error: text || response.statusText });
            }
        } catch (err) {
            setResult({ ok: false, error: String(err) });
        }
    };

    const handleClear = () => {
        setStartLocation('');
        setEndLocation('');
        setTransportMode(['subways']);
        setStartTime(new Date().toISOString().slice(0, 16));
        setEndTime('');
        setTripDuration('');
        setWheelchairAccessible(false);
        setResult(null);
    };

    return (
        <div className="input-page">
            <div className="card">
                <header className="card-header">
                    <h1>TravelBuddyAI</h1>
                    <p className="subtitle">Plan accessible, multi-modal itineraries quickly</p>
                </header>

                <form className="form-grid" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label className="label">Start Location</label>
                        <div className="location-input-container">
                            <input
                                ref={startLocationRef}
                                type="text"
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                                placeholder="Search for a location..."
                                required
                            />
                            <button type="button" onClick={handleGetLocation} className="location-btn small">
                                Use Current
                            </button>
                        </div>
                    </div>

                    <div className="form-row">
                        <label className="label">End Location</label>
                        <input
                            ref={endLocationRef}
                            type="text"
                            value={endLocation}
                            onChange={(e) => setEndLocation(e.target.value)}
                            placeholder="Search for destination..."
                        />
                    </div>

                    <div className="form-row">
                        <label className="label">Mode of Transport</label>
                        <div className="transport-mode-container">
                            {TRANSPORT_OPTIONS.map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => handleTransportModeChange(mode)}
                                    className={`transport-pill ${transportMode.includes(mode) ? 'active' : ''}`}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-row">
                        <label className="label">Start Time</label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>

                    <div className="form-row">
                        <label className="label">Trip Duration (hours)</label>
                        <input type="number" min="0" step="0.5" value={tripDuration} onChange={(e) => setTripDuration(e.target.value)} placeholder="e.g. 2.5" />
                    </div>

                    <div className="form-row">
                        <label className="label">End Time (optional)</label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>

                    <div className="form-row checkbox-row">
                        <label className="label">Wheelchair Accessible</label>
                        <input type="checkbox" checked={wheelchairAccessible} onChange={(e) => setWheelchairAccessible(e.target.checked)} />
                    </div>

                    <div className="form-actions">
                        <button className="primary" type="submit">Plan Itinerary</button>
                        <button type="button" className="muted" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                <div className="result-area">
                    <ItineraryResult result={result} />
                </div>
            </div>
        </div>
    );
};

export default InputPage;