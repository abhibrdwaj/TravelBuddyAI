import React, { useState } from 'react';
import InputStepLayout from '../InputStepLayout';
import '../InputStepLayout.css';

const PreferencesStep = ({ onNext, onBack, showBack, answers }) => {
  // Placeholder for trip preferences, can be expanded
  const [adventureLevel, setAdventureLevel] = useState(answers.adventureLevel || '');
  const [natureVsCulture, setNatureVsCulture] = useState(answers.natureVsCulture || '');
  const [popularVsLocal, setPopularVsLocal] = useState(answers.popularVsLocal || '');

  const handleNext = () => {
    onNext({ adventureLevel, natureVsCulture, popularVsLocal });
  };

  return (
    <InputStepLayout
      title="How do you like to vacation?"
      description="Tell us about your travel style."
      showBack={showBack}
      showNext
      onBack={onBack}
      onNext={handleNext}
      nextLabel="Next"
    >
      <div className="input-row">
        <label>Is your ideal vacation day an exhilarating adventure or a relaxing break?</label>
        <input value={adventureLevel} onChange={e => setAdventureLevel(e.target.value)} placeholder="Adventurous / Relaxing / Balance" />
      </div>
      <div className="input-row">
        <label>Would you rather explore the great outdoors or pursue a cultural experience?</label>
        <input value={natureVsCulture} onChange={e => setNatureVsCulture(e.target.value)} placeholder="Nature / Culture / No preference" />
      </div>
      <div className="input-row">
        <label>In a new place, do you prefer to visit popular attractions or engage in authentic local experiences?</label>
        <input value={popularVsLocal} onChange={e => setPopularVsLocal(e.target.value)} placeholder="Popular / Local / Both" />
      </div>
    </InputStepLayout>
  );
};

export default PreferencesStep;
