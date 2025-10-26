export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

function dayRange(dateStr?: string) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const q = (url.searchParams.get('q') || '').trim();
  const statusParam = (url.searchParams.get('status') || 'ALL') as
    | AttendanceStatus
    | 'ALL';
  const dateParam = url.searchParams.get('date') || undefined;

  const instructorId = url.searchParams.get('instructorId')
    ? Number(url.searchParams.get('instructorId'))
    : undefined;

  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));

  try {
    // Build WHERE only with scalar columns on Attendance
    const where: any = {};
    if (instructorId) where.instructorId = instructorId;
    if (statusParam !== 'ALL') where.status = statusParam;
    const range = dayRange(dateParam);
    if (range) where.timestamp = range;

    // 1) Pull base rows (scalar only)
    const [total, rows] = await prisma.$transaction([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          attendanceId: true,
          studentId: true,
          userId: true,
          subjectSchedId: true,
          instructorId: true,
          status: true,
          notes: true,
          timestamp: true,
        },
      }),
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ items: [], total, page, pageSize });
    }

    // 2) Bulk fetch related info
    const studentIds = Array.from(
      new Set(rows.map((r) => r.studentId).filter(Boolean))
    ) as number[];

    const schedIds = Array.from(
      new Set(rows.map((r) => r.subjectSchedId).filter(Boolean))
    ) as number[];

    const [students, schedules] = await Promise.all([
      studentIds.length
        ? prisma.student.findMany({
            where: { studentId: { in: studentIds } },
            select: {
              studentId: true,
              studentIdNum: true,
              firstName: true,
              lastName: true,
            },
          })
        : Promise.resolve([]),
      schedIds.length
        ? prisma.subjectSchedule.findMany({
            where: { subjectSchedId: { in: schedIds } },
            select: {
              subjectSchedId: true,
              day: true,
              startTime: true,
              endTime: true,
              subject: { select: { subjectCode: true, subjectName: true } },
              section: { select: { sectionName: true } },
              room: { select: { roomNo: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const studentById = new Map(students.map((s) => [s.studentId, s]));
    const scheduleById = new Map(
      schedules.map((s) => [s.subjectSchedId, s])
    );

    const itemsPreFilter = rows.map((r) => {
      const s = studentById.get(r.studentId);
      const sch = scheduleById.get(r.subjectSchedId);

      return {
        attendanceId: r.attendanceId,
        timestamp: r.timestamp,
        status: r.status,
        notes: r.notes ?? null,

        // student
        studentId: r.studentId,
        userId: r.userId,
        studentIdNum: s?.studentIdNum ?? '',
        firstName: s?.firstName ?? '',
        lastName: s?.lastName ?? '',

        // schedule
        subjectSchedId: r.subjectSchedId,
        subjectCode: sch?.subject?.subjectCode ?? '',
        subjectName: sch?.subject?.subjectName ?? '',
        section: sch?.section?.sectionName ?? '',
        room: sch?.room?.roomName ?? '',
        day: sch?.day ?? '',
        time:
          sch?.startTime && sch?.endTime
            ? `${sch.startTime} - ${sch.endTime}`
            : '',

        instructorId: r.instructorId ?? null,
      };
    });

    // Optional free-text filter on student name/id (applied in memory)
    const items =
      q.length === 0
        ? itemsPreFilter
        : itemsPreFilter.filter((row) => {
            const hay = [
              row.firstName,
              row.lastName,
              row.studentIdNum,
            ]
              .join(' ')
              .toLowerCase();
            return hay.includes(q.toLowerCase());
          });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e: any) {
    console.error('GET /api/attendance/log error:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to fetch attendance logs' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
