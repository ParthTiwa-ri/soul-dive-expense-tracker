'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR } from '@/lib/constants';
import { db } from '@/lib/db';
import { Scale, CheckCircle2, AlertCircle, ShieldCheck, Banknote } from 'lucide-react';

interface ReconciliationViewProps {
  expenses: Expense[];
  onRefresh?: () => void;
}

export default function ReconciliationView({ expenses, onRefresh }: ReconciliationViewProps) {
  const { language, currentUser } = useApp();
  const isHindi = language === 'hi';

  const [openingBalance, setOpeningBalance] = useState<string>('10000');
  const [actualClosing, setActualClosing] = useState<string>('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Today's Cash Expenses
  const todayStr = new Date().toISOString().split('T')[0];

  const todayCashExpenses = useMemo(() => {
    return expenses.filter(
      (e) =>
        e.paymentDate === todayStr &&
        e.paymentMethod === 'cash' &&
        e.status !== 'voided'
    );
  }, [expenses, todayStr]);

  const totalCashOutflow = useMemo(() => {
    return todayCashExpenses.reduce((sum, e) => sum + e.amountPaise, 0);
  }, [todayCashExpenses]);

  const parsedOpening = (parseFloat(openingBalance) || 0) * 100;
  const expectedClosing = parsedOpening - totalCashOutflow;
  const parsedActual = actualClosing ? (parseFloat(actualClosing) || 0) * 100 : null;
  const discrepancy = parsedActual !== null ? parsedActual - expectedClosing : 0;

  // Verification Queue
  const unverifiedExpenses = useMemo(() => {
    return expenses.filter((e) => e.verificationStatus === 'pending' && e.status !== 'voided');
  }, [expenses]);

  const handleVerify = async (clientUuid: string) => {
    try {
      await db.expenses.update(clientUuid, {
        verificationStatus: 'verified',
        verifiedByUserId: currentUser.id,
        verifiedAt: new Date().toISOString(),
        syncStatus: 'pending', // Sync verification update
      });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to verify expense:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Daily Cash Drawer Balancing Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Banknote className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {isHindi ? 'दैनिक नकद मिलान (Daily Cash Reconciliation)' : 'Daily Cash Reconciliation'}
            </h3>
            <p className="text-xs text-slate-400">
              {isHindi ? 'साइट पर नकद गल्ला एवं खर्च की जांच' : 'Site petty cash balance audit'}
            </p>
          </div>
        </div>

        {/* Inputs & Calculated Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {isHindi ? 'सुबह का प्रारंभिक कैश (Opening Balance ₹)' : 'Opening Cash Balance (₹)'}
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              {isHindi ? 'आज का कुल नकद खर्च (Cash Outflow)' : "Today's Cash Outflow"}
            </label>
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-black text-rose-800">
              - {formatINR(totalCashOutflow)}
            </div>
          </div>
        </div>

        {/* Expected vs Actual Closing */}
        <div className="p-4 bg-cyan-50/70 border border-cyan-200 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">
              {isHindi ? 'गल्ले में होना चाहिए (Expected Balance):' : 'Expected Balance in Drawer:'}
            </span>
            <span className="font-black text-base text-cyan-950">
              {formatINR(expectedClosing)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isHindi ? 'शाम को गिना गया वास्तविक कैश (Actual Closing ₹):' : 'Actual Cash Counted (₹):'}
            </label>
            <input
              type="number"
              placeholder={isHindi ? 'गिने हुए रुपये दर्ज करें' : 'Counted amount'}
              value={actualClosing}
              onChange={(e) => setActualClosing(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-cyan-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-cyan-600"
            />
          </div>

          {parsedActual !== null && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                discrepancy === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : discrepancy < 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span>{isHindi ? 'अंतर (Difference / Discrepancy):' : 'Difference:'}</span>
              <span>
                {discrepancy === 0
                  ? isHindi
                    ? 'पूर्ण मिलान (Exact Match) ✓'
                    : 'Exact Match ✓'
                  : formatINR(discrepancy)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Verification Queue (PRD Section 2: Manager / Owner Review) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-700" />
            <h3 className="font-bold text-sm text-slate-900">
              {isHindi ? 'सत्यापन कतार (Manager Verification Queue)' : 'Verification Queue'}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
            {unverifiedExpenses.length} {isHindi ? 'जांच बाकी' : 'pending'}
          </span>
        </div>

        {unverifiedExpenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {isHindi ? 'सभी खर्च सत्यापित (Verified) हैं!' : 'All recorded expenses are verified!'}
          </p>
        ) : (
          <div className="space-y-2">
            {unverifiedExpenses.map((exp) => (
              <div
                key={exp.clientUuid}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{exp.description}</span>
                  <span className="text-slate-500">
                    {exp.paidByName} • {formatINR(exp.amountPaise)} • {exp.paymentMethod.toUpperCase()}
                  </span>
                </div>

                <button
                  onClick={() => handleVerify(exp.clientUuid)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'मंजूर करें' : 'Verify'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
