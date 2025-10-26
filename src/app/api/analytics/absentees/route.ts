// src/app/api/analytics/absentees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/analytics/absentees?instructorId=7&start=2025-09-28&end=2025-10-04&q=&limit=20
 */
export async function GET(req: NextRequest) {
  let url: URL | null = null;
  try {
    url = new URL(req.url);
    const instructorId = Number(url.searchParams.get('instructorId') || 0);
    const start = url.searchParams.get('start') || '';
    const end = url.searchParams.get('end') || '';
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));

    if (!instructorId) {
      return NextResponse.json({ error: 'instructorId is required' }, { status: 400 });
    }
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end are required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Collect the instructor's schedules (classes) first
    const schedules = await prisma.subjectSchedule.findMany({
      where: { instructorId },
      select: { subjectSchedId: true },
    });

    const schedIds = schedules.map((s) => s.subjectSchedId);
    if (schedIds.length === 0) {
      return NextResponse.json({
        items: [],
        meta: {
          uniqueStudents: 0,
          absenceRate: 0,
          start,
          end,
        },
      });
    }

    // Pull all attendance rows inside the date range for those schedules
    // NOTE: adjust field names if your model differs (timestamp/createdAt)
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    const rows = await prisma.attendance.findMany({
      where: {
        subjectSchedId: { in: schedIds },
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        subjectSchedId: true,
        studentId: true,
        status: true, // 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    if (rows.length === 0) {
      return NextResponse.json({
        items: [],
        meta: {
          uniqueStudents: 0,
          absenceRate: 0,
          start,
          end,
        },
      });
    }

    // Aggregate per studentId
    type Acc = {
      studentId: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      lastSeen: Date;
    };

    const byStudent = new Map<number, Acc>();

    for (const r of rows) {
      const sId = Number(r.studentId);
      if (!byStudent.has(sId)) {
        byStudent.set(sId, {
          studentId: sId,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
          lastSeen: r.timestamp,
        });
      }
      const acc = byStudent.get(sId)!;
      acc.total += 1;
      if (r.status === 'ABSENT') acc.absent += 1;
      else if (r.status === 'PRESENT') acc.present += 1;
      else if (r.status === 'LATE') acc.late += 1;
      else if (r.status === 'EXCUSED') acc.excused += 1;
      if (r.timestamp > acc.lastSeen) acc.lastSeen = r.timestamp;
    }

    // Grab student details (name/idNum)
    const studentIds = Array.from(byStudent.keys());
    const students = await prisma.student.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, studentIdNum: true, firstName: true, lastName: true },
    });
    const studentMap = new Map(students.map((s) => [s.studentId, s]));

    // Prepare list, filter by q if provided (name/id matches)
    let items = Array.from(byStudent.values()).map((acc) => {
      const st = studentMap.get(acc.studentId);
      const idNum = st?.studentIdNum || '';
      const firstName = st?.firstName || '';
      const lastName = st?.lastName || '';
      const name = `${firstName} ${lastName}`.trim();
      const absencePct = acc.total > 0 ? Math.round((acc.absent / acc.total) * 100) : 0;

      return {
        studentId: acc.studentId,
        idNumber: idNum,
        firstName,
        lastName,
        name,
        absent: acc.absent,
        present: acc.present,
        late: acc.late,
        excused: acc.excused,
        total: acc.total,
        absencePct,
        lastSeen: acc.lastSeen,
      };
    });

    if (q) {
      items = items.filter((it) => {
        const hay = `${it.idNumber} ${it.name}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Sort: most ABSENT first, then total desc, then name
    items.sort((a, b) => {
      if (b.absent !== a.absent) return b.absent - a.absent;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

    const uniqueStudents = items.length;
    const totalAbsences = items.reduce((n, it) => n + it.absent, 0);
    const overallEvents = items.reduce((n, it) => n + it.total, 0);
    const absenceRate = overallEvents > 0 ? Math.round((totalAbsences / overallEvents) * 100) : 0;

    // Cap result size by limit
    const limited = items.slice(0, limit);

    return NextResponse.json({
      items: limited,
      meta: {
        uniqueStudents,
        absenceRate,
        start,
        end,
      },
    });
  } catch (e: any) {
    console.error('GET /api/analytics/absentees error:', e);
    return NextResponse.json({ error: 'Failed to load top absentees' }, { status: 500 });
  } finally {
    // keep prisma connected for lambda pooling; if you want to hard close:
    // await prisma.$disconnect();
  }
}
