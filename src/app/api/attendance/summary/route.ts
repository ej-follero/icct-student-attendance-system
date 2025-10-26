export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to build a full-day date range
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
  try {
    const url = new URL(req.url);
    const instructorId = url.searchParams.get('instructorId')
      ? Number(url.searchParams.get('instructorId'))
      : undefined;
    const date = url.searchParams.get('date') || undefined;

    if (!instructorId) {
      return NextResponse.json({ error: 'Missing instructorId' }, { status: 400 });
    }

    // 1) Find all schedules taught by this instructor
    const schedules = await prisma.subjectSchedule.findMany({
      where: { instructorId },
      select: {
        subjectSchedId: true,
        subject: { select: { subjectCode: true, subjectName: true } },
        section: { select: { sectionName: true } },
        room: { select: { roomId: true } }, // show roomId since schema has no roomName
      },
    });

    if (schedules.length === 0) return NextResponse.json({ items: [] });

    const schedIds = schedules.map(s => s.subjectSchedId);

    // 2) Pull attendance records for those schedules
    const records = await prisma.attendance.findMany({
      where: {
        instructorId,
        subjectSchedId: { in: schedIds },
        ...(date ? { timestamp: dayRange(date) } : {}),
      },
      select: { subjectSchedId: true, status: true },
    });

    // 3) Aggregate counts per schedule
    const stats: Record<number, { present: number; absent: number; late: number; excused: number }> = {};
    for (const r of records) {
      if (!stats[r.subjectSchedId]) stats[r.subjectSchedId] = { present: 0, absent: 0, late: 0, excused: 0 };
      const s = stats[r.subjectSchedId];
      if (r.status === 'PRESENT') s.present++;
      else if (r.status === 'ABSENT') s.absent++;
      else if (r.status === 'LATE') s.late++;
      else if (r.status === 'EXCUSED') s.excused++;
    }

    // 4) Build response rows
    const items = schedules.map(s => {
      const g = stats[s.subjectSchedId] || { present: 0, absent: 0, late: 0, excused: 0 };
      const total = g.present + g.absent + g.late + g.excused;
      const rate = total ? Math.round((g.present / total) * 100) : 0;
      return {
        scheduleId: s.subjectSchedId,
        subject: s.subject.subjectName,
        code: s.subject.subjectCode,
        section: s.section.sectionName,
        room: s.room?.roomId ?? '',
        ...g,
        total,
        rate,
      };
    });

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('GET /attendance/summary error:', e);
    return NextResponse.json({ error: e.message || 'Failed to load summary' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
