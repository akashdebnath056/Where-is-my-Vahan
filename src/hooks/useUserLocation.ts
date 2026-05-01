import { useState, useEffect } from 'react';

export function useUserLocation() {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported');
      return;
    }

    // Try to get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGranted(true);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setGranted(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    
    // Watch position
    const watchId = navigator.geolocation.watchPosition(
       (position) => {
          setLocation({
             lat: position.coords.latitude,
             lng: position.coords.longitude
          });
       },
       (err) => console.error(err),
       { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { location, error, granted };
}
