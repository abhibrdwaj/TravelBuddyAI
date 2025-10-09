import React from 'react';
import './InputStepLayout.css';

const InputStepLayout = ({ image, title, description, children, onNext, onBack, showBack, showNext, nextLabel = 'Next', backLabel = 'Back' }) => {
  return (
    <div className="input-step-layout">
      <div className="input-step-image">
        {/* Placeholder for image/illustration */}
        {image || <div className="image-placeholder">Image Placeholder</div>}
      </div>
      <div className="input-step-content">
        {title && <h1 className="input-step-title">{title}</h1>}
        {description && <p className="input-step-desc">{description}</p>}
        <div className="input-step-fields">{children}</div>
        <div className="input-step-nav">
          {showBack && <button className="input-step-back" onClick={onBack}>{backLabel}</button>}
          {showNext && <button className="input-step-next" onClick={onNext}>{nextLabel}</button>}
        </div>
      </div>
    </div>
  );
};

export default InputStepLayout;
