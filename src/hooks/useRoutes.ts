import { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { REAL_ROUTES as SEED_ROUTES } from '../lib/seedData';

export interface RouteStop {
  id: string;
  name: string;
  location: { lat: number; lng: number };
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stops: RouteStop[];
}

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>(SEED_ROUTES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Seed initial routes if empty
    getDocs(collection(db, 'routes')).then(snap => {
      if (snap.empty) {
        import('../lib/seedData').then(({ seedRoutes }) => seedRoutes());
      }
    }).catch(() => {});

    const unsubscribe = onSnapshot(collection(db, 'routes'), (snapshot) => {
      const activeRoutes = snapshot.docs.map(doc => doc.data() as Route);
      if (activeRoutes.length > 0) {
        setRoutes(activeRoutes);
      } else {
        setRoutes(SEED_ROUTES); // fallback
      }
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching routes:", err);
      if (err.message && err.message.toLowerCase().includes('permission')) {
        setError("Permission denied syncing routes.");
      } else {
        setError("Network error fetching routes. Using fallback.");
      }
      setRoutes(SEED_ROUTES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { routes, loading, error };
}
