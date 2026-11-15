'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense, Category } from '@/types';
import { formatINR, formatDateIST, DEFAULT_CATEGORIES } from '@/lib/constants';
import { db } from '@/lib/db';
import {
  Search,
  SlidersHorizontal,
  Download,
  Receipt,
  CheckCircle,
  Clock,
  X,
  RotateCcw,
  Check,
  Calendar,
  ChevronDown,
  Edit3,
  Lock,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import EditExpenseModal from '@/components/EditExpenseModal';
import { deleteRemoteExpense, broadcastExpenseChange } from '@/lib/syncEngine';

interface LedgerViewProps {
  expenses: Expense[];
}

type DatePreset = 'all' | 'today' | 'this_month' | 'custom';

// Helper to format date in YYYY-MM-DD for Asia/Kolkata timezone
function getDateStringIST(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function LedgerView({ expenses }: LedgerViewProps) {
  const { language, currentUser, triggerSync } = useApp();
  const isHindi = language === 'hi';
  const isOwner = currentUser.role === 'owner' || currentUser.role === 'super_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState(getDateStringIST(-30));
  const [customEndDate, setCustomEndDate] = useState(getDateStringIST(0));
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyReceipts, setOnlyReceipts] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Bottom Sheet Filter Modal State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Selected expense for detail popup
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Categories list
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    async function loadCats() {
      try {
        const loaded = await db.categories.toArray();
        if (loaded && loaded.length > 0) setCategories(loaded);
      } catch (e) {}
    }
    loadCats();
  }, []);

  // Calculate Dates for presets
  const todayIST = getDateStringIST(0);
  const currentMonthPrefix = todayIST.substring(0, 7); // YYYY-MM

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (datePreset !== 'all') count++;
    if (selectedMethod !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (onlyReceipts) count++;
    return count;
  }, [datePreset, selectedMethod, selectedCategory, onlyReceipts]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setSelectedMethod('all');
    setSelectedCategory('all');
    setOnlyReceipts(false);
    setSortBy('date-desc');
  };

  // Filtered and Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        // Exclude voided / deleted expenses
        if (e.status === 'voided') return false;

        // 1. Text Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = e.description.toLowerCase().includes(q);
          const matchVendor = e.vendorName?.toLowerCase().includes(q);
          const matchPayer = e.paidByName.toLowerCase().includes(q);
          const matchCat = (e.categoryNameHi || e.categoryName || '').toLowerCase().includes(q);
          if (!matchDesc && !matchVendor && !matchPayer && !matchCat) return false;
        }

        // 2. Date Filter
        if (datePreset === 'today') {
          if (e.paymentDate !== todayIST) return false;
        } else if (datePreset === 'this_month') {
          if (!e.paymentDate.startsWith(currentMonthPrefix)) return false;
        } else if (datePreset === 'custom') {
          if (customStartDate && e.paymentDate < customStartDate) return false;
          if (customEndDate && e.paymentDate > customEndDate) return false;
        }

        // 3. Payment method filter
        if (selectedMethod !== 'all' && e.paymentMethod !== selectedMethod) return false;

        // 4. Category filter
        if (selectedCategory !== 'all' && e.categoryId !== selectedCategory) return false;

        // 5. Receipt filter
        if (onlyReceipts && !e.hasReceipt) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
        }
        if (sortBy === 'amount-desc') {
          return b.amountPaise - a.amountPaise;
        }
        if (sortBy === 'amount-asc') {
          return a.amountPaise - b.amountPaise;
        }
        return 0;
      });
  }, [
    expenses,
    searchQuery,
    datePreset,
    customStartDate,
    customEndDate,
    selectedMethod,
    selectedCategory,
    onlyReceipts,
    sortBy,
    todayIST,
    currentMonthPrefix,
  ]);

  // Aggregate Totals
  const totalAmountPaise = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status !== 'voided')
      .reduce((sum, e) => sum + e.amountPaise, 0);
  }, [filteredExpenses]);

  const pendingCount = useMemo(() => {
    return filteredExpenses.filter((e) => e.verificationStatus === 'pending' && e.status !== 'voided').length;
  }, [filteredExpenses]);

  const verifiedCount = useMemo(() => {
    return filteredExpenses.filter((e) => e.verificationStatus === 'verified' && e.status !== 'voided').length;
  }, [filteredExpenses]);

  // Handle Approve action
  const handleApprove = async (clientUuid: string) => {
    try {
      await db.expenses.update(clientUuid, {
        verificationStatus: 'verified',
        verifiedByUserId: currentUser.id,
        verifiedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });

      // Immediately broadcast approval and trigger sync across devices
      broadcastExpenseChange();
      if (typeof window !== 'undefined' && navigator.onLine) {
        triggerSync();
      }

      if (selectedExpense && selectedExpense.clientUuid === clientUuid) {
        setSelectedExpense((prev) => (prev ? { ...prev, verificationStatus: 'verified' } : null));
      }

      try {
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { y: 0.8 },
        });
      } catch (e) {}
    } catch (err) {
      console.error('Failed to approve expense:', err);
    }
  };

  // Handle Delete action
  const handleDeleteExpense = async (clientUuid: string) => {
    if (selectedExpense?.verificationStatus === 'verified' && !isSuperAdmin) {
      alert(isHindi ? 'मंजूरशुदा खर्च को डिलीट नहीं किया जा सकता।' : 'Approved expenses cannot be deleted.');
      return;
    }

    const isApproved = selectedExpense?.verificationStatus === 'verified';
    const confirmText = isHindi
      ? isApproved
        ? '⚡ सुपर एडमिन: क्या आप वाकई इस मंजूरशुदा खर्च को हमेशा के लिए डिलीट करना चाहते हैं?'
        : 'क्या आप इस खर्च को हमेशा के लिए हटाना (Delete) चाहते हैं?'
      : isApproved
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
      setSelectedExpense(null);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert(isHindi ? 'निर्यात करने के लिए कोई रिकॉर्ड नहीं है।' : 'No records to export.');
      return;
    }

    const headers = [
      'Date',
      'Description',
      'Category',
      'Vendor',
      'Amount (INR)',
      'Payment Method',
      'Paid By',
      'Submitted By',
      'Approval Status',
      'Sync Status',
      'Has Receipt',
    ];

    const rows = filteredExpenses.map((e) => [
      e.paymentDate,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.categoryNameHi || e.categoryName || ''}"`,
      `"${(e.vendorName || '').replace(/"/g, '""')}"`,
      (e.amountPaise / 100).toFixed(2),
      e.paymentMethod,
      `"${e.paidByName}"`,
      `"${e.submittedByName}"`,
      e.verificationStatus === 'verified' ? 'Approved' : 'Pending Approval',
      e.syncStatus,
      e.hasReceipt ? 'Yes' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SoulDive_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const datePresets: { id: DatePreset; labelEn: string; labelHi: string }[] = [
    { id: 'all', labelEn: 'All Time', labelHi: 'सभी समय' },
    { id: 'today', labelEn: 'Today', labelHi: 'आज' },
    { id: 'this_month', labelEn: 'This Month', labelHi: 'इस महीने' },
    { id: 'custom', labelEn: 'Custom 📅', labelHi: 'कस्टम तारीख 📅' },
  ];

  // Helper for active date label
  const activeDateLabel = useMemo(() => {
    const found = datePresets.find((p) => p.id === datePreset);
    if (!found || found.id === 'all') return null;
    return isHindi ? found.labelHi : found.labelEn;
  }, [datePreset, isHindi]);

  return (
    <div className="space-y-3.5">
      {/* 1. Ultra-Clean Top Bar (Single Row Only!) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={isHindi ? 'खर्च, वेंडर, श्रेणी खोजें...' : 'Search expenses...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-cyan-500 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Trigger Button with badge count */}
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
            activeFiltersCount > 0
              ? 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-700" />
          <span className="hidden sm:inline">{isHindi ? 'फिल्टर' : 'Filters'}</span>
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-cyan-700 text-white rounded-full text-[10px] font-black leading-tight">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
          title="Export CSV"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">{isHindi ? 'एक्सपोर्ट' : 'Export'}</span>
        </button>
      </div>

      {/* 2. Active Filter Pills (Shown only when active filters exist) */}
      {(activeFiltersCount > 0 || searchQuery) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {activeDateLabel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 text-[11px] font-bold border border-cyan-200 animate-in fade-in">
              <Calendar className="w-3 h-3 text-cyan-700" />
              <span>{activeDateLabel}</span>
              <button
                onClick={() => setDatePreset('all')}
                className="hover:text-cyan-950 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}



          {selectedMethod !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 text-[11px] font-bold animate-in fade-in">
              <span className="uppercase">{selectedMethod}</span>
              <button onClick={() => setSelectedMethod('all')} className="hover:text-slate-950 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {onlyReceipts && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 text-[11px] font-bold border border-cyan-200 animate-in fade-in">
              <span>{isHindi ? 'सिर्फ बिल' : 'With Receipts'}</span>
              <button onClick={() => setOnlyReceipts(false)} className="hover:text-cyan-950 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={resetAllFilters}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline ml-1"
          >
            {isHindi ? 'सभी हटाएं (Clear all)' : 'Clear all'}
          </button>
        </div>
      )}

      {/* 3. Sleek Financial Summary Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider block">
            {isHindi ? 'कुल खर्च (फिल्टर अनुसार)' : 'Total Spend'}
          </span>
          <span className="text-2xl font-black text-white tracking-tight">
            {formatINR(totalAmountPaise)}
          </span>
        </div>

        <div className="text-right space-y-1">
          <span className="text-xs text-slate-300 font-bold block">
            {filteredExpenses.length} {isHindi ? 'रिकॉर्ड' : 'entries'}
          </span>
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingCount} {isHindi ? 'बाकी' : 'pending'}
              </span>
            )}
            {verifiedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {verifiedCount} {isHindi ? 'मंजूर' : 'approved'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Transaction Cards (Visible immediately, no scrolling required!) */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">
              {isHindi ? 'इस फिल्टर में कोई खर्च नहीं मिला' : 'No expenses match this filter'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {isHindi ? 'कृपया तारीख या अन्य फिल्टर बदलकर देखें।' : 'Try changing your filter settings.'}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                {isHindi ? 'सभी फिल्टर हटाएं' : 'Clear Filters'}
              </button>
            )}
          </div>
        ) : (
          filteredExpenses.map((item) => {
            const isApproved = item.verificationStatus === 'verified';
            const isSynced = item.syncStatus === 'synced';

            return (
              <div
                key={item.clientUuid}
                onClick={() => setSelectedExpense(item)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
              >
                {/* Left: Description, Date, Vendor, Category */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 truncate">{item.description}</span>
                    {item.hasReceipt && (
                      <span className="p-1 rounded bg-cyan-100 text-cyan-800" title="Bill Receipt Attached">
                        <Receipt className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateIST(item.paymentDate, language)} • {item.paymentMethod.toUpperCase()}
                    {item.vendorName ? ` • ${item.vendorName}` : ''}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-600">{item.paidByName}</span>
                    <span>•</span>
                    <span className="text-cyan-700 font-semibold">
                      {isHindi ? item.categoryNameHi || item.categoryName : item.categoryName}
                    </span>
                  </div>
                </div>

                {/* Right: Amount, Approval Badge, Sync Status */}
                <div className="text-right flex flex-col items-end flex-shrink-0">
                  <span className="text-base font-black text-slate-900 tracking-tight">
                    {formatINR(item.amountPaise)}
                  </span>

                  {/* Prominent Approval Status Badge */}
                  <div className="mt-1">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        {isHindi ? 'मंजूर' : 'Approved'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {isHindi ? 'मंजूरी बाकी' : 'Pending Approval'}
                      </span>
                    )}
                  </div>

                  {/* Cloud Sync Status */}
                  <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                    {isSynced ? (isHindi ? 'क्लाउड सिंक ✓' : 'Synced ✓') : (isHindi ? 'फोन में सेव' : 'Local Only')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. The Revolut/Apple-Style Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom duration-300 border-t border-slate-200">
            {/* Sheet Handle & Header */}
            <div className="px-6 pt-3 pb-3 border-b border-slate-100">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isHindi ? 'फिल्टर एवं तारीख' : 'Filters & Date Range'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isHindi ? 'अपनी सुविधानुसार खर्च छांटें' : 'Refine ledger results'}
                  </p>
                </div>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Sheet Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* SECTION A: Date Range Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isHindi ? 'तारीख का दायरा (Date Range)' : 'Date Range'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {datePresets.map((preset) => {
                    const isSelected = datePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setDatePreset(preset.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-cyan-700 text-white border-cyan-700 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isHindi ? preset.labelHi : preset.labelEn}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Inputs if Custom Selected */}
                {datePreset === 'custom' && (
                  <div className="mt-3 p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-2xl grid grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-cyan-950 mb-1">
                        {isHindi ? 'तारीख से (From)' : 'From Date'}
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-cyan-950 mb-1">
                        {isHindi ? 'तारीख तक (To)' : 'To Date'}
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>



              {/* SECTION C: Payment Method */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isHindi ? 'भुगतान माध्यम (Payment Method)' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'upi', label: 'UPI' },
                    { id: 'bank_transfer', label: 'Bank' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        selectedMethod === m.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION D: Category & Sorting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {isHindi ? 'खर्च श्रेणी' : 'Category'}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="all">{isHindi ? 'सभी श्रेणियां' : 'All Categories'}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isHindi ? c.nameHi : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {isHindi ? 'क्रम (Sort Order)' : 'Sort Order'}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="date-desc">{isHindi ? 'तारीख (नया पहले)' : 'Date: Newest'}</option>
                    <option value="date-asc">{isHindi ? 'तारीख (पुराना पहले)' : 'Date: Oldest'}</option>
                    <option value="amount-desc">{isHindi ? 'रकम (अधिक से कम)' : 'Amount: High to Low'}</option>
                    <option value="amount-asc">{isHindi ? 'रकम (कम से अधिक)' : 'Amount: Low to High'}</option>
                  </select>
                </div>
              </div>

              {/* Only With Receipts Toggle */}
              <div className="pt-1">
                <label
                  onClick={() => setOnlyReceipts(!onlyReceipts)}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-bold text-slate-800">
                      {isHindi ? 'सिर्फ बिल संलग्न खर्च दिखाएं' : 'Show only expenses with receipts'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={onlyReceipts}
                    onChange={() => {}}
                    className="w-4 h-4 text-cyan-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={resetAllFilters}
                className="py-3 px-4 rounded-2xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                {isHindi ? 'रीसेट (Reset)' : 'Reset'}
              </button>

              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-3 px-5 rounded-2xl bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-black shadow-md shadow-cyan-700/20 active:scale-98 transition-all text-center"
              >
                {isHindi ? `लागू करें (${filteredExpenses.length} रिकॉर्ड)` : `Apply (${filteredExpenses.length} entries)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Expense Detail & 1-Click Approval Popup */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">{isHindi ? 'खर्च का विवरण' : 'Expense Details'}</h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="text-center py-3 bg-cyan-50/60 rounded-2xl border border-cyan-100">
                <span className="text-xs text-slate-500 font-medium block">
                  {isHindi ? 'रकम (Amount)' : 'Amount'}
                </span>
                <span className="text-3xl font-black text-cyan-900">
                  {formatINR(selectedExpense.amountPaise)}
                </span>
              </div>

              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
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
                  <span className="text-slate-500">{isHindi ? 'मंजूरी स्थिति:' : 'Approval Status:'}</span>
                  <span
                    className={`font-black ${
                      selectedExpense.verificationStatus === 'verified'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {selectedExpense.verificationStatus === 'verified'
                      ? isHindi
                        ? 'मंजूर (Approved ✓)'
                        : 'Approved'
                      : isHindi
                      ? 'मंजूरी बाकी (Pending Approval)'
                      : 'Pending Approval'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">{isHindi ? 'क्लाउड सिंक स्थिति:' : 'Cloud Sync:'}</span>
                  <span className="font-bold text-cyan-800 uppercase">
                    {selectedExpense.syncStatus}
                  </span>
                </div>
              </div>

              {selectedExpense.hasReceipt && selectedExpense.receiptDataUrl && (
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-2">
                    {isHindi ? 'बिल की प्रति:' : 'Bill Receipt:'}
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-52 flex items-center justify-center bg-slate-100">
                    <img
                      src={selectedExpense.receiptDataUrl}
                      alt="Bill receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

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
                      className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                        isSuperAdmin && selectedExpense.verificationStatus === 'verified'
                          ? 'bg-amber-400 hover:bg-amber-300 border-amber-500 text-slate-950 font-black'
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
                        type="button"
                        onClick={() => handleApprove(selectedExpense.clientUuid)}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3px]" />
                        <span>{isHindi ? 'मंजूर करें' : 'Approve'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {(selectedExpense.verificationStatus !== 'verified' || isSuperAdmin) && isOwner && (
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(selectedExpense.clientUuid)}
                  className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
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
                type="button"
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
      />
    </div>
  );
}
