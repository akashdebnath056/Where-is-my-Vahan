import React, { useState } from 'react';
import { MapPin, Search, Navigation, Clock, Bus as BusIcon, ChevronDown, UserCircle2 } from 'lucide-react';
import { getDistanceKM, getNextStop, calculateETAAndMins } from '../lib/geo';
import { LiveBus } from '../hooks/useLiveBuses';
import { Route } from '../hooks/useRoutes';
import { VehicleIcon } from './VehicleIcon';
import { getStatusConfig } from '../constants';

interface HomeViewProps {
  buses: LiveBus[];
  routes: Route[];
  userLocation: { lat: number; lng: number } | null;
  onBusSelect: (bus: LiveBus) => void;
  openCrowdsource: () => void;
}

export function HomeView({ buses, routes, userLocation, onBusSelect, openCrowdsource }: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');

  const now = Date.now();

  let displayedBuses = buses;

  if (selectedRouteFilter !== 'all') {
    displayedBuses = displayedBuses.filter(b => b.routeId === selectedRouteFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matchingRouteIds = new Set<string>();
    
    for (const route of routes) {
      if (route.name.toLowerCase().includes(q)) {
        matchingRouteIds.add(route.id);
        continue;
      }
      for (const stop of route.stops) {
        if (stop.name.toLowerCase().includes(q)) {
          matchingRouteIds.add(route.id);
          break;
        }
      }
    }
    
    displayedBuses = buses.filter(b => {
      const matchRoute = matchingRouteIds.has(b.routeId);
      const matchId = b.id.toLowerCase().includes(q);
      
      // If Private journey, MUST match ID. We ignore route match for private ones to be strict, but matching ID is enough.
      if (b.journeyType === 'Private') {
        return matchId;
      }
      return matchRoute || matchId;
    });
  } else if (userLocation) {
    // Sort by proximity, hide Private buses
    displayedBuses = [...buses.filter(b => b.journeyType !== 'Private')].sort((a, b) => {
      const distA = getDistanceKM(userLocation.lat, userLocation.lng, a.lat, a.lng);
      const distB = getDistanceKM(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return distA - distB;
    });
  } else {
    // No search query, no location -> hide Private buses
    displayedBuses = buses.filter(b => b.journeyType !== 'Private');
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative pb-20">
      <div className="px-4 py-4 bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Filter by Route</label>
          <div className="relative">
             <select 
               value={selectedRouteFilter} 
               onChange={(e) => setSelectedRouteFilter(e.target.value)}
               className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-medium appearance-none"
             >
               <option value="all">All Routes</option>
               {routes.map(r => (
                 <option key={r.id} value={r.id}>{r.name}</option>
               ))}
             </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">Find Your Bus / Destination</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
              placeholder="Search stops, destination, or bus ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayedBuses.length === 0 ? (
            <div className="text-center p-8 text-slate-500 dark:text-slate-400">
              <BusIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No active buses found</p>
              <p className="text-sm mt-1">Try searching a different route or help crowdsource locations!</p>
            </div>
         ) : (
           displayedBuses.map((bus) => {
             const route = routes.find(r => r.id === bus.routeId);
             if (!route) return null;
             
             let distStr = '--';
             if (userLocation) {
               const dist = getDistanceKM(userLocation.lat, userLocation.lng, bus.lat, bus.lng);
               distStr = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;
             }
             
             const nextStopInfo = getNextStop(bus.lat, bus.lng, route.stops);
             const eta = nextStopInfo ? calculateETAAndMins(nextStopInfo.distanceKM, Math.max(bus.speed || 25, 5)) : null;
             const isCrowdsourced = bus.driverId === 'anonymous_user';
             const isLive = now - bus.lastUpdated < 180000;
             const statusCfg = getStatusConfig(bus.status);
             const StatusIcon = statusCfg.icon;

             return (
               <div 
                 key={bus.id} 
                 onClick={() => onBusSelect(bus)}
                 className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden flex flex-col gap-3"
               >
                 <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: route.color }} />
                 
                 {/* Horizontal Top Row */}
                 <div className="flex items-center justify-between pl-2">
                    <div className="flex items-center gap-2">
                        <VehicleIcon type={bus.vehicleType} className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <span className="font-bold text-lg text-slate-900 dark:text-white">{bus.id}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: `${route.color}25`, color: route.color }}>
                             {route.name}
                          </span>
                          {isCrowdsourced && (
                             <span className="flex items-center gap-1 text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/50 uppercase font-black tracking-tighter">
                               <UserCircle2 className="w-2.5 h-2.5" />
                               Crowd
                             </span>
                          )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <Navigation className="w-3 h-3" />
                      {distStr}
                    </div>
                 </div>

                 {/* Status Row */}
                 <div className="pl-2 flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${
                       bus.status === 'Breakdown' 
                         ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/30 dark:border-red-900' 
                         : bus.status === 'Delayed'
                         ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900'
                         : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900'
                    }`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </div>
                    {isLive && (
                      <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-900/30">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Live
                      </div>
                    )}
                 </div>

                 {/* Badges Row for Vehicle Type / Carrying Option */}
                 {(bus.vehicleType || bus.carryingOption || bus.journeyType === 'Private') && (
                    <div className="flex items-center gap-2 pl-2 mt-0.5 flex-wrap">
                      {bus.journeyType === 'Private' && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                          Private
                        </span>
                      )}
                      {bus.vehicleType && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                          {bus.vehicleType}
                        </span>
                      )}
                      {bus.carryingOption && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                          bus.carryingOption === 'Goods' 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' 
                            : bus.carryingOption === 'Both'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                        }`}>
                          Carrying: {bus.carryingOption}
                        </span>
                      )}
                    </div>
                 )}

                 {/* Sub info */}
                 <div className="flex items-center gap-2 pl-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                   <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> 
                   <span className="truncate">{route.stops[0]?.name} &rarr; {route.stops[route.stops.length - 1]?.name}</span>
                 </div>
                 
                 {/* ETA Banner */}
                 {nextStopInfo && eta && (
                   <div className="mt-1 ml-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2.5 flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50">
                     <div className="flex flex-col gap-0.5" style={{ maxWidth: '60%' }}>
                       <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider">Next Stop</span>
                       <span className="text-[13px] font-bold text-emerald-900 dark:text-emerald-300 truncate pr-2">{nextStopInfo.stop.name}</span>
                     </div>
                     <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-800">
                       <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                       <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">{eta.label}</span>
                     </div>
                   </div>
                 )}
               </div>
             );
           })
         )}
      </div>

       {/* Bottom Right FAB for Crowdsourcing */}
       <button
         onClick={openCrowdsource}
         className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_8px_20px_rgba(79,70,229,0.3)] flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-20"
       >
         <BusIcon className="w-6 h-6" />
       </button>
    </div>
  );
}
