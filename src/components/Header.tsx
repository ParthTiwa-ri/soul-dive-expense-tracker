'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { CloudOff, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import SecretPinModal from '@/components/SecretPinModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';

export default function Header() {
  const {
    currentUser,
    language,
    isOnline,
    syncStats,
    triggerSync,
    isSyncing,
    isSuperAdmin,
  } = useApp();

  const isHindi = language === 'hi';
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);

  const handleHardRefresh = async () => {
    if (isHardRefreshing) return;
    setIsHardRefreshing(true);
    try {
      // 1. Sync pending data if online
      if (isOnline) {
        await triggerSync();
      }

      // 2. Clear service worker caches to remove stale JS/CSS/HTML bundles
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      // 3. Trigger Service Worker update check
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update().catch(() => {});
        }
      }

      // Give brief visual feedback with spinner
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (err) {
      console.warn('Cache clearing notice:', err);
    }

    // 4. Force cache-busting reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.href = url.toString();
    }
  };

  // Hidden 5-tap sequence on logo within 2 seconds
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 700) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setIsSecretModalOpen(true);
    }
  };

  const userInitial = isSuperAdmin
    ? 'P'
    : currentUser.fullName
    ? currentUser.fullName.trim()[0].toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-cyan-900/50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Name & Water Icon (Tap 5 times rapidly for Super Admin) */}
        <div
          onClick={handleLogoTap}
          className="flex items-center gap-2.5 cursor-pointer select-none active:scale-95 transition-transform"
          title="Soul Dive"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-cyan-400/40 bg-white flex items-center justify-center flex-shrink-0">
            <img src="/icons/icon-192.png" alt="Soul Dive" className="w-full h-full object-cover" />
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

        {/* Sync Status Badge & Profile Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Offline / Sync Status Indicator */}
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHindi ? 'ऑफलाइन' : 'Offline'}</span>
            </div>
          ) : syncStats.pendingCount > 0 ? (
            <button
              type="button"
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
            <button
              type="button"
              onClick={handleHardRefresh}
              disabled={isHardRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all cursor-pointer shadow-sm disabled:opacity-75"
              title={isHindi ? 'नया अपडेट जांचें और रीलोड करें' : 'Check for updates & reload'}
            >
              {isHardRefreshing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{isHindi ? 'रीलोड...' : 'Updating...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isHindi ? 'सुरक्षित' : 'Synced'}</span>
                </>
              )}
            </button>
          )}

          {/* Profile Avatar Button (Option 1) */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`relative flex items-center justify-center transition-all active:scale-95 select-none ${
              isSuperAdmin
                ? 'w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/80 hover:ring-amber-300'
                : 'w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 text-white font-black text-sm shadow-md shadow-cyan-950/60 border border-cyan-300/40 hover:ring-2 hover:ring-cyan-400/60'
            }`}
            title={isHindi ? `${currentUser.fullName} (सेटिंग्स)` : `${currentUser.fullName} (Settings)`}
            aria-label="Profile and Settings"
          >
            {isSuperAdmin ? (
              <Shield className="w-5 h-5 stroke-[2.5px]" />
            ) : (
              <span>{userInitial}</span>
            )}
          </button>
        </div>
      </div>

      {/* Profile & Settings Drawer / Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Secret PIN Entry Backdoor Modal (5-tap on logo) */}
      <SecretPinModal
        isOpen={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
      />
    </header>
  );
}
