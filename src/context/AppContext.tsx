'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { DEFAULT_PROFILES, SUPER_ADMIN_PROFILE, SUPER_ADMIN_SECRET_PIN } from '@/lib/constants';
import { db, initializeLocalDatabase } from '@/lib/db';
import { syncPendingExpenses, applyRemoteRealtimeEvent, SyncStats } from '@/lib/syncEngine';
import { supabase } from '@/lib/supabase';

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  language: 'hi' | 'en';
  setLanguage: (lang: 'hi' | 'en') => void;
  isOnline: boolean;
  syncStats: SyncStats;
  syncVersion: number;
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
  isSuperAdmin: boolean;
  unlockSuperAdmin: (pin: string) => boolean;
  exitSuperAdmin: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserProfile>(DEFAULT_PROFILES[0]); // Defaults to Krishna Murari Tiwari (Father)
  const [language, setLanguageState] = useState<'hi' | 'en'>('hi'); // Defaults to Hindi
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    isOnline: true,
  });

  // Restore remembered device user profile and language on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserId = localStorage.getItem('souldive_user_id');
      if (savedUserId) {
        if (savedUserId === SUPER_ADMIN_PROFILE.id) {
          setCurrentUserState(SUPER_ADMIN_PROFILE);
        } else {
          const found = DEFAULT_PROFILES.find((p) => p.id === savedUserId);
          if (found) {
            setCurrentUserState(found);
          }
        }
      }
      const savedLang = localStorage.getItem('souldive_language');
      if (savedLang === 'hi' || savedLang === 'en') {
        setLanguageState(savedLang);
      }
    }
  }, []);

  const setCurrentUser = (user: UserProfile) => {
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('souldive_user_id', user.id);
    }
  };

  const isSuperAdmin = currentUser.role === 'super_admin';

  const unlockSuperAdmin = (pin: string): boolean => {
    if (typeof window === 'undefined') return false;
    const storedPin = localStorage.getItem('souldive_super_pin') || SUPER_ADMIN_SECRET_PIN;
    if (pin.trim() === storedPin.trim()) {
      setCurrentUser(SUPER_ADMIN_PROFILE);
      return true;
    }
    return false;
  };

  const exitSuperAdmin = () => {
    // Return back to regular owner (Manu Shukla)
    setCurrentUser(DEFAULT_PROFILES[1]);
  };

  const setLanguage = (lang: 'hi' | 'en') => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('souldive_language', lang);
    }
  };

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
      const currentOnline = typeof window !== 'undefined' ? navigator.onLine : true;

      setSyncStats((prev) => {
        if (
          prev.pendingCount === pending &&
          prev.syncingCount === syncing &&
          prev.failedCount === failed &&
          prev.isOnline === currentOnline
        ) {
          return prev; // No state mutation, zero unnecessary re-renders
        }
        setSyncVersion((v) => v + 1);
        return {
          ...prev,
          pendingCount: pending,
          syncingCount: syncing,
          failedCount: failed,
          isOnline: currentOnline,
        };
      });
    } catch (e) {
      // IndexedDB might not be ready yet
    }
  };

  useEffect(() => {
    refreshSyncStats();
    const interval = setInterval(refreshSyncStats, 3000);

    // Initial background sync on startup if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      triggerSync();
    }

    // Adaptive background fallback sync every 15 seconds (WebSockets already deliver sub-50ms instant updates)
    const periodicSync = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        triggerSync();
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(periodicSync);
    };
  }, []);

  // 3. Same-device cross-tab instant broadcast (< 10ms via HTML5 BroadcastChannel)
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const localTab = new BroadcastChannel('souldive_tab_sync');
    localTab.onmessage = async (event) => {
      try {
        if (event.data?.type === 'expense_deleted' && event.data.clientUuid) {
          await db.expenses.delete(event.data.clientUuid);
          await refreshSyncStats();
        } else {
          await triggerSync();
        }
      } catch (err) {
        console.warn('Local cross-tab sync error:', err);
      }
    };
    return () => localTab.close();
  }, []);

  // 4. Supabase Realtime Broadcast & CDC for instant, 0-refresh multi-device synchronization
  useEffect(() => {
    if (!supabase) return;

    try {
      const channel = supabase.channel('expenses_live_shared');

      // Instant client-to-client broadcast (< 50ms)
      channel.on('broadcast', { event: 'expense_updated' }, async () => {
        try {
          await triggerSync();
        } catch (err) {
          console.warn('Realtime broadcast sync error:', err);
        }
      });

      // Instant client-to-client deletion broadcast (< 50ms)
      channel.on('broadcast', { event: 'expense_deleted' }, async (payload) => {
        try {
          const deletedUuid = payload.payload?.clientUuid;
          if (deletedUuid) {
            await db.expenses.delete(deletedUuid);
            await refreshSyncStats();
          } else {
            await triggerSync();
          }
        } catch (err) {
          console.warn('Realtime delete event error:', err);
        }
      });

      // Database WAL changes as secondary backup
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        async (payload) => {
          try {
            const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
            await applyRemoteRealtimeEvent(payload.eventType as any, row);
            await refreshSyncStats();
          } catch (err) {
            console.warn('Realtime local update error:', err);
            triggerSync();
          }
        }
      );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Instantly sync any missed transactions upon socket connection or reconnection
          triggerSync();
        }
      });

      return () => {
        supabase?.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime subscription setup failed:', e);
    }
  }, []);

  // 4. Instant pull when user switches tabs or wakes up phone screen
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (navigator.onLine) {
        triggerSync();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 5. Manual or automated sync trigger
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
        syncVersion,
        triggerSync,
        isSyncing,
        isSuperAdmin,
        unlockSuperAdmin,
        exitSuperAdmin,
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

