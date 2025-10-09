import React from 'react';
import InputStepLayout from '../InputStepLayout';
import nycBuzzling from '../assets/Museum_couple.png';

const IntroStep = ({ onNext }) => (
  <InputStepLayout
    title="Create your travel persona."
    description="Let's get personal! Tell me a bit about your travel style and preferences so I can whip up some spot-on destination and experience suggestions just for you."
    showNext
    onNext={onNext}
    nextLabel="Get started"
    image={<img src={nycBuzzling} alt="NYC street food scene" style={{ width: '100%', height: 'auto', borderRadius: 32 }} />}
  >
    {/* No fields, just intro */}
  </InputStepLayout>
);

export default IntroStep;
