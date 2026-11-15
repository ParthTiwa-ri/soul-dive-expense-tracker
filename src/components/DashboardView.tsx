'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Expense } from '@/types';
import { formatINR } from '@/lib/constants';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  CreditCard,
  Receipt,
  Activity,
  BarChart2,
  Flame,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';

interface DashboardViewProps {
  expenses: Expense[];
}

const COLORS = ['#0891b2', '#06b6d4', '#0d9488', '#14b8a6', '#f59e0b', '#ec4899', '#6366f1'];

type DailyRange = '7d' | '14d' | '30d' | 'this_month';

// Helper to parse "YYYY-MM-DD" safely without UTC shifts
function parseDateParts(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1,
    day: parseInt(parts[2], 10),
  };
}

// Format "YYYY-MM-DD" into IST/Local string like "15 नव" or "15 Nov"
function formatDayShort(dateStr: string, isHindi: boolean): string {
  try {
    const { year, month, day } = parseDateParts(dateStr);
    const d = new Date(year, month, day);
    return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

// Get Hindi/English weekday like "रवि" or "Sun"
function formatWeekdayShort(dateStr: string, isHindi: boolean): string {
  try {
    const { year, month, day } = parseDateParts(dateStr);
    const d = new Date(year, month, day);
    return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
      weekday: 'short',
    });
  } catch {
    return '';
  }
}

