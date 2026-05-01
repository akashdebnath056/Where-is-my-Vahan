import React from 'react';
import { Route, Bus, getBusCoordinates } from '../lib/simulator';
import { motion } from 'motion/react';
import { Bus as BusIcon, MapPin } from 'lucide-react';

interface TransitMapProps {
  routes: Route[];
  buses: Bus[];
  selectedRouteId: string | null;
}

export default function TransitMap({ routes, buses, selectedRouteId }: TransitMapProps) {
  const visibleRoutes = selectedRouteId 
    ? routes.filter(r => r.id === selectedRouteId)
    : routes;

  const visibleBuses = selectedRouteId
    ? buses.filter(b => b.routeId === selectedRouteId)
    : buses;

  return (
    <div className="relative w-full h-full bg-[#f8fafc] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Abstract Map Background Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />

      {/* Render Routes */}
      <svg className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="none">
        {visibleRoutes.map((route) => {
          const points = route.stops.map(
            (stop) => `${stop.location.x}% ${stop.location.y}%`
          );
          // To draw connected lines with SVG, convert percentages to numbers conceptually
          // For simplicity here, we can render multiple lines between stops
          return (
            <g key={route.id}>
              {route.stops.map((stop, index) => {
                const nextStop = route.stops[index + 1];
                if (!nextStop) return null;
                return (
                  <line
                    key={`${stop.id}-${nextStop.id}`}
                    x1={`${stop.location.x}%`}
                    y1={`${stop.location.y}%`}
                    x2={`${nextStop.location.x}%`}
                    y2={`${nextStop.location.y}%`}
                    stroke={route.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="opacity-40"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Render Stops */}
      {visibleRoutes.flatMap(r => r.stops).map((stop, index, array) => {
        // filter out duplicates if multiple routes share a stop
        if (array.findIndex(s => s.id === stop.id) !== index) return null;
        return (
          <div
            key={stop.id}
            className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${stop.location.x}%`, top: `${stop.location.y}%` }}
          >
            <div className="w-3 h-3 bg-white border-2 border-slate-800 rounded-full shadow-sm" />
            <span className="mt-1 text-[10px] font-bold text-slate-700 bg-white/80 px-1 rounded backdrop-blur-sm whitespace-nowrap">
              {stop.name}
            </span>
          </div>
        );
      })}

      {/* Render Buses */}
      {visibleBuses.map((bus) => {
        const route = routes.find((r) => r.id === bus.routeId);
        if (!route) return null;
        const coords = getBusCoordinates(bus, route);

        return (
          <motion.div
            key={bus.id}
            className="absolute z-30 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
            animate={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
            }}
            transition={{ ease: "linear", duration: 1 }}
          >
            <div 
              className="p-1.5 rounded-lg shadow-md border border-white flex items-center gap-1"
              style={{ backgroundColor: route.color }}
            >
              <BusIcon className="w-4 h-4 text-white" />
              <span className="text-[10px] font-bold text-white px-0.5">{bus.id}</span>
            </div>
            
            {/* Pulse effect if moving */}
            {bus.status === 'In Transit' && (
              <span className="absolute flex w-6 h-6 -z-10">
                <span 
                  className="absolute inline-flex w-full h-full rounded-full opacity-50 animate-ping"
                  style={{ backgroundColor: route.color }}
                />
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
