import React from 'react';
import { Bus, Truck, Car, CarFront, HelpCircle } from 'lucide-react';

export function VehicleIcon({ type, className }: { type?: string, className?: string }) {
  if (!type) return <Bus className={className} />;
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('truck')) return <Truck className={className} />;
  if (lowerType.includes('car')) return <Car className={className} />;
  if (lowerType.includes('auto')) return <CarFront className={className} />;
  if (lowerType.includes('van')) return <CarFront className={className} />;
  if (lowerType.includes('bus')) return <Bus className={className} />;
  
  return <Bus className={className} />;
}
