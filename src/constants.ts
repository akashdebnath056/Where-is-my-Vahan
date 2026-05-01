import { Loader2, CheckCircle2, Timer, AlertOctagon, Bus } from 'lucide-react';

export const BUS_STATUSES = [
  { 
    id: 'In Transit', 
    label: 'In Transit', 
    color: 'emerald', 
    icon: Bus,
    description: 'Bus is moving normally between stops.'
  },
  { 
    id: 'Approaching Stop', 
    label: 'Approaching Stop', 
    color: 'blue', 
    icon: Loader2,
    description: 'Bus is near the next stop and will arrive shortly.'
  },
  { 
    id: 'At Stop', 
    label: 'At Stop (Boarding)', 
    color: 'indigo', 
    icon: CheckCircle2,
    description: 'Bus is currently at a stop for passengers to board.'
  },
  { 
    id: 'Delayed', 
    label: 'Delayed', 
    color: 'amber', 
    icon: Timer,
    description: 'Bus is running behind schedule due to traffic or other issues.'
  },
  { 
    id: 'Breakdown', 
    label: 'Breakdown', 
    color: 'red', 
    icon: AlertOctagon,
    description: 'Bus has encountered a technical issue and is currently out of service.'
  }
];

export type BusStatusId = 'In Transit' | 'Approaching Stop' | 'At Stop' | 'Delayed' | 'Breakdown';

export const getStatusConfig = (statusId: string) => {
  return BUS_STATUSES.find(s => s.id === statusId) || BUS_STATUSES[0];
};
