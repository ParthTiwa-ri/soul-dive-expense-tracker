'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { PlusCircle, BookOpen, BarChart3, ShieldCheck } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'entry' | 'ledger' | 'dashboard' | 'approvals';
  onSelectTab: (tab: 'entry' | 'ledger' | 'dashboard' | 'approvals') => void;
  pendingApprovalsCount?: number;
}

export default function BottomNav({
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
}: BottomNavProps) {
  const { language, currentUser } = useApp();
  const isHindi = language === 'hi';
  const isOwner = currentUser.role === 'owner';

  const allTabs = [
    {
      id: 'entry' as const,
      labelHi: 'खर्च दर्ज करें',
      labelEn: 'Add Expense',
      icon: PlusCircle,
      requiresOwner: false,
    },
    {
      id: 'ledger' as const,
      labelHi: 'बहीखाता',
      labelEn: 'Ledger',
      icon: BookOpen,
      requiresOwner: false,
    },
    {
      id: 'dashboard' as const,
      labelHi: 'रिपोर्ट्स',
      labelEn: 'Reports',
      icon: BarChart3,
      requiresOwner: false,
    },
    {
      id: 'approvals' as const,
      labelHi: 'सत्यापन',
      labelEn: 'Approvals',
      icon: ShieldCheck,
      badge: pendingApprovalsCount,
      requiresOwner: true,
    },
  ];

  // Filter tabs: Contributor sees 3 simple tabs, Manu (owner) sees all 4 including Approvals
  const visibleTabs = allTabs.filter((tab) => !tab.requiresOwner || isOwner);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-lg">
      <div className={`max-w-md mx-auto grid ${visibleTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} px-2 py-1.5`}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = (tab as any).badge || 0;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-cyan-700 font-bold bg-cyan-50/80'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    isActive ? 'stroke-[2.5px] text-cyan-600' : 'stroke-[1.75px]'
                  }`}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-sm">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight truncate">
                {isHindi ? tab.labelHi : tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
