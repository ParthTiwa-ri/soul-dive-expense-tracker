'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR, formatDateIST } from '@/lib/constants';
import { db } from '@/lib/db';
import { ShieldCheck, CheckCircle2, Receipt, Check, Edit3, Trash2, ZoomIn, ZoomOut, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import EditExpenseModal from '@/components/EditExpenseModal';
import { deleteRemoteExpense, broadcastExpenseChange } from '@/lib/syncEngine';

interface ApprovalViewProps {
  expenses: Expense[];
}

export default function ApprovalView({ expenses }: ApprovalViewProps) {
  const { language, currentUser, triggerSync, showToast } = useApp();
  const isHindi = language === 'hi';
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  // Filter unverified active expenses (Approval screen only focuses on pending expenses)
  const unverifiedExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.verificationStatus === 'pending' && e.status !== 'voided'
    );
  }, [expenses]);

  const displayList = unverifiedExpenses;

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

      showToast(isHindi ? '✓ खर्च मंजूर हो गया' : '✓ Expense approved');
    } catch (err) {
      console.error('Failed to verify expense:', err);
    }
  };

  // Bulk Approve all currently pending expenses
  const handleApproveAll = async () => {
    if (unverifiedExpenses.length === 0 || isApprovingAll) return;
    const confirmText = isHindi
      ? `क्या आप सभी ${unverifiedExpenses.length} खर्चों को एक साथ मंजूर करना चाहते हैं?`
      : `Approve all ${unverifiedExpenses.length} pending expenses at once?`;
    if (!confirm(confirmText)) return;

    setIsApprovingAll(true);
    try {
      const nowIso = new Date().toISOString();
      for (const exp of unverifiedExpenses) {
        await db.expenses.update(exp.clientUuid, {
          verificationStatus: 'verified',
          verifiedByUserId: currentUser.id,
          verifiedByName: currentUser.fullName,
          verifiedAt: nowIso,
          syncStatus: 'pending',
        });
      }

      broadcastExpenseChange();
      if (typeof window !== 'undefined' && navigator.onLine) {
        triggerSync();
      }

      showToast(
        isHindi
          ? `✓ सभी ${unverifiedExpenses.length} खर्च मंजूर हो गए`
          : `✓ All ${unverifiedExpenses.length} expenses approved`
      );

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err) {
      console.error('Failed to approve all expenses:', err);
    } finally {
      setIsApprovingAll(false);
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
      </div>

      {/* Bulk Quick Approve Card (when more than 1 pending) */}
      {unverifiedExpenses.length > 1 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div>
            <span className="text-xs font-black text-emerald-950 block">
              {isHindi ? '⚡ एकमुश्त मंजूरी (Bulk Approve)' : '⚡ Quick Bulk Approval'}
            </span>
            <span className="text-[11px] text-emerald-800 font-semibold">
              {isHindi
                ? `सभी ${unverifiedExpenses.length} खर्चों को 1-टैप में सत्यापित करें`
                : `Verify all ${unverifiedExpenses.length} pending expenses at once`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleApproveAll}
            disabled={isApprovingAll}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3px]" />
            <span>
              {isApprovingAll
                ? isHindi
                  ? 'मंजूर हो रहे हैं...'
                  : 'Approving...'
                : isHindi
                ? `सभी (${unverifiedExpenses.length}) मंजूर करें`
                : `Approve All (${unverifiedExpenses.length})`}
            </span>
          </button>
        </div>
      )}

      {/* Expense List */}
      <div className="space-y-3">
        {displayList.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isHindi ? 'कोई खर्च मंजूरी के लिए बाकी नहीं है!' : 'No transactions pending approval!'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isHindi
                ? 'सभी दर्ज खर्च सत्यापित किए जा चुके हैं।'
                : 'All recorded expenses have been verified.'}
            </p>
          </div>
        ) : (
          displayList.map((expense) => {
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
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => {
                        setSelectedReceiptUrl(expense.receiptDataUrl || null);
                        setIsZoomed(false);
                      }}
                      className="w-12 h-12 rounded-xl overflow-hidden border border-cyan-200 flex-shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform bg-slate-100"
                      title={isHindi ? 'बिल फोटो बड़ा देखें' : 'Tap to zoom bill'}
                    >
                      <img
                        src={expense.receiptDataUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReceiptUrl(expense.receiptDataUrl || null);
                        setIsZoomed(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-800 text-xs font-bold hover:bg-cyan-100 transition-colors"
                    >
                      <Receipt className="w-4 h-4 text-cyan-600" />
                      <span>{isHindi ? 'बिल की फोटो देखें' : 'View Bill Receipt'}</span>
                    </button>
                  </div>
                )}

                {/* Bottom Row: Verification & Correction Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  {/* Correct / Edit Option */}
                  <button
                    type="button"
                    onClick={() => setEditingExpense(expense)}
                    className="py-1.5 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                    <span>{isHindi ? 'सुधारें' : 'Correct'}</span>
                  </button>

                  {/* Approve Option */}
                  <button
                    type="button"
                    onClick={() => handleApprove(expense.clientUuid)}
                    className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>{isHindi ? 'मंजूर करें' : 'Approve'}</span>
                  </button>

                  {/* Delete Option */}
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(expense.clientUuid, false)}
                    className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors active:scale-95"
                    title={isHindi ? 'डिलीट करें' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

      {/* Fullscreen Tap-to-Zoom Receipt Modal */}
      {selectedReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setSelectedReceiptUrl(null);
            setIsZoomed(false);
          }}
        >
          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(!isZoomed);
              }}
              className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
              title={isZoomed ? 'Zoom Out' : 'Zoom In'}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              <span>{isZoomed ? (isHindi ? 'छोटा' : 'Zoom Out') : (isHindi ? 'बड़ा' : 'Zoom In')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedReceiptUrl(null);
                setIsZoomed(false);
              }}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all active:scale-95"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image with Zoom Toggle */}
          <div
            className={`max-w-4xl max-h-[82vh] overflow-auto rounded-2xl flex items-center justify-center ${
              isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
          >
            <img
              src={selectedReceiptUrl}
              alt="Receipt Preview"
              className={`rounded-xl object-contain transition-transform duration-200 select-none shadow-2xl ${
                isZoomed ? 'scale-150 my-16 mx-16' : 'max-h-[80vh] w-auto'
              }`}
            />
          </div>

          <p className="text-white/70 text-xs mt-3 select-none">
            {isHindi ? '🔍 बड़ा/छोटा करने के लिए फोटो पर टैप करें' : '🔍 Tap image to zoom in / out'}
          </p>
        </div>
      )}
    </div>
  );
}

