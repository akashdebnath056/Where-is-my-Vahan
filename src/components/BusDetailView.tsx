import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LiveBus } from '../hooks/useLiveBuses';
import { Route } from '../hooks/useRoutes';
import { ArrowLeft, Edit2, MapPin, Bus, Clock, Navigation } from 'lucide-react';
import { getClosestStopIndex, getDistanceKM, getNextStop, calculateETAAndMins } from '../lib/geo';
import { VehicleIcon } from './VehicleIcon';
import { getStatusConfig } from '../constants';

interface BusDetailViewProps {
  bus: LiveBus;
  routes: Route[];
  onBack: () => void;
  onViewMap: () => void;
}

export function BusDetailView({ bus, routes, onBack, onViewMap }: BusDetailViewProps) {
  const route = routes.find(r => r.id === bus.routeId);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isLive = now - bus.lastUpdated < 180000; // 3 minutes timeout
  const statusConfig = getStatusConfig(bus.status);
  const StatusIcon = statusConfig.icon;

  const currentStopIndex = useMemo(() => {
    return route ? getClosestStopIndex(bus.lat, bus.lng, route.stops) : 0;
  }, [bus.lat, bus.lng, route]);

  const nextStopData = useMemo(() => {
    return route ? getNextStop(bus.lat, bus.lng, route.stops) : null;
  }, [bus.lat, bus.lng, route]);

  const eta = useMemo(() => {
    return nextStopData ? calculateETAAndMins(nextStopData.distanceKM, Math.max(bus.speed || 25, 5)) : null;
  }, [nextStopData, bus.speed]);

  useEffect(() => {
    if (currentStopIndex > 0 && scrollRef.current) {
      const currentElement = document.getElementById(`stop-${currentStopIndex}`);
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStopIndex]);

  const stopDetails = useMemo(() => {
    if (!route || !nextStopData) return [];
    
    // Calculate realistic cumulative distances from the bus's *current location* forward.
    let runDist = nextStopData.distanceKM; 
    const nowTime = new Date();
    const currentSpeed = Math.max(bus.speed || 25, 5);
    
    return route.stops.map((stop, i) => {
      // Past stops
      if (i < nextStopData.index) {
        return {
          isPassed: true,
          distStr: '-',
          timeStr: '—'
        };
      }
      
      // Future/Next stops
      if (i > nextStopData.index) {
        const prev = route.stops[i - 1];
        runDist += getDistanceKM(prev.location.lat, prev.location.lng, stop.location.lat, stop.location.lng) * 1.3;
      }
      
      const { mins } = calculateETAAndMins(runDist, currentSpeed);
      const arrTime = new Date(nowTime.getTime() + mins * 60000);
      const actualDistStr = runDist < 1 ? Math.round(runDist * 1000) + ' m' : runDist.toFixed(1) + ' km';

      return {
        isPassed: false,
        distStr: actualDistStr,
        minsAway: Math.round(mins),
        timeStr: arrTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };
    });
  }, [route, nextStopData]);

  if (!route) return null;

  const isFinalStop = nextStopData?.index === route.stops.length - 1;

  const handleDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans">
      {/* Modern Header */}
      <header className="pt-4 pb-6 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </button>
          
          <div className="flex items-center gap-2">
             <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-sm ${
               bus.status === 'Breakdown' 
                 ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900' 
                 : bus.status === 'Delayed'
                 ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900'
                 : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900'
             }`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold tracking-tight">
                  {statusConfig.label}
                </span>
             </div>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{route.name}</h1>
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><Bus className="w-4 h-4" /> Vehicle {bus.id}</span>
            <div className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${
              isLive 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
              {isLive ? 'Broadcasting Live' : 'Not Broadcasting'}
              {bus.lastUpdated && (
                <span className="opacity-70 font-medium ml-0.5">
                  ({new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>
            {bus.vehicleCapacity && (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Capacity: {bus.vehicleCapacity}</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Live ETA Banner - Glassy Bento Style */}
      {nextStopData && eta && (
        <div className="px-4 pt-4 pb-2 z-20 sticky top-[138px]">
          <div className="bg-indigo-600 dark:bg-indigo-500 rounded-2xl p-4 shadow-lg shadow-indigo-500/20 text-white flex items-center justify-between">
              <div className="flex flex-col pr-4">
                 <span className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-1">
                    {isFinalStop ? 'Final Stop' : 'Next Stop'}
                 </span>
                 <span className="text-lg font-bold leading-tight line-clamp-1">{nextStopData.stop.name}</span>
              </div>
              <div className="flex flex-col items-end shrink-0 pl-4 border-l border-indigo-400/30">
                 <span className="text-2xl font-black">{eta.label.split(' ')[0]}</span>
                 <span className="text-xs font-medium text-indigo-200">{eta.label.split(' ').slice(1).join(' ')}</span>
              </div>
          </div>
        </div>
      )}

      {/* Main Timeline Area */}
      <div className="flex-1 overflow-y-auto w-full px-4 pt-4 pb-32" ref={scrollRef}>
        <div className="relative">
          {/* Continuous Track Line */}
          <div className="absolute top-[28px] bottom-8 left-[70px] w-[3px] bg-slate-200 dark:bg-slate-800 rounded-full" />

          {route.stops.map((stop, i) => {
            const isCurrent = i === currentStopIndex;
            const isNext = i === nextStopData?.index;
            const details = stopDetails[i];
            const isFirst = i === 0;
            const isLast = i === route.stops.length - 1;
            
            // Visual states
            const textColor = details.isPassed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100';
            const highlightText = isNext ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : `${textColor} font-bold`;

            return (
              <div id={`stop-${i}`} key={stop.id} className={`flex items-start group`}>
                
                {/* Time Column */}
                <div className="w-[60px] pt-1.5 flex flex-col items-end pr-3">
                  <span className={`text-[13px] font-semibold ${details.isPassed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {details.timeStr}
                  </span>
                  {!details.isPassed && details.minsAway !== undefined && i !== 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 mt-0.5">
                      {details.minsAway}m
                    </span>
                  )}
                </div>

                {/* Node Column */}
                <div className="w-[20px] flex justify-center relative pt-2">
                  {isCurrent ? (
                    <div className="relative flex flex-col items-center z-10 -translate-y-2">
                      <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-950 shadow-md">
                         <VehicleIcon type={bus.vehicleType} className="w-5 h-5 text-white" />
                      </div>
                      {bus.currentArea && (
                        <div className="absolute top-[42px] bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                          {bus.currentArea}
                        </div>
                      )}
                    </div>
                  ) : isNext ? (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 border-4 border-white dark:border-slate-950 z-10 ring-2 ring-indigo-200 dark:ring-indigo-900/50" />
                  ) : details.isPassed ? (
                    <div className="w-[10px] h-[10px] rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-950 z-10 mt-1" />
                  ) : (
                    <div className="w-[10px] h-[10px] rounded-full bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-950 z-10 mt-1" />
                  )}
                </div>

                {/* Info Column */}
                <div className={`flex-1 pl-4 pb-8 ${isLast ? 'pb-4' : ''}`}>
                  <div className="flex flex-col gap-1">
                    <span className={`text-[16px] leading-tight ${highlightText}`}>
                      {stop.name}
                    </span>
                    
                    {!details.isPassed && (
                      <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                        {details.distStr}
                      </span>
                    )}

                    {/* Directions button when bus is current or next */}
                    {(isCurrent || isNext) && (
                      <button 
                        onClick={() => handleDirections(bus.lat, bus.lng)}
                        className="mt-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 max-w-max shadow-sm active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-slate-750"
                      >
                        <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Get directions to vehicle</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Map Button overlay (Bottom Right) */}
      <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none flex justify-center z-40">
        <button 
          onClick={onViewMap}
          className="pointer-events-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full px-6 py-4 shadow-xl flex items-center justify-center gap-2.5 active:scale-95 transition-transform font-bold"
        >
          <MapPin className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
          <span>Live Map View</span>
        </button>
      </div>

      {/* Bottom gradient fade to ensure content isn't hard cut off */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none z-30" />
    </div>
  );
}

