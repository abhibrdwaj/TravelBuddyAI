import React from 'react';
import AppLayout from './AppLayout';
import '../styles/AboutPage.css';
import { useHistory } from 'react-router-dom';

const AboutPage = () => {
  const history = useHistory();
  const handlePersonalize = () => {
    history.push('/personalize');
  };
  return (
    <AppLayout>
      <h1 className="about-title">Meet Voyalytics AI</h1>
      <div className="about-highlight"></div>
      <div className="about-journey">
        <h2>Our Journey</h2>
        <p>
          At Voyalytics AI, we are travel-obsessed technologists and explorers. We believe that travel planning should be as fun and exciting as the trip itself. But, historically, that has rarely been the case.
        </p>
        <p>
          Planning an adventure that suits your unique travel style often involves bouncing from website to website and endlessly scrolling through socials for inspiration and validation.
        </p>
        <p>
          Tools like ChatGPT can save you time, but they only provide plain text responses that lack personalization and actionable insights. Plus, they don’t help organize your bookings.
        </p>
        <p>
          So we developed Voyalytics AI, the most personalized way to discover, plan and organize any adventure — around the world or in your own backyard.
        </p>
        <ul>
          <li>Personalized travel suggestions</li>
          <li>Customizable and shareable itineraries</li>
          <li>Beautiful photos, interactive maps and reviews</li>
          <li>And the ability to organize everything all in one place</li>
        </ul>
        <p>
          In short, we bring you the world and empower you to experience it in a better way — your way.
        </p>
        <p>
          If you’re ready to travel differently, let’s go!
        </p>
        <button onClick={() => window.location.href='/get-started'} className="about-get-started-btn">Get started</button>
        <button onClick={handlePersonalize} className="about-personalize-btn">Personalize your trip</button>
      </div>
    </AppLayout>
  );
};

export default AboutPage;
