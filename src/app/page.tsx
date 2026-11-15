'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { db } from '@/lib/db';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import RecentExpensesList from '@/components/RecentExpensesList';
import { Mic, Plus, CloudOff, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

// Lazy-load heavy components on demand so initial page load and LCP are instantaneous (< 1s)
const DashboardView = dynamic(() => import('@/components/DashboardView'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
      लोड हो रहा है...
    </div>
  ),
});

const LedgerView = dynamic(() => import('@/components/LedgerView'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
      लोड हो रहा है...
    </div>
  ),
});

const ApprovalView = dynamic(() => import('@/components/ApprovalView'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
      लोड हो रहा है...
    </div>
  ),
});

const VoiceRecorderModal = dynamic(() => import('@/components/VoiceRecorderModal'), {
  ssr: false,
});

const QuickExpenseModal = dynamic(() => import('@/components/QuickExpenseModal'), {
  ssr: false,
});

export default function HomePage() {
  const { language, isOnline, syncStats, triggerSync, isSyncing, currentUser, syncVersion, toast } = useApp();
  const isHindi = language === 'hi';

  const [activeTab, setActiveTab] = useState<'entry' | 'ledger' | 'dashboard' | 'approvals'>('entry');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInitialData, setManualInitialData] = useState<Partial<Expense> | null>(null);

  // If current active tab is approvals but user is not owner/super_admin, safely fallback to entry tab
  React.useEffect(() => {
    const isOwnerOrSuper = currentUser.role === 'owner' || currentUser.role === 'super_admin';
    if (!isOwnerOrSuper && activeTab === 'approvals') {
      setActiveTab('entry');
    }
  }, [currentUser.role, activeTab]);

  // Live reactive query directly linked to Dexie IndexedDB (strictly active, non-voided expenses)
  const liveExpenses = useLiveQuery(
    async () => {
      const activeExpenses = await db.expenses
        .filter((e) => e.status !== 'voided')
        .toArray();
      return activeExpenses.sort(
        (a, b) => new Date(b.deviceCreatedAt).getTime() - new Date(a.deviceCreatedAt).getTime()
      );
    },
    [syncVersion],
    []
  );

  const expenses = liveExpenses || [];
  const pendingApprovalsCount = expenses.filter(
    (e) => e.verificationStatus === 'pending' && e.status !== 'voided'
  ).length;

  const handleExpenseSaved = (newExpense: Expense) => {
    // Attempt background sync if online
    if (navigator.onLine) {
      triggerSync();
    }
  };

  const handleEditManuallyFromVoice = (initialData: Partial<Expense>) => {
    setManualInitialData(initialData);
    setIsManualModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 pb-28">
        {/* Offline Alert Banner */}
        {!isOnline && (
          <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium animate-in fade-in">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                {isHindi
                  ? 'इंटरनेट बंद है — रिकॉर्ड फोन में सुरक्षित रहेंगे और बाद में सिंक होंगे।'
                  : 'You are offline — expenses will be saved locally and synced once reconnected.'}
              </span>
            </div>
          </div>
        )}

        {/* Sync Pending Banner */}
        {isOnline && syncStats.pendingCount > 0 && (
          <div className="mb-4 p-3.5 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center justify-between text-xs text-cyan-900 font-medium animate-in fade-in">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-cyan-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isHindi
                  ? `${syncStats.pendingCount} नए खर्च सिंक होने बाकी हैं`
                  : `${syncStats.pendingCount} expenses pending cloud sync`}
              </span>
            </div>
            <button
              onClick={triggerSync}
              disabled={isSyncing}
              className="px-3 py-1 bg-cyan-700 text-white font-bold rounded-xl text-xs hover:bg-cyan-600 transition-colors"
            >
              {isHindi ? 'अभी सिंक करें' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* TAB 1: ENTRY SCREEN (FATHER-FIRST EXPERIENCE) */}
        {activeTab === 'entry' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Primary Action: Big Prominent Speak Button (PRD Section 23.2) */}
            <div className="bg-gradient-to-b from-white to-cyan-50/50 rounded-3xl p-6 border border-cyan-100 shadow-md text-center flex flex-col items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                {isHindi ? 'सबसे आसान तरीका' : 'Easiest Method'}
              </span>

              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                {isHindi ? 'बोलकर खर्च दर्ज करें' : 'Speak to Record Expense'}
              </h2>

              <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
                {isHindi
                  ? 'नीचे का बड़ा माइक बटन दबाएं और बोलें। ऐप अपने आप रकम और काम पहचान लेगा।'
                  : 'Tap the large button and speak your expense in Hindi. The app extracts details automatically.'}
              </p>

              {/* Dominant Circular Mic Action Button */}
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(50); } catch (e) {}
                  }
                  setIsVoiceModalOpen(true);
                }}
                className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-cyan-600/30 hover:scale-105 active:scale-95 transition-all duration-200 group"
              >
                <Mic className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
              </button>

              <span className="mt-4 inline-block text-xs font-bold text-cyan-800 bg-cyan-100/80 px-3.5 py-1.5 rounded-full">
                {isHindi ? 'माइक दबाकर बोलें' : 'Tap to speak'}
              </span>

              {/* Ultra-Simple Manual Fallback Button (PRD Section 23.4) */}
              <div className="w-full mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                <button
                  onClick={() => {
                    setManualInitialData(null);
                    setIsManualModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-slate-300 hover:border-cyan-500 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
                >
                  <Plus className="w-4 h-4 text-cyan-600 stroke-[3px]" />
                  <span>{isHindi ? 'टाइप करके दर्ज करें (३ आसान स्टेप)' : 'Type to Enter (3 Simple Fields)'}</span>
                </button>
              </div>
            </div>

            {/* Recent Expenses On This Device */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-extrabold text-sm text-slate-800">
                  {isHindi ? 'इस फोन पर हाल के खर्च' : 'Recent Entries on this Device'}
                </h3>
                <button
                  onClick={() => setActiveTab('ledger')}
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-800"
                >
                  {isHindi ? 'पूरा बहीखाता देखें →' : 'View Full Ledger →'}
                </button>
              </div>

              <RecentExpensesList
                expenses={expenses.slice(0, 10)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: CENTRAL LEDGER */}
        {activeTab === 'ledger' && (
          <div className="animate-in fade-in duration-200">
            <h2 className="text-lg font-black text-slate-900 mb-3 px-1">
              {isHindi ? 'खर्च बहीखाता' : 'Expense Ledger'}
            </h2>
            <LedgerView expenses={expenses} />
          </div>
        )}

        {/* TAB 3: DASHBOARD & ANALYTICS */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-200">
            <h2 className="text-lg font-black text-slate-900 mb-3 px-1">
              {isHindi ? 'खर्च रिपोर्ट एवं आंकड़े' : 'Reports & Analytics'}
            </h2>
            <DashboardView expenses={expenses} />
          </div>
        )}


        {/* TAB 4: APPROVALS & VERIFICATION */}
        {activeTab === 'approvals' && (
          <div className="animate-in fade-in duration-200">
            <ApprovalView expenses={expenses} />
          </div>
        )}
      </main>

      {/* Floating Action Voice Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaved={handleExpenseSaved}
        onEditManually={handleEditManuallyFromVoice}
      />

      {/* Quick 3-Field Manual Modal */}
      <QuickExpenseModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setManualInitialData(null);
        }}
        onSaved={handleExpenseSaved}
        initialData={manualInitialData}
      />

      {/* Floating Bottom Confirmation Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur text-white px-4 py-2.5 rounded-full shadow-2xl border border-cyan-500/40 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Thumb-Zone Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />
    </div>
  );
}

