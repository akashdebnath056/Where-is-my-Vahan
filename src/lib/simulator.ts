export interface Coordinate {
  x: number;
  y: number;
}

export interface Stop {
  id: string;
  name: string;
  location: Coordinate;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stops: Stop[];
}

export interface Bus {
  id: string;
  routeId: string;
  currentStopIndex: number;
  nextStopIndex: number;
  progress: number; // 0 to 1
  speed: number;
  status: 'In Transit' | 'At Station';
}

const mockStops: Record<string, Stop> = {
  s1: { id: 's1', name: 'Central Station', location: { x: 10, y: 50 } },
  s2: { id: 's2', name: 'City Center', location: { x: 30, y: 40 } },
  s3: { id: 's3', name: 'Park Avenue', location: { x: 50, y: 30 } },
  s4: { id: 's4', name: 'University', location: { x: 70, y: 60 } },
  s5: { id: 's5', name: 'North Mall', location: { x: 90, y: 20 } },
  s6: { id: 's6', name: 'Metro Square', location: { x: 30, y: 80 } },
  s7: { id: 's7', name: 'Tech Park', location: { x: 60, y: 80 } },
  s8: { id: 's8', name: 'Airport Transit', location: { x: 80, y: 90 } },
};

export const mockRoutes: Route[] = [
  {
    id: 'r1',
    name: '101 Express',
    color: '#3b82f6', // blue-500
    stops: [mockStops.s1, mockStops.s2, mockStops.s3, mockStops.s4, mockStops.s5],
  },
  {
    id: 'r2',
    name: 'Metro Link 5',
    color: '#10b981', // emerald-500
    stops: [mockStops.s1, mockStops.s6, mockStops.s7, mockStops.s8],
  },
  {
    id: 'r3',
    name: 'University Circ.',
    color: '#f59e0b', // amber-500
    stops: [mockStops.s2, mockStops.s6, mockStops.s4, mockStops.s3, mockStops.s2],
  },
];

const initialBuses: Bus[] = [
  { id: 'B-1011', routeId: 'r1', currentStopIndex: 0, nextStopIndex: 1, progress: 0.2, speed: 0.05, status: 'In Transit' },
  { id: 'B-1012', routeId: 'r1', currentStopIndex: 3, nextStopIndex: 4, progress: 0.8, speed: 0.04, status: 'In Transit' },
  { id: 'B-2051', routeId: 'r2', currentStopIndex: 1, nextStopIndex: 2, progress: 0.5, speed: 0.06, status: 'In Transit' },
  { id: 'B-3001', routeId: 'r3', currentStopIndex: 0, nextStopIndex: 1, progress: 0.1, speed: 0.03, status: 'In Transit' },
  { id: 'B-3002', routeId: 'r3', currentStopIndex: 2, nextStopIndex: 3, progress: 0.9, speed: 0.035, status: 'In Transit' },
];

export function getBusCoordinates(bus: Bus, route: Route): Coordinate {
  if (!route) return { x: 0, y: 0 };
  const currentStop = route.stops[bus.currentStopIndex];
  const nextStop = route.stops[bus.nextStopIndex];
  
  if (!nextStop) return currentStop.location;

  return {
    x: currentStop.location.x + (nextStop.location.x - currentStop.location.x) * bus.progress,
    y: currentStop.location.y + (nextStop.location.y - currentStop.location.y) * bus.progress,
  };
}
