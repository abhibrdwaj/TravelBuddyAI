import React, { useState, useEffect } from 'react';
import InputPage from './InputPage';
import LoadingScreen from './LoadingScreen';
import TransitAndMapView from './map-viewer/TransitAndMapView';

const GetStartedPage = () => {
  const [step, setStep] = useState('input');
  const [transitModes, setTransitModes] = useState([]);
  const [itineraryResult, setItineraryResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedModes = JSON.parse(localStorage.getItem('transitModes'));
    if (savedModes) setTransitModes(savedModes);
  }, []);

  const handlePlanItinerary = (nextStep, result) => {
    if (nextStep === 'loading') {
      setStep('loading');
    } else if (nextStep === 'map') {
      setStep('map');
      if (result) setItineraryResult(result);
    }
  };

  const handleReplan = (result) => {
    setLoading(false);
    setItineraryResult(result.optimized || result); // Use optimized result if available
    setStep('map');
  };

  const startReplanLoading = () => {
    setLoading(true);
    setStep('loading');
  };

  if (step === 'input') {
    return <InputPage onPlanItinerary={handlePlanItinerary} />;
  } else if (step === 'loading' || loading) {
    return <LoadingScreen message={step === 'loading' ? 'Planning your itinerary...' : 'Optimizing your itinerary...'} />;
  } else if (step === 'map') {
    return (
      <TransitAndMapView
        transitModes={transitModes}
        itineraryResult={itineraryResult}
        onReplan={handleReplan}
        startReplanLoading={startReplanLoading}
      />
    );
  } else {
    return null;
  }
};

export default GetStartedPage;
