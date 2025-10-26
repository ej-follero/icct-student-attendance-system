'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, AlertTriangle, TrendingDown, Users, Clock, ChevronLeft, ChevronRight, AlertCircle, Search } from 'lucide-react';

type Item = {
  studentId: number;
  idNumber: string;
  name: string;
  firstName: string;
  lastName: string;
  absent: number;
  present: number;
  late: number;
  excused: number;
  total: number;
  absencePct: number;
  lastSeen: string | Date;
};

type Payload = {
  items: Item[];
  meta: {
    uniqueStudents: number;
    absenceRate: number;
    start: string;
    end: string;
  };
};

export default function TopAbsenteesPage() {
  const instructorId = 7;

  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    try {
      setLoading(true);
      setErr('');
      const p = new URLSearchParams();
      p.set('instructorId', String(instructorId));
      p.set('start', start);
      p.set('end', end);
      if (q) p.set('q', q);
      p.set('limit', String(limit));

      const res = await fetch(`/api/analytics/absentees?${p.toString()}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to load');
      setData(j);
      setPage(1);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load top absentees');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const maxAbsent = useMemo(() => {
    return Math.max(1, ...(data?.items?.map((i) => i.absent) || [1]));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil((data?.items?.length || 0) / pageSize));
  const pageRows = (data?.items || []).slice((page - 1) * pageSize, page * pageSize);

  const getAbsenceColor = (pct: number) => {
    if (pct >= 50) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (pct >= 30) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (pct >= 15) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-rose-500 to-red-600 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-orange-500 to-amber-600 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Top Absentees
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Students with highest absence counts in the selected date range
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
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>Top {n}</option>
              ))}
            </select>
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

        {/* Meta Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-2">Date Range</div>
            <div className="text-sm font-semibold text-gray-900">{start} → {end}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Students in List</div>
            <div className="text-3xl font-bold text-gray-900">{data?.meta?.uniqueStudents ?? 0}</div>
          </div>

          <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Average Absence Rate</div>
            <div className="text-3xl font-bold text-rose-700">{data?.meta?.absenceRate ?? 0}%</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top Absence Counts</h2>
              <p className="text-sm text-gray-500 mt-0.5">Visual comparison of absence patterns</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {!loading && (data?.items?.length ?? 0) === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No students found for this range</p>
            </div>
          )}

          {!loading && (data?.items?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {data!.items.slice(0, 10).map((it, idx) => {
                const width = Math.round((it.absent / maxAbsent) * 100);
                return (
                  <div key={it.studentId} className="group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${getRankColor(idx + 1)}`}>
                        {idx + 1}
                      </div>
                      <div className="w-32 truncate text-sm font-mono text-gray-600">{it.idNumber || '—'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <div className="truncate font-medium text-gray-900">{it.name}</div>
                          <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                            <span className="text-rose-700 font-bold">{it.absent}</span>
                            <span className="text-gray-500 text-xs">absences</span>
                          </div>
                        </div>
                        <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Detailed Records</h2>
            <p className="text-sm text-gray-500 mt-0.5">{data?.items?.length || 0} students</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">ID Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Absent</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Present</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Late</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Excused</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Absence %</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <>
                    {Array.from({ length: pageSize }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-gray-200" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-12 rounded bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-6 w-16 rounded-full bg-gray-200 ml-auto" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No records found</h3>
                          <p className="text-sm text-gray-500">Try adjusting your filters</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && pageRows.map((it, idx) => {
                  const globalRank = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr key={it.studentId} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${getRankColor(globalRank)}`}>
                          {globalRank}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">{it.idNumber || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 text-xs">{it.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-rose-700 font-bold text-xs">{it.absent}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-700 font-semibold text-xs">{it.present}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-amber-700 font-semibold text-xs">{it.late}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-blue-700 font-semibold text-xs">{it.excused}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-900 font-semibold text-xs">{it.total}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getAbsenceColor(it.absencePct)}`}>
                          {it.absencePct}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(it.lastSeen).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && (data?.items?.length || 0) > pageSize && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data?.items?.length || 0)}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{data?.items?.length || 0}</span> students
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