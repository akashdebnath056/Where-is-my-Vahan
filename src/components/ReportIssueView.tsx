import React, { useState } from 'react';
import { StaticPage } from './StaticPage';
import { AlertTriangle, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function ReportIssueView({ onBack }: { onBack: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'issues'), {
        subject,
        description,
        status: 'open',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error) {
      console.error("Error submitting issue: ", error);
      alert('Failed to submit issue. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StaticPage title="Report Issue" onBack={onBack}>
      {submitted ? (
        <div className="flex flex-col items-center justify-center py-12 text-center fade-in">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Issue Reported</h3>
          <p className="text-slate-500 dark:text-slate-400">Thank you for letting us know. Our team will look into it.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Encountered a problem with a bus, route, or the app? Let us know below so we can fix it.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject</label>
            <input 
              id="subject"
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g., Wrong bus route, App crashed, etc."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-300">Description</label>
            <textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about what went wrong..."
              className="w-full h-32 resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !subject.trim() || !description.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Submit Report
              </>
            )}
          </button>
        </form>
      )}
    </StaticPage>
  );
}
