'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, TrendingUp, Users, UserCheck, UserX, Clock, FileText, ChevronLeft, ChevronRight, AlertCircle, BarChart3 } from 'lucide-react';

type CourseRow = {
  scheduleId: number;
  code: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendanceRate: number;
};

type ApiResponse = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  courses: CourseRow[];
};

export default function AttendanceOverviewPage() {
  const instructorId = 7;

  const [date, setDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState<ApiResponse>({
    total: 0, present: 0, absent: 0, late: 0, excused: 0, courses: [],
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function load() {
    try {
      setLoading(true);
      setErr('');
      const p = new URLSearchParams();
      p.set('instructorId', String(instructorId));
      if (date) p.set('date', date);

      const res = await fetch(`/api/analytics/overview?${p.toString()}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to load overview');
      setData(j);
      setPage(1);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load overview');
      setData({ total: 0, present: 0, absent: 0, late: 0, excused: 0, courses: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [date]);

  const totalRate = useMemo(() => {
    return data.total ? Math.round((data.present / data.total) * 100) : 0;
  }, [data]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(data.courses.length / pageSize));
  }, [data.courses.length]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.courses.slice(start, start + pageSize);
  }, [data.courses, page]);

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
                Attendance Overview
              </h1>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Track attendance across all your classes
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
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
          {/* Total */}
          <div className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Total Records</div>
            <div className="text-3xl font-bold text-gray-900">{data.total.toLocaleString()}</div>
          </div>

          {/* Present */}
          <div className="group bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                {data.total ? Math.round((data.present / data.total) * 100) : 0}%
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Present</div>
            <div className="text-3xl font-bold text-emerald-700">{data.present.toLocaleString()}</div>
          </div>

          {/* Absent */}
          <div className="group bg-white rounded-2xl border border-rose-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                <UserX className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                {data.total ? Math.round((data.absent / data.total) * 100) : 0}%
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Absent</div>
            <div className="text-3xl font-bold text-rose-700">{data.absent.toLocaleString()}</div>
          </div>

          {/* Late */}
          <div className="group bg-white rounded-2xl border border-amber-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                {data.total ? Math.round((data.late / data.total) * 100) : 0}%
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Late</div>
            <div className="text-3xl font-bold text-amber-700">{data.late.toLocaleString()}</div>
          </div>

          {/* Excused */}
          <div className="group bg-white rounded-2xl border border-blue-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                {data.total ? Math.round((data.excused / data.total) * 100) : 0}%
              </div>
            </div>
            <div className="text-sm font-medium text-gray-500 mb-1">Excused</div>
            <div className="text-3xl font-bold text-blue-700">{data.excused.toLocaleString()}</div>
          </div>
        </div>

        {/* Overall Rate Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Overall Attendance Rate</div>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-gray-900">{totalRate}%</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className={`w-4 h-4 ${totalRate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className={`font-semibold ${totalRate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {totalRate >= 90 ? 'Excellent' : totalRate >= 75 ? 'Good' : totalRate >= 60 ? 'Fair' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${getAttendanceColor(totalRate)}`}>
              {data.present} / {data.total}
            </div>
          </div>
          
          <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="absolute h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, totalRate)}%` }}
            />
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Course Breakdown</h2>
            <p className="text-sm text-gray-500 mt-0.5">{data.courses.length} courses</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Course Code</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subject Name</th>
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
                        <td className="px-6 py-4">
                          <div className="h-4 w-20 rounded-lg bg-gray-200" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-48 rounded-lg bg-gray-200" />
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
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 rounded-lg bg-gray-200 ml-auto" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-16 rounded-full bg-gray-200 ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No data available</h3>
                          <p className="text-sm text-gray-500">
                            {date ? 'No attendance records for the selected date' : 'Select a date or refresh to view data'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  pageRows.map((r) => (
                    <tr key={r.scheduleId} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-sm font-semibold">
                          {r.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{r.name}</td>
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
                      <td className="px-6 py-4 text-right">
                        <span className="text-gray-900 font-semibold">{r.total}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getAttendanceColor(r.attendanceRate)}`}>
                          {r.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && data.courses.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.courses.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-900">{data.courses.length}</span> courses
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