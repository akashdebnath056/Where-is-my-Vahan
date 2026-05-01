import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Menu, X, Info, Phone, MessageSquare, Bus, Moon, Sun, Bell, Settings as SettingsIcon, Share2, Map as MapIcon, AlertTriangle } from 'lucide-react';

import { useLiveBuses, LiveBus } from './hooks/useLiveBuses';
import { useUserLocation } from './hooks/useUserLocation';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useRoutes } from './hooks/useRoutes';
import { HomeView } from './components/HomeView';
import { BusDetailView } from './components/BusDetailView';
import GoogleTransitMap from './components/GoogleTransitMap';
import { CrowdsourceModal } from './components/CrowdsourceModal';
import { StaticPage } from './components/StaticPage';
import DriverMode from './components/DriverMode';
import { DriverProfileSetup } from './components/DriverProfileSetup';
import { ReportIssueView } from './components/ReportIssueView';
import { AuthView } from './components/AuthView';

import { seedRoutes } from './lib/seedData';

type ViewState = 'home' | 'detail' | 'map' | 'about' | 'contact' | 'feedback' | 'alerts' | 'settings' | 'city' | 'driver-profile' | 'report-issue' | 'driver-auth';

export default function App() {
  const { buses, loading: busesLoading, error: busesError } = useLiveBuses();
  const { routes, loading: routesLoading, error: routesError } = useRoutes();
  const { location: userLocation, error: locError } = useUserLocation();
  const isOnline = useNetworkStatus();
  
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCrowdsource, setShowCrowdsource] = useState(false);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [city, setCity] = useState("Agartala");

  useEffect(() => {
    seedRoutes().catch(console.error);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) setIsDarkMode(true);
  }, []);

  const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  const navigateToBusDetail = (bus: LiveBus) => {
    setSelectedBus(bus);
    setCurrentView('detail');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Where is my Vahan',
        text: 'Track real-time buses in ' + city + ' with Where is my Vahan!',
        url: window.location.href,
      }).catch(e => {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      });
    } else {
      alert("Sharing is not supported on this browser.");
    }
  };

  const menuItems = [
    { icon: Bell, label: 'View Alerts', action: () => { setCurrentView('alerts'); setMenuOpen(false); } },
    { icon: AlertTriangle, label: 'Report Issue', action: () => { setCurrentView('report-issue'); setMenuOpen(false); } },
    { icon: MessageSquare, label: 'Suggest a Feature', action: () => { setCurrentView('feedback'); setMenuOpen(false); } },
    { icon: SettingsIcon, label: 'Settings', action: () => { setCurrentView('settings'); setMenuOpen(false); } },
    { icon: Share2, label: 'Share the App', action: () => { handleShare(); setMenuOpen(false); } },
    { icon: MapIcon, label: 'Select Your City', action: () => { setCurrentView('city'); setMenuOpen(false); } },
    { icon: Info, label: 'About', action: () => { setCurrentView('about'); setMenuOpen(false); } },
    { icon: Phone, label: 'Contact Us', action: () => { setCurrentView('contact'); setMenuOpen(false); } },
  ];

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-lg mx-auto relative overflow-hidden font-sans border-x border-slate-200/50 dark:border-slate-800 shadow-xl ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Network Error Banners / Offline Indicator */}
      {!isOnline && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800/50 px-4 py-2 shrink-0 z-40 flex items-center justify-center gap-2">
           <Info className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
           <p className="text-xs font-bold text-orange-700 dark:text-orange-300">
             Offline mode. Displaying last known data.
           </p>
        </div>
      )}
      {(busesError || routesError) && isOnline && (
        <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-4 py-2 shrink-0 z-40 flex items-center gap-2">
           <Info className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
           <p className="text-xs font-medium text-red-700 dark:text-red-300 truncate">
             {busesError || routesError}
           </p>
        </div>
      )}

      {/* Dynamic Top App Bar for Home & Map only (Detail/Static have their own back headers) */}
      {(currentView === 'home' || currentView === 'map') && (
        <header className="flex items-center justify-between px-4 py-4 bg-indigo-600 dark:bg-indigo-900 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMenuOpen(true)}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Where is my Vahan</h1>
          </div>
          {currentView === 'map' && (
             <button 
              onClick={() => setCurrentView('detail')} 
              className="text-xs font-bold text-indigo-100 uppercase tracking-wider bg-indigo-700 dark:bg-indigo-800 px-3 py-1.5 rounded-full"
             >
               List View
             </button>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'home' && (
          <HomeView 
            buses={buses} 
            routes={routes}
            userLocation={userLocation} 
            onBusSelect={navigateToBusDetail} 
            openCrowdsource={() => setShowCrowdsource(true)}
          />
        )}

        {currentView === 'detail' && selectedBus && (
          <BusDetailView 
            bus={selectedBus} 
            routes={routes}
            onBack={() => setCurrentView('home')} 
            onViewMap={() => setCurrentView('map')} 
          />
        )}

        {currentView === 'map' && selectedBus && (
          <div className="h-full w-full relative">
            {GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleTransitMap buses={[selectedBus]} routes={routes} selectedRouteId={selectedBus.routeId} />
              </APIProvider>
            ) : (
               <div className="flex flex-col items-center justify-center p-8 text-center h-full text-slate-500 dark:text-slate-400">
                  Must provide VITE_GOOGLE_MAPS_API_KEY in environment to view maps.
               </div>
            )}
          </div>
        )}

         {currentView === 'about' && (
           <StaticPage title="About" onBack={() => setCurrentView('home')}>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium"><strong>Where is my Vahan</strong> is a crowdsourced community transit tracking application. Inspired by tools that democratize information, we allow everyday passengers and bus drivers to broadcast GPS transit data seamlessly so anyone can find their next ride.</p>
           </StaticPage>
         )}

         {currentView === 'contact' && (
           <StaticPage title="Contact Us" onBack={() => setCurrentView('home')}>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">Reach out via support@whereismyvahan.app for fleet partnerships and API integrations.</p>
           </StaticPage>
         )}

         {currentView === 'report-issue' && (
           <ReportIssueView onBack={() => setCurrentView('home')} />
         )}

         {currentView === 'feedback' && (
           <StaticPage title="Suggest a Feature" onBack={() => setCurrentView('home')}>
             <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">Drop your app feedback and feature requests!</p>
             <textarea className="w-full mt-4 p-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={5} placeholder="Write something..."></textarea>
             <button className="mt-4 px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl font-bold active:scale-95 transition-transform">Submit</button>
           </StaticPage>
         )}
         
         {currentView === 'alerts' && (
           <StaticPage title="Live Alerts" onBack={() => setCurrentView('home')}>
             <div className="flex flex-col gap-3">
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-xl">
                  <h3 className="font-bold text-orange-800 dark:text-orange-300 text-lg">Road Blockage</h3>
                  <p className="text-orange-700 dark:text-orange-400 mt-1">VIP Road is temporarily closed due to construction. Expect delays.</p>
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">New Route Added</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Route 7 has been officially added to the Agartala fleet.</p>
                </div>
             </div>
           </StaticPage>
         )}

         {currentView === 'settings' && (
           <StaticPage title="Settings" onBack={() => setCurrentView('home')}>
             <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                   <span className="font-bold text-slate-800 dark:text-white">Dark Mode</span>
                   <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                   >
                     <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                   <span className="font-bold text-slate-800 dark:text-white">Push Notifications</span>
                   <button className="w-12 h-6 rounded-full bg-indigo-500 relative">
                     <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white translate-x-6 transition-transform" />
                   </button>
                </div>
             </div>
           </StaticPage>
         )}

         {currentView === 'city' && (
           <StaticPage title="Select City" onBack={() => setCurrentView('home')}>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Choose your city to see relevant transit networks.</p>
             <div className="flex flex-col gap-3">
                {["Agartala", "Guwahati", "Shillong"].map(c => (
                  <button 
                    key={c}
                    onClick={() => setCity(c)}
                    className={`p-4 rounded-xl border text-left font-bold transition-colors ${
                      city === c 
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {c} {c === "Agartala" && <span className="ml-2 text-xs font-normal bg-indigo-100 dark:bg-indigo-800 px-2 py-0.5 rounded-full text-indigo-600 dark:text-indigo-200">Currently Launching</span>}
                  </button>
                ))}
             </div>
           </StaticPage>
         )}

         {currentView === 'driver-auth' && (
           <AuthView 
             onBack={() => setCurrentView('home')} 
             onSuccess={() => { setCurrentView('home'); setMenuOpen(true); }} 
           />
         )}

         {currentView === 'driver-profile' && (
           <DriverProfileSetup onComplete={() => setCurrentView('home')} />
         )}
      </main>

      {/* Slide-out Sidebar Menu */}
      <div className={`absolute inset-0 z-50 flex transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         {/* Backdrop */}
         <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMenuOpen(false)} />
         
         {/* Drawer */}
         <div className={`relative w-4/5 max-w-sm bg-slate-50 dark:bg-slate-900 h-full flex flex-col shadow-2xl transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 bg-indigo-600 dark:bg-indigo-900 text-white">
                 <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-600 dark:text-indigo-900">
                      <Bus className="w-7 h-7" />
                    </div>
                    {/* Theme Toggle Button */}
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)} 
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Toggle Dark Mode"
                    >
                      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                 </div>
                 <h2 className="text-2xl font-bold tracking-tight">Vahan Settings</h2>
                 <p className="text-indigo-200 text-sm mt-1">v1.2.0 • {city}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {menuItems.map(item => (
                  <button 
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-4 w-full p-4 rounded-2xl hover:bg-slate-200/50 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors text-left"
                  >
                    <item.icon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-base">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                 <DriverMode 
                    onEditProfile={() => {
                        setCurrentView('driver-profile');
                        setMenuOpen(false);
                    }} 
                    onSignIn={() => {
                        setCurrentView('driver-auth');
                        setMenuOpen(false);
                    }}
                 />
              </div>
           </div>
        </div>

      {/* Modals */}
      {showCrowdsource && (
        <CrowdsourceModal 
          userLocation={userLocation} 
          onClose={() => setShowCrowdsource(false)} 
        />
      )}
    </div>
  );
}
