'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense, Category } from '@/types';
import { formatINR, formatDateIST, DEFAULT_CATEGORIES } from '@/lib/constants';
import { db } from '@/lib/db';
import {
  Search,
  Filter,
  Download,
  Receipt,
  CheckCircle,
  Clock,
  X,
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LedgerViewProps {
  expenses: Expense[];
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'this_month' | 'last30' | 'custom';

// Helper to format date in YYYY-MM-DD for Asia/Kolkata timezone
function getDateStringIST(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function LedgerView({ expenses }: LedgerViewProps) {
  const { language, currentUser } = useApp();
  const isHindi = language === 'hi';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState(getDateStringIST(-30));
  const [customEndDate, setCustomEndDate] = useState(getDateStringIST(0));
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<'all' | 'pending' | 'verified'>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyReceipts, setOnlyReceipts] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selected expense for detail & approval modal
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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
  const yesterdayIST = getDateStringIST(-1);
  const last7DaysIST = getDateStringIST(-7);
  const last30DaysIST = getDateStringIST(-30);
  const currentMonthPrefix = todayIST.substring(0, 7); // YYYY-MM

  // Check if any non-default filter is active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    datePreset !== 'all' ||
    selectedApprovalStatus !== 'all' ||
    selectedMethod !== 'all' ||
    selectedCategory !== 'all' ||
    onlyReceipts;

  const resetAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setSelectedApprovalStatus('all');
    setSelectedMethod('all');
    setSelectedCategory('all');
    setOnlyReceipts(false);
    setSortBy('date-desc');
  };

  // Filtered and Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        // 1. Text Search (Description, Vendor, Payer, Category)
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
        } else if (datePreset === 'yesterday') {
          if (e.paymentDate !== yesterdayIST) return false;
        } else if (datePreset === 'last7') {
          if (e.paymentDate < last7DaysIST || e.paymentDate > todayIST) return false;
        } else if (datePreset === 'this_month') {
          if (!e.paymentDate.startsWith(currentMonthPrefix)) return false;
        } else if (datePreset === 'last30') {
          if (e.paymentDate < last30DaysIST || e.paymentDate > todayIST) return false;
        } else if (datePreset === 'custom') {
          if (customStartDate && e.paymentDate < customStartDate) return false;
          if (customEndDate && e.paymentDate > customEndDate) return false;
        }

        // 3. Approval status filter
        if (selectedApprovalStatus === 'verified' && e.verificationStatus !== 'verified') return false;
        if (selectedApprovalStatus === 'pending' && e.verificationStatus !== 'pending') return false;

        // 4. Payment method filter
        if (selectedMethod !== 'all' && e.paymentMethod !== selectedMethod) return false;

        // 5. Category filter
        if (selectedCategory !== 'all' && e.categoryId !== selectedCategory) return false;

        // 6. Receipt filter
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
    selectedApprovalStatus,
    selectedMethod,
    selectedCategory,
    onlyReceipts,
    sortBy,
    todayIST,
    yesterdayIST,
    last7DaysIST,
    last30DaysIST,
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
    { id: 'yesterday', labelEn: 'Yesterday', labelHi: 'कल' },
    { id: 'last7', labelEn: 'Last 7 Days', labelHi: 'पिछले ७ दिन' },
    { id: 'this_month', labelEn: 'This Month', labelHi: 'इस महीने' },
    { id: 'last30', labelEn: 'Last 30 Days', labelHi: 'पिछले ३० दिन' },
    { id: 'custom', labelEn: 'Custom 📅', labelHi: 'कस्टम तारीख 📅' },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Top Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={isHindi ? 'खर्च, सप्लायर, श्रेणी या नाम खोजें...' : 'Search purpose, vendor, category...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-cyan-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Advanced Filter Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              showAdvancedFilters || hasActiveFilters
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isHindi ? 'फिल्टर' : 'Filters'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
            )}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold transition-colors shadow-sm"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isHindi ? 'CSV डाउनलोड' : 'Export'}</span>
          </button>
        </div>

        {/* Professional Date Preset Chips Bar */}
        <div className="pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {datePresets.map((preset) => {
              const isSelected = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-cyan-700 text-white shadow-sm shadow-cyan-700/20'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {isHindi ? preset.labelHi : preset.labelEn}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Picker Accordion */}
          {datePreset === 'custom' && (
            <div className="mt-3 p-3 bg-cyan-50/70 border border-cyan-200 rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                <label className="text-xs font-bold text-cyan-900">
                  {isHindi ? 'तारीख से:' : 'From:'}
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                <label className="text-xs font-bold text-cyan-900">
                  {isHindi ? 'तारीख तक:' : 'To:'}
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Secondary Filter Dropdown Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {/* Approval Status Filter */}
          <select
            value={selectedApprovalStatus}
            onChange={(e) => setSelectedApprovalStatus(e.target.value as any)}
            className={`border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none transition-colors ${
              selectedApprovalStatus !== 'all'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <option value="all">{isHindi ? 'मंजूरी: सभी स्थिति' : 'Approvals: All'}</option>
            <option value="pending">{isHindi ? '⏳ मंजूरी बाकी (Pending)' : '⏳ Pending Approval'}</option>
            <option value="verified">{isHindi ? '✓ मंजूरशुदा (Approved)' : '✓ Approved'}</option>
          </select>

          {/* Payment Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">{isHindi ? 'सभी माध्यम' : 'All Methods'}</option>
            <option value="cash">{isHindi ? 'नकद (Cash)' : 'Cash'}</option>
            <option value="upi">{isHindi ? 'UPI (GPay / PhonePe)' : 'UPI'}</option>
            <option value="bank_transfer">{isHindi ? 'बैंक ट्रांसफर' : 'Bank Transfer'}</option>
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none max-w-[150px] truncate"
          >
            <option value="all">{isHindi ? 'सभी श्रेणियां' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {isHindi ? c.nameHi : c.nameEn}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="date-desc">{isHindi ? 'तारीख (नया पहले)' : 'Date: Newest'}</option>
            <option value="date-asc">{isHindi ? 'तारीख (पुराना पहले)' : 'Date: Oldest'}</option>
            <option value="amount-desc">{isHindi ? 'रकम (अधिक से कम)' : 'Amount: High to Low'}</option>
            <option value="amount-asc">{isHindi ? 'रकम (कम से अधिक)' : 'Amount: Low to High'}</option>
          </select>

          {/* Receipt toggle filter */}
          <button
            onClick={() => setOnlyReceipts(!onlyReceipts)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 ${
              onlyReceipts
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isHindi ? 'सिर्फ बिल' : 'Receipts'}</span>
          </button>

          {/* Reset Filters button if any filter is active */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isHindi ? 'रीसेट' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Professional Financial Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-cyan-950 p-4 rounded-3xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider block">
            {isHindi ? 'कुल खर्च (फिल्टर अनुसार)' : 'Total Filtered Spend'}
          </span>
          <span className="text-2xl font-black text-white tracking-tight">
            {formatINR(totalAmountPaise)}
          </span>
        </div>

        {/* Detailed Count Badges */}
        <div className="text-right space-y-1">
          <span className="text-xs text-slate-300 font-bold block">
            {filteredExpenses.length} {isHindi ? 'कुल रिकॉर्ड' : 'records'}
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

      {/* Expense Card List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">
              {isHindi ? 'इस फिल्टर में कोई खर्च नहीं मिला' : 'No expenses match this filter'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {isHindi ? 'कृपया तारीख या अन्य फिल्टर बदलकर देखें।' : 'Try selecting a different date range or resetting filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                {isHindi ? 'सभी फिल्टर रीसेट करें' : 'Reset All Filters'}
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
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
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

      {/* Expense Detail & Approval Popup */}
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

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              {selectedExpense.verificationStatus === 'pending' && selectedExpense.status !== 'voided' && (
                <button
                  onClick={() => handleApprove(selectedExpense.clientUuid)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>{isHindi ? 'मंजूर करें (Approve)' : 'Approve'}</span>
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
    </div>
  );
}
