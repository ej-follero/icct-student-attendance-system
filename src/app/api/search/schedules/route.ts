import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Search subject schedules by subject code/name or id
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
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 10), 50);
    const entityType = searchParams.get('entityType'); // 'student' or 'instructor'
    const entityId = searchParams.get('entityId'); // studentId or instructorId
    
    console.log('Schedule search request:', { q, limit, entityType, entityId });
    
    if (!q) {
      console.log('No query provided, returning empty results');
      return NextResponse.json({ items: [] });
    }

    let whereClause: any = {
      OR: [
        { subject: { subjectCode: { contains: q, mode: 'insensitive' } } },
        { subject: { subjectName: { contains: q, mode: 'insensitive' } } },
        { section: { sectionName: { contains: q, mode: 'insensitive' } } },
      ],
      status: 'ACTIVE', // Only show active schedules
      deletedAt: null // Exclude soft-deleted schedules
    };

    // Filter by entity type and ID
    if (entityType && entityId) {
      if (entityType === 'student') {
        // For students, find schedules where the student is enrolled
        whereClause.StudentSchedule = {
          some: {
            studentId: parseInt(entityId),
            status: 'ACTIVE'
          }
        };
      } else if (entityType === 'instructor') {
        // For instructors, find schedules they teach
        whereClause.instructorId = parseInt(entityId);
      }
    }

    // Search for both schedules and events in parallel
    const [schedules, events] = await Promise.all([
      prisma.subjectSchedule.findMany({
        where: whereClause,
        include: { 
          subject: true, 
          section: true,
          instructor: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          StudentSchedule: entityType === 'student' ? {
            where: {
              studentId: entityId ? parseInt(entityId) : undefined,
              status: 'ACTIVE'
            }
          } : false
        },
        take: Math.ceil(limit / 2), // Split limit between schedules and events
      }),
      prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
          deletedAt: null, // Only show non-deleted events
          status: { in: ['SCHEDULED', 'ONGOING', 'COMPLETED'] }, // Only show scheduled/active events
        },
        select: {
          eventId: true,
          title: true,
          eventType: true,
          eventDate: true,
          endDate: true,
          location: true,
        },
        orderBy: { eventDate: 'desc' },
        take: Math.ceil(limit / 2), // Split limit between schedules and events
      }),
    ]);

    console.log('Found schedules:', schedules.length, 'Found events:', events.length);

    // Map schedules
    const scheduleItems = schedules.map(s => ({
      value: `schedule:${s.subjectSchedId}`,
      label: `${s.subject.subjectCode} • ${s.section.sectionName} • ${s.day} ${s.startTime}-${s.endTime} • ${s.instructor?.firstName || 'Unknown'} ${s.instructor?.lastName || 'Instructor'}`,
    }));

    // Map events
    const eventItems = events.map(e => {
      const eventDate = new Date(e.eventDate);
      const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const locationStr = e.location ? ` • ${e.location}` : '';
      return {
        value: `event:${e.eventId}`,
        label: `${e.title} • ${dateStr} ${timeStr}${locationStr} • ${e.eventType}`,
      };
    });

    // Combine and limit total results
    const items = [...scheduleItems, ...eventItems].slice(0, limit);

    console.log('Returning items:', items.length);

    return NextResponse.json({ items });
  } catch (e) {
    console.error('Schedule search error', e);
    return NextResponse.json({ items: [] });
  }
}




