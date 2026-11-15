'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { DEFAULT_PROFILES } from '@/lib/constants';
import { Waves, CloudOff, RefreshCw, CheckCircle2, UserCircle2, Globe } from 'lucide-react';

export default function Header() {
  const { currentUser, setCurrentUser, language, setLanguage, isOnline, syncStats, triggerSync, isSyncing } = useApp();

  const isHindi = language === 'hi';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-cyan-900/50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Name & Water Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-wide text-white">
              Soul Dive <span className="text-cyan-400">{isHindi ? 'खर्चा' : 'Expense'}</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {isHindi ? 'वाटरपार्क खर्च लेजर' : 'Water Park Ledger'}
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Offline / Sync Status Indicator */}
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHindi ? 'ऑफलाइन' : 'Offline'}</span>
            </div>
          ) : syncStats.pendingCount > 0 ? (
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-all active:scale-95"
              title={isHindi ? 'सर्वर पर सिंक करें' : 'Sync to server'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-300'}`} />
              <span>
                {syncStats.pendingCount} {isHindi ? 'सिंक बाकी' : 'pending'}
              </span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isHindi ? 'सुरक्षित' : 'Synced'}</span>
            </div>
          )}

          {/* User Profile Switcher */}
          <div className="relative flex items-center">
            <select
              value={currentUser.id}
              onChange={(e) => {
                const user = DEFAULT_PROFILES.find((p) => p.id === e.target.value);
                if (user) setCurrentUser(user);
              }}
              className="bg-slate-800 text-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer max-w-[130px] truncate"
            >
              {DEFAULT_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(isHindi ? 'en' : 'hi')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isHindi ? 'EN' : 'हिन्दी'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

