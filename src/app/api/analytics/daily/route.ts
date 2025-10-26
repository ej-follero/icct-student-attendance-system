import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// helper: normalize a YYYY-MM-DD into [start, end) UTC
function dayRange(dateStr: string) {
  // keep it simple: treat given date as local day and make an inclusive range
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instructorId = Number(searchParams.get('instructorId'));
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const debug = searchParams.get('debug') === '1';

  if (!instructorId || Number.isNaN(instructorId)) {
    return NextResponse.json({ error: 'instructorId is required' }, { status: 400 });
  }

  try {
    const { start, end } = dayRange(date);

    // 1) Count by schedule & status for this instructor and day
    const grouped = await prisma.attendance.groupBy({
      by: ['subjectSchedId', 'status'],
      where: {
        instructorId,
        timestamp: { gte: start, lt: end },
      },
      _count: { _all: true },
    });

    // Nothing today? Return zeros
    if (grouped.length === 0) {
      return NextResponse.json({
        date,
        totals: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 },
        items: [],
      });
    }

    // 2) Fold into per-schedule totals
    type Count = { present: number; absent: number; late: number; excused: number; total: number };
    const perSched = new Map<number, Count>();

    for (const g of grouped) {
      const sid = g.subjectSchedId;
      if (!sid) continue;
      const c = perSched.get(sid) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      switch (g.status) {
        case 'PRESENT':
          c.present += g._count._all; break;
        case 'ABSENT':
          c.absent += g._count._all; break;
        case 'LATE':
          c.late += g._count._all; break;
        case 'EXCUSED':
          c.excused += g._count._all; break;
        default:
          // ignore other statuses if any
          break;
      }
      c.total += g._count._all;
      perSched.set(sid, c);
    }

    // 3) Fetch schedules metadata for those subjectSchedIds
    const scheduleIds = Array.from(perSched.keys());
    const schedules = await prisma.subjectSchedule.findMany({
      where: { subjectSchedId: { in: scheduleIds } },
      select: {
        subjectSchedId: true,
        day: true,
        startTime: true,
        endTime: true,
        subject: { select: { subjectCode: true, subjectName: true } },      // Subjects model
        section: { select: { sectionName: true } },
        room: { select: { roomBuildingLoc: true, roomFloorLoc: true } },
      },
    });

    // map schedules by id for faster access
    const schedMap = new Map<number, (typeof schedules)[number]>();
    for (const s of schedules) schedMap.set(s.subjectSchedId, s);

    // 4) Compose items
    const items = scheduleIds.map((sid) => {
      const c = perSched.get(sid)!;
      const meta = schedMap.get(sid);
      const present = c.present;
      const total = c.total;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        scheduleId: sid,
        code: meta?.subject?.subjectCode ?? '',
        subject: meta?.subject?.subjectName ?? 'Unknown Subject',
        section: meta?.section?.sectionName ?? '',
        room:
          meta?.room?.roomBuildingLoc && meta?.room?.roomFloorLoc
            ? `${meta.room.roomBuildingLoc} ${meta.room.roomFloorLoc}`
            : meta?.room?.roomBuildingLoc ?? '',
        day: meta?.day ?? '',
        time: meta?.startTime && meta?.endTime ? `${meta.startTime} - ${meta.endTime}` : '',
        present: c.present,
        absent: c.absent,
        late: c.late,
        excused: c.excused,
        total,
        rate,
      };
    });

    // 5) Overall totals
    const totals = items.reduce(
      (acc, it) => {
        acc.present += it.present;
        acc.absent += it.absent;
        acc.late += it.late;
        acc.excused += it.excused;
        acc.total += it.total;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    );
    const overallRate = totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;

    return NextResponse.json({
      date,
      totals: { ...totals, rate: overallRate },
      items,
    });
  } catch (e: any) {
    console.error('GET /api/analytics/daily error:', e);
    if (searchParams.get('debug') === '1') {
      // Optional debug surface
      return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to load daily summary' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
