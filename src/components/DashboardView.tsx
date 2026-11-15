'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, CreditCard, Receipt, Award } from 'lucide-react';

interface DashboardViewProps {
  expenses: Expense[];
}

const COLORS = ['#0891b2', '#06b6d4', '#0d9488', '#14b8a6', '#f59e0b', '#ec4899', '#6366f1'];

export default function DashboardView({ expenses }: DashboardViewProps) {
  const { language } = useApp();
  const isHindi = language === 'hi';

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Metrics
  const activeExpenses = useMemo(() => expenses.filter((e) => e.status !== 'voided'), [expenses]);

  const totalOutflow = useMemo(
    () => activeExpenses.reduce((sum, e) => sum + e.amountPaise, 0),
    [activeExpenses]
  );

  const todayOutflow = useMemo(
    () =>
      activeExpenses
        .filter((e) => e.paymentDate === todayStr)
        .reduce((sum, e) => sum + e.amountPaise, 0),
    [activeExpenses, todayStr]
  );

  const thisMonthOutflow = useMemo(
    () =>
      activeExpenses
        .filter((e) => e.paymentDate.startsWith(currentMonthStr))
        .reduce((sum, e) => sum + e.amountPaise, 0),
    [activeExpenses, currentMonthStr]
  );

  const receiptCount = useMemo(
    () => activeExpenses.filter((e) => e.hasReceipt).length,
    [activeExpenses]
  );

  // Category breakdown for chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      const name = isHindi ? e.categoryNameHi || e.categoryName || 'अन्य' : e.categoryName || 'Other';
      map[name] = (map[name] || 0) + e.amountPaise / 100;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6
  }, [activeExpenses, isHindi]);

  // Payment Method breakdown
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      const m = e.paymentMethod.toUpperCase();
      map[m] = (map[m] || 0) + e.amountPaise / 100;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activeExpenses]);

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Outflow */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isHindi ? 'कुल खर्च' : 'Total Outflow'}</span>
          </div>
          <span className="text-xl font-black text-slate-900">{formatINR(totalOutflow)}</span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            {activeExpenses.length} {isHindi ? 'कुल लेनदेन' : 'transactions'}
          </span>
        </div>

        {/* This Month */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase mb-1">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>{isHindi ? 'इस महीने' : 'This Month'}</span>
          </div>
          <span className="text-xl font-black text-teal-900">{formatINR(thisMonthOutflow)}</span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            {isHindi ? 'वर्तमान माह' : 'Current month'}
          </span>
        </div>

        {/* Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase mb-1">
            <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            <span>{isHindi ? 'आज का खर्च' : "Today's Spend"}</span>
          </div>
          <span className="text-xl font-black text-amber-900">{formatINR(todayOutflow)}</span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            {isHindi ? 'आज का भुगतान' : 'Paid today'}
          </span>
        </div>

        {/* Receipts Attached */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase mb-1">
            <Receipt className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isHindi ? 'बिल संलग्न' : 'Receipts'}</span>
          </div>
          <span className="text-xl font-black text-cyan-900">
            {receiptCount} / {activeExpenses.length}
          </span>
          <span className="block text-[11px] text-slate-400 mt-0.5">
            {activeExpenses.length > 0
              ? `${Math.round((receiptCount / activeExpenses.length) * 100)}% बिल उपलब्ध`
              : '0%'}
          </span>
        </div>
      </div>

      {/* Category Spending Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-slate-600 mb-3 tracking-wider">
            {isHindi ? 'प्रमुख श्रेणियों में खर्च (₹)' : 'Top Categories (₹)'}
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, isHindi ? 'रकम' : 'Amount']}
                />
                <Bar dataKey="value" fill="#0891b2" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payment Method Breakdown */}
      {methodData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-slate-600 mb-3 tracking-wider">
            {isHindi ? 'भुगतान माध्यम अनुसार (Cash / UPI / Bank)' : 'Payment Method Distribution'}
          </h3>
          <div className="flex items-center justify-center h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-600 mt-2">
            {methodData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span>
                  {entry.name}: ₹{Math.round(entry.value).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

