"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  studentId: number;
  idNumber: string | null;
  name: string;
  section: string;
  subject: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  lastSeen: string | null;
};

type Payload = {
  items: Row[];
  totals: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
  count: number;
};

export default function GenerateReportPage() {
  // TODO: wire this to your logged-in user later
  const instructorId = 7;

  const [start, setStart] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [end, setEnd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Payload | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const url = `/api/reports/generate?instructorId=${instructorId}&start=${start}&end=${end}`;
      const res = await fetch(url);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to fetch report");
      setData(j as Payload);
    } catch (e: any) {
      setError(e.message || "Failed to fetch report");
      setData({
        items: [],
        totals: { present: 0, absent: 0, late: 0, excused: 0, total: 0 },
        count: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.items ?? [];
  const totals = data?.totals ?? {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-2 rounded-lg border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-2 rounded-lg border"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="h-[40px] px-4 rounded-lg bg-blue-600 text-white"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* Totals (optional) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card title="Total Records" value={totals.total} />
        <Card title="Present" value={totals.present} />
        <Card title="Absent" value={totals.absent} />
        <Card title="Late" value={totals.late} />
        <Card title="Excused" value={totals.excused} />
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <Th>#</Th>
              <Th>ID Number</Th>
              <Th>Name</Th>
              <Th>Section</Th>
              <Th>Subject</Th>
              <Th align="right">Present</Th>
              <Th align="right">Absent</Th>
              <Th align="right">Late</Th>
              <Th align="right">Excused</Th>
              <Th align="center">Last Seen</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-500">
                  No data
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.studentId} className="hover:bg-slate-50">
                <Td>{i + 1}</Td>
                <Td>{r.idNumber ?? "-"}</Td>
                <Td>{r.name || "-"}</Td>
                <Td>{r.section || "N/A"}</Td>
                <Td>{r.subject || "N/A"}</Td>
                <Td align="right">{r.present}</Td>
                <Td align="right">{r.absent}</Td>
                <Td align="right">{r.late}</Td>
                <Td align="right">{r.excused}</Td>
                <Td align="center">
                  {r.lastSeen ? new Date(r.lastSeen).toLocaleString() : "-"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const a =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";
  return (
    <th className={`px-4 py-3 font-semibold text-gray-700 ${a}`}>{children}</th>
  );
}
function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const a =
    align === "right"
      ? "text-right"
      : align === "center"
      ? "text-center"
      : "text-left";
  return <td className={`px-4 py-3 ${a}`}>{children}</td>;
}
