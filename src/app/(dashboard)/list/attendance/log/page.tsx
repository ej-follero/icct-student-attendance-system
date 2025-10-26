"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Row = {
  attendanceId: number;
  timestamp: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  notes: string | null;

  studentId: number;
  userId: number;
  studentIdNum: string;
  firstName: string;
  lastName: string;

  subjectSchedId: number;
  subjectCode: string;
  subjectName: string;
  section: string;
  room: string;
  day: string;
  time: string;

  instructorId: number | null;
};

const STATUS = ["ALL", "PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type StatusFilter = (typeof STATUS)[number];

export default function AttendanceLogPage() {
  const params = useSearchParams();
  const router = useRouter();

  // Filters (url-driven)
  const [instructorId, setInstructorId] = useState<string>(
    params.get("instructorId") || ""
  );
  const [date, setDate] = useState<string>(
    params.get("date") || new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<StatusFilter>(
    (params.get("status") as StatusFilter) || "ALL"
  );
  const [q, setQ] = useState<string>(params.get("q") || "");

  // Pagination
  const [page, setPage] = useState<number>(
    Math.max(1, Number(params.get("page") || 1))
  );
  const [pageSize] = useState<number>(20);

  // Data
  const [data, setData] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "good" | "bad"; msg: string }>();

  // Keep URL in sync with filters
  useEffect(() => {
    const sp = new URLSearchParams();
    if (instructorId) sp.set("instructorId", instructorId);
    if (date) sp.set("date", date);
    if (status && status !== "ALL") sp.set("status", status);
    if (q) sp.set("q", q);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    router.replace(`?${sp.toString()}`);
  }, [instructorId, date, status, q, page, pageSize, router]);

  // Load data
  useEffect(() => {
    const sp = new URLSearchParams();
    if (instructorId) sp.set("instructorId", instructorId);
    if (date) sp.set("date", date);
    sp.set("status", status);
    if (q) sp.set("q", q);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));

    (async () => {
      try {
        setLoading(true);
        setBanner(undefined);
        const r = await fetch(`/api/attendance/log?${sp.toString()}`, {
          headers: { Accept: "application/json" },
        });
        // If something returns HTML, show clear error
        const text = await r.text();
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(
            "Unexpected response (HTML). Did you call the page instead of the API? Make sure the fetch path is '/api/attendance/log'."
          );
        }
        if (!r.ok) throw new Error(json?.error || "Failed to load logs");

        setData(json.items || []);
        setTotal(json.total || 0);
      } catch (e: any) {
        setBanner({ type: "bad", msg: e?.message || "Failed to load logs" });
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [instructorId, date, status, q, page, pageSize]);

  // UI helpers
  const statusBadge = (s: Row["status"]) => {
    const base = "inline-flex px-2 py-1 rounded text-xs font-medium";
    switch (s) {
      case "PRESENT":
        return `${base} bg-green-100 text-green-700`;
      case "ABSENT":
        return `${base} bg-rose-100 text-rose-700`;
      case "LATE":
        return `${base} bg-amber-100 text-amber-700`;
      case "EXCUSED":
      default:
        return `${base} bg-blue-100 text-blue-700`;
    }
  };

  const Header = () => (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            My Attendance Logs • {new Date(date).toLocaleDateString()}
          </h1>
          <p className="text-slate-600">
            View entries saved from “Record Attendance”.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Instructor ID (optional)
              </label>
              <input
                placeholder="e.g. 7"
                value={instructorId}
                onChange={(e) => {
                  setPage(1);
                  setInstructorId(e.target.value.replace(/[^\d]/g, ""));
                }}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setPage(1);
                  setDate(e.target.value);
                }}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as StatusFilter);
                }}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Search by student name / ID
              </label>
              <input
                placeholder="e.g. Trinidad, Esperanza, Cruz…"
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`rounded-lg px-4 py-3 flex items-center gap-2 ${
              banner.type === "good"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span className="font-medium">{banner.msg}</span>
            <button
              onClick={() => setBanner(undefined)}
              className="ml-auto opacity-70 hover:opacity-100"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Student ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Section</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && data.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  data.map((row) => (
                    <tr key={row.attendanceId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {new Date(row.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{row.studentIdNum}</td>
                      <td className="px-4 py-3">
                        {row.lastName}, {row.firstName}
                      </td>
                      <td className="px-4 py-3">
                        {row.subjectCode} — {row.subjectName}
                      </td>
                      <td className="px-4 py-3">{row.section}</td>
                      <td className="px-4 py-3">{row.room}</td>
                      <td className="px-4 py-3">{row.time}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(row.status)}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-slate-600">
              Page {page} of {totalPages} • {total} total
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, page - 3),
                  Math.max(0, page - 3) + 5 /* window */
                )
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 border rounded ${
                      p === page ? "bg-indigo-600 text-white" : ""
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