// Full date display for tooltip: "रविवार, 15 नवम्बर 2026"
function formatFullDate(dateStr: string, isHindi: boolean): string {
  try {
    const { year, month, day } = parseDateParts(dateStr);
    const d = new Date(year, month, day);
    return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Short Rupee format for chart Y-axis ticks (e.g. ₹5k, ₹1.5L)
function formatYAxis(val: number): string {
  if (val >= 100000) {
    const inLakhs = val / 100000;
    return `₹${inLakhs % 1 === 0 ? inLakhs : inLakhs.toFixed(1)}L`;
  }
  if (val >= 1000) {
    const inK = val / 1000;
    return `₹${inK % 1 === 0 ? inK : inK.toFixed(0)}k`;
  }
  return `₹${val}`;
}

export default function DashboardView({ expenses }: DashboardViewProps) {
  const { language } = useApp();
  const isHindi = language === 'hi';

  const [dailyRange, setDailyRange] = useState<DailyRange>('7d');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Metrics: active non-voided expenses
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

  // Daily Expense Data Calculation
  const dailyData = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();

    if (dailyRange === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();
      for (let day = 1; day <= todayDate; day++) {
        const y = year;
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
    } else {
      const numDays = dailyRange === '7d' ? 7 : dailyRange === '14d' ? 14 : 30;
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
      }
    }

    // Pre-aggregate expenses by paymentDate
    const dateMap: Record<string, { totalPaise: number; count: number }> = {};
    activeExpenses.forEach((e) => {
      if (!dateMap[e.paymentDate]) {
        dateMap[e.paymentDate] = { totalPaise: 0, count: 0 };
      }
      dateMap[e.paymentDate].totalPaise += e.amountPaise;
      dateMap[e.paymentDate].count += 1;
    });

    return dates.map((dateStr) => {
      const entry = dateMap[dateStr] || { totalPaise: 0, count: 0 };
      const amountRupees = entry.totalPaise / 100;
      return {
        date: dateStr,
        displayDate: formatDayShort(dateStr, isHindi),
        weekday: formatWeekdayShort(dateStr, isHindi),
        fullDate: formatFullDate(dateStr, isHindi),
        amountPaise: entry.totalPaise,
        amount: amountRupees,
        count: entry.count,
      };
    });
  }, [activeExpenses, dailyRange, isHindi]);

  // Period Stats for the Daily Expense Tracker
  const periodStats = useMemo(() => {
    const totalPaise = dailyData.reduce((sum, d) => sum + d.amountPaise, 0);
    const totalDays = dailyData.length || 1;
    const avgPaise = Math.round(totalPaise / totalDays);

    let peak = { amountPaise: 0, date: '', displayDate: '', count: 0 };
    dailyData.forEach((d) => {
      if (d.amountPaise > peak.amountPaise) {
        peak = {
          amountPaise: d.amountPaise,
          date: d.date,
          displayDate: d.displayDate,
          count: d.count,
        };
      }
    });

    return {
      totalPaise,
      avgPaise,
      peak,
    };
  }, [dailyData]);

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

  // Custom Daily Chart Tooltip
  const CustomDailyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 text-xs min-w-[170px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="font-bold text-white text-xs">{data.displayDate}</div>
              <div className="text-[10px] text-slate-400">{data.weekday}</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 font-bold">
              {data.count} {isHindi ? 'खर्च' : 'bills'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            {isHindi ? 'दैनिक कुल रकम:' : 'Daily Total:'}
          </div>
          <div className="text-lg font-black text-cyan-400">
            ₹{Number(data.amount).toLocaleString('en-IN')}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. Metrics Grid */}
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

      {/* 2. DAILY EXPENSE GRAPH TRACKER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <Activity className="w-4 h-4 stroke-[2.5px]" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                {isHindi ? 'दैनिक खर्च ट्रैकर' : 'Daily Expense Tracker'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 ml-9">
              {isHindi ? 'हर दिन हुए खर्च का ग्राफ और ट्रेंड' : 'Day-by-day spending graph and trends'}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Chart Style Toggle: Area vs Bar */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  chartType === 'area'
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isHindi ? 'ट्रेंड ग्राफ' : 'Trend Line'}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isHindi ? 'ट्रेंड' : 'Line'}</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  chartType === 'bar'
                    ? 'bg-white text-cyan-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={isHindi ? 'बार ग्राफ' : 'Bar Chart'}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isHindi ? 'बार' : 'Bar'}</span>
              </button>
            </div>

            {/* Time Window Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {(
                [
                  { id: '7d', labelHi: '7 दिन', labelEn: '7D' },
                  { id: '14d', labelHi: '14 दिन', labelEn: '14D' },
                  { id: '30d', labelHi: '30 दिन', labelEn: '30D' },
                  { id: 'this_month', labelHi: 'माह', labelEn: 'Month' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDailyRange(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    dailyRange === r.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {isHindi ? r.labelHi : r.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Period Highlights Mini-Cards */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 mb-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'अवधि का खर्च' : 'Period Total'}
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
              {formatINR(periodStats.totalPaise)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-2 sm:pl-3">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {isHindi ? 'दैनिक औसत' : 'Daily Avg'}
            </span>
            <span className="text-xs sm:text-sm font-black text-teal-800 truncate block">
              {formatINR(periodStats.avgPaise)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-2 sm:pl-3">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500 inline" />
              <span>{isHindi ? 'अधिकतम दिन' : 'Peak Day'}</span>
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-900 truncate block">
              {periodStats.peak.amountPaise > 0
                ? `${formatINR(periodStats.peak.amountPaise)}`
                : '₹0'}
            </span>
            {periodStats.peak.amountPaise > 0 && (
              <span className="text-[10px] text-slate-400 block truncate">
                {periodStats.peak.displayDate}
              </span>
            )}
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={dailyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dailyExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={dailyRange === '30d' ? 4 : dailyRange === '14d' ? 1 : 0}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<CustomDailyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#0891b2"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#dailyExpenseGradient)"
                  dot={{ r: 3, fill: '#0891b2', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#0891b2', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={dailyData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={dailyRange === '30d' ? 4 : dailyRange === '14d' ? 1 : 0}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<CustomDailyTooltip />} />
                <Bar
                  dataKey="amount"
                  fill="#0891b2"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Category Spending Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-slate-600 mb-3 tracking-wider">
            {isHindi ? 'प्रमुख श्रेणियों में खर्च (₹)' : 'Top Categories (₹)'}
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `₹${Number(val).toLocaleString('en-IN')}`,
                    isHindi ? 'रकम' : 'Amount',
                  ]}
                />
                <Bar dataKey="value" fill="#0891b2" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Payment Method Breakdown */}
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
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                />
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
