'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { DEFAULT_PROFILES } from '@/lib/constants';
import { db, initializeLocalDatabase } from '@/lib/db';
import { syncPendingExpenses, SyncStats } from '@/lib/syncEngine';

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  isOnline: boolean;
  syncStats: SyncStats;
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_PROFILES[0]); // Defaults to Father
  const [language, setLanguage] = useState<'hi' | 'en'>('hi'); // Defaults to Hindi
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    isOnline: true,
  });

  // 1. Initialize local DB and listen to online/offline state
  useEffect(() => {
    initializeLocalDatabase();

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        triggerSync();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Register Service Worker for PWA
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // 2. Poll / Update sync stats from Dexie
  const refreshSyncStats = async () => {
    try {
      const pending = await db.expenses.where('syncStatus').equals('pending').count();
      const syncing = await db.expenses.where('syncStatus').equals('syncing').count();
      const failed = await db.expenses.where('syncStatus').equals('failed').count();

      setSyncStats((prev) => ({
        ...prev,
        pendingCount: pending,
        syncingCount: syncing,
        failedCount: failed,
        isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      }));
    } catch (e) {
      // IndexedDB might not be ready yet
    }
  };

  useEffect(() => {
    refreshSyncStats();
    const interval = setInterval(refreshSyncStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Manual or automated sync trigger
  const triggerSync = async () => {
    if (isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    setIsSyncing(true);
    try {
      await syncPendingExpenses();
      setSyncStats((prev) => ({ ...prev, lastSyncAt: new Date().toISOString() }));
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
      await refreshSyncStats();
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        language,
        setLanguage,
        isOnline,
        syncStats,
        triggerSync,
        isSyncing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

