import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { LiveBus } from '../hooks/useLiveBuses';
import { Route } from '../hooks/useRoutes';
import { Bus } from 'lucide-react';
import { VehicleIcon } from './VehicleIcon';

interface GoogleTransitMapProps {
  buses: LiveBus[];
  routes: Route[];
  selectedRouteId: string | null;
}

const PolylineOverlay: React.FC<{ route: Route | undefined }> = ({ route }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !route || route.stops.length < 2) return;

    const path = route.stops.map(s => s.location);
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: route.color || '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });
    
    polyline.setMap(map);

    return () => polyline.setMap(null);
  }, [map, route]);
  
  return null;
}

const SmoothBusMarker: React.FC<{ bus: LiveBus; route?: Route }> = ({ bus, route }) => {
  const [pos, setPos] = useState({ lat: bus.lat, lng: bus.lng });

  useEffect(() => {
    const startLat = pos.lat;
    const startLng = pos.lng;
    const endLat = bus.lat;
    const endLng = bus.lng;

    const dist = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2));
    // If distance is large (e.g. initial load or massive jump), teleport directly
    if (dist > 0.05) {
      setPos({ lat: endLat, lng: endLng });
      return;
    }

    let startTime = performance.now();
    const duration = 2000; // ms

    let animationFrameId: number;

    function animate(time: number) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      // easeOutQuad
      const easeT = t * (2 - t);

      setPos({
        lat: startLat + (endLat - startLat) * easeT,
        lng: startLng + (endLng - startLng) * easeT
      });

      if (t < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    }
    
    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [bus.lat, bus.lng]);

  return (
    <AdvancedMarker position={pos}>
      <div 
        className="p-2 rounded-xl shadow-xl border-2 border-white flex items-center justify-center relative transition-transform hover:scale-110 will-change-transform"
        style={{ backgroundColor: route?.color || '#3b82f6' }}
      >
        <VehicleIcon type={bus.vehicleType} className="w-5 h-5 text-white" />
        <span className="absolute -bottom-7 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-900/90 text-white whitespace-nowrap z-50 shadow-sm border border-slate-700/50">
          {route?.name || 'Unknown'}
        </span>
      </div>
    </AdvancedMarker>
  );
}

export default function GoogleTransitMap({ buses, routes, selectedRouteId }: GoogleTransitMapProps) {
  // Center roughly intelligently
  const activeRoutes = selectedRouteId
    ? routes.filter(r => r.id === selectedRouteId)
    : routes;

  const mapCenter = activeRoutes.length > 0 && activeRoutes[0].stops.length > 0
    ? activeRoutes[0].stops[Math.floor(activeRoutes[0].stops.length / 2)].location
    : { lat: 23.8315, lng: 91.2868 }; // fallback Agartala

  const visibleBuses = selectedRouteId
    ? buses.filter(b => b.routeId === selectedRouteId)
    : buses;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      <Map
        defaultZoom={13}
        defaultCenter={mapCenter}
        mapId="DEMO_MAP_ID"
        disableDefaultUI={true}
        gestureHandling={'greedy'}
      >
        {/* Render Routes Lines */}
        {activeRoutes.map(route => (
           <PolylineOverlay key={route.id} route={route} />
        ))}

        {/* Render Stops */}
        {activeRoutes.map(route => (
          route.stops.map(stop => (
            <AdvancedMarker key={`${route.id}-${stop.id}`} position={{ lat: stop.location.lat, lng: stop.location.lng }}>
              <div className="flex flex-col items-center group cursor-pointer z-10 w-32 -mx-16">
                <div className="w-3.5 h-3.5 bg-white border-[3px] rounded-full shadow-md z-10 relative" style={{ borderColor: route.color || '#3b82f6' }} />
                <span className="mt-1 text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded-lg backdrop-blur-md whitespace-nowrap shadow-sm border border-slate-200/50 dark:border-slate-700/50 relative z-0">
                  {stop.name}
                </span>
              </div>
            </AdvancedMarker>
          ))
        ))}

        {/* Render Buses */}
        {visibleBuses.map((bus) => {
          const route = routes.find((r) => r.id === bus.routeId);
          return <SmoothBusMarker key={bus.id} bus={bus} route={route} />;
        })}
      </Map>
    </div>
  );
}
