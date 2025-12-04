import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/students/:id/enrolled-schedules
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // JWT Authentication (SUPER_ADMIN, ADMIN, DEPARTMENT_HEAD, INSTRUCTOR)
    const token = _req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const reqUserId = Number((decoded as any)?.userId);
    if (!Number.isFinite(reqUserId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const reqUser = await prisma.user.findUnique({ where: { userId: reqUserId }, select: { status: true, role: true } });
    if (!reqUser || reqUser.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_HEAD', 'INSTRUCTOR'];
    if (!allowedRoles.includes(reqUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const studentId = Number(id);
    if (!studentId || !Number.isFinite(studentId)) {
      return NextResponse.json({ items: [] });
    }

    const schedules = await prisma.subjectSchedule.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null, // Exclude soft-deleted schedules
        StudentSchedule: {
          some: { studentId, status: 'ACTIVE' }
        }
      },
      include: {
        subject: true,
        section: true,
        instructor: { select: { firstName: true, lastName: true } }
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
    });

    const items = schedules.map((s) => ({
      value: `schedule:${s.subjectSchedId}`,
      label: `${s.subject.subjectCode} • ${s.section.sectionName} • ${s.day} ${s.startTime}-${s.endTime} • ${s.instructor?.firstName || 'Unknown'} ${s.instructor?.lastName || 'Instructor'}`
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch enrolled schedules error:', error);
    return NextResponse.json({ items: [] });
  }
}


