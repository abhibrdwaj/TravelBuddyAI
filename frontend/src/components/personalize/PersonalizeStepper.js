import React, { useState } from 'react';
import IntroStep from './steps/IntroStep';
import BasicInfoStep from './steps/BasicInfoStep';
import PreferencesStep from './steps/PreferencesStep';

const steps = [
  { component: IntroStep },
  { component: BasicInfoStep },
  { component: PreferencesStep },
];

const PersonalizeStepper = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const StepComponent = steps[stepIndex].component;

  const handleNext = (stepData) => {
    setAnswers(prev => ({ ...prev, ...stepData }));
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else if (onComplete) {
      onComplete({ ...answers, ...stepData });
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  return (
    <StepComponent
      onNext={handleNext}
      onBack={handleBack}
      showBack={stepIndex > 0}
      showNext={true}
      answers={answers}
    />
  );
};

export default PersonalizeStepper;
