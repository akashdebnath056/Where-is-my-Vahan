import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRoutes } from '../hooks/useRoutes';
import { StaticPage } from './StaticPage';
import { PlacesAutocompleteInput } from './PlacesInput';
import { APIProvider } from '@vis.gl/react-google-maps';

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

export function DriverProfileSetup({ onComplete }: { onComplete: () => void }) {
  const [user, loading] = useAuthState(auth);
  const { routes } = useRoutes();

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
  const [customStops, setCustomStops] = useState<{id: string, name: string, location: {lat: number, lng: number}}[]>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopLocation, setNewStopLocation] = useState<{lat: number, lng: number} | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, driverName: user.displayName || '' }));
      getDoc(doc(db, 'drivers', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          setHasProfile(true);
          const data = docSnap.data() as DriverProfile;
          if (!data.routeId) data.routeId = 'r1';
          if (!data.vehicleType) data.vehicleType = 'Bus';
          if (!data.carryingOption) data.carryingOption = 'Passenger';
          if (!data.journeyType) data.journeyType = 'Public';
          if (!data.vehicleCapacity) data.vehicleCapacity = '';
          setForm(data);
          
          if (data.routeId.startsWith('route-')) {
             getDoc(doc(db, 'routes', data.routeId)).then(rSnap => {
                if(rSnap.exists()) {
                   setCustomStops(rSnap.data().stops || []);
                }
             })
          }
        }
      });
    }
  }, [user]);

  const handleAddStop = () => {
    if (!newStopName || !newStopLocation) return;
    const newStop = {
      id: 's_' + Date.now(),
      name: newStopName,
      location: newStopLocation
    };
    setCustomStops(prev => [...prev, newStop]);
    setNewStopName('');
    setNewStopLocation(null);
  };

  const handleRemoveStop = (id: string) => {
    setCustomStops(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      let finalRouteId = form.routeId;
      
      if (finalRouteId === 'custom') {
         finalRouteId = `route-${user.uid}`;
         const customProps = { ...form, routeId: finalRouteId };
         setForm(customProps);
         
         const finalStops = customStops.length >= 2 ? customStops : [
           { id: 's_start', name: form.customSource || 'Start', location: { lat: 23.83, lng: 91.28 } },
           { id: 's_end', name: form.customDestination || 'End', location: { lat: 23.84, lng: 91.29 } }
         ];

         await setDoc(doc(db, 'routes', finalRouteId), {
           id: finalRouteId,
           name: `${finalStops[0].name} to ${finalStops[finalStops.length - 1].name} (Custom)`,
           color: '#ef4444',
           stops: finalStops
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
      
      await setDoc(doc(db, 'drivers', user.uid), savePayload, { merge: true });
      
      onComplete(); // Navigate home upon submitting!
    } catch(err) {
      console.error(err);
      alert("Failed to save profile. Please check connection.");
    }
    setSubmitting(false);
  };

  if (loading) return <StaticPage title="Driver Profile" onBack={onComplete}><div className="text-sm">Loading...</div></StaticPage>;
  if (!user) return <StaticPage title="Driver Profile" onBack={onComplete}><div className="text-sm">Please sign in from the sidebar first.</div></StaticPage>;

  return (
    <StaticPage title={hasProfile ? 'Edit Profile' : 'Driver Registration'} onBack={onComplete}>
          <div className="space-y-4 pb-20">
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Registration No</label>
               <input 
                 type="text" placeholder="e.g. TR01 AB 1234" 
                 value={form.registrationNumber} onChange={e => setForm({...form, registrationNumber: e.target.value.toUpperCase()})}
                 className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-mono tracking-wider font-bold"
               />
             </div>
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Name</label>
               <input 
                 type="text" placeholder="Your Name" 
                 value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})}
                 className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium"
               />
             </div>
             
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Capacity</label>
               <input 
                 type="text" placeholder="e.g. 40 Passengers, 5 Tons" 
                 value={form.vehicleCapacity} onChange={e => setForm({...form, vehicleCapacity: e.target.value})}
                 className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium"
               />
             </div>

             <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Type</label>
                  <div className="relative">
                     <select 
                       value={form.vehicleType || 'Bus'} 
                       onChange={e => setForm({...form, vehicleType: e.target.value})}
                       className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium appearance-none"
                     >
                       <option value="Bus">Bus</option>
                       <option value="Truck">Truck</option>
                       <option value="Mini-Van">Mini-Van</option>
                       <option value="Auto">Auto Rickshaw</option>
                       <option value="Car">Car</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Carrying</label>
                  <div className="relative">
                     <select 
                       value={form.carryingOption || 'Passenger'} 
                       onChange={e => setForm({...form, carryingOption: e.target.value})}
                       className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium appearance-none"
                     >
                       <option value="Passenger">Passenger</option>
                       <option value="Goods">Goods</option>
                       <option value="Both">Both</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
             </div>
             
             <div>
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Journey Type</label>
               <div className="relative">
                  <select 
                    value={form.journeyType || 'Public'} 
                    onChange={e => setForm({...form, journeyType: e.target.value as 'Public' | 'Private'})}
                    className="w-full text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium appearance-none"
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
             </div>

             <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Assigned Route</label>
               <div className="relative mb-3">
                  <select 
                    value={form.routeId || ''} 
                    onChange={e => setForm({...form, routeId: e.target.value})}
                    className="w-full text-sm p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-gray-100 outline-none focus:border-indigo-500 font-medium appearance-none ring-1 ring-black/5"
                  >
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    <option value="custom" className="font-bold text-indigo-600">Custom Route (Add Locations)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>

               {form.routeId === 'custom' && (
                 <div className="flex flex-col gap-3 mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Custom Route Stops</div>
                    <div className="text-xs text-slate-500 mb-2">Add locations in sequence from start to destination.</div>

                    <div className="flex flex-col gap-2 mb-3">
                       {customStops.map((stop, index) => (
                         <div key={stop.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                           <div className="flex items-center gap-2">
                              <span className="w-5 h-5 flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-[10px] font-bold rounded-full text-slate-600 dark:text-slate-300">{index + 1}</span>
                              <span className="text-sm font-medium">{stop.name}</span>
                           </div>
                           <button onClick={() => handleRemoveStop(stop.id)} className="text-slate-400 hover:text-red-500 p-1">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                       {customStops.length === 0 && (
                          <div className="text-xs text-slate-400 italic py-2 text-center">No stops added yet.</div>
                       )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                       <div className="flex-1">
                          {GOOGLE_MAPS_API_KEY ? (
                            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                               <PlacesAutocompleteInput 
                                 value={newStopName}
                                 onChange={setNewStopName}
                                 onPlaceSelected={(name, loc) => {
                                    setNewStopName(name);
                                    setNewStopLocation(loc);
                                 }}
                                 placeholder="Search for a stop..."
                               />
                            </APIProvider>
                          ) : (
                               <input 
                                 type="text"
                                 value={newStopName}
                                 onChange={(e) => setNewStopName(e.target.value)}
                                 placeholder="Google Maps API Key missing..."
                                 disabled
                                 className="w-full text-sm p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400"
                               />
                          )}
                       </div>
                       <button 
                         onClick={handleAddStop}
                         disabled={!newStopName || !newStopLocation}
                         className="bg-indigo-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
                       >
                         <Plus className="w-4 h-4" /> Add Stop
                       </button>
                    </div>
                 </div>
               )}
             </div>

             <div className="flex gap-3 pt-4">
                <button disabled={submitting} onClick={handleSaveProfile} className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 transition-colors shadow-md">{submitting ? 'Saving...' : (hasProfile ? 'Save Profile' : 'Register Vehicle')}</button>
             </div>
          </div>
    </StaticPage>
  );
}
