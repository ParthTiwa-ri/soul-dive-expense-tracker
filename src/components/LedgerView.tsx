'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR, formatDateIST } from '@/lib/constants';
import { db } from '@/lib/db';
import {
  Search,
  Filter,
  Download,
  Receipt,
  CheckCircle,
  Clock,
  X,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LedgerViewProps {
  expenses: Expense[];
}

export default function LedgerView({ expenses }: LedgerViewProps) {
  const { language, currentUser } = useApp();
  const isHindi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<'all' | 'pending' | 'verified'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Filtered and Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = e.description.toLowerCase().includes(q);
          const matchVendor = e.vendorName?.toLowerCase().includes(q);
          const matchPayer = e.paidByName.toLowerCase().includes(q);
          if (!matchDesc && !matchVendor && !matchPayer) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && e.categoryId !== selectedCategory) {
          return false;
        }

        // Payment method filter
        if (selectedMethod !== 'all' && e.paymentMethod !== selectedMethod) {
          return false;
        }

        // Approval status filter
        if (selectedApprovalStatus === 'verified' && e.verificationStatus !== 'verified') return false;
        if (selectedApprovalStatus === 'pending' && e.verificationStatus !== 'pending') return false;

        // Receipt filter
        if (selectedStatus === 'receipt' && !e.hasReceipt) return false;

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
  }, [expenses, searchQuery, selectedCategory, selectedMethod, selectedApprovalStatus, selectedStatus, sortBy]);

  // Aggregate Totals
  const totalAmountPaise = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status !== 'voided')
      .reduce((sum, e) => sum + e.amountPaise, 0);
  }, [filteredExpenses]);

  // Handle Approve action directly from Ledger
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
          particleCount: 45,
          spread: 40,
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

  return (
    <div className="space-y-4">
      {/* Search & Export Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={isHindi ? 'खर्च, वेंडर या नाम खोजें...' : 'Search by purpose, vendor...'}
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

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold transition-colors"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isHindi ? 'CSV डाउनलोड' : 'Export'}</span>
          </button>
        </div>

        {/* Quick Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Approval Status Filter */}
          <select
            value={selectedApprovalStatus}
            onChange={(e) => setSelectedApprovalStatus(e.target.value as any)}
            className="bg-cyan-50/60 border border-cyan-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-cyan-900 outline-none"
          >
            <option value="all">{isHindi ? 'मंजूरी: सभी स्थिति' : 'Approvals: All'}</option>
            <option value="pending">{isHindi ? '⏳ मंजूरी बाकी (Pending)' : 'Pending Approval'}</option>
            <option value="verified">{isHindi ? '✓ मंजूरशुदा (Approved)' : 'Approved'}</option>
          </select>

          {/* Payment Method filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">{isHindi ? 'सभी माध्यम' : 'All Methods'}</option>
            <option value="cash">{isHindi ? 'नकद' : 'Cash'}</option>
            <option value="upi">{isHindi ? 'UPI' : 'UPI'}</option>
            <option value="bank_transfer">{isHindi ? 'बैंक' : 'Bank'}</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="date-desc">{isHindi ? 'तारीख (नया पहले)' : 'Date: Newest'}</option>
            <option value="date-asc">{isHindi ? 'तारीख (पुराना पहले)' : 'Date: Oldest'}</option>
            <option value="amount-desc">{isHindi ? 'रकम (अधिक से कम)' : 'Amount: High to Low'}</option>
            <option value="amount-asc">{isHindi ? 'रकम (कम से अधिक)' : 'Amount: Low to High'}</option>
          </select>

          {/* Receipt toggle filter */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'receipt' ? 'all' : 'receipt')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
              selectedStatus === 'receipt'
                ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isHindi ? 'सिर्फ बिल वाले' : 'With Receipt'}</span>
          </button>
        </div>
      </div>

      {/* Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 to-cyan-950 p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider block">
            {isHindi ? 'कुल खर्च (फिल्टर अनुसार)' : 'Total Spend (Filtered)'}
          </span>
          <span className="text-2xl font-black text-white">{formatINR(totalAmountPaise)}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium block">
            {filteredExpenses.length} {isHindi ? 'रिकॉर्ड' : 'entries'}
          </span>
        </div>
      </div>

      {/* Ledger Table / Card List */}
      <div className="space-y-2.5">
        {filteredExpenses.map((item) => {
          const isApproved = item.verificationStatus === 'verified';
          const isSynced = item.syncStatus === 'synced';

          return (
            <div
              key={item.clientUuid}
              onClick={() => setSelectedExpense(item)}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 truncate">{item.description}</span>
                  {item.hasReceipt && (
                    <span className="p-0.5 rounded bg-cyan-100 text-cyan-800">
                      <Receipt className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDateIST(item.paymentDate, language)} • {item.paymentMethod.toUpperCase()}
                  {item.vendorName ? ` • ${item.vendorName}` : ''}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>{item.paidByName}</span>
                  <span>•</span>
                  <span className="text-cyan-700 font-medium">
                    {isHindi ? item.categoryNameHi : item.categoryName}
                  </span>
                </div>
              </div>

              {/* Right Side: Amount, Approval Badge, and Sync Indicator */}
              <div className="text-right flex flex-col items-end">
                <span className="text-base font-extrabold text-slate-900">
                  {formatINR(item.amountPaise)}
                </span>

                {/* Primary: Approval / Verification Status Badge */}
                <div className="mt-1">
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      {isHindi ? 'मंजूर (Approved)' : 'Approved'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {isHindi ? 'मंजूरी बाकी' : 'Pending Approval'}
                    </span>
                  )}
                </div>

                {/* Secondary: Cloud Sync Status */}
                <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                  {isSynced ? (isHindi ? 'क्लाउड सिंक ✓' : 'Synced ✓') : (isHindi ? 'फोन में सेव' : 'Local Only')}
                </span>
              </div>
            </div>
          );
        })}
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
