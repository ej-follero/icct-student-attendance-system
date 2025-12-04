import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ScheduleStatus, DayOfWeek } from '@prisma/client';

export async function GET(request: NextRequest) {
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

    // Get user and verify role
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { email: true, role: true, status: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    if (user.role !== 'INSTRUCTOR') {
      return NextResponse.json({ error: 'Instructor access required' }, { status: 403 });
    }

    // Find instructor by email
    const instructor = await prisma.instructor.findUnique({
      where: { email: user.email },
      select: { instructorId: true }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor record not found' }, { status: 404 });
    }

    // Get all schedules for this instructor
    const schedules = await prisma.subjectSchedule.findMany({
      where: {
        instructorId: instructor.instructorId,
        status: ScheduleStatus.ACTIVE,
        deletedAt: null // Exclude soft-deleted schedules
      },
      include: {
        subject: {
          select: {
            subjectId: true,
            subjectName: true,
            subjectCode: true
          }
        },
        section: {
          select: {
            sectionId: true,
            sectionName: true,
            StudentSection: {
              select: { studentId: true }
            }
          }
        },
        room: {
          select: {
            roomNo: true,
            roomType: true,
            roomBuildingLoc: true,
            roomFloorLoc: true
          }
        },
        semester: {
          select: {
            semesterId: true,
            semesterType: true,
            year: true
          }
        }
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // Format the response
    const formattedSchedules = schedules.map(schedule => ({
      scheduleId: schedule.subjectSchedId,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: {
        id: schedule.subject.subjectId,
        name: schedule.subject.subjectName,
        code: schedule.subject.subjectCode
      },
      section: {
        id: schedule.section.sectionId,
        name: schedule.section.sectionName,
        studentCount: schedule.section.StudentSection.length
      },
      room: schedule.room ? {
        roomNo: schedule.room.roomNo,
        roomType: schedule.room.roomType,
        building: schedule.room.roomBuildingLoc,
        floor: schedule.room.roomFloorLoc
      } : null,
      semester: schedule.semester ? {
        id: schedule.semester.semesterId,
        type: schedule.semester.semesterType,
        year: schedule.semester.year
      } : null,
      status: schedule.status
    }));

    return NextResponse.json({
      schedules: formattedSchedules,
      total: formattedSchedules.length
    });

  } catch (error) {
    console.error('Error fetching instructor schedules:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

