import { useEffect, useState } from 'react';

/**
 * Custom hook to fetch directions for an itinerary using Google Maps JS API.
 * @param {Array} itinerary - Array of locations (with address or name).
 * @param {Array} transitModes - Array of user-selected transit modes.
 * @returns {Array} routes - Array of route details for each leg.
 */
export default function useDirections(itinerary, transitModes) {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!window.google || !window.google.maps) {
        setRoutes([{ error: 'Google Maps JS API not loaded.' }]);
        return;
      }
      const directionsService = new window.google.maps.DirectionsService();
      const legs = [];
      for (let i = 0; i < itinerary.length - 1; i++) {
        const origin = itinerary[i].location_name || itinerary[i].address;
        const destination = itinerary[i + 1].location_name || itinerary[i + 1].address;
        let mode = 'TRANSIT';
        let transitOptions = {};
        if (transitModes.includes('walking')) mode = 'WALKING';
        else if (transitModes.includes('taxis')) mode = 'DRIVING';
        else if (transitModes.includes('e-bikes')) mode = 'BICYCLING';
        else if (transitModes.includes('subways') || transitModes.includes('buses')) {
          mode = 'TRANSIT';
          const modesArr = [];
          if (transitModes.includes('subways')) modesArr.push(window.google.maps.TransitMode.SUBWAY);
          if (transitModes.includes('buses')) modesArr.push(window.google.maps.TransitMode.BUS);
          if (modesArr.length > 0) transitOptions.modes = modesArr;
        }
        const request = {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode[mode],
          ...(mode === 'TRANSIT' ? { transitOptions } : {})
        };
        const getRoute = () => new Promise((resolve) => {
          directionsService.route(request, (result, status) => {
            if (status === 'OK' && result.routes.length > 0) {
              const summary = result.routes[0].legs[0];
              const steps = summary.steps.map((s) => {
                let details = s.instructions;
                if (s.transit) {
                  details += `<br/><span style='color:#4285F4;font-weight:bold;'>Transit: ${s.transit.line.name} (${s.transit.line.short_name || ''})</span>`;
                  details += `<br/>From <b>${s.transit.departure_stop.name}</b> to <b>${s.transit.arrival_stop.name}</b>`;
                  details += `<br/>Headsign: ${s.transit.headsign}`;
                  details += `<br/>Vehicle: ${s.transit.line.vehicle.name}`;
                  if (s.transit.line.color) details += `<span style='background:${s.transit.line.color};color:${s.transit.line.text_color};padding:2px 6px;border-radius:4px;margin-left:6px;'>${s.transit.line.short_name || s.transit.line.name}</span>`;
                  if (result.routes[0].fare) {
                    details += `<br/><span style='color:#388e3c;font-weight:bold;'>Fare: ${result.routes[0].fare.text}</span>`;
                  }
                }
                return details;
              });
              resolve({
                origin,
                destination,
                duration: summary.duration.text,
                steps,
                polyline: result.routes[0].overview_polyline,
                transitMode: mode === 'TRANSIT' && transitOptions.modes ? transitOptions.modes.join(', ') : mode.toLowerCase(),
                startTime: summary.departure_time ? summary.departure_time.text : '',
                endTime: summary.arrival_time ? summary.arrival_time.text : '',
                distance: summary.distance ? summary.distance.text : '',
                fare: result.routes[0].fare ? result.routes[0].fare.text : null
              });
            } else {
              resolve({ origin, destination, error: 'No route found', transitMode: mode === 'TRANSIT' && transitOptions.modes ? transitOptions.modes.join(', ') : mode.toLowerCase() });
            }
          });
        });
        // eslint-disable-next-line no-await-in-loop
        legs.push(await getRoute());
      }
      setRoutes(legs);
    };
    if (transitModes.length && itinerary.length > 1) fetchRoutes();
  }, [itinerary, transitModes]);

  return routes;
}
