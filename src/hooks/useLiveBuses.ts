import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LiveBus {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  status: string;
  driverId: string;
  speed?: number; // Added speed property
  lastUpdated: number;
  vehicleType?: string;
  carryingOption?: string;
  journeyType?: 'Public' | 'Private';
  vehicleCapacity?: string;
  currentArea?: string;
}

export function useLiveBuses() {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'buses'), (snapshot) => {
      const busData = snapshot.docs.map(doc => doc.data() as LiveBus);
      // Filter out stale buses (e.g. haven't updated in 5 minutes)
      const now = Date.now();
      const activeBuses = busData.filter(b => now - b.lastUpdated < 5 * 60 * 1000);
      setBuses(activeBuses);
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching live buses:", err);
      if (err.message && err.message.toLowerCase().includes('permission')) {
        setError("Permission denied. Check your authentication status.");
      } else {
        setError("Network error fetching live buses.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { buses, loading, error };
}
