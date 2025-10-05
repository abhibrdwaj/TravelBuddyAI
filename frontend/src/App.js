import React, { useState, useEffect } from 'react';
import InputPage from './components/InputPage';
import LoadingScreen from './components/LoadingScreen';
import ItineraryMap from './components/ItineraryMap';
import TransitOptions from './components/TransitOptions';
import dummyData from './dummy_itinerary.json';

function App() {
  const [step, setStep] = useState('input');
  const [transitModes, setTransitModes] = useState([]);

  useEffect(() => {
    const savedModes = JSON.parse(localStorage.getItem('transitModes'));
    if (savedModes) setTransitModes(savedModes);
  }, []);

  const handlePlanItinerary = () => {
    setStep('loading');
    setTimeout(() => {
      setStep('map');
    }, 1000);
  };

  return (
    <div className="App">
      {step === 'input' && <InputPage onPlanItinerary={handlePlanItinerary} />}
      {step === 'loading' && <LoadingScreen />}
      {step === 'map' && (
        <>
          <ItineraryMap transitModes={transitModes} />
          <TransitOptions transitModes={transitModes} />
        </>
      )}
    </div>
  );
}

export default App;