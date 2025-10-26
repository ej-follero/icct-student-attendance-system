'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Users, FileSpreadsheet } from 'lucide-react';

type SummaryRow = {
  scheduleId: number;
  code: string;
  subject: string;
  section: string;
  room: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number;
};

export default function AttendanceSummaryPage() {
  const [items, setItems] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const instructorId = 7; // replace with logged-in instructor

  /** fetch data */
  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const p = new URLSearchParams();
      p.set('instructorId', String(instructorId));
      if (date) p.set('date', date);
      const res = await fetch(`/api/attendance/summary?${p}`, { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to fetch summary');
      setItems(j.items || []);
      setPage(1);
    } catch (e: any) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [date]);

  /** totals */
  const totals = useMemo(() => {
    const sum = (k: keyof SummaryRow) => items.reduce((a, it) => a + (it[k] as number), 0);
    const totalAll = sum('total');
    const present = sum('present');
    const rate = totalAll ? Math.round((present / totalAll) * 100) : 0;
    return { present, absent: sum('absent'), late: sum('late'), excused: sum('excused'), totalAll, rate };
  }, [items]);

  const rateColor = (r: number) =>
    r >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : r >= 75 ? 'bg-blue-50 text-blue-700 border-blue-200'
      : r >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  const totalPages = Math.ceil(items.length / pageSize);
  const current = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Attendance Summary</h1>
            <p className="text-sm text-gray-500">Overview of class attendance on the selected date</p>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={fetchSummary}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card icon={<Users size={18} />} title="Overall Present Rate">
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold border ${rateColor(totals.rate)}`}>
              {totals.rate}%
            </div>
          </Card>
          <Card icon={<FileSpreadsheet size={18} />} title="Total Records">
            <div className="text-3xl font-bold">{totals.totalAll}</div>
          </Card>
          <Card icon={<CalendarDays size={18} />} title="Breakdown">
            <p className="text-sm">
              <span className="font-semibold">{totals.present}</span> Present •{' '}
              <span className="font-semibold">{totals.absent}</span> Absent •{' '}
              <span className="font-semibold">{totals.late}</span> Late •{' '}
              <span className="font-semibold">{totals.excused}</span> Excused
            </p>
          </Card>
        </div>

        {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}

        {/* Table */}
        <div className="rounded-lg border shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Section</th>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2 text-right">Present</th>
                <th className="px-4 py-2 text-right">Absent</th>
                <th className="px-4 py-2 text-right">Late</th>
                <th className="px-4 py-2 text-right">Excused</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="p-6 text-center text-gray-400">Loading...</td></tr>
              )}
              {!loading && current.length === 0 && (
                <tr><td colSpan={10} className="p-6 text-center text-gray-400">No data found</td></tr>
              )}
              {current.map((r, i) => (
                <tr key={r.scheduleId} className={i % 2 ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-100'}>
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.subject}</td>
                  <td className="px-4 py-2">{r.section}</td>
                  <td className="px-4 py-2">{r.room}</td>
                  <td className="px-4 py-2 text-right">{r.present}</td>
                  <td className="px-4 py-2 text-right">{r.absent}</td>
                  <td className="px-4 py-2 text-right">{r.late}</td>
                  <td className="px-4 py-2 text-right">{r.excused}</td>
                  <td className="px-4 py-2 text-right">{r.total}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${rateColor(r.rate)}`}>
                      {r.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setPage(idx + 1)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${
                  page === idx + 1
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Card Component ---------- */
function Card({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {icon} <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
