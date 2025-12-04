import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DayOfWeek, ScheduleStatus, AttendanceStatus, Status as GenericStatus } from '@prisma/client';

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
      include: {
        Department: {
          select: { departmentName: true, departmentCode: true }
        },
        SubjectSchedule: {
          where: { status: ScheduleStatus.ACTIVE },
          include: {
            subject: { select: { subjectId: true, subjectName: true, subjectCode: true } },
            section: { 
              select: { 
                sectionName: true,
                sectionId: true,
                StudentSection: {
                  select: { studentId: true }
                }
              } 
            },
            room: { select: { roomNo: true } }
          }
        }
      }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor record not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d

    // Calculate date ranges
    const now = new Date();
    const getDateRange = (period: string) => {
      switch (period) {
        case '1d':
          return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    };

    const startDate = getDateRange(period);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all subject schedule IDs for this instructor's classes
    const subjectSchedIds = instructor.SubjectSchedule.map(schedule => schedule.subjectSchedId);
    const sectionIds = instructor.SubjectSchedule.map(schedule => schedule.section.sectionId);

    // Handle case where instructor has no classes
    if (subjectSchedIds.length === 0) {
      return NextResponse.json({
        instructor: {
          instructorId: instructor.instructorId,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          department: instructor.Department.departmentName,
          departmentCode: instructor.Department.departmentCode
        },
        statistics: {
          totalClasses: 0,
          totalStudents: 0,
          totalSubjects: 0,
          attendance: {
            total: 0,
            today: 0,
            period: 0,
            rate: 0,
            byStatus: []
          }
        },
        schedule: {
          today: [],
          upcoming: []
        },
        classPerformance: [],
        subjects: [],
        recentAttendance: [],
        charts: {
          attendanceTrends: []
        },
        metadata: {
          period,
          generatedAt: now.toISOString(),
          dataRange: { start: startDate.toISOString(), end: now.toISOString() }
        }
      });
    }

    // Get today's schedule
    const weekdayToEnum: Array<DayOfWeek> = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    const todayEnum = weekdayToEnum[now.getDay()];
    const todaySchedule = instructor.SubjectSchedule
      .filter(schedule => schedule.day === todayEnum)
      .map(schedule => ({
        scheduleId: schedule.subjectSchedId,
        time: `${schedule.startTime} - ${schedule.endTime}`,
        subject: schedule.subject.subjectName,
        subjectCode: schedule.subject.subjectCode,
        section: schedule.section.sectionName,
        room: schedule.room?.roomNo || 'TBA',
        studentCount: schedule.section.StudentSection.length
      }));

    // Get upcoming classes (next 7 days)
    const upcomingSchedule = instructor.SubjectSchedule
      .filter(schedule => {
        const scheduleDay = weekdayToEnum.indexOf(schedule.day);
        const todayDay = now.getDay();
        const daysUntil = (scheduleDay - todayDay + 7) % 7;
        return daysUntil > 0 && daysUntil <= 7;
      })
      .slice(0, 10)
      .map(schedule => ({
        scheduleId: schedule.subjectSchedId,
        day: schedule.day,
        time: `${schedule.startTime} - ${schedule.endTime}`,
        subject: schedule.subject.subjectName,
        subjectCode: schedule.subject.subjectCode,
        section: schedule.section.sectionName,
        room: schedule.room?.roomNo || 'TBA',
        studentCount: schedule.section.StudentSection.length
      }));

    // Get attendance statistics for instructor's classes
    // Use subjectSchedId to filter attendance (Attendance links to SubjectSchedule via subjectSchedId)
    const [totalAttendance, todayAttendance, periodAttendance, attendanceByStatus] = await Promise.all([
      prisma.attendance.count({
        where: {
          subjectSchedId: { in: subjectSchedIds.length > 0 ? subjectSchedIds : [-1] } // Use -1 (non-existent ID) if empty
        }
      }),
      prisma.attendance.count({
        where: {
          subjectSchedId: { in: subjectSchedIds.length > 0 ? subjectSchedIds : [-1] },
          timestamp: { gte: todayStart }
        }
      }),
      prisma.attendance.count({
        where: {
          subjectSchedId: { in: subjectSchedIds.length > 0 ? subjectSchedIds : [-1] },
          timestamp: { gte: startDate }
        }
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        _count: { status: true },
        where: {
          subjectSchedId: { in: subjectSchedIds.length > 0 ? subjectSchedIds : [-1] },
          timestamp: { gte: startDate }
        }
      })
    ]);

    // Calculate attendance rate
    const presentCount = attendanceByStatus.find(s => s.status === AttendanceStatus.PRESENT)?._count?.status || 0;
    const totalPeriodAttendance = attendanceByStatus.reduce((sum, s) => sum + (s._count?.status || 0), 0);
    const attendanceRate = totalPeriodAttendance > 0 
      ? Math.round((presentCount / totalPeriodAttendance) * 100) 
      : 0;

    // Get total students across all classes
    const uniqueStudentIds = new Set(
      instructor.SubjectSchedule.flatMap(schedule => 
        schedule.section.StudentSection.map(ss => ss.studentId)
      )
    );
    const totalStudents = uniqueStudentIds.size;

    // Get recent attendance records
    const recentAttendance = await prisma.attendance.findMany({
      where: {
        subjectSchedId: { in: subjectSchedIds },
        timestamp: { gte: startDate }
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentIdNum: true
          }
        },
        subjectSchedule: {
          select: {
            section: {
              select: {
                sectionName: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    // Get attendance trends (daily for the period)
    // Fetch all attendance records for the period and group by date in memory
    const allAttendance = await prisma.attendance.findMany({
      where: {
        subjectSchedId: { in: subjectSchedIds },
        timestamp: { gte: startDate }
      },
      select: {
        timestamp: true,
        status: true
      }
    });

    // Group by date
    const trendsMap = new Map<string, { present: number; absent: number; late: number; excused: number }>();
    allAttendance.forEach(att => {
      const date = new Date(att.timestamp).toISOString().split('T')[0];
      if (!trendsMap.has(date)) {
        trendsMap.set(date, { present: 0, absent: 0, late: 0, excused: 0 });
      }
      const dayData = trendsMap.get(date)!;
      switch (att.status) {
        case AttendanceStatus.PRESENT:
          dayData.present++;
          break;
        case AttendanceStatus.ABSENT:
          dayData.absent++;
          break;
        case AttendanceStatus.LATE:
          dayData.late++;
          break;
        case AttendanceStatus.EXCUSED:
          dayData.excused++;
          break;
      }
    });

    const attendanceTrends = Array.from(trendsMap.entries())
      .map(([date, counts]) => ({
        date,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        excused: counts.excused,
        total: counts.present + counts.absent + counts.late + counts.excused
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get class performance (attendance by section/subject schedule)
    const classPerformance = await Promise.all(
      instructor.SubjectSchedule.map(async (schedule) => {
        const sectionAttendance = await prisma.attendance.count({
          where: {
            subjectSchedId: schedule.subjectSchedId,
            timestamp: { gte: startDate }
          }
        });
        const sectionPresent = await prisma.attendance.count({
          where: {
            subjectSchedId: schedule.subjectSchedId,
            status: AttendanceStatus.PRESENT,
            timestamp: { gte: startDate }
          }
        });
        const sectionRate = sectionAttendance > 0 
          ? Math.round((sectionPresent / sectionAttendance) * 100) 
          : 0;

        return {
          scheduleId: schedule.subjectSchedId,
          sectionId: schedule.section.sectionId,
          sectionName: schedule.section.sectionName,
          subject: schedule.subject.subjectName,
          subjectCode: schedule.subject.subjectCode,
          studentCount: schedule.section.StudentSection.length,
          attendanceCount: sectionAttendance,
          attendanceRate: sectionRate
        };
      })
    );

    // Get subjects taught
    const subjects = Array.from(
      new Map(
        instructor.SubjectSchedule.map(schedule => [
          schedule.subject.subjectId,
          {
            subjectId: schedule.subject.subjectId,
            subjectName: schedule.subject.subjectName,
            subjectCode: schedule.subject.subjectCode
          }
        ])
      ).values()
    );

    return NextResponse.json({
      instructor: {
        instructorId: instructor.instructorId,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email: instructor.email,
        gender: instructor.gender,
        department: instructor.Department.departmentName,
        departmentCode: instructor.Department.departmentCode
      },
      statistics: {
        totalClasses: instructor.SubjectSchedule.length,
        totalStudents,
        totalSubjects: subjects.length,
        attendance: {
          total: totalAttendance,
          today: todayAttendance,
          period: periodAttendance,
          rate: attendanceRate,
          byStatus: attendanceByStatus.map(s => ({
            status: s.status,
            count: s._count?.status || 0
          }))
        }
      },
      schedule: {
        today: todaySchedule,
        upcoming: upcomingSchedule
      },
      classPerformance,
      subjects,
      recentAttendance: recentAttendance.map(att => ({
        attendanceId: att.attendanceId,
        studentName: att.student ? `${att.student.firstName} ${att.student.lastName}` : 'Unknown',
        studentId: att.student?.studentIdNum || '',
        section: att.subjectSchedule?.section?.sectionName || 'Unknown',
        status: att.status,
        timestamp: att.timestamp
      })),
      charts: {
        attendanceTrends: attendanceTrends
      },
      metadata: {
        period,
        generatedAt: now.toISOString(),
        dataRange: { start: startDate.toISOString(), end: now.toISOString() }
      }
    });

  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

