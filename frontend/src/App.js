import React, { useState, useEffect } from 'react';
import InputPage from './components/InputPage';
import LoadingScreen from './components/LoadingScreen';
import TransitAndMapView from './components/TransitAndMapView';

function App() {
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

  return (
    <div className="App">
      {step === 'input' && <InputPage onPlanItinerary={handlePlanItinerary} />}
      {(step === 'loading' || loading) && (
        <LoadingScreen text={loading ? "optimized plan" : "initial plan"} />
      )}
      {step === 'map' && itineraryResult && (
        <TransitAndMapView
          transitModes={transitModes}
          itineraryResult={itineraryResult}
          onReplan={handleReplan}
          startReplanLoading={startReplanLoading}
        />
      )}
    </div>
  );
}

export default App;