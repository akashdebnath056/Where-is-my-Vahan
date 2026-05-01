import React, { useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export const PlacesAutocompleteInput = ({ 
  value, 
  onChange, 
  onPlaceSelected, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  onPlaceSelected: (name: string, location: {lat: number, lng: number}) => void;
  placeholder: string;
}) => {
  const places = useMapsLibrary('places');
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const widget = new places.Autocomplete(inputRef.current, {
      fields: ['name', 'geometry', 'formatted_address']
    });

    const listener = widget.addListener('place_changed', () => {
      const place = widget.getPlace();
      if (place.geometry?.location) {
        const name = place.name || place.formatted_address || '';
        onPlaceSelected(name, {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    });

    return () => {
      if (listener) google.maps.event.removeListener(listener);
    };
  }, [places, onPlaceSelected]);

  return (
    <input 
       ref={inputRef}
       type="text" 
       placeholder={placeholder}
       value={value} 
       onChange={e => onChange(e.target.value)} 
       className="w-full text-sm p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500" 
    />
  );
};
