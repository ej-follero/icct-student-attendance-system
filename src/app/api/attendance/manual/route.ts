import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

// Create manual attendance entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      entityType,
      entityId,
      status,
      subjectSchedId,
      eventId,
      timestamp,
      notes,
    } = body as {
      entityType: 'student';
      entityId: number;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      subjectSchedId?: number;
      eventId?: number;
      timestamp?: string;
      notes?: string;
    };

    if (!entityType || !entityId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate entity exists and get userId (students only)
    let actualUserId: number;
    let userRole: 'STUDENT' = 'STUDENT';

    if (entityType === 'student') {
      const student = await prisma.student.findUnique({ 
        where: { studentId: Number(entityId) }, 
        select: { studentId: true, userId: true } 
      });
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      actualUserId = student.userId;
    } else {
      return NextResponse.json({ error: 'Only student manual attendance is supported' }, { status: 410 });
    }

    // Validate subject schedule if provided
    let validatedSubjectSchedId: number | null = null;
    if (subjectSchedId !== undefined && subjectSchedId !== null) {
      const schedule = await prisma.subjectSchedule.findUnique({
        where: { subjectSchedId: Number(subjectSchedId) },
        select: { subjectSchedId: true }
      });
      if (!schedule) {
        return NextResponse.json({ error: 'Subject schedule not found' }, { status: 404 });
      }
      validatedSubjectSchedId = schedule.subjectSchedId;
    }

    // Validate event if provided
    let validatedEventId: number | null = null;
    if (eventId !== undefined && eventId !== null) {
      const event = await prisma.event.findUnique({
        where: { eventId: Number(eventId) },
        select: { eventId: true, deletedAt: true }
      });
      if (!event || event.deletedAt !== null) {
        return NextResponse.json({ error: 'Event not found or has been deleted' }, { status: 404 });
      }
      validatedEventId = event.eventId;
    }

    // Ensure only one of subjectSchedId or eventId is provided
    if (validatedSubjectSchedId !== null && validatedEventId !== null) {
      return NextResponse.json({ error: 'Cannot specify both subject schedule and event' }, { status: 400 });
    }

    // Create attendance record according to schema
    const attendanceData = {
      userId: actualUserId,
      userRole: userRole,
      studentId: Number(entityId),
      subjectSchedId: validatedSubjectSchedId,
      eventId: validatedEventId,
      status: status,
      attendanceType: 'MANUAL_ENTRY' as const,
      verification: 'PENDING' as const,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      notes: notes || null,
    };

    const created = await prisma.attendance.create({
      data: attendanceData,
      select: { 
        attendanceId: true,
        timestamp: true,
        status: true,
        attendanceType: true
      },
    });

    // First-of-week notification for ABSENT/LATE
    try {
      if ((created.status === 'ABSENT' || created.status === 'LATE') && attendanceData.studentId) {
        const startOfWeek = new Date(created.timestamp);
        const day = startOfWeek.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // Monday start
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const count = await prisma.attendance.count({
          where: {
            studentId: attendanceData.studentId,
            status: created.status,
            timestamp: { gte: startOfWeek, lt: endOfWeek },
          }
        });
        if (count === 1) {
          const student = await prisma.student.findUnique({ where: { studentId: attendanceData.studentId }, select: { userId: true, firstName: true, lastName: true } });
          if (student?.userId) {
            await createNotification(student.userId, {
              title: 'Attendance alert',
              message: `${student.firstName} ${student.lastName} marked ${created.status}`,
              priority: created.status === 'ABSENT' ? 'HIGH' : 'NORMAL',
              type: 'ATTENDANCE',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Notification (first-of-week) failed:', e);
    }

    return NextResponse.json({ 
      success: true, 
      attendanceId: created.attendanceId,
      timestamp: created.timestamp,
      status: created.status,
      attendanceType: created.attendanceType
    }, { status: 201 });
  } catch (e) {
    console.error('Manual attendance POST error', e);
    console.error('Error details:', {
      message: e instanceof Error ? e.message : 'Unknown error',
      stack: e instanceof Error ? e.stack : undefined,
      name: e instanceof Error ? e.name : undefined
    });
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 });
  }
}



