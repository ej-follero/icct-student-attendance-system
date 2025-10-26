import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const instructorId = Number(url.searchParams.get('instructorId'));
  const scheduleId = url.searchParams.get('scheduleId')
    ? Number(url.searchParams.get('scheduleId'))
    : undefined;

  if (!instructorId)
    return NextResponse.json({ error: 'instructorId is required' }, { status: 400 });

  // optional date filters
  const start = url.searchParams.get('start')
    ? new Date(url.searchParams.get('start') as string)
    : undefined;
  const end = url.searchParams.get('end')
    ? new Date(url.searchParams.get('end') as string)
    : undefined;

  try {
    // get schedules for instructor
    const schedules = await prisma.subjectSchedule.findMany({
      where: { instructorId },
      select: {
        subjectSchedId: true,
        subject: { select: { subjectCode: true, subjectName: true } },
      },
    });

    const schedIds = schedules.map(s => s.subjectSchedId);
    if (schedIds.length === 0) return NextResponse.json({ trends: [] });

    // optional filter
    const ids = scheduleId ? [scheduleId] : schedIds;

    // pull all attendance rows in range
    const records = await prisma.attendance.findMany({
      where: {
        subjectSchedId: { in: ids },
        ...(start && end ? { timestamp: { gte: start, lt: end } } : {}),
      },
      select: {
        subjectSchedId: true,
        timestamp: true,
        status: true,
      },
    });

    // group by schedule + date (yyyy-mm-dd)
    const buckets: Record<
      string,
      {
        code: string;
        name: string;
        date: string;
        present: number;
        absent: number;
        late: number;
        excused: number;
      }
    > = {};

    const meta = new Map<number, { code: string; name: string }>();
    schedules.forEach(s =>
      meta.set(s.subjectSchedId, {
        code: s.subject?.subjectCode ?? `sched-${s.subjectSchedId}`,
        name: s.subject?.subjectName ?? 'Unknown',
      })
    );

    for (const r of records) {
      const d = new Date(r.timestamp);
      const keyDate = d.toISOString().slice(0, 10);
      const key = `${r.subjectSchedId}-${keyDate}`;
      if (!buckets[key]) {
        const m = meta.get(r.subjectSchedId)!;
        buckets[key] = {
          code: m.code,
          name: m.name,
          date: keyDate,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
      }
      switch (r.status as AttendanceStatus) {
        case 'PRESENT':
          buckets[key].present++;
          break;
        case 'ABSENT':
          buckets[key].absent++;
          break;
        case 'LATE':
          buckets[key].late++;
          break;
        case 'EXCUSED':
          buckets[key].excused++;
          break;
      }
    }

    // sort
    const trends = Object.values(buckets).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({ trends });
  } catch (e: any) {
    console.error('GET /api/analytics/trends error:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to load trends' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
