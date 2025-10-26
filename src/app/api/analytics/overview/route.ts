import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

/** Build a same-day range for a YYYY-MM-DD string. */
function dayRange(dateStr?: string) {
  if (!dateStr) return undefined as any;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined as any;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

/**
 * GET /api/analytics/overview?instructorId=7&date=2025-10-04
 * Returns overall totals and a per-class course breakdown for that instructor.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const instructorIdStr = url.searchParams.get('instructorId');
  const dateStr = url.searchParams.get('date') || undefined;

  if (!instructorIdStr) {
    return NextResponse.json({ error: 'instructorId is required' }, { status: 400 });
  }

  const instructorId = Number(instructorIdStr);
  if (!Number.isFinite(instructorId)) {
    return NextResponse.json({ error: 'instructorId must be a number' }, { status: 400 });
  }

  try {
    // 1) Pull schedules taught by this instructor (we only need subject + id)
    const schedules = await prisma.subjectSchedule.findMany({
      where: { instructorId },
      select: {
        subjectSchedId: true,
        subject: { select: { subjectCode: true, subjectName: true } },
      },
    });

    if (schedules.length === 0) {
      return NextResponse.json({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        courses: [],
      });
    }

    const schedIds = schedules.map(s => s.subjectSchedId);

    // 2) Aggregate attendance by schedule + status with optional same-day filter
    const timeFilter = dateStr ? { timestamp: dayRange(dateStr) } : {};
    const grouped = await prisma.attendance.groupBy({
      by: ['subjectSchedId', 'status'],
      where: {
        subjectSchedId: { in: schedIds },
        ...(timeFilter as any),
      },
      _count: { _all: true },
    });

    // 3) Index subject meta
    const meta = new Map<number, { code: string; name: string }>();
    schedules.forEach(s => {
      meta.set(s.subjectSchedId, {
        code: s.subject?.subjectCode ?? `sched-${s.subjectSchedId}`,
        name: s.subject?.subjectName ?? 'Unknown Subject',
      });
    });

    // 4) Tally per schedule
    type Bucket = { present: number; absent: number; late: number; excused: number; total: number };
    const perSchedule = new Map<number, Bucket>();

    for (const row of grouped) {
      const sid = row.subjectSchedId!;
      const bucket = perSchedule.get(sid) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      bucket.total += row._count._all;

      switch (row.status as AttendanceStatus) {
        case 'PRESENT':
          bucket.present += row._count._all;
          break;
        case 'ABSENT':
          bucket.absent += row._count._all;
          break;
        case 'LATE':
          bucket.late += row._count._all;
          break;
        case 'EXCUSED':
          bucket.excused += row._count._all;
          break;
      }

      perSchedule.set(sid, bucket);
    }

    // 5) Build course rows + overall totals
    let total = 0, present = 0, absent = 0, late = 0, excused = 0;

    const courses = Array.from(perSchedule.entries()).map(([sid, b]) => {
      total += b.total;
      present += b.present;
      absent += b.absent;
      late += b.late;
      excused += b.excused;

      const m = meta.get(sid)!;
      const rate = b.total ? Math.round((b.present / b.total) * 100) : 0;

      return {
        scheduleId: sid,
        code: m.code,
        name: m.name,
        present: b.present,
        absent: b.absent,
        late: b.late,
        excused: b.excused,
        total: b.total,
        attendanceRate: rate,
      };
    });

    // Keep deterministic ordering
    courses.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      total,
      present,
      absent,
      late,
      excused,
      courses,
    });
  } catch (e: any) {
    console.error('GET /api/analytics/overview error:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to load overview' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
