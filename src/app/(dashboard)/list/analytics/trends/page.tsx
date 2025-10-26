'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, TrendingUp, Filter, ChevronLeft, ChevronRight, AlertCircle, BarChart3, LineChart } from 'lucide-react';

type TrendRow = {
  code: string;
  name: string;
  date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
};

type ApiResponse = { trends: TrendRow[] };

export default function AttendanceTrendsPage() {
  const instructorId = 7;

  const [data, setData] = useState<TrendRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState('');
  const [activeTab, setActiveTab] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function load() {
    try {
      setLoading(true);
      setErr('');
      const p = new URLSearchParams();
      p.set('instructorId', String(instructorId));
      if (start) p.set('start', start);
      if (end) p.set('end', end);
      if (selected) p.set('scheduleId', selected);
      const res = await fetch(`/api/analytics/trends?${p.toString()}`, {
        cache: 'no-store',
      });
      const j: ApiResponse = await res.json();
      if (!res.ok) throw new Error((j as any)?.error || 'Failed to load trends');
      setData(j.trends);
      setPage(1);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load trends');
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach(d => {
      if (!map.has(d.code)) map.set(d.code, d.name);
    });
    return Array.from(map.entries());
  }, [data]);

  const filtered = useMemo(() => {
    if (!selected) return data;
    return data.filter(d => d.code === selected);
  }, [selected, data]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const chartData = useMemo(() => {
    if (filtered.length === 0) return { points: '', circles: [] };
    
    const values = filtered.map(r => r[activeTab]);
    const maxValue = Math.max(...values, 1);
    const width = 600;
    const height = 180;
    const padding = 20;
    
    const points = filtered.map((r, i) => {
      const x = padding + (i / Math.max(1, filtered.length - 1)) * (width - padding * 2);
      const y = height - padding - (r[activeTab] / maxValue) * (height - padding * 2);
      return { x, y, value: r[activeTab], date: r.date };
    });
    
    return {
      points: points.map(p => `${p.x},${p.y}`).join(' '),
      circles: points,
      maxValue,
    };
  }, [filtered, activeTab]);

  const getTabColor = (tab: typeof activeTab) => {
    const colors = {
      present: 'emerald',
      absent: 'rose',
      late: 'amber',
      excused: 'blue',
    };
    return colors[tab];
  };

  const getLineColor = () => {
    const colors = {
      present: '#10b981',
      absent: '#f43f5e',
      late: '#f59e0b',
      excused: '#3b82f6',
    };
    return colors[activeTab];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Attendance Trends
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                View daily attendance patterns per class
              </p>
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start date"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End date"
                />
              </div>
              
              <select
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selected}
                onChange={e => setSelected(e.target.value)}
              >
                <option value="">All Classes</option>
                {classOptions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{err}</p>
            </div>
          </div>
        )}

        {/* Chart Card */}
        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Trend Visualization</h2>
                <p className="text-sm text-gray-500">{filtered.length} data points</p>
              </div>
              <LineChart className="w-5 h-5 text-gray-400" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {(['present', 'absent', 'late', 'excused'] as const).map((tab) => {
                const color = getTabColor(tab);
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-all relative ${
                      isActive
                        ? `text-${color}-700`
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {isActive && (
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${color}-500`} 
                           style={{ backgroundColor: getLineColor() }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
            <div className="relative">
              <svg viewBox="0 0 600 200" className="w-full h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((percent) => {
                  const y = 180 - (percent / 100) * 160 + 20;
                  return (
                    <g key={percent}>
                      <line
                        x1="20"
                        y1={y}
                        x2="580"
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <text x="5" y={y + 4} fontSize="10" fill="#9ca3af">
                        {Math.round((percent / 100) * chartData.maxValue)}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                {chartData.points && (
                  <polygon
                    points={`20,180 ${chartData.points} ${580},180`}
                    fill={getLineColor()}
                    fillOpacity="0.1"
                  />
                )}

                {/* Line */}
                {chartData.points && (
                  <polyline
                    fill="none"
                    stroke={getLineColor()}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData.points}
                  />
                )}

                {/* Points */}
                {chartData.circles.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      fill="white"
                      stroke={getLineColor()}
                      strokeWidth="2"
                      className="hover:r-7 transition-all cursor-pointer"
                    />
                    <title>{`${p.date}: ${p.value}`}</title>
                  </g>
                ))}
              </svg>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getLineColor() }} />
                <span className="text-gray-600 capitalize">{activeTab}</span>
              </div>
              <div className="text-gray-500">
                Max: <span className="font-semibold text-gray-900">{chartData.maxValue}</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty Chart State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No trend data available</h3>
                <p className="text-sm text-gray-500">
                  Adjust your filters or select a date range to view trends
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Detailed Records</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtered.length} total records {selected && `for ${selected}`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Course Code</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Present</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Absent</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Late</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Excused</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <>
                    {Array.from({ length: pageSize }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 w-24 rounded-lg bg-gray-200" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-20 rounded-lg bg-gray-200" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No records found</h3>
                          <p className="text-sm text-gray-500">Try adjusting your filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium">{r.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold">
                          {r.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-700 font-semibold">{r.present}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-rose-700 font-semibold">{r.absent}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-amber-700 font-semibold">{r.late}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-blue-700 font-semibold">{r.excused}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > pageSize && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{filtered.length}</span> records
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {totalPages <= 7 ? (
                    [...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                          page === i + 1
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))
                  ) : (
                    <span className="px-3 text-sm text-gray-600">
                      Page <span className="font-semibold text-gray-900">{page}</span> of {totalPages}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}