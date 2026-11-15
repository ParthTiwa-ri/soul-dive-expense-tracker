'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR, formatDateIST } from '@/lib/constants';
import { db } from '@/lib/db';
import { ShieldCheck, CheckCircle2, Clock, Receipt, Image as ImageIcon, Check, Edit3, Lock, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import EditExpenseModal from '@/components/EditExpenseModal';
import { deleteRemoteExpense, broadcastExpenseChange } from '@/lib/syncEngine';

interface ApprovalViewProps {
  expenses: Expense[];
}

export default function ApprovalView({ expenses }: ApprovalViewProps) {
  const { language, currentUser, triggerSync } = useApp();
  const isHindi = language === 'hi';
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [filterMode, setFilterMode] = useState<'pending' | 'verified'>('pending');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filter unverified and verified active expenses
  const unverifiedExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.verificationStatus === 'pending' && e.status !== 'voided'
    );
  }, [expenses]);

  const verifiedExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.verificationStatus === 'verified' && e.status !== 'voided'
    );
  }, [expenses]);

  const displayList = filterMode === 'pending' ? unverifiedExpenses : verifiedExpenses;

  // Handle transaction approval / verification
  const handleApprove = async (clientUuid: string) => {
    try {
      await db.expenses.update(clientUuid, {
        verificationStatus: 'verified',
        verifiedByUserId: currentUser.id,
        verifiedAt: new Date().toISOString(),
        syncStatus: 'pending', // Re-sync the verification status to central server
      });

      // Immediately broadcast and sync approval across devices
      broadcastExpenseChange();
      if (typeof window !== 'undefined' && navigator.onLine) {
        triggerSync();
      }

      // Micro celebration feedback
      try {
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { y: 0.8 },
        });
      } catch (e) {}
    } catch (err) {
      console.error('Failed to verify expense:', err);
    }
  };

  // Handle Delete action
  const handleDeleteExpense = async (clientUuid: string, isVerifiedExpense: boolean) => {
    if (isVerifiedExpense && !isSuperAdmin) {
      alert(isHindi ? 'मंजूरशुदा खर्च को डिलीट नहीं किया जा सकता।' : 'Approved expenses cannot be deleted.');
      return;
    }

    const confirmText = isHindi
      ? isVerifiedExpense
        ? '⚡ सुपर एडमिन: क्या आप वाकई इस मंजूरशुदा खर्च को हमेशा के लिए डिलीट करना चाहते हैं?'
        : 'क्या आप इस खर्च को हमेशा के लिए हटाना (Delete) चाहते हैं?'
      : isVerifiedExpense
      ? '⚡ Super Admin: Are you sure you want to permanently DELETE this APPROVED expense?'
      : 'Are you sure you want to permanently delete this expense?';
    if (!confirm(confirmText)) return;

    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        await db.expenses.delete(clientUuid);
        await deleteRemoteExpense(clientUuid);
      } else {
        await db.expenses.update(clientUuid, {
          status: 'voided',
          syncStatus: 'pending',
        });
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white p-5 rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-black">
                {isHindi ? 'खर्च सत्यापन (Approve Expenses)' : 'Expense Approvals'}
              </h2>
              <p className="text-xs text-slate-300">
                {isHindi ? 'मालिक / मैनेजर द्वारा खर्च की मंजूरी' : 'Owner / Manager Verification'}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/30">
            {unverifiedExpenses.length} {isHindi ? 'मंजूरी बाकी' : 'Pending'}
          </span>
        </div>

        {/* Tab Filter: Pending vs Approved */}
        <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('pending')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'pending'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {isHindi ? 'मंजूरी बाकी' : 'Pending Review'} ({unverifiedExpenses.length})
          </button>

          <button
            onClick={() => setFilterMode('verified')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'verified'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {isHindi ? 'मंजूरशुदा' : 'Approved'} ({verifiedExpenses.length})
          </button>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">
              {filterMode === 'pending'
                ? isHindi
                  ? 'कोई खर्च मंजूरी के लिए बाकी नहीं है!'
                  : 'No transactions pending approval!'
                : isHindi
                ? 'अभी कोई मंजूरशुदा खर्च नहीं है'
                : 'No approved transactions yet'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {filterMode === 'pending'
                ? isHindi
                  ? 'सभी दर्ज खर्च सत्यापित किए जा चुके हैं।'
                  : 'All recorded expenses have been verified.'
                : ''}
            </p>
          </div>
        ) : (
          displayList.map((expense) => {
            const isVerified = expense.verificationStatus === 'verified';

            return (
              <div
                key={expense.clientUuid}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-cyan-300 transition-all"
              >
                {/* Top Row: Description & Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {expense.description}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateIST(expense.paymentDate, language)} • {expense.paymentMethod.toUpperCase()}
                      {expense.vendorName ? ` • ${expense.vendorName}` : ''}
                    </p>
                  </div>

                  <span className="text-lg font-black text-slate-900 whitespace-nowrap">
                    {formatINR(expense.amountPaise)}
                  </span>
                </div>

                {/* Submitter & Category Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium">
                    {isHindi ? 'दर्जकर्ता:' : 'Submitted By:'}{' '}
                    <strong className="text-slate-800">{expense.submittedByName}</strong>
                  </span>
                  <span className="text-cyan-800 font-semibold">
                    {isHindi ? expense.categoryNameHi || expense.categoryName : expense.categoryName}
                  </span>
                </div>

                {/* Receipt Preview Thumbnail if present */}
                {expense.hasReceipt && expense.receiptDataUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedReceiptUrl(expense.receiptDataUrl || null)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-800 text-xs font-semibold hover:bg-cyan-100 transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{isHindi ? 'बिल की फोटो देखें' : 'View Bill Receipt'}</span>
                    </button>
                  </div>
                )}

                {/* Bottom Row: Verification & Correction Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {isHindi ? 'सत्यापित (Approved)' : 'Approved'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {isHindi ? 'मंजूरी बाकी' : 'Pending Approval'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isVerified && !isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isHindi ? 'लॉक्ड (परिवर्तन वर्जित)' : 'Locked'}</span>
                      </span>
                    ) : (
                      <>
                        {/* Correct / Edit Option */}
                        <button
                          type="button"
                          onClick={() => setEditingExpense(expense)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                            isSuperAdmin && isVerified
                              ? 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950 font-black'
                              : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                          <span>
                            {isSuperAdmin && isVerified
                              ? isHindi
                                ? '🔓 सुपर सुधार (Override)'
                                : '🔓 Super Edit'
                              : isHindi
                              ? 'सुधारें'
                              : 'Correct'}
                          </span>
                        </button>

                        {!isVerified && (
                          <button
                            type="button"
                            onClick={() => handleApprove(expense.clientUuid)}
                            className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                          >
                            <Check className="w-4 h-4 stroke-[3px]" />
                            <span>{isHindi ? 'मंजूर करें' : 'Approve'}</span>
                          </button>
                        )}

                        {(!isVerified || isSuperAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense.clientUuid, isVerified)}
                            className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors active:scale-95"
                            title={isHindi ? 'डिलीट करें' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Correction Modal */}
      <EditExpenseModal
        isOpen={Boolean(editingExpense)}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      {/* Receipt Photo Modal */}
      {selectedReceiptUrl && (
        <div
          onClick={() => setSelectedReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-3 shadow-2xl space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-700">
                {isHindi ? 'बिल की प्रति' : 'Bill Receipt'}
              </span>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕ बंद करें
              </button>
            </div>
            <img
              src={selectedReceiptUrl}
              alt="Receipt"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}

