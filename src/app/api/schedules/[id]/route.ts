import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from '@/lib/notifications';

// GET individual schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // JWT Authentication
    const token = request.cookies.get('token')?.value;
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

    const { id } = await params;
    const scheduleId = parseInt(id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const schedule = await prisma.subjectSchedule.findUnique({
      where: { subjectSchedId: scheduleId },
      include: {
        subject: true,
        section: true,
        instructor: true,
        room: true,
        semester: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

// PUT update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
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

    // Admin-only access control
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const scheduleId = parseInt(id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    const body = await request.json();
    console.log('Update schedule request body:', body);
    
    const {
      subjectId,
      sectionId,
      instructorId,
      roomId,
      day,
      startTime,
      endTime,
      scheduleType,
      status,
      maxStudents,
      semesterId,
      academicYear,
      notes
    } = body;

    // Validate required fields
    if (!subjectId || !sectionId || !roomId || !day || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate data types
    if (isNaN(parseInt(subjectId)) || isNaN(parseInt(sectionId)) || isNaN(parseInt(roomId))) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    if (instructorId && isNaN(parseInt(instructorId))) {
      return NextResponse.json({ error: 'Invalid instructor ID format' }, { status: 400 });
    }

    // Check if schedule exists
    const existingSchedule = await prisma.subjectSchedule.findUnique({
      where: { subjectSchedId: scheduleId }
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Update the schedule
    try {
      const prev = await prisma.subjectSchedule.findUnique({ where: { subjectSchedId: scheduleId }, select: { status: true, instructorId: true, roomId: true } });
      const updatedSchedule = await prisma.subjectSchedule.update({
        where: { subjectSchedId: scheduleId },
        data: {
          subjectId: parseInt(subjectId),
          sectionId: parseInt(sectionId),
          instructorId: instructorId ? parseInt(instructorId) : null,
          roomId: parseInt(roomId),
          day: day,
          startTime: startTime,
          endTime: endTime,
          scheduleType: scheduleType || 'REGULAR',
          status: status || 'ACTIVE',
          maxStudents: parseInt(maxStudents) || 30,
          semesterId: semesterId ? parseInt(semesterId) : undefined,
          academicYear: academicYear || undefined,
          notes: notes || null,
        },
        include: {
          subject: true,
          section: true,
          instructor: true,
          room: true,
          semester: true,
        },
      });

      // Notifications: status changes and conflicts (room/instructor/time)
      try {
        if (prev && prev.status !== updatedSchedule.status && (updatedSchedule.status === 'CANCELLED' || updatedSchedule.status === 'POSTPONED')) {
          await createNotification(userId, {
            title: updatedSchedule.status === 'CANCELLED' ? 'Class cancelled' : 'Class postponed',
            message: `Section ${updatedSchedule.section.sectionName} ${updatedSchedule.day} ${updatedSchedule.startTime}-${updatedSchedule.endTime}`,
            priority: 'NORMAL',
            type: 'SCHEDULING',
          });
        }
        // Basic conflict detection: overlapping schedules in same room or same instructor
        const overlaps = await prisma.subjectSchedule.findFirst({
          where: {
            subjectSchedId: { not: scheduleId },
            day: updatedSchedule.day,
            OR: [
              { roomId: updatedSchedule.roomId },
              ...(updatedSchedule.instructorId ? [{ instructorId: updatedSchedule.instructorId }] : []),
            ],
            // naive time overlap check using string compare HH:MM
            AND: [
              { startTime: { lt: updatedSchedule.endTime } },
              { endTime: { gt: updatedSchedule.startTime } },
            ],
          },
          include: { room: true, instructor: true, section: true }
        });
        if (overlaps) {
          await createNotification(userId, {
            title: 'Schedule conflict',
            message: `Conflict with ${overlaps.section.sectionName} in room ${overlaps.room.roomNo}${overlaps.instructor ? ` or instructor ${overlaps.instructor.firstName} ${overlaps.instructor.lastName}` : ''} (${overlaps.startTime}-${overlaps.endTime})`,
            priority: 'HIGH',
            type: 'SCHEDULING',
          });
        }
      } catch {}

      return NextResponse.json(updatedSchedule);
    } catch (dbError: any) {
      console.error('Database update error:', dbError);
      return NextResponse.json({ 
        error: 'Database update failed', 
        details: dbError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// DELETE schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // JWT Authentication - Admin only
    const token = request.cookies.get('token')?.value;
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

    // Admin-only access control
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const scheduleId = parseInt(id);
    
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'Invalid schedule ID' }, { status: 400 });
    }

    // Check if schedule exists
    const existingSchedule = await prisma.subjectSchedule.findUnique({
      where: { subjectSchedId: scheduleId }
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Soft delete the schedule - update status to "CANCELLED" and set deletedAt timestamp
    await prisma.subjectSchedule.update({
      where: { subjectSchedId: scheduleId },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'Schedule soft deleted successfully (can be restored)' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
