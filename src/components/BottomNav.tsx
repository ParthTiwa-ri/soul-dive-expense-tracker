'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { PlusCircle, BookOpen, BarChart3, Scale } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'entry' | 'ledger' | 'dashboard' | 'reconcile';
  onSelectTab: (tab: 'entry' | 'ledger' | 'dashboard' | 'reconcile') => void;
}

export default function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const { language } = useApp();
  const isHindi = language === 'hi';

  const tabs = [
    {
      id: 'entry' as const,
      labelHi: 'खर्च दर्ज करें',
      labelEn: 'Add Expense',
      icon: PlusCircle,
    },
    {
      id: 'ledger' as const,
      labelHi: 'बहीखाता',
      labelEn: 'Ledger',
      icon: BookOpen,
    },
    {
      id: 'dashboard' as const,
      labelHi: 'रिपोर्ट्स',
      labelEn: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'reconcile' as const,
      labelHi: 'रोकड़ / रिकंसाइल',
      labelEn: 'Reconcile',
      icon: Scale,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-cyan-700 font-bold bg-cyan-50/80'
                  : 'text-slate-500 hover:text-slate-700 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px] text-cyan-600' : 'stroke-[1.75px]'}`} />
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

