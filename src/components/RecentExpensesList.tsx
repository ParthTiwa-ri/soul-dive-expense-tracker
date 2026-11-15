'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR, formatDateIST, formatDateTimeIST } from '@/lib/constants';
import { db } from '@/lib/db';
import { CheckCircle2, Clock, AlertTriangle, Receipt, ChevronRight, X, Image as ImageIcon, Camera, Trash2, Check, Edit3, Lock, ZoomIn, ZoomOut } from 'lucide-react';
import { compressImage, deleteRemoteExpense, broadcastExpenseChange } from '@/lib/syncEngine';
import EditExpenseModal from '@/components/EditExpenseModal';

interface RecentExpensesListProps {
  expenses: Expense[];
  onRefresh?: () => void;
}

export default function RecentExpensesList({ expenses, onRefresh }: RecentExpensesListProps) {
  const { language, currentUser, triggerSync } = useApp();
  const isHindi = language === 'hi';
  const isOwner = currentUser.role === 'owner' || currentUser.role === 'super_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAttachingReceipt, setIsAttachingReceipt] = useState(false);
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

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

      broadcastExpenseChange();
      if (typeof window !== 'undefined' && navigator.onLine) {
        triggerSync();
      }

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

  // Delete transaction (or override by Super Admin)
  const handleDeleteExpense = async (clientUuid: string) => {
    if (selectedExpense?.verificationStatus === 'verified' && !isSuperAdmin) {
      alert(isHindi ? 'मंजूरशुदा (Approved) खर्च को रद्द या डिलीट नहीं किया जा सकता।' : 'Approved expenses cannot be deleted.');
      return;
    }

    const isApproved = selectedExpense?.verificationStatus === 'verified';
    const confirmText = isHindi
      ? isApproved
        ? '⚡ सुपर एडमिन: क्या आप वाकई इस मंजूरशुदा (Approved) खर्च को हमेशा के लिए डिलीट करना चाहते हैं?'
        : 'क्या आप इस खर्च को हमेशा के लिए डिलीट करना चाहते हैं?'
      : isApproved
      ? '⚡ Super Admin: Are you sure you want to permanently DELETE this APPROVED expense?'
      : 'Do you want to permanently delete this expense?';
    if (!confirm(confirmText)) return;

    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        await db.expenses.delete(clientUuid);
        await deleteRemoteExpense(clientUuid);
      } else {
        // Offline tombstone: disappears immediately from UI, deletes on server when back online
        await db.expenses.update(clientUuid, {
          status: 'voided',
          syncStatus: 'pending',
        });
      }
      setSelectedExpense(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const activeExpenses = (expenses || []).filter((e) => e.status !== 'voided');

  if (activeExpenses.length === 0) {
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
      {activeExpenses.map((expense) => {
        const isSynced = expense.syncStatus === 'synced';
        const isFailed = expense.syncStatus === 'failed';
        const isVoided = expense.status === 'voided';

        return (
          <div
            key={expense.clientUuid}
            onClick={() => setSelectedExpense(expense)}
            className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between gap-3 ${
              isVoided
                ? 'opacity-60 bg-slate-50 border-slate-200'
                : 'border-slate-200/90 hover:border-cyan-300'
            }`}
          >
            {/* Bill Photo Mini Thumbnail */}
            {expense.hasReceipt && expense.receiptDataUrl ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomReceiptUrl(expense.receiptDataUrl || null);
                  setIsZoomed(false);
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-cyan-200 flex-shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform bg-slate-100"
                title={isHindi ? 'बिल फोटो बड़ा देखें' : 'Tap to zoom bill'}
              >
                <img
                  src={expense.receiptDataUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}

            {/* Left: Purpose, Vendor, Date & Sync Badge */}
            <div className="flex-1 min-w-0 pr-1">
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

              {/* System status: only shown when offline, failed, or voided */}
              {(!isSynced || isFailed || isVoided) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {!isSynced && !isFailed && !isVoided && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-in fade-in"
                      title={isHindi ? 'फोन में सेव (इंटरनेट मिलने पर सिंक होगा)' : 'Local Only (Pending Sync)'}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>{isHindi ? 'फोन में सेव' : 'Local'}</span>
                    </span>
                  )}

                  {isFailed && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                      title={isHindi ? 'सिंक विफल (दोबारा प्रयास होगा)' : 'Sync Failed'}
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                      <span>{isHindi ? 'सिंक विफल' : 'Failed'}</span>
                    </span>
                  )}

                  {isVoided && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      {isHindi ? 'रद्द' : 'Voided'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Amount & Arrow */}
            <div className="flex items-center gap-2 text-right">
              <div>
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className={`text-base font-extrabold tracking-tight ${
                      isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {formatINR(expense.amountPaise)}
                  </span>
                  {/* Tiny colored icon: only for pending approval, nothing for approved */}
                  {expense.verificationStatus === 'pending' && !isVoided && (
                    <span
                      title={isHindi ? 'मंजूरी बाकी (Pending Approval)' : 'Pending Approval'}
                      className="p-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center justify-center flex-shrink-0"
                    >
                      <Clock className="w-3 h-3 text-amber-600 stroke-[2.5]" />
                    </span>
                  )}
                </div>
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
                  <span className="text-slate-500">{isHindi ? 'तारीख व समय:' : 'Date & Time:'}</span>
                  <span className="font-bold text-slate-900">
                    {formatDateTimeIST(
                      selectedExpense.paymentDate,
                      selectedExpense.paymentTime || selectedExpense.deviceCreatedAt,
                      language
                    )}
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
                  <div
                    onClick={() => {
                      setZoomReceiptUrl(selectedExpense.receiptDataUrl || null);
                      setIsZoomed(false);
                    }}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-56 flex items-center justify-center bg-slate-100 cursor-pointer hover:border-cyan-400 transition-colors"
                    title={isHindi ? 'बड़ा देखने के लिए क्लिक करें' : 'Click to zoom'}
                  >
                    <img
                      src={selectedExpense.receiptDataUrl}
                      alt="Bill receipt"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                      <ZoomIn className="w-4 h-4" />
                      <span>{isHindi ? 'बड़ा देखें (Zoom)' : 'Zoom View'}</span>
                    </div>
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
                {selectedExpense.verificationStatus === 'verified' && !isSuperAdmin ? (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isHindi ? 'मंजूरशुदा (परिवर्तन वर्जित)' : 'Approved (Locked)'}</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const toEdit = selectedExpense;
                        setSelectedExpense(null);
                        setEditingExpense(toEdit);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        isSuperAdmin && selectedExpense.verificationStatus === 'verified'
                          ? 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                          : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-700" />
                      <span>
                        {isSuperAdmin && selectedExpense.verificationStatus === 'verified'
                          ? isHindi
                            ? '🔓 सुपर सुधार (Override)'
                            : '🔓 Super Edit'
                          : isHindi
                          ? 'सुधारें'
                          : 'Edit'}
                      </span>
                    </button>

                    {isOwner && selectedExpense.verificationStatus === 'pending' && selectedExpense.status !== 'voided' && (
                      <button
                        onClick={async () => {
                          await db.expenses.update(selectedExpense.clientUuid, {
                            verificationStatus: 'verified',
                            verifiedByUserId: currentUser.id,
                            verifiedByName: currentUser.fullName,
                            verifiedAt: new Date().toISOString(),
                            syncStatus: 'pending',
                          });
                          broadcastExpenseChange();
                          if (typeof window !== 'undefined' && navigator.onLine) {
                            triggerSync();
                          }
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
                  </>
                )}
              </div>

              {(selectedExpense.verificationStatus !== 'verified' || isSuperAdmin) && isOwner && (
                <button
                  onClick={() => handleDeleteExpense(selectedExpense.clientUuid)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isSuperAdmin && selectedExpense.verificationStatus === 'verified'
                      ? 'border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100'
                      : 'border-rose-300 bg-white hover:bg-rose-50 text-rose-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>
                    {isSuperAdmin && selectedExpense.verificationStatus === 'verified'
                      ? isHindi
                        ? 'सुपर डिलीट'
                        : 'Super Delete'
                      : isHindi
                      ? 'डिलीट करें'
                      : 'Delete'}
                  </span>
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

      {/* Fullscreen Tap-to-Zoom Receipt Modal */}
      {zoomReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            setZoomReceiptUrl(null);
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
                setZoomReceiptUrl(null);
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
              src={zoomReceiptUrl}
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

