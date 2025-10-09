import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import AboutPage from './components/AboutPage';
import GetStartedPage from './components/GetStartedPage';
import PersonalizeStepper from './components/personalize/PersonalizeStepper';

const AppRoutes = () => (
  <Switch>
    <Route path="/about" component={AboutPage} />
    <Route path="/get-started" component={GetStartedPage} />
    <Route path="/personalize" component={PersonalizeStepper} />
    {/* Default route: redirect to /personalize */}
    <Redirect exact from="/" to="/personalize" />
  </Switch>
);

export default AppRoutes;
