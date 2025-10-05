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
        const origin = itinerary[i].fromLocation;
        const destination = itinerary[i + 1].fromLocation;
        if (itinerary[i].mode !== 'walking' && itinerary[i].mode !== 'subways') continue;
        let travelMode = (itinerary[i].mode == 'walking') ? 'WALKING' : 'TRANSIT';
        // Set drivingOptions with departureTime if available
        const drivingOptions = itinerary[i].departTime ? {
          departureTime: new Date(itinerary[i].departTime)
        } : undefined;
        const request = {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode[travelMode],
          ...(travelMode === 'TRANSIT' ? {
            transitOptions: {
              modes: [window.google.maps.TransitMode.SUBWAY]
            }
          } : {}),
          ...(drivingOptions ? { drivingOptions } : {})
        };
        const getRoute = () => new Promise((resolve) => {
          directionsService.route(request, (result, status) => {
            if (status === 'OK' && result.routes.length > 0) {
              const summary = result.routes[0].legs[0];
              const steps = summary.steps.map((s) => {
                let details = '';
                details += s.instructions;
                if (s.transit) {
                    const transitTimes = s.transit.departure_time && s.transit.arrival_time
                    ? `<br/><span style='color:#4a90e2;font-weight:bold;'>Departs: ${s.transit.departure_time.text} | Arrives: ${s.transit.arrival_time.text}</span>`
                    : '';
                    if (transitTimes) details += transitTimes;
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
                transitMode: travelMode,
                startTime: summary.departure_time ? summary.departure_time.text : '',
                endTime: summary.arrival_time ? summary.arrival_time.text : '',
                distance: summary.distance ? summary.distance.text : '',
                fare: result.routes[0].fare ? result.routes[0].fare.text : null
              });
            } else {
              resolve({ origin, destination, error: 'No route found', transitMode: travelMode });
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
