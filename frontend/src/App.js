import React, { useState, useEffect } from 'react';
import InputPage from './components/InputPage';
import LoadingScreen from './components/LoadingScreen';
import TransitAndMapView from './components/TransitAndMapView';

function App() {
  const [step, setStep] = useState('input');
  const [transitModes, setTransitModes] = useState([]);
  const [itineraryResult, setItineraryResult] = useState(null);

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

  return (
    <div className="App">
      {step === 'input' && <InputPage onPlanItinerary={handlePlanItinerary} />}
      {step === 'loading' && <LoadingScreen />}
      {step === 'map' && itineraryResult && (
          <TransitAndMapView transitModes={transitModes} itineraryResult={itineraryResult} />
      )}
    </div>
  );
}

export default App;