import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from '@/lib/prisma';

// Define the schedule import schema aligned with Prisma schema
const scheduleImportSchema = z.object({
  subjectId: z.number().optional(),
  subjectName: z.string().min(1, "Subject name is required"),
  subjectCode: z.string().min(1, "Subject code is required"),
  sectionId: z.number().optional(),
  sectionName: z.string().min(1, "Section name is required"),
  instructorId: z.number().optional(),
  instructorName: z.string().optional(),
  roomId: z.number().optional(),
  roomNo: z.string().min(1, "Room number is required"),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  scheduleType: z.enum(["REGULAR", "MAKEUP", "SPECIAL", "REVIEW", "EXAM"]).optional().default("REGULAR"),
  status: z.enum(["ACTIVE", "CANCELLED", "POSTPONED", "COMPLETED", "CONFLICT"]).optional().default("ACTIVE"),
  maxStudents: z.number().min(1).optional().default(30),
  notes: z.string().optional(),
  semesterId: z.number().optional(),
  academicYear: z.string().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected array of schedule data' }, { status: 400 });
    }

    let success = 0;
    let failed = 0;
    let errors: string[] = [];
    const createdSchedules = [];

    for (let i = 0; i < body.length; i++) {
      try {
        const validated = scheduleImportSchema.parse({
          ...body[i],
          status: body[i].status || "ACTIVE",
          scheduleType: body[i].scheduleType || "REGULAR",
          maxStudents: body[i].maxStudents || 30,
        });

        // Find or create subject
        let subject;
        if (validated.subjectId) {
          subject = await prisma.subjects.findUnique({
            where: { subjectId: validated.subjectId }
          });
        }

        if (!subject) {
          subject = await prisma.subjects.findFirst({
            where: {
              OR: [
                { subjectName: { equals: validated.subjectName, mode: 'insensitive' } },
                { subjectCode: { equals: validated.subjectCode, mode: 'insensitive' } }
              ]
            }
          });
        }

        if (!subject) {
          // Create new subject if it doesn't exist
          subject = await prisma.subjects.create({
            data: {
              subjectName: validated.subjectName,
              subjectCode: validated.subjectCode,
              subjectType: 'LECTURE',
              status: 'ACTIVE',
              description: `Imported subject: ${validated.subjectName}`,
              lectureUnits: 3,
              labUnits: 0,
              creditedUnits: 3,
              totalHours: 54,
              courseId: 1, // Default course - you might want to make this configurable
              departmentId: 1, // Default department - you might want to make this configurable
              academicYear: validated.academicYear || new Date().getFullYear().toString(),
              semester: 'FIRST_SEMESTER',
              maxStudents: validated.maxStudents || 30,
            }
          });
        }

        // Find or create section
        let section;
        if (validated.sectionId) {
          section = await prisma.section.findUnique({
            where: { sectionId: validated.sectionId }
          });
        }

        if (!section) {
          section = await prisma.section.findFirst({
            where: {
              sectionName: { equals: validated.sectionName, mode: 'insensitive' }
            }
          });
        }

        if (!section) {
          // Create new section if it doesn't exist
          section = await prisma.section.create({
            data: {
              sectionName: validated.sectionName,
              sectionCapacity: validated.maxStudents || 30,
              sectionStatus: 'ACTIVE',
              yearLevel: 1, // Default year level
              academicYear: validated.academicYear || new Date().getFullYear().toString(),
              semester: 'FIRST_SEMESTER',
              currentEnrollment: 0,
              courseId: 1, // Default course - you might want to make this configurable
              semesterId: validated.semesterId || 1, // Default semester
            }
          });
        }

        // Find instructor (optional)
        let instructor = null;
        if (validated.instructorId) {
          instructor = await prisma.instructor.findUnique({
            where: { instructorId: validated.instructorId }
          });
        }

        if (!instructor && validated.instructorName) {
          // Try to find by name
          const nameParts = validated.instructorName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          instructor = await prisma.instructor.findFirst({
            where: {
              AND: [
                { firstName: { equals: firstName, mode: 'insensitive' } },
                { lastName: { equals: lastName, mode: 'insensitive' } }
              ]
            }
          });
        }

        // Find room
        let room;
        if (validated.roomId) {
          room = await prisma.room.findUnique({
            where: { roomId: validated.roomId }
          });
        }

        if (!room) {
          room = await prisma.room.findFirst({
            where: {
              roomNo: { equals: validated.roomNo, mode: 'insensitive' }
            }
          });
        }

        if (!room) {
          throw new Error(`Room not found: ${validated.roomNo}`);
        }

        // Get semester ID
        let semesterId = validated.semesterId;
        if (!semesterId) {
          // Find the current active semester
          const currentSemester = await prisma.semester.findFirst({
            where: { status: 'CURRENT' },
            select: { semesterId: true }
          });
          
          if (!currentSemester) {
            // If no current semester, find the most recent semester
            const latestSemester = await prisma.semester.findFirst({
              orderBy: { createdAt: 'desc' },
              select: { semesterId: true }
            });
            
            if (!latestSemester) {
              throw new Error('No semester found. Please create a semester first.');
            }
            
            semesterId = latestSemester.semesterId;
          } else {
            semesterId = currentSemester.semesterId;
          }
        }

        // Check for time conflicts
        const conflictingSchedule = await prisma.subjectSchedule.findFirst({
          where: {
            day: validated.day,
            startTime: { lte: validated.endTime },
            endTime: { gte: validated.startTime },
            roomId: room.roomId,
            deletedAt: null, // Only check conflicts with non-deleted schedules
            semesterId: semesterId
          }
        });

        if (conflictingSchedule) {
          throw new Error(`Time conflict with existing schedule in room ${validated.roomNo}`);
        }

        // Create the schedule
        const created = await prisma.subjectSchedule.create({
          data: {
            subjectId: subject.subjectId,
            sectionId: section.sectionId,
            instructorId: instructor?.instructorId || null,
            roomId: room.roomId,
            day: validated.day,
            startTime: validated.startTime,
            endTime: validated.endTime,
            scheduleType: validated.scheduleType,
            status: validated.status,
            maxStudents: validated.maxStudents,
            notes: validated.notes || null,
            semesterId: semesterId,
            academicYear: validated.academicYear || new Date().getFullYear().toString(),
            isRecurring: true,
            slots: 0,
          },
          include: {
            subject: true,
            section: true,
            instructor: true,
            room: true,
            semester: true,
          }
        });

        createdSchedules.push(created);
        success++;
      } catch (err: any) {
        failed++;
        if (err instanceof z.ZodError) {
          errors.push(`Row ${i + 1}: ${err.errors.map(e => e.message).join(", ")}`);
        } else {
          errors.push(`Row ${i + 1}: ${err.message || 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({ 
      success, 
      failed, 
      errors, 
      createdSchedules,
      message: `Import completed: ${success} successful, ${failed} failed`
    });
  } catch (error) {
    console.error('Schedule import error:', error);
    return NextResponse.json({ 
      error: "Failed to import schedules",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
