'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR, formatDateIST } from '@/lib/constants';
import { db } from '@/lib/db';
import { CheckCircle2, Clock, AlertTriangle, Receipt, ChevronRight, X, Image as ImageIcon, Camera, Trash2, Check, Edit3 } from 'lucide-react';
import { compressImage } from '@/lib/syncEngine';
import EditExpenseModal from '@/components/EditExpenseModal';

interface RecentExpensesListProps {
  expenses: Expense[];
  onRefresh?: () => void;
}

export default function RecentExpensesList({ expenses, onRefresh }: RecentExpensesListProps) {
  const { language, currentUser } = useApp();
  const isHindi = language === 'hi';

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAttachingReceipt, setIsAttachingReceipt] = useState(false);

  // Handle receipt attachment to an existing expense
  const handleAttachReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedExpense) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAttachingReceipt(true);
      const { blob, dataUrl } = await compressImage(file);
      await db.expenses.update(selectedExpense.clientUuid, {
        hasReceipt: true,
        receiptDataUrl: dataUrl,
        receiptBlob: blob,
        syncStatus: selectedExpense.syncStatus === 'synced' ? 'pending' : selectedExpense.syncStatus,
      });

      setSelectedExpense((prev) =>
        prev
          ? {
              ...prev,
              hasReceipt: true,
              receiptDataUrl: dataUrl,
            }
          : null
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to attach receipt:', err);
    } finally {
      setIsAttachingReceipt(false);
    }
  };

  // Void unverified transaction
  const handleVoidExpense = async (clientUuid: string) => {
    const confirmText = isHindi
      ? 'क्या आप इस खर्च को रद्द (Void) करना चाहते हैं?'
      : 'Do you want to void this expense entry?';
    if (!confirm(confirmText)) return;

    try {
      await db.expenses.update(clientUuid, {
        status: 'voided',
        syncStatus: 'pending', // Re-sync void status to server
      });
      setSelectedExpense(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to void expense:', err);
    }
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 text-sm">
          {isHindi ? 'अभी कोई खर्च दर्ज नहीं है' : 'No expenses recorded yet'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          {isHindi
            ? 'ऊपर दिए गए बोलकर या मैन्युअल बटन से नया खर्च जोड़ें।'
            : 'Tap the voice or manual button above to record your first expense.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const isSynced = expense.syncStatus === 'synced';
        const isFailed = expense.syncStatus === 'failed';
        const isVoided = expense.status === 'voided';

        return (
          <div
            key={expense.clientUuid}
            onClick={() => setSelectedExpense(expense)}
            className={`bg-white rounded-2xl p-4 border transition-all active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between ${
              isVoided
                ? 'opacity-60 bg-slate-50 border-slate-200'
                : 'border-slate-200/90 hover:border-cyan-300'
            }`}
          >
            {/* Left: Purpose, Vendor, Date & Sync Badge */}
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`font-bold text-sm text-slate-900 truncate ${
                    isVoided ? 'line-through text-slate-500' : ''
                  }`}
                >
                  {expense.description}
                </span>

                {/* Has Receipt Indicator */}
                {expense.hasReceipt && (
                  <span className="p-0.5 rounded bg-cyan-100 text-cyan-800" title="Receipt attached">
                    <Receipt className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>{formatDateIST(expense.paymentDate, language)}</span>
                {expense.vendorName && <span>• {expense.vendorName}</span>}
                <span>• {expense.paymentMethod.toUpperCase()}</span>
              </div>

              {/* Status Badges: Approval Status & Cloud Sync */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {/* Approval Status Badge */}
                {expense.verificationStatus === 'verified' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    {isHindi ? 'मंजूर' : 'Approved'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                    {isHindi ? 'मंजूरी बाकी' : 'Pending Approval'}
                  </span>
                )}

                {/* Cloud Sync Status */}
                <span className="text-[10px] text-slate-400 font-medium ml-1">
                  {isSynced ? (
                    <span className="text-slate-400">क्लाउड सिंक ✓</span>
                  ) : isFailed ? (
                    <span className="text-rose-600 font-semibold">सिंक विफल</span>
                  ) : (
                    <span className="text-amber-600 font-semibold">फोन में सेव</span>
                  )}
                </span>

                {isVoided && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {isHindi ? 'रद्द' : 'Voided'}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Amount & Arrow */}
            <div className="flex items-center gap-2 text-right">
              <div>
                <span
                  className={`text-base font-extrabold tracking-tight ${
                    isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {formatINR(expense.amountPaise)}
                </span>
                <span className="block text-[10px] font-medium text-slate-400 truncate max-w-[90px]">
                  {expense.paidByName || 'Self'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        );
      })}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {isHindi ? 'खर्च का पूरा विवरण' : 'Expense Details'}
              </h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="text-center py-3 bg-cyan-50/60 rounded-2xl border border-cyan-100">
                <span className="text-xs text-slate-500 font-medium block">
                  {isHindi ? 'कुल रकम' : 'Total Amount'}
                </span>
                <span className="text-3xl font-black text-cyan-900">
                  {formatINR(selectedExpense.amountPaise)}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{isHindi ? 'विवरण (Purpose):' : 'Purpose:'}</span>
                  <span className="font-bold text-slate-900">{selectedExpense.description}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{isHindi ? 'श्रेणी (Category):' : 'Category:'}</span>
                  <span className="font-bold text-slate-900">
                    {isHindi ? selectedExpense.categoryNameHi : selectedExpense.categoryName}
                  </span>
                </div>

                {selectedExpense.vendorName && (
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">{isHindi ? 'वेंडर (Vendor):' : 'Vendor:'}</span>
                    <span className="font-bold text-slate-900">{selectedExpense.vendorName}</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{isHindi ? 'तारीख (Date):' : 'Date:'}</span>
                  <span className="font-bold text-slate-900">
                    {formatDateIST(selectedExpense.paymentDate, language)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{isHindi ? 'भुगतान विधि:' : 'Method:'}</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {selectedExpense.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">{isHindi ? 'दर्जकर्ता (User):' : 'Submitted By:'}</span>
                  <span className="font-bold text-slate-900">{selectedExpense.submittedByName}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{isHindi ? 'सिंक स्थिति:' : 'Sync Status:'}</span>
                  <span className="font-bold text-cyan-800 uppercase">
                    {selectedExpense.syncStatus}
                  </span>
                </div>
              </div>

              {/* Receipt Preview or Camera Attach */}
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">
                  {isHindi ? 'बिल की प्रति (Receipt Photo):' : 'Bill Receipt:'}
                </span>

                {selectedExpense.receiptDataUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-56 flex items-center justify-center bg-slate-100">
                    <img
                      src={selectedExpense.receiptDataUrl}
                      alt="Bill receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <label className="cursor-pointer flex items-center justify-center gap-2 py-4 px-3 rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-50/40 hover:bg-cyan-100/40 text-cyan-800 text-xs font-bold transition-colors">
                    <Camera className="w-5 h-5 text-cyan-600" />
                    <span>{isHindi ? 'बिल की फोटो जोड़ें' : 'Attach Bill Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAttachReceipt}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedExpense;
                    setSelectedExpense(null);
                    setEditingExpense(toEdit);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isHindi ? 'सुधारें' : 'Edit'}</span>
                </button>

                {selectedExpense.verificationStatus === 'pending' && selectedExpense.status !== 'voided' && (
                  <button
                    onClick={async () => {
                      await db.expenses.update(selectedExpense.clientUuid, {
                        verificationStatus: 'verified',
                        verifiedByUserId: currentUser.id,
                        verifiedAt: new Date().toISOString(),
                        syncStatus: 'pending',
                      });
                      setSelectedExpense((prev) =>
                        prev ? { ...prev, verificationStatus: 'verified' } : null
                      );
                      if (onRefresh) onRefresh();
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>{isHindi ? 'मंजूर करें (Approve)' : 'Approve'}</span>
                  </button>
                )}
              </div>

              {selectedExpense.status !== 'voided' && (
                <button
                  onClick={() => handleVoidExpense(selectedExpense.clientUuid)}
                  className="py-2.5 px-3 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{isHindi ? 'रद्द करें (Void)' : 'Void'}</span>
                </button>
              )}

              <button
                onClick={() => setSelectedExpense(null)}
                className="py-2.5 px-4 ml-auto rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                {isHindi ? 'बंद करें' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Correction Modal */}
      <EditExpenseModal
        isOpen={Boolean(editingExpense)}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSaved={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}

