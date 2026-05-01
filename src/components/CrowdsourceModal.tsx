import React, { useState, useRef, useEffect } from 'react';
import { db, loginAnonymously } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { X, Bus, ChevronDown } from 'lucide-react';
import { useRoutes } from '../hooks/useRoutes';
import { BUS_STATUSES, getStatusConfig } from '../constants';
import { auth } from '../lib/firebase';

interface CrowdsourceModalProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export function CrowdsourceModal({ onClose, userLocation }: CrowdsourceModalProps) {
  const { routes } = useRoutes();
  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState(routes[0]?.id || 'r1');
  const [status, setStatus] = useState(BUS_STATUSES[0].id);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
    onClose();
  };

  const startBroadcasting = async () => {
    if (!busId) { alert('Please enter a Bus Number/ID.'); return; }
    
    // Ensure user is signed in for security rules
    if (!auth.currentUser) {
      try {
        await loginAnonymously();
      } catch (err) {
        console.error("Anon auth failed", err);
        alert("Authentication failed. Cannot broadcast.");
        return;
      }
    }

    setIsBroadcasting(true);

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const speed = position.coords.speed !== null ? position.coords.speed * 3.6 : undefined;

          // Push update to firebase acting as the bus
          try {
            const updatePayload: any = {
              id: busId,
              routeId: routeId,
              lat,
              lng,
              status: status,
              driverId: 'anonymous_user',
              lastUpdated: Date.now()
            };
            if (speed !== undefined) {
               updatePayload.speed = speed;
            }

            await setDoc(doc(db, 'buses', busId), updatePayload, { merge: true });
          } catch(err) {
            console.error('Update failed', err);
          }
        },
        (err) => {
          console.error(err);
          alert('Failed to get location. Please enable location services.');
          setIsBroadcasting(false);
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setIsBroadcasting(false);
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 dark:bg-black/80 backdrop-blur-sm p-4">
       <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 relative shadow-xl transform transition-all translate-y-0 border border-transparent dark:border-slate-800">
          <button onClick={handleClose} className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
             <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                 <Bus className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-slate-900 dark:text-white">I am in a Bus</h3>
               <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Crowdsource your location</p>
             </div>
          </div>

          {isBroadcasting ? (
             <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center animate-pulse">
                   <div className="w-8 h-8 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </div>
                <h4 className="font-bold text-emerald-800 dark:text-emerald-500 text-lg">Broadcasting Live</h4>
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm mt-1">
                   <StatusIcon className={`w-3.5 h-3.5 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`} />
                   <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{statusConfig.label}</span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-600/80 mt-1">You are securely transmitting live GPS for <strong className="dark:text-emerald-400">{busId}</strong> to help other passengers. Thank you!</p>
                <button onClick={handleClose} className="mt-2 text-slate-500 dark:text-slate-400 font-bold text-sm underline pb-2">
                   Stop & Close
                </button>
             </div>
          ) : (
             <div className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Bus Number / ID</label>
                   <input type="text" value={busId} onChange={e => setBusId(e.target.value.toUpperCase())} placeholder="e.g. TR01 AB 1234" className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal font-mono" />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Route</label>
                   <div className="relative">
                      <select value={routeId} onChange={e => setRouteId(e.target.value)} className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-white appearance-none">
                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Current Status</label>
                   <div className="grid grid-cols-2 gap-2">
                      {BUS_STATUSES.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => setStatus(s.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${status === s.id ? `border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20` : 'border-transparent bg-slate-100 dark:bg-slate-800'}`}
                        >
                           <s.icon className={`w-4 h-4 ${status === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                           <span className={`text-xs font-bold ${status === s.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>{s.label}</span>
                        </button>
                      ))}
                   </div>
                </div>
                <button onClick={startBroadcasting} className="w-full py-4 mt-2 bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl active:scale-95 transition-all shadow-[0_8px_20px_rgba(79,70,229,0.2)]">
                   Start Broadcasting Location
                </button>
             </div>
          )}
       </div>
    </div>
  );
}
