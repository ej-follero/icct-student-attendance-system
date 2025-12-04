import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Search students or instructors by name/id
export async function GET(req: NextRequest) {
  try {
    // JWT Authentication
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Check user exists and is active
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    // Role-based access control
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_HEAD', 'INSTRUCTOR'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'student') as 'student' | 'instructor';
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 10), 50);

    if (!q) return NextResponse.json({ items: [] });

    if (type === 'student') {
      const items = await prisma.student.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { studentIdNum: { contains: q, mode: 'insensitive' } },
            { rfidTag: { contains: q, mode: 'insensitive' } },
          ],
          status: 'ACTIVE', // Only show active students
        },
        select: { studentId: true, firstName: true, lastName: true, studentIdNum: true, rfidTag: true },
        take: limit,
      });
      return NextResponse.json({
        items: items.map(s => ({
          value: String(s.studentId),
          label: `${s.firstName} ${s.lastName} • ${s.studentIdNum}${s.rfidTag ? ` (RFID: ${s.rfidTag})` : ''}`,
        })),
      });
    }

    const items = await prisma.instructor.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
        ],
        status: 'ACTIVE', // Only show active instructors
      },
      select: { instructorId: true, firstName: true, lastName: true, employeeId: true },
      take: limit,
    });
    return NextResponse.json({
      items: items.map(i => ({
        value: String(i.instructorId),
        label: `${i.firstName} ${i.lastName} • ${i.employeeId}`,
      })),
    });
  } catch (e) {
    console.error('Entity search error', e);
    return NextResponse.json({ items: [] });
  }
}



