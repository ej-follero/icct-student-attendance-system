'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, Download, Search, UserCheck, UserX, Clock, FileText, AlertCircle, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

type Row = {
  scheduleId: number;
  code: string;
  subject: string;
  section: string;
  room: string;
  day: string;
  time: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

type Payload = {
  date: string;
  totals: { present: number; absent: number; late: number; excused: number; total: number; rate: number };
  items: Row[];
};

export default function DailySummaryPage() {
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialInstructor = Number(sp?.get('instructorId') || 0) || 0;
  const initialDate = sp?.get('date') || new Date().toISOString().slice(0, 10);

  const [instructorId, setInstructorId] = useState<number>(initialInstructor || 0);
  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().slice(0, 10));
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function load() {
    if (!instructorId) {
      setErr('instructorId is required');
      setPayload(null);
      return;
    }
    try {
      setLoading(true);
      setErr('');
      const p = new URLSearchParams({ instructorId: String(instructorId), date });
      const res = await fetch(`/api/analytics/daily?${p.toString()}`, { cache: 'no-store' });
      const j = (await res.json()) as Payload | { error: string };
      if (!res.ok || (j as any).error) {
        throw new Error((j as any).error || 'Failed to load daily summary');
      }
      setPayload(j as Payload);
      setPage(1);

      if (typeof window !== 'undefined') {
        const next = new URL(window.location.href);
        next.searchParams.set('instructorId', String(instructorId));
        next.searchParams.set('date', date);
        window.history.replaceState({}, '', next.toString());
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [instructorId, date]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    if (!payload?.items) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return payload.items;
    return payload.items.filter((r) =>
      [r.code, r.subject, r.section, r.room, r.day, r.time, String(r.present), String(r.absent), String(r.late), String(r.excused)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [payload, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const filteredTotals = useMemo(() => {
    if (!filtered.length) return { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 };
    const present = filtered.reduce((a, r) => a + r.present, 0);
    const absent = filtered.reduce((a, r) => a + r.absent, 0);
    const late = filtered.reduce((a, r) => a + r.late, 0);
    const excused = filtered.reduce((a, r) => a + r.excused, 0);
    const total = filtered.reduce((a, r) => a + r.total, 0);
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, excused, total, rate };
  }, [filtered]);

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['Code', 'Subject', 'Section', 'Room', 'Day', 'Time', 'Present', 'Absent', 'Late', 'Excused', 'Total', 'Rate(%)'];
    const rows = filtered.map((r) => [r.code, r.subject, r.section, r.room, r.day, r.time, r.present, r.absent, r.late, r.excused, r.total, r.rate]);
    const csv = [headers, ...rows].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-summary-${date}-instructor-${instructorId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rate >= 75) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (rate >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Daily Attendance Summary
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Per-class attendance counts for a specific instructor and date
              </p>
            </div>

            <button
              onClick={exportCSV}
              disabled={!filtered.length}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Instructor ID</label>
                <input
                  type="number"
                  value={instructorId || ''}
                  onChange={(e) => setInstructorId(Number(e.target.value || 0))}
                  placeholder="e.g. 7"
                  className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-all mt-auto"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
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

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="group bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {payload?.totals.rate ?? 0}%
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Present</div>
            <div className="text-3xl font-bold text-emerald-700">{payload?.totals.present ?? 0}</div>
          </div>

          <div className="group bg-white rounded-2xl border border-rose-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                <UserX className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Absent</div>
            <div className="text-3xl font-bold text-rose-700">{payload?.totals.absent ?? 0}</div>
          </div>

          <div className="group bg-white rounded-2xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Late</div>
            <div className="text-3xl font-bold text-amber-700">{payload?.totals.late ?? 0}</div>
          </div>

          <div className="group bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Excused</div>
            <div className="text-3xl font-bold text-blue-700">{payload?.totals.excused ?? 0}</div>
          </div>

          <div className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-500 mb-2">Present Rate</div>
              <div className="text-3xl font-bold text-gray-900">{payload?.totals.rate ?? 0}%</div>
            </div>
            <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="absolute h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, payload?.totals.rate ?? 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing data for: <span className="font-semibold text-gray-900">{payload?.date || date}</span>
            </div>
            <div className="relative flex-1 max-w-md ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                placeholder="Search subject, section, room..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Class Records</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} classes found</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subject</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Section</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Room</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Day</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Present</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Absent</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Late</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Excused</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <>
                    {Array.from({ length: pageSize }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 w-16 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-32 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-16 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-20 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-24 rounded-lg bg-gray-200" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" /></td>
                        <td className="px-6 py-4"><div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" /></td>
                        <td className="px-6 py-4"><div className="h-6 w-16 rounded-full bg-gray-200 ml-auto" /></td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No records found</h3>
                          <p className="text-sm text-gray-500">
                            {q ? 'Try adjusting your search query' : 'No data available for this filter'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && pageRows.map((it) => (
                  <tr key={it.scheduleId} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold">
                        {it.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{it.subject}</td>
                    <td className="px-6 py-4 text-gray-700">{it.section}</td>
                    <td className="px-6 py-4 text-gray-700">{it.room}</td>
                    <td className="px-6 py-4 text-gray-700">{it.day}</td>
                    <td className="px-6 py-4 text-gray-700 font-mono text-xs">{it.time}</td>
                    <td className="px-6 py-4 text-right"><span className="text-emerald-700 font-semibold">{it.present}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-rose-700 font-semibold">{it.absent}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-amber-700 font-semibold">{it.late}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-blue-700 font-semibold">{it.excused}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-gray-900 font-semibold">{it.total}</span></td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getAttendanceColor(it.rate)}`}>
                        {it.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {!loading && pageRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 font-semibold border-t-2 border-gray-200">
                    <td className="px-6 py-4 text-gray-900" colSpan={6}>Page Totals</td>
                    <td className="px-6 py-4 text-right text-emerald-700">{filteredTotals.present}</td>
                    <td className="px-6 py-4 text-right text-rose-700">{filteredTotals.absent}</td>
                    <td className="px-6 py-4 text-right text-amber-700">{filteredTotals.late}</td>
                    <td className="px-6 py-4 text-right text-blue-700">{filteredTotals.excused}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{filteredTotals.total}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getAttendanceColor(filteredTotals.rate)}`}>
                        {filteredTotals.rate}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
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
                of <span className="font-semibold text-gray-900">{filtered.length}</span> classes
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