"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Schedule = {
  subjectSchedId: number;
  day: string;
  time: string;
  subject: { subjectCode: string; subjectName: string };
  room: { roomName: string; building?: string | null };
  section: { sectionId: number; sectionName: string };
};

type StudentRow = {
  studentId: number;
  userId: number;
  studentIdNum: string;
  firstName: string;
  lastName: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
};

const STATUS_OPTS: StudentRow["status"][] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

const getStatusColor = (status: StudentRow["status"]) => {
  switch (status) {
    case "PRESENT":
      return "bg-green-100 text-green-800 border-green-200";
    case "ABSENT":
      return "bg-red-100 text-red-800 border-red-200";
    case "LATE":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "EXCUSED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: StudentRow["status"]) => {
  switch (status) {
    case "PRESENT":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "ABSENT":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "LATE":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "EXCUSED":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function RecordAttendancePage() {
  const params = useSearchParams();
  const router = useRouter();

  const instructorId = useMemo<number | null>(() => {
    const s = params.get("instructorId");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [date, setDate] = useState<string>(() => {
    const q = params.get("date");
    return q ?? new Date().toISOString().slice(0, 10);
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "good" | "bad"; msg: string }>();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | "">("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(Array.from(params.entries()));
    sp.set("date", date);
    if (instructorId) sp.set("instructorId", String(instructorId));
    router.replace(`?${sp.toString()}`);
  }, [date, instructorId, params, router]);

  // Load schedules
  useEffect(() => {
    if (!instructorId) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/schedules?instructorId=${instructorId}`);
        if (!r.ok) throw new Error("Failed to load schedules");
        const raw = await r.json();

        const list: Schedule[] = raw.map((s: any) => ({
          subjectSchedId: s.subjectSchedId ?? s.id,
          day: s.day,
          time: s.time,
          subject: {
            subjectCode: s.subject?.subjectCode ?? "",
            subjectName: s.subject?.subjectName ?? "",
          },
          room: {
            roomName: s.room?.roomName ?? "",
            building: s.room?.building ?? null,
          },
          section: {
            sectionId: s.section?.sectionId ?? s.sectionId,
            sectionName: s.section?.sectionName ?? "",
          },
        }));

        setSchedules(list);
        if (!selectedScheduleId && list.length) {
          setSelectedScheduleId(list[0].subjectSchedId);
        }
      } catch (e: any) {
        setBanner({ type: "bad", msg: e.message || "Could not load schedules" });
      } finally {
        setLoading(false);
      }
    })();
  }, [instructorId, selectedScheduleId]);

  // Load students for section
  useEffect(() => {
    if (!selectedScheduleId) return;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(
          `/api/attendance/students?scheduleId=${selectedScheduleId}`
        );
        if (!r.ok) throw new Error("Failed to load students");
        const { items } = await r.json();
        const rows: StudentRow[] = items.map((s: any) => ({
          ...s,
          status: "PRESENT",
        }));
        setStudents(rows);
      } catch (e: any) {
        setBanner({ type: "bad", msg: e.message || "Could not load students" });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedScheduleId]);

  const setAll = (status: StudentRow["status"]) =>
    setStudents((prev) => prev.map((s) => ({ ...s, status })));

  const save = async () => {
    if (!instructorId) {
      setBanner({ type: "bad", msg: "Missing instructorId" });
      return;
    }
    if (!selectedScheduleId) {
      setBanner({ type: "bad", msg: "Select a class to record" });
      return;
    }
    if (students.length === 0) {
      setBanner({ type: "bad", msg: "No students to save" });
      return;
    }

    try {
      setSaving(true);
const r = await fetch('/api/attendance/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date,
    instructorId,
    subjectSchedId: selectedScheduleId,    // <-- FIX
    entries: students.map(s => ({
      studentId: s.studentId,
      userId: s.userId,
      status: s.status,
    })),
  }),
});

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save attendance");
      }
      setBanner({ type: "good", msg: "Attendance saved successfully!" });
    } catch (e: any) {
      setBanner({ type: "bad", msg: e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.studentIdNum.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const selectedSchedule = schedules.find((sc) => sc.subjectSchedId === selectedScheduleId);

  const attendanceStats = useMemo(() => {
    const stats = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    students.forEach((student) => {
      stats[student.status]++;
    });
    return stats;
  }, [students]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Record Attendance</h1>
                <p className="text-slate-600">Mark student attendance for your classes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner */}
        {banner && (
          <div className={`rounded-lg px-4 py-3 mb-6 flex items-center gap-3 ${
            banner.type === "good"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {banner.type === "good" ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="font-medium">{banner.msg}</span>
            <button
              onClick={() => setBanner(undefined)}
              className="ml-auto text-current hover:opacity-70"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {!instructorId ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Instructor Required</h3>
              <p className="text-slate-600">
                Please add <code className="bg-slate-100 px-2 py-1 rounded text-sm">?instructorId=ID</code> to the URL to continue.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Class Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Class</h2>
              
              <div className="grid lg:grid-cols-4 gap-4 mb-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Class Schedule</label>
                  <select
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={selectedScheduleId}
                    onChange={(e) =>
                      setSelectedScheduleId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  >
                    <option value="">Select a class...</option>
                    {schedules.map((s) => (
                      <option key={s.subjectSchedId} value={s.subjectSchedId}>
                        {s.subject.subjectCode} — {s.subject.subjectName} ({s.section.sectionName}) • {s.day} • {s.time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                    {selectedSchedule?.section.sectionName || "—"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Room</label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                    {selectedSchedule
                      ? `${selectedSchedule.room.roomName} ${selectedSchedule.room.building || ""}`.trim()
                      : "—"}
                  </div>
                </div>
              </div>

              {selectedSchedule && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-indigo-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {selectedSchedule.subject.subjectCode} - {selectedSchedule.subject.subjectName}
                    </span>
                    <span className="text-indigo-600">•</span>
                    <span>{selectedSchedule.day} at {selectedSchedule.time}</span>
                  </div>
                </div>
              )}
            </div>

            {selectedScheduleId && (
              <>
                {/* Attendance Stats */}
                {students.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-green-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon("PRESENT")}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-700">{attendanceStats.PRESENT}</p>
                          <p className="text-sm text-green-600">Present</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-red-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon("ABSENT")}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-700">{attendanceStats.ABSENT}</p>
                          <p className="text-sm text-red-600">Absent</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-yellow-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon("LATE")}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-700">{attendanceStats.LATE}</p>
                          <p className="text-sm text-yellow-600">Late</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-blue-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon("EXCUSED")}
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-700">{attendanceStats.EXCUSED}</p>
                          <p className="text-sm text-blue-600">Excused</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Student Attendance</h2>
                      <p className="text-slate-600 text-sm">Mark attendance for {students.length} students</p>
                    </div>

                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        className="pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 w-full lg:w-64"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={() => setAll("PRESENT")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      {getStatusIcon("PRESENT")}
                      Mark all Present
                    </button>
                    <button
                      onClick={() => setAll("ABSENT")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      {getStatusIcon("ABSENT")}
                      Mark all Absent
                    </button>
                    <button
                      onClick={() => setAll("LATE")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
                    >
                      {getStatusIcon("LATE")}
                      Mark all Late
                    </button>
                    <button
                      onClick={() => setAll("EXCUSED")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      {getStatusIcon("EXCUSED")}
                      Mark all Excused
                    </button>
                  </div>

                  {/* Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Student ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {loading ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-500">
                                <svg className="animate-spin w-8 h-8 mb-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-lg font-medium">Loading students...</p>
                              </div>
                            </td>
                          </tr>
                        ) : filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-500">
                                <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">No students found</h3>
                                <p className="text-slate-500">
                                  {searchTerm ? "No students match your search." : "No students enrolled in this section."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st) => (
                            <tr key={st.studentId} className="hover:bg-slate-50 transition-colors duration-150">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm text-slate-900">{st.studentIdNum}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {st.firstName.charAt(0)}{st.lastName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{st.lastName}, {st.firstName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${getStatusColor(st.status)}`}
                                  value={st.status}
                                  onChange={(e) =>
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.studentId === st.studentId
                                          ? {
                                              ...x,
                                              status: e.target.value as StudentRow["status"],
                                            }
                                          : x
                                      )
                                    )
                                  }
                                >
                                  {STATUS_OPTS.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-6 border-t border-slate-200 mt-6">
                    <button
                      onClick={save}
                      disabled={saving || !students.length}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving Attendance...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h2m0 0h9a2 2 0 002-2V9a2 2 0 00-2-2H9m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7v2m6-2v2" />
                          </svg>
                          Save Attendance ({students.length} students)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}