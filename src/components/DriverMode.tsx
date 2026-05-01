import React, { useState, useEffect, useRef } from 'react';
import { auth, db, loginWithGoogle } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Bus, Navigation, ShieldAlert, CheckCircle, Edit, UserPlus, ChevronDown, Plus, X, ArrowUp, ArrowDown, LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRoutes } from '../hooks/useRoutes';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';
import { PlacesAutocompleteInput } from './PlacesInput';
import { getDistanceKM } from '../lib/geo';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

interface DriverProfile {
  registrationNumber: string;
  driverName: string;
  routeId: string;
  vehicleType?: string;
  carryingOption?: string;
  customSource?: string;
  customDestination?: string;
  journeyType?: 'Public' | 'Private';
  vehicleCapacity?: string;
}

export default function DriverMode({ onEditProfile, onSignIn }: { onEditProfile: () => void, onSignIn: () => void }) {
  const [user, loading, error] = useAuthState(auth);
  const { routes } = useRoutes();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('In Transit');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [form, setForm] = useState<DriverProfile>({
    registrationNumber: '',
    driverName: '',
    routeId: 'r1',
    vehicleType: 'Bus',
    carryingOption: 'Passenger',
    journeyType: 'Public',
    customSource: '',
    customDestination: '',
    vehicleCapacity: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopLocation, setNewStopLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<number | null>(null);
  const [currentAreaName, setCurrentAreaName] = useState<string>('');
  
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastGeocodedLocRef = useRef<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
       geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, driverName: user.displayName || '' }));
      getDoc(doc(db, 'drivers', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DriverProfile;
          if (!data.routeId) {
             data.routeId = 'r1';
          }
          if (!data.vehicleType) data.vehicleType = 'Bus';
          if (!data.carryingOption) data.carryingOption = 'Passenger';
          if (!data.journeyType) data.journeyType = 'Public';
          if (!data.vehicleCapacity) data.vehicleCapacity = '';
          
          setProfile(data);
        } else {
          onEditProfile();
        }
      });
    }
  }, [user]);

  useEffect(() => {
    let watchId: number;
    if (isDriving && user && profile) {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const speed = position.coords.speed !== null ? position.coords.speed * 3.6 : undefined;
            
            setLocation({ lat, lng });
            const now = Date.now();
            setLastBroadcastTime(now);

            let areaName = currentAreaName;

            if (geocoderRef.current) {
              const lastLoc = lastGeocodedLocRef.current;
              const shouldGeocode = !lastLoc || getDistanceKM(lat, lng, lastLoc.lat, lastLoc.lng) > 0.5;
              if (shouldGeocode) {
                 lastGeocodedLocRef.current = { lat, lng };
                 geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                       const locality = results[0].address_components.find(c => c.types.includes('locality') || c.types.includes('sublocality'))?.short_name;
                       const name = locality || results[0].formatted_address.split(',')[0];
                       setCurrentAreaName(name);
                       setDoc(doc(db, 'buses', user.uid), { currentArea: name }, { merge: true }).catch(e => console.error(e));
                    }
                 });
              }
            }

            const updatePayload: any = {
              id: profile.registrationNumber,
              routeId: profile.routeId || 'r1',
              lat,
              lng,
              status: currentStatus,
              driverId: user.uid,
              lastUpdated: now,
              vehicleType: profile.vehicleType || 'Bus',
              carryingOption: profile.carryingOption || 'Passenger',
              journeyType: profile.journeyType || 'Public',
              vehicleCapacity: profile.vehicleCapacity || ''
            };
            
            if (areaName) {
               updatePayload.currentArea = areaName;
            }
            if (speed !== undefined) {
               updatePayload.speed = speed;
            }

            await setDoc(doc(db, 'buses', user.uid), updatePayload, { merge: true });
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 0 }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isDriving, user, profile, currentStatus]);

  const handleStatusChange = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (isDriving && user && location) {
       await setDoc(doc(db, 'buses', user.uid), {
         status: newStatus,
         lastUpdated: Date.now()
       }, { merge: true });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let finalRouteId = form.routeId;
      
      // If custom route is selected, immediately provision a dynamic custom route
      if (finalRouteId === 'custom') {
         finalRouteId = `route-${user.uid}`;
         const customProps = { ...form, routeId: finalRouteId };
         setForm(customProps);
         
         await setDoc(doc(db, 'routes', finalRouteId), {
           id: finalRouteId,
           name: `${form.customSource || 'Start'} to ${form.customDestination || 'End'} (Custom)`,
           color: '#ef4444',
           stops: [
             { id: 's_start', name: form.customSource || 'Start', location: { lat: 23.83, lng: 91.28 } }, // Fallback coords; driver fixes later via Manage Stops
             { id: 's_end', name: form.customDestination || 'End', location: { lat: 23.84, lng: 91.29 } }
           ]
         }, { merge: true });
      }

      const savePayload: any = {
        registrationNumber: form.registrationNumber,
        driverName: form.driverName,
        routeId: finalRouteId,
        updatedAt: Date.now()
      };
      if (form.vehicleType) savePayload.vehicleType = form.vehicleType;
      if (form.carryingOption) savePayload.carryingOption = form.carryingOption;
      if (form.journeyType) savePayload.journeyType = form.journeyType;
      if (form.vehicleCapacity) savePayload.vehicleCapacity = form.vehicleCapacity;
      if (form.customSource) savePayload.customSource = form.customSource;
      if (form.customDestination) savePayload.customDestination = form.customDestination;
      
      // Optimistic UI update for speed
      setProfile(savePayload as DriverProfile);
      setIsEditingProfile(false);

      await setDoc(doc(db, 'drivers', user.uid), savePayload, { merge: true });
      
    } catch(err) {
      console.error(err);
      alert("Failed to save profile. Please check connection.");
    }
    setSubmitting(false);
  };

  const activeRoute = routes.find(r => r.id === profile?.routeId);

  const cloneRouteForEdits = async (updater: (stops: any[]) => any[]) => {
    if (!user || !profile || !activeRoute) return;
    
    // We create or update a driver-specific custom route
    const customRouteId = `route-${user.uid}`;
    let newStops = [...activeRoute.stops];
    newStops = updater(newStops);

    const newRouteInfo = {
      id: customRouteId,
      name: activeRoute.id === customRouteId ? activeRoute.name : `${activeRoute.name} (Custom)`,
      color: activeRoute.color || '#ef4444',
      stops: newStops
    };

    // Update in global routes
    await setDoc(doc(db, 'routes', customRouteId), newRouteInfo);
    
    // Switch driver profile to use this customized route if not already
    if (profile.routeId !== customRouteId) {
       await setDoc(doc(db, 'drivers', user.uid), { routeId: customRouteId }, { merge: true });
       setProfile({ ...profile, routeId: customRouteId });
    }
  };

  const handleRemoveStop = (stopId: string) => {
    cloneRouteForEdits((stops) => stops.filter(s => s.id !== stopId));
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    cloneRouteForEdits((stops) => {
       const newStops = [...stops];
       if (direction === 'up' && index > 0) {
          [newStops[index], newStops[index - 1]] = [newStops[index - 1], newStops[index]];
       } else if (direction === 'down' && index < newStops.length - 1) {
          [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
       }
       return newStops;
    });
  };

  const handleAddStop = () => {
    if (!newStopName.trim() || !activeRoute) return;
    // Use the fetched autocomplete location, OR default to current live GPS if they just clicked "Add at GPS Point" without using autocomplete
    const stopLoc = newStopLocation || location;
    if (!stopLoc) return;

    cloneRouteForEdits((stops) => {
       const newStop = {
         id: `s_custom_${Date.now()}`,
         name: newStopName.trim(),
         location: stopLoc
       };
       if (stops.length < 2) return [...stops, newStop];
       return [...stops.slice(0, -1), newStop, stops[stops.length - 1]];
    });
    setNewStopName('');
    setNewStopLocation(null);
    setIsAddingStop(false);
  };

  if (loading) return <div className="text-sm font-semibold text-slate-500">Loading auth...</div>;

  if (!user) {
    return (
      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
          <ShieldAlert className="w-5 h-5" />
          <h3 className="font-bold text-sm">Driver Portal</h3>
        </div>
        <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80">Secure sign-in required to broadcast live GPS.</p>
        <button 
          onClick={onSignIn}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all w-full flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Sign In / Sign Up
        </button>
        <p className="text-[10px] text-center w-full text-indigo-600/50 dark:text-indigo-400/50">For Email/Password, ask Admin to enable in console</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-3">
         <div className="flex items-center justify-between">
           <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Loading profile...</h3>
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between w-full">
         <div className="flex items-center gap-2">
           <Navigation className="w-5 h-5 text-indigo-500" />
           <h3 className="font-bold text-sm">Driver Dashboard</h3>
         </div>
         <div className="flex items-center gap-1">
           <button onClick={onEditProfile} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Edit Profile">
              <Edit className="w-4 h-4" />
           </button>
           <button onClick={() => signOut(auth)} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Log Out">
              <LogOut className="w-4 h-4" />
           </button>
         </div>
      </div>
      
      <div className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1">
         <div className="flex items-center justify-between">
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{profile.registrationNumber}</div>
           <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
             isDriving 
               ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
               : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
           }`}>
             {isDriving && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
             {isDriving ? 'Broadcasting Live' : 'Not Broadcasting'}
           </div>
         </div>
         <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activeRoute ? activeRoute.name : 'Unknown Route'}</div>
         {isDriving && currentAreaName && (
           <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
             Current Area: {currentAreaName}
           </div>
         )}
         {isDriving && lastBroadcastTime && (
           <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
             Last updated: {new Date(lastBroadcastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
           </div>
         )}
      </div>

      <div className="flex flex-col gap-2">
         {/* Top buttons row */}
         <div className="flex gap-2 w-full">
            <button 
              onClick={() => setIsDriving(!isDriving)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
                isDriving ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isDriving ? 'Stop Broadcast' : 'Start Broadcast'}
            </button>
            
            <div className="relative flex-1">
              <select 
                value={currentStatus} 
                onChange={e => handleStatusChange(e.target.value)}
                className="w-full h-full text-sm font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 appearance-none text-center"
              >
                <option value="In Transit">In Transit</option>
                <option value="At Station">At Station</option>
                <option value="Delayed">Delayed</option>
                <option value="Breakdown">Breakdown</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
         </div>
         
         {isDriving && location && activeRoute && typeof window !== 'undefined' && GOOGLE_MAPS_API_KEY && (
           <div className="mt-2 flex flex-col gap-3">
             <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Live Route View</div>
             <div className="h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                  <GoogleMap 
                    defaultCenter={location} 
                    defaultZoom={12} 
                    disableDefaultUI 
                    mapId="driver-minimap"
                  >
                    <AdvancedMarker position={location}>
                      <div className="w-5 h-5 bg-indigo-600 rounded-full border-[3px] border-white shadow-lg animate-pulse" />
                    </AdvancedMarker>
                    {activeRoute.stops.map(stop => (
                      <AdvancedMarker key={stop.id} position={stop.location}>
                        <div className="w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white shadow-sm" />
                      </AdvancedMarker>
                    ))}
                  </GoogleMap>
                </APIProvider>
             </div>

             <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
               <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Manage Stops</span>
                  <button onClick={() => setIsAddingStop(!isAddingStop)} className="text-indigo-600 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-0.5" /> <span className="text-[10px] font-bold">Add</span>
                  </button>
               </div>
               
               {isAddingStop && (
                 <div className="flex gap-2 mb-3">
                   <div className="flex-1">
                     <PlacesAutocompleteInput 
                        value={newStopName}
                        onChange={setNewStopName}
                        onPlaceSelected={(name, loc) => {
                           setNewStopName(name);
                           setNewStopLocation(loc);
                        }}
                        placeholder="Search places or drop point..."
                     />
                   </div>
                   <button onClick={handleAddStop} className="bg-indigo-600 text-white text-xs font-bold px-3 py-0 rounded-lg hover:bg-indigo-700 whitespace-nowrap hidden sm:block">Add at GPS Point</button>
                   <button onClick={handleAddStop} className="bg-indigo-600 text-white text-xs font-bold px-3 py-0 rounded-lg hover:bg-indigo-700 whitespace-nowrap sm:hidden">Add</button>
                 </div>
               )}

               <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                 {activeRoute.stops.map((stop, index) => (
                    <div key={stop.id} className="flex justify-between items-center text-xs p-1.5 hover:bg-white dark:hover:bg-slate-900 rounded group border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                      <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300 flex-1">{stop.name}</span>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-50 group-hover:opacity-100 transition-opacity">
                         <button disabled={index === 0} onClick={() => handleMoveStop(index, 'up')} className="text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded disabled:opacity-30">
                           <ArrowUp className="w-3.5 h-3.5" />
                         </button>
                         <button disabled={index === activeRoute.stops.length - 1} onClick={() => handleMoveStop(index, 'down')} className="text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded disabled:opacity-30">
                           <ArrowDown className="w-3.5 h-3.5" />
                         </button>
                         <div className="w-[1px] h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />
                         <button onClick={() => handleRemoveStop(stop.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1 rounded">
                           <X className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    </div>
                 ))}
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}
