'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense, PaymentMethod, Category, ProjectPhase } from '@/types';
import { db } from '@/lib/db';
import { PAYMENT_METHODS, DEFAULT_CATEGORIES, DEFAULT_PHASES } from '@/lib/constants';
import { compressImage } from '@/lib/syncEngine';
import {
  X,
  Check,
  Camera,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSaved?: (updated: Expense) => void;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  onSaved,
}: EditExpenseModalProps) {
  const { currentUser, language } = useApp();
  const isHindi = language === 'hi';
  const isOwner = currentUser.role === 'owner';

  // Form states
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('cat-other-construction');
  const [vendorName, setVendorName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Receipt image states
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [hasReceipt, setHasReceipt] = useState<boolean>(false);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);

  // Master Data
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [phases, setPhases] = useState<ProjectPhase[]>(DEFAULT_PHASES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const loadedCats = await db.categories.toArray();
        if (loadedCats && loadedCats.length > 0) setCategories(loadedCats);

        const loadedPhs = await db.phases.toArray();
        if (loadedPhs && loadedPhs.length > 0) setPhases(loadedPhs);
      } catch (e) {
        console.error('Failed to load master data:', e);
      }
    }
    loadMasterData();
  }, []);

  // Sync state whenever selected expense changes
  useEffect(() => {
    if (expense) {
      setAmountRupees((expense.amountPaise / 100).toString());
      setDescription(expense.description || '');
      setCategoryId(expense.categoryId || 'cat-other-construction');
      setVendorName(expense.vendorName || '');
      setPaymentMethod(expense.paymentMethod || 'cash');
      setPaymentDate(expense.paymentDate || new Date().toISOString().split('T')[0]);
      setNotes(expense.notes || '');
      setReceiptPreview(expense.receiptDataUrl || null);
      setReceiptBlob(expense.receiptBlob || null);
      setHasReceipt(Boolean(expense.hasReceipt && (expense.receiptDataUrl || expense.receiptBlob)));
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const isVerified = expense.verificationStatus === 'verified';

  // Handle new receipt upload
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingReceipt(true);
      const { blob, dataUrl } = await compressImage(file);
      setReceiptBlob(blob);
      setReceiptPreview(dataUrl);
      setHasReceipt(true);
    } catch (err) {
      console.error('Failed to compress receipt photo:', err);
      alert(isHindi ? 'फोटो प्रोसेस करने में समस्या हुई।' : 'Failed to process receipt image.');
    } finally {
      setIsCompressingReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    setReceiptBlob(null);
    setHasReceipt(false);
  };

  // Perform Save with or without approval
  const handlePerformSave = async (shouldApprove: boolean) => {
    if (isVerified) {
      alert(
        isHindi
          ? 'मंजूरशुदा (Approved) खर्च में बदलाव या सुधार वर्जित है।'
          : 'Approved expenses are permanently locked and cannot be edited.'
      );
      return;
    }

    const parsedRupees = parseFloat(amountRupees.replace(/,/g, ''));
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      alert(isHindi ? 'कृपया सही रकम दर्ज करें।' : 'Please enter a valid amount.');
      return;
    }

    if (!description.trim()) {
      alert(isHindi ? 'कृपया खर्च का विवरण दर्ज करें।' : 'Please enter the expense purpose.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId);
      const amountPaise = Math.round(parsedRupees * 100);

      const updates: Partial<Expense> = {
        amountPaise,
        description: description.trim(),
        categoryId,
        categoryName: selectedCategory?.nameEn || expense.categoryName || 'Other Construction',
        categoryNameHi: selectedCategory?.nameHi || expense.categoryNameHi || 'अन्य निर्माण खर्च',
        vendorName: vendorName.trim() || undefined,
        paymentMethod,
        paymentDate,
        notes: notes.trim() || undefined,
        hasReceipt,
        receiptDataUrl: receiptPreview || undefined,
        receiptBlob: receiptBlob || undefined,
        syncStatus: 'pending', // Re-sync the edited data to server
      };

      if (shouldApprove) {
        updates.verificationStatus = 'verified';
        updates.verifiedByUserId = currentUser.id;
        updates.verifiedAt = new Date().toISOString();
      }

      await db.expenses.update(expense.clientUuid, updates);

      const updatedExpense: Expense = {
        ...expense,
        ...updates,
      };

      // Confetti feedback
      try {
        confetti({
          particleCount: shouldApprove ? 60 : 35,
          spread: 45,
          origin: { y: 0.8 },
        });
      } catch (e) {}

      if (onSaved) {
        onSaved(updatedExpense);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update expense:', err);
      alert(isHindi ? 'बदलाव सेव करने में समस्या हुई।' : 'Failed to update expense.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">
                {isHindi ? 'खर्च में सुधार करें' : 'Correct / Edit Expense'}
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isVerified
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                {isVerified
                  ? isHindi
                    ? 'मंजूरशुदा'
                    : 'Approved'
                  : isHindi
                  ? 'मंजूरी बाकी'
                  : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isHindi ? 'मंजूरी से पहले विवरण या रकम बदलें' : 'Update details before verifying'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {isVerified && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                {isHindi
                  ? 'यह खर्च पहले ही मंजूर (Approved) हो चुका है। लेजर ऑडिट नियमों के अनुसार इसमें सुधार या बदलाव वर्जित है।'
                  : 'This expense has already been approved and is locked for audit integrity. Modifications are not allowed.'}
              </span>
            </div>
          )}

          {/* 1. Amount in INR */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'रकम (रुपये में)' : 'Amount (₹)'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-2xl font-black text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0"
                disabled={isVerified}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-cyan-600 focus:bg-white rounded-2xl text-2xl font-black text-slate-900 outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* 2. Purpose / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'किसलिए खर्च हुआ (विवरण)' : 'Expense Purpose / Description'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHindi ? 'उदा: 10 बोरी सीमेंट, नाश्ता, डीजल...' : 'e.g. 10 bags cement...'}
              disabled={isVerified}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-600 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
            />
          </div>

          {/* 3. Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'श्रेणी (Category)' : 'Category'}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isVerified}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-600 focus:bg-white rounded-xl text-xs font-bold text-slate-800 outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
            >
              <optgroup label={isHindi ? '--- निर्माण खर्च (Construction) ---' : '--- Construction ---'}>
                {categories
                  .filter((c) => c.groupName === 'construction')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
              </optgroup>
              <optgroup label={isHindi ? '--- संचालन खर्च (Operations) ---' : '--- Operations ---'}>
                {categories
                  .filter((c) => c.groupName === 'operations')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
              </optgroup>
              <optgroup label={isHindi ? '--- वित्तीय / अन्य (Financial) ---' : '--- Financial ---'}>
                {categories
                  .filter((c) => c.groupName === 'financial')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* 4. Vendor Name & Payment Date (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isHindi ? 'वेंडर / किसे दिए (Vendor)' : 'Vendor / Paid To'}
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder={isHindi ? 'उदा: शर्मा जी' : 'e.g. Sharma Traders'}
                disabled={isVerified}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-600 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isHindi ? 'तारीख (Payment Date)' : 'Payment Date'}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isVerified}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-600 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* 5. Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'भुगतान माध्यम (Payment Method)' : 'Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    disabled={isVerified}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center disabled:opacity-75 ${
                      isSelected
                        ? 'bg-cyan-50 border-cyan-600 text-cyan-900 shadow-sm ring-1 ring-cyan-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isHindi ? method.labelHi.split(' ')[0] : method.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Receipt Photo Section */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'बिल की फोटो (Receipt Photo)' : 'Receipt Photo'}
            </label>

            {receiptPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={receiptPreview}
                    alt="Receipt thumbnail"
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isHindi ? 'बिल फोटो संलग्न है' : 'Receipt attached'}
                    </span>
                    {!isVerified && (
                      <label className="text-[11px] font-semibold text-cyan-700 hover:underline cursor-pointer">
                        {isCompressingReceipt
                          ? isHindi
                            ? 'प्रोसेसिंग...'
                            : 'Processing...'
                          : isHindi
                          ? 'फोटो बदलें'
                          : 'Change photo'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                          disabled={isCompressingReceipt}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {!isVerified && (
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    title={isHindi ? 'फोटो हटाएं' : 'Remove receipt'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : isVerified ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-medium">
                {isHindi ? 'कोई बिल प्रति संलग्न नहीं है' : 'No receipt photo attached'}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-cyan-50/50 border-2 border-dashed border-slate-300 hover:border-cyan-400 rounded-2xl cursor-pointer transition-all">
                <Camera className="w-4 h-4 text-cyan-700" />
                <span className="text-xs font-bold text-slate-700">
                  {isCompressingReceipt
                    ? isHindi
                      ? 'प्रोसेसिंग...'
                      : 'Processing...'
                    : isHindi
                    ? 'बिल की फोटो जोड़ें / खींचें'
                    : 'Attach or take receipt photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  disabled={isCompressingReceipt}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 7. Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isHindi ? 'अतिरिक्त टिप्पणी (Optional Notes)' : 'Additional Notes (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isHindi ? 'उदा: टोकन नंबर या टिप्पणी' : 'e.g. note or remarks'}
              disabled={isVerified}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-cyan-600 focus:bg-white rounded-xl text-xs font-medium outline-none transition-all disabled:opacity-75 disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Action Buttons Sticky Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          {isVerified ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>{isHindi ? 'मंजूरशुदा (परिवर्तन वर्जित / लॉक्ड)' : 'Approved (Locked & Read-Only)'}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors ml-auto"
              >
                {isHindi ? 'बंद करें' : 'Close'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>

              {/* Option A: Save changes only (without approving) */}
              <button
                type="button"
                onClick={() => handlePerformSave(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all text-center"
              >
                {isSaving
                  ? isHindi
                    ? 'सेव हो रहा है...'
                    : 'Saving...'
                  : isHindi
                  ? isOwner
                    ? 'सिर्फ सुधार सेव करें'
                    : 'सुधार सेव करें'
                  : isOwner
                  ? 'Save Changes Only'
                  : 'Save Changes'}
              </button>

              {/* Option B: Save and Approve immediately (for Owner / Admin only) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handlePerformSave(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>
                    {isSaving
                      ? isHindi
                        ? 'मंजूर हो रहा है...'
                        : 'Approving...'
                      : isHindi
                      ? 'सुधारें और मंजूर करें'
                      : 'Save & Approve'}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
