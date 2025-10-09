import React, { useState } from 'react';
import InputStepLayout from '../InputStepLayout';
import '../InputStepLayout.css';
const BasicInfoStep = ({ onNext, onBack, showBack, answers }) => {
  const [firstName, setFirstName] = useState(answers.firstName || '');
  const [lastName, setLastName] = useState(answers.lastName || '');
  const [age, setAge] = useState(answers.age || '');
  const [sex, setSex] = useState(answers.sex || '');
  const [travelWith, setTravelWith] = useState(answers.travelWith || '');
  const [location, setLocation] = useState(answers.location || '');

  const handleNext = () => {
    onNext({ firstName, lastName, age, sex, travelWith, location });
  };

  return (
    <InputStepLayout
      title="Let's start with the basics."
      description="Tell us about yourself."
      showBack={showBack}
      showNext
      onBack={onBack}
      onNext={handleNext}
      nextLabel="Next"
    >
      <div className="input-row">
        <label>First name</label>
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
        <label>Last name</label>
        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
      </div>
      <div className="input-row">
        <label>Age</label>
        <input value={age} onChange={e => setAge(e.target.value)} placeholder="How many years?" type="number" min="0" />
        <label>Sex</label>
        <div>
          <button type="button" className={sex==='Male' ? 'selected' : ''} onClick={()=>setSex('Male')}>Male</button>
          <button type="button" className={sex==='Female' ? 'selected' : ''} onClick={()=>setSex('Female')}>Female</button>
          <button type="button" className={sex==='Other' ? 'selected' : ''} onClick={()=>setSex('Other')}>Other</button>
        </div>
      </div>
      <div className="input-row">
        <label>Who do you typically travel with?</label>
        <div>
          <button type="button" className={travelWith==='Solo' ? 'selected' : ''} onClick={()=>setTravelWith('Solo')}>Solo</button>
          <button type="button" className={travelWith==='Spouse' ? 'selected' : ''} onClick={()=>setTravelWith('Spouse')}>Spouse</button>
          <button type="button" className={travelWith==='Family' ? 'selected' : ''} onClick={()=>setTravelWith('Family')}>Family</button>
          <button type="button" className={travelWith==='Friends' ? 'selected' : ''} onClick={()=>setTravelWith('Friends')}>Friends</button>
        </div>
      </div>
      <div className="input-row">
        <label>Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where are you?" />
      </div>
    </InputStepLayout>
  );
};

export default BasicInfoStep;
