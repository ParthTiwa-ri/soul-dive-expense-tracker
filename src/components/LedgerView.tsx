'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense, Category, PaymentMethod } from '@/types';
import { formatINR, formatDateIST } from '@/lib/constants';
import { Search, Filter, Download, Receipt, CheckCircle, Clock, X, ArrowUpDown, RefreshCw, AlertTriangle } from 'lucide-react';

interface LedgerViewProps {
  expenses: Expense[];
}

export default function LedgerView({ expenses }: LedgerViewProps) {
  const { language } = useApp();
  const isHindi = language === 'hi';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

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

        // Status filter
        if (selectedStatus === 'verified' && e.verificationStatus !== 'verified') return false;
        if (selectedStatus === 'pending' && e.verificationStatus !== 'pending') return false;
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
  }, [expenses, searchQuery, selectedCategory, selectedMethod, selectedStatus, sortBy]);

  // Aggregate Totals
  const totalAmountPaise = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.status !== 'voided')
      .reduce((sum, e) => sum + e.amountPaise, 0);
  }, [filteredExpenses]);

  // Export to CSV (PRD Section 7 & 18)
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
      'Sync Status',
      'Verification Status',
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
      e.syncStatus,
      e.verificationStatus,
      e.hasReceipt ? 'Yes' : 'No',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
          <span className="text-2xl font-black text-white">
            {formatINR(totalAmountPaise)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-medium block">
            {filteredExpenses.length} {isHindi ? 'रिकॉर्ड' : 'entries'}
          </span>
        </div>
      </div>

      {/* Ledger Table / Card List */}
      <div className="space-y-2.5">
        {filteredExpenses.map((item) => (
          <div
            key={item.clientUuid}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {item.description}
                </span>
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

            <div className="text-right">
              <span className="text-base font-extrabold text-slate-900">
                {formatINR(item.amountPaise)}
              </span>
              <div className="mt-1 flex items-center justify-end">
                {item.syncStatus === 'synced' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                    {isHindi ? 'सर्वर पर सुरक्षित' : 'Synced'}
                  </span>
                ) : item.syncStatus === 'syncing' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-600" />
                    {isHindi ? 'सिंक हो रहा है...' : 'Syncing...'}
                  </span>
                ) : item.syncStatus === 'failed' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                    {isHindi ? 'सिंक विफल' : 'Failed'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                    {isHindi ? 'फोन में सेव (सिंक बाकी)' : 'Local Only'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

