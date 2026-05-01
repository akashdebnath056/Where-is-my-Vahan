export function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

export function getClosestStopIndex(busLat: number, busLng: number, stops: {location: {lat: number, lng: number}}[]): number {
  if (!stops || stops.length === 0) return 0;
  
  let minDistance = Infinity;
  let closestIndex = 0;
  
  stops.forEach((stop, index) => {
    const dist = getDistanceKM(busLat, busLng, stop.location.lat, stop.location.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = index;
    }
  });
  
  return closestIndex;
}

export function getNextStop(busLat: number, busLng: number, stops: {name: string, location: {lat: number, lng: number}}[]) {
  if (!stops || stops.length === 0) return null;
  const closestIndex = getClosestStopIndex(busLat, busLng, stops);
  const distToClosest = getDistanceKM(busLat, busLng, stops[closestIndex].location.lat, stops[closestIndex].location.lng);
  
  let nextIndex = closestIndex;
  // If exceptionally close (<150m), the bus is basically there, consider ETA for the next stop
  if (distToClosest < 0.15 && closestIndex < stops.length - 1) {
    nextIndex = closestIndex + 1;
  }
  
  return { 
    stop: stops[nextIndex], 
    index: nextIndex, 
    distanceKM: getDistanceKM(busLat, busLng, stops[nextIndex].location.lat, stops[nextIndex].location.lng) 
  };
}

export function calculateETAAndMins(distanceKM: number, avgSpeedKMH: number = 25): { mins: number, label: string } {
  // Rough realistic factor: multiply direct distance by 1.3 for actual road distance
  const roadDist = distanceKM * 1.3;
  const mins = Math.round((roadDist / avgSpeedKMH) * 60);
  if (mins < 1) return { mins: 0, label: 'Arriving' };
  if (mins > 60) {
    const hrs = Math.floor(mins / 60);
    const rm = mins % 60;
    return { mins, label: `${hrs}h ${rm}m` };
  }
  return { mins, label: `${mins} min` };
}
