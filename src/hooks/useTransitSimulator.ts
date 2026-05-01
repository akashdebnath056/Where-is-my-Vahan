import { useState, useEffect } from 'react';
import { Bus, Route, mockRoutes, getBusCoordinates } from '../lib/simulator';

export function useTransitSimulator() {
  const [buses, setBuses] = useState<Bus[]>([
    { id: 'B-1011', routeId: 'r1', currentStopIndex: 0, nextStopIndex: 1, progress: 0.2, speed: 0.05, status: 'In Transit' },
    { id: 'B-1012', routeId: 'r1', currentStopIndex: 3, nextStopIndex: 4, progress: 0.8, speed: 0.04, status: 'In Transit' },
    { id: 'B-2051', routeId: 'r2', currentStopIndex: 1, nextStopIndex: 2, progress: 0.5, speed: 0.06, status: 'In Transit' },
    { id: 'B-3001', routeId: 'r3', currentStopIndex: 0, nextStopIndex: 1, progress: 0.1, speed: 0.03, status: 'In Transit' },
    { id: 'B-3002', routeId: 'r3', currentStopIndex: 2, nextStopIndex: 3, progress: 0.9, speed: 0.035, status: 'In Transit' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBuses((prevBuses) =>
        prevBuses.map((bus) => {
          const route = mockRoutes.find((r) => r.id === bus.routeId);
          if (!route) return bus;

          let newProgress = bus.progress + bus.speed;
          let newCurrentIndex = bus.currentStopIndex;
          let newNextIndex = bus.nextStopIndex;
          let newStatus = bus.status;

          if (newProgress >= 1) {
            newCurrentIndex = newNextIndex;
            newNextIndex = newCurrentIndex + 1;
            
            // Loop route if reached end
            if (newNextIndex >= route.stops.length) {
              newNextIndex = 0;
            }
            newProgress = 0;
            newStatus = 'At Station';
          } else if (newProgress > 0.05) {
            newStatus = 'In Transit';
          }

          return {
            ...bus,
            progress: newProgress,
            currentStopIndex: newCurrentIndex,
            nextStopIndex: newNextIndex,
            status: newStatus as 'In Transit' | 'At Station',
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { routes: mockRoutes, buses };
}
