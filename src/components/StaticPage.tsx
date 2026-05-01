import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface StaticPageProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

export function StaticPage({ title, onBack, children }: StaticPageProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
       <header className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
         <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-800 dark:text-white" />
         </button>
         <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
       </header>
       <div className="flex-1 p-6 overflow-y-auto prose dark:prose-invert">
         {children}
       </div>
    </div>
  );
}
