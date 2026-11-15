'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense, PaymentMethod, Category, ProjectPhase } from '@/types';
import { db } from '@/lib/db';
import { PAYMENT_METHODS } from '@/lib/constants';
import { compressImage } from '@/lib/syncEngine';
import { X, Check, Camera, ChevronDown, ChevronUp, Image as ImageIcon, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
  initialData?: Partial<Expense> | null;
}

export default function QuickExpenseModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: QuickExpenseModalProps) {
  const { currentUser, language } = useApp();
  const isHindi = language === 'hi';

  // 3 Core Fields
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // "और जानकारी" (More details)
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('cat-other-construction');
  const [vendorName, setVendorName] = useState<string>('');
  const [phaseId, setPhaseId] = useState<string>('phase-construction');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Receipt image capture
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);

  // Categories & Phases from Dexie
  const [categories, setCategories] = useState<Category[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadMasterData() {
      const cats = await db.categories.toArray();
      const phs = await db.phases.toArray();
      setCategories(cats);
      setPhases(phs);
    }
    loadMasterData();
  }, []);

  // Pre-fill initial data if opened from voice edit
  useEffect(() => {
    if (initialData) {
      if (initialData.amountPaise) {
        setAmountRupees(String(initialData.amountPaise / 100));
      }
      if (initialData.description) setDescription(initialData.description);
      if (initialData.paymentMethod) setPaymentMethod(initialData.paymentMethod);
      if (initialData.vendorName) setVendorName(initialData.vendorName);
      if (initialData.categoryId) setCategoryId(initialData.categoryId);
      if (initialData.paymentDate) setPaymentDate(initialData.paymentDate);
    } else {
      setAmountRupees('');
      setDescription('');
      setPaymentMethod('cash');
      setVendorName('');
      setNotes('');
      setReceiptPreview(null);
      setReceiptBlob(null);
      setShowMoreDetails(false);
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialData, isOpen]);

  // Handle Receipt Photo capture
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingReceipt(true);
      const { blob, dataUrl } = await compressImage(file);
      setReceiptBlob(blob);
      setReceiptPreview(dataUrl);
    } catch (err) {
      console.error('Failed to compress receipt photo:', err);
      alert(isHindi ? 'फोटो प्रोसेस करने में समस्या हुई।' : 'Failed to process receipt image.');
    } finally {
      setIsCompressingReceipt(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedRupees = parseFloat(amountRupees.replace(/,/g, ''));
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      alert(isHindi ? 'कृपया सही रकम दर्ज करें।' : 'Please enter a valid amount.');
      return;
    }

    if (!description.trim()) {
      alert(isHindi ? 'कृपया बताएं किसलिए पैसे दिए।' : 'Please enter the expense purpose.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId);
      const selectedPhase = phases.find((p) => p.id === phaseId);

      const clientUuid = crypto.randomUUID();
      const amountPaise = Math.round(parsedRupees * 100);

      const newExpense: Expense = {
        clientUuid,
        amountPaise,
        currency: 'INR',
        description: description.trim(),
        categoryId,
        categoryName: selectedCategory?.nameEn || 'Other Construction',
        categoryNameHi: selectedCategory?.nameHi || 'अन्य निर्माण खर्च',
        vendorName: vendorName.trim() || undefined,
        phaseId,
        phaseName: selectedPhase?.nameEn || 'Construction',
        paymentMethod,
        paymentDate,
        paidByUserId: currentUser.id,
        paidByName: currentUser.fullName,
        submittedByUserId: currentUser.id,
        submittedByName: currentUser.fullName,
        notes: notes.trim() || undefined,
        recordType: 'expense',
        status: 'active',
        verificationStatus: 'pending',
        deviceCreatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        hasReceipt: Boolean(receiptPreview),
        receiptDataUrl: receiptPreview || undefined,
        receiptBlob: receiptBlob || undefined,
      };

      // 1. Immediate offline local save
      await db.expenses.add(newExpense);

      // 2. Confetti celebration
      try {
        confetti({
          particleCount: 70,
          spread: 50,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      onSaved(newExpense);
      onClose();
    } catch (err) {
      console.error('Failed to save manual expense:', err);
      alert(isHindi ? 'सेव करने में समस्या हुई।' : 'Error saving expense.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-cyan-800">
          <div>
            <h2 className="font-bold text-lg text-white">
              {isHindi ? 'खर्च दर्ज करें' : 'Record Expense'}
            </h2>
            <p className="text-xs text-cyan-300 font-medium">
              {isHindi ? 'आसान ३-स्टेप फॉर्म (ऑफलाइन सुरक्षित)' : 'Simple 3-field form (Offline safe)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors text-slate-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* FIELD 1: Amount (रकम) with large input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHindi ? '१. रकम (रुपये में)' : '1. Amount (in INR)'} *
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-2xl font-black text-cyan-600">
                ₹
              </div>
              <input
                type="number"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 focus:bg-white rounded-2xl text-2xl font-black text-slate-900 tracking-tight outline-none transition-colors"
              />
            </div>
          </div>

          {/* FIELD 2: Purpose (किसलिए पैसे दिए?) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHindi ? '२. किस चीज़ के लिए पैसे दिए?' : '2. What was it for?'} *
            </label>
            <input
              type="text"
              required
              placeholder={isHindi ? 'उदा: सीमेंट, सरिया, डीजल, मजदूरी' : 'e.g. Cement, Steel, Fuel, Labour'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 focus:bg-white rounded-2xl text-base font-semibold text-slate-900 outline-none transition-colors"
            />
          </div>

          {/* FIELD 3: Payment Method (भुगतान माध्यम) - Large touch buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {isHindi ? '३. पैसे कैसे दिए?' : '3. Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash' as const, labelHi: 'नकद (Cash)', labelEn: 'Cash' },
                { id: 'upi' as const, labelHi: 'UPI (GPay)', labelEn: 'UPI' },
                { id: 'bank_transfer' as const, labelHi: 'बैंक (NEFT)', labelEn: 'Bank' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPaymentMethod(item.id)}
                  className={`py-3 px-2 rounded-2xl border-2 font-bold text-xs transition-all ${
                    paymentMethod === item.id
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-900 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isHindi ? item.labelHi : item.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible "और जानकारी" (More details) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-500 hover:text-cyan-700 border-t border-slate-100"
            >
              <span>{isHindi ? 'और जानकारी (वेंडर, रसीद, श्रेणी आदि)' : 'More Details (Vendor, Bill, Category)'}</span>
              {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMoreDetails && (
              <div className="mt-3 space-y-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                {/* Vendor / Paid to */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'किसको दिए (सप्लायर / वेंडर)' : 'Vendor / Paid to'}
                  </label>
                  <input
                    type="text"
                    placeholder={isHindi ? 'उदा: शर्मा जी, पटेल ब्रदर्स' : 'e.g. Sharma Traders'}
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'खर्च की श्रेणी (Category)' : 'Category'}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-cyan-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isHindi ? c.nameHi : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Phase */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'प्रोजेक्ट फेज' : 'Project Phase'}
                  </label>
                  <select
                    value={phaseId}
                    onChange={(e) => setPhaseId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-cyan-500"
                  >
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {isHindi ? p.nameHi : p.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'भुगतान की तारीख' : 'Payment Date'}
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Receipt Photo Capture */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'बिल की फोटो (Camera / Gallery)' : 'Attach Bill Photo'}
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 border-dashed border-cyan-400 bg-cyan-50/50 hover:bg-cyan-100/50 text-cyan-800 text-xs font-bold transition-colors">
                      <Camera className="w-4 h-4 text-cyan-600" />
                      <span>{receiptPreview ? (isHindi ? 'फोटो बदलें' : 'Change Photo') : (isHindi ? 'फोटो खींचें' : 'Take Photo')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        className="hidden"
                      />
                    </label>

                    {receiptPreview && (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                        <img
                          src={receiptPreview}
                          alt="Receipt Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptPreview(null);
                            setReceiptBlob(null);
                          }}
                          className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isHindi ? 'नोट्स' : 'Notes'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={isHindi ? 'कोई अतिरिक्त जानकारी...' : 'Any extra details...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Large Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || isCompressingReceipt}
              className="w-full py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 active:scale-98 transition-all"
            >
              <Check className="w-6 h-6 stroke-[3px]" />
              <span>{isHindi ? 'खर्च सेव करें' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

