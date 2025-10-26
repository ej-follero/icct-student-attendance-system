// src/app/api/attendance/bulk/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { AttendanceStatus, AttendanceType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Combine YYYY-MM-DD and HH:mm into a Date */
function combineDateAndHHMM(dateStr: string, hhmm?: string | null) {
  const d = new Date(dateStr);
  if (!hhmm) return d;
  const [h, m] = hhmm.split(":").map(Number);
  const out = new Date(d);
  out.setHours(h ?? 0, m ?? 0, 0, 0);
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, instructorId, subjectSchedId, entries } = body || {};

    if (
      !date ||
      !instructorId ||
      !subjectSchedId ||
      !Array.isArray(entries) ||
      entries.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get class time boundaries
    const schedule = await prisma.subjectSchedule.findUnique({
      where: { subjectSchedId: Number(subjectSchedId) },
      select: { startTime: true, endTime: true },
    });
    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    const startTs = combineDateAndHHMM(date, schedule.startTime);

    // ✅ Use instructor’s ID as userId (actor)
    const tx = await prisma.$transaction(
      entries.map((e: any) => {
        const status = e.status as AttendanceStatus;
        const checkInTs = e.checkIn
          ? combineDateAndHHMM(date, e.checkIn)
          : startTs;
        const checkOutTs = e.checkOut
          ? combineDateAndHHMM(date, e.checkOut)
          : null;

        return prisma.attendance.upsert({
          where: {
            studentId_subjectSchedId_timestamp: {
              studentId: Number(e.studentId),
              subjectSchedId: Number(subjectSchedId),
              timestamp: startTs,
            },
          },
          create: {
            studentId: Number(e.studentId),
            userId: Number(instructorId), // 👈 fixed
            subjectSchedId: Number(subjectSchedId),
            instructorId: Number(instructorId),
            userRole: Role.INSTRUCTOR, // 👈 fixed
            status,
            attendanceType: AttendanceType.MANUAL_ENTRY,
            timestamp: checkInTs,
            checkOutTime: checkOutTs,
            notes: e.notes ?? null,
          },
          update: {
            userId: Number(instructorId),
            instructorId: Number(instructorId),
            status,
            checkOutTime: checkOutTs,
            notes: e.notes ?? null,
          },
        });
      })
    );

    return NextResponse.json(
      { success: true, count: tx.length },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("POST /api/attendance/bulk error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to save attendance" },
      { status: 500 }
    );
  }
}
