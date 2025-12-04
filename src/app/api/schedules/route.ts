import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from '@/lib/notifications';

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
    // Query params and filters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = (searchParams.get("search") || "").trim();
    
    // Debug logging for search queries
    if (search) {
      console.log('Search query received:', search);
    }

    // Build where clause with filters
    const where: any = {
      // Exclude soft deleted schedules (those with deletedAt set)
      // Archived schedules (status CANCELLED but deletedAt is null) are still included
      deletedAt: null
    };
    if (search && search.length >= 1) {
      // Enhanced search across multiple fields
      const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        // For multi-word searches, try to match full phrases first
        const fullPhrase = search.trim();
        
        // Split hyphenated/underscored terms into parts for better matching
        // e.g., "bsp-sub" -> ["bsp", "sub"] to match "BSP-SUB-101"
        const hyphenatedParts = fullPhrase.split(/[-_\s]+/).filter(part => part.length > 0);
        const hasHyphens = (fullPhrase.includes('-') || fullPhrase.includes('_')) && hyphenatedParts.length > 0;
        
        console.log('Search processing:', { fullPhrase, hyphenatedParts, hasHyphens });
        
        // Build OR conditions array
        const orConditions: any[] = [
          // Subject fields - multiple matching strategies for better partial matching
          { subject: { subjectName: { contains: fullPhrase, mode: "insensitive" } } },
          { subject: { subjectCode: { contains: fullPhrase, mode: "insensitive" } } },
          
          // For hyphenated searches like "bsp-sub", try matching each part
          // This will match "BSP-SUB-101" when searching "bsp-sub"
          ...(hasHyphens && hyphenatedParts.length > 1 ? [
            // Match each part individually (OR logic - matches if any part is found)
            // This is more flexible and will catch "BSP-SUB-101", "BSP-101", "SUB-101", etc.
            ...hyphenatedParts.filter(part => part.length > 0).map(part => ({
              subject: { subjectCode: { contains: part, mode: "insensitive" } }
            })),
            ...hyphenatedParts.filter(part => part.length > 0).map(part => ({
              subject: { subjectName: { contains: part, mode: "insensitive" } }
            })),
            // Try without separators (e.g., "bspsub" matches "BSPSUB101")
            ...(hyphenatedParts.length > 0 ? [
              { subject: { subjectCode: { contains: hyphenatedParts.join(''), mode: "insensitive" } } },
              // Try with space (e.g., "bsp sub")
              { subject: { subjectCode: { contains: hyphenatedParts.join(' '), mode: "insensitive" } } },
              // Try with different separators
              { subject: { subjectCode: { contains: hyphenatedParts.join('-'), mode: "insensitive" } } },
              { subject: { subjectCode: { contains: hyphenatedParts.join('_'), mode: "insensitive" } } },
            ] : []),
          ] : []),
          
          // For single hyphenated term (like "bsp-" which becomes ["bsp"]), also try the part
          ...(hasHyphens && hyphenatedParts.length === 1 && hyphenatedParts[0] && hyphenatedParts[0].length >= 2 ? [
            { subject: { subjectCode: { contains: hyphenatedParts[0], mode: "insensitive" } } },
            { subject: { subjectName: { contains: hyphenatedParts[0], mode: "insensitive" } } }
          ] : []),
          // Section
          { section: { sectionName: { contains: fullPhrase, mode: "insensitive" } } },
          // Instructor - full name matching (only if instructor exists)
          {
            AND: [
              { instructor: { isNot: null } },
              { instructor: { firstName: { contains: searchTerms[0], mode: "insensitive" } } },
              ...(searchTerms.length > 1 ? [{ instructor: { lastName: { contains: searchTerms.slice(1).join(' '), mode: "insensitive" } } }] : [])
            ]
          },
          // Instructor - individual fields (only if instructor exists)
          {
            AND: [
              { instructor: { isNot: null } },
              { instructor: { firstName: { contains: fullPhrase, mode: "insensitive" } } }
            ]
          },
          {
            AND: [
              { instructor: { isNot: null } },
              { instructor: { lastName: { contains: fullPhrase, mode: "insensitive" } } }
            ]
          },
          // Instructor ID (only if instructor exists and search is numeric)
          ...(search.match(/^\d+$/) ? [{
            AND: [
              { instructor: { isNot: null } },
              { instructor: { instructorId: parseInt(search) } }
            ]
          }] : []),
          // Room fields
          { room: { roomNo: { contains: fullPhrase, mode: "insensitive" } } },
          // Note: roomBuildingLoc and roomFloorLoc are enums, so exact match only
          // They can be filtered via the filter dropdowns instead
          // Academic year
          { academicYear: { contains: fullPhrase, mode: "insensitive" } },
          // Semester
          { semester: { semesterName: { contains: fullPhrase, mode: "insensitive" } } },
          // Time fields
          { startTime: { contains: fullPhrase, mode: "insensitive" } },
          { endTime: { contains: fullPhrase, mode: "insensitive" } },
          // Day
          { day: { contains: fullPhrase, mode: "insensitive" } },
          // Schedule type
          { scheduleType: { contains: fullPhrase, mode: "insensitive" } },
          // Status
          { status: { contains: fullPhrase, mode: "insensitive" } },
          // Notes
          { notes: { contains: fullPhrase, mode: "insensitive" } },
        ];
        
        // Also search individual terms if multi-word
        if (searchTerms.length > 1) {
          const individualTermOrs = searchTerms.flatMap(term => {
            if (!term || term.length === 0) return [];
            const normalized = term.replace(/[^a-zA-Z0-9]/g, '');
            return [
              { subject: { subjectName: { contains: term, mode: "insensitive" } } },
              { subject: { subjectCode: { contains: term, mode: "insensitive" } } },
              // Also try normalized version (without special chars) for each term
              ...(normalized.length >= 2 ? [
                { subject: { subjectCode: { contains: normalized, mode: "insensitive" } } }
              ] : []),
              { section: { sectionName: { contains: term, mode: "insensitive" } } },
              { instructor: { firstName: { contains: term, mode: "insensitive" } } },
              { instructor: { lastName: { contains: term, mode: "insensitive" } } },
              { room: { roomNo: { contains: term, mode: "insensitive" } } },
              { academicYear: { contains: term, mode: "insensitive" } },
            ];
          }).filter(condition => condition !== null);
          orConditions.push(...individualTermOrs);
        } else {
          // For single term searches, also try normalized version
          const singleTerm = searchTerms[0];
          if (singleTerm && singleTerm.length > 0) {
            if (singleTerm.includes('-') || singleTerm.includes('_') || singleTerm.includes(' ')) {
              const normalizedTerm = singleTerm.replace(/[^a-zA-Z0-9]/g, '');
              if (normalizedTerm.length >= 2) {
                orConditions.push(
                  { subject: { subjectCode: { contains: normalizedTerm, mode: "insensitive" } } },
                  { subject: { subjectName: { contains: normalizedTerm, mode: "insensitive" } } }
                );
              }
            }
          }
        }
        
        // Only set where.OR if we have conditions
        if (orConditions.length > 0) {
          where.OR = orConditions;
        }
      }
    }

    // Add filter parameters
    const status = searchParams.get("status");
    const semester = searchParams.get("semester");
    const day = searchParams.get("day");
    const instructor = searchParams.get("instructor");
    const room = searchParams.get("room");
    const scheduleType = searchParams.get("scheduleType");
    const academicYear = searchParams.get("academicYear");
    const subject = searchParams.get("subject");
    const section = searchParams.get("section");
    const department = searchParams.get("department");
    const timeRange = searchParams.get("timeRange");
    const enrollment = searchParams.get("enrollment");
    const building = searchParams.get("building");
    const floor = searchParams.get("floor");
    const roomType = searchParams.get("roomType");

    if (status && status !== 'all') {
      // Map frontend status values to Prisma enum values
      const statusMap: Record<string, string> = {
        'Active': 'ACTIVE',
        'Inactive': 'CANCELLED', // ScheduleStatus doesn't have INACTIVE, use CANCELLED
        'Completed': 'COMPLETED',
        'Cancelled': 'CANCELLED',
        'Postponed': 'POSTPONED',
        'Conflict': 'CONFLICT',
        // Also handle uppercase values if sent directly
        'ACTIVE': 'ACTIVE',
        'CANCELLED': 'CANCELLED',
        'COMPLETED': 'COMPLETED',
        'POSTPONED': 'POSTPONED',
        'CONFLICT': 'CONFLICT',
      };
      
      const mappedStatus = statusMap[status] || status.toUpperCase();
      where.status = mappedStatus as any;
    }
    if (semester && semester !== 'all') {
      where.semester = { semesterName: { contains: semester, mode: "insensitive" } };
    }
    if (day && day !== 'all') {
      where.day = day;
    }
    if (instructor && instructor !== 'all') {
      where.instructor = {
        OR: [
          { firstName: { contains: instructor, mode: "insensitive" } },
          { lastName: { contains: instructor, mode: "insensitive" } }
        ]
      };
    }
    if (room && room !== 'all') {
      where.room = { roomNo: { contains: room, mode: "insensitive" } };
    }
    if (scheduleType && scheduleType !== 'all') {
      where.scheduleType = scheduleType;
    }
    if (academicYear && academicYear !== 'all') {
      where.academicYear = academicYear;
    }
    if (subject && subject !== 'all') {
      where.subject = { subjectName: { contains: subject, mode: "insensitive" } };
    }
    if (section && section !== 'all') {
      where.section = { sectionName: { contains: section, mode: "insensitive" } };
    }
    if (department && department !== 'all') {
      where.subject = {
        ...where.subject,
        Department: { departmentName: { contains: department, mode: "insensitive" } }
      };
    }
    if (timeRange && timeRange !== 'all') {
      let startTime, endTime;
      switch (timeRange) {
        case 'morning':
          startTime = '06:00';
          endTime = '12:00';
          break;
        case 'afternoon':
          startTime = '12:00';
          endTime = '18:00';
          break;
        case 'evening':
          startTime = '18:00';
          endTime = '22:00';
          break;
        default:
          break;
      }
      if (startTime && endTime) {
        where.startTime = { gte: startTime };
        where.endTime = { lte: endTime };
      }
    }
    // Note: Enrollment filter requires post-processing as Prisma doesn't support
    // comparing relation count with a field value directly in where clauses
    // This will be handled after fetching by counting StudentSchedule records
    if (building && building !== 'all') {
      where.room = {
        ...where.room,
        roomBuildingLoc: building as any
      };
    }
    if (floor && floor !== 'all') {
      where.room = {
        ...where.room,
        roomFloorLoc: floor as any
      };
    }
    if (roomType && roomType !== 'all') {
      where.room = {
        ...where.room,
        roomType: roomType as any
      };
    }

    // Validate where clause before querying
    if (where.OR && Array.isArray(where.OR) && where.OR.length === 0) {
      delete where.OR;
    }
    
    // Fetch schedules with StudentSchedule count for enrollment filtering
    const includeEnrollment = enrollment && enrollment !== 'all';
    
    let schedules: any[];
    let total: number;
    
    if (includeEnrollment) {
      // For enrollment filter, we need to include StudentSchedule to count enrolled students
      const allSchedules = await prisma.subjectSchedule.findMany({
        where,
        include: {
          subject: true,
          section: true,
          instructor: true,
          room: true,
          semester: true,
          StudentSchedule: {
            where: { status: 'ACTIVE' as any },
            select: { id: true }
          },
        },
      });
      
      // Apply enrollment filter
      const filtered = allSchedules.filter(schedule => {
        const enrolledCount = (schedule.StudentSchedule as any[]).length;
        const maxStudents = schedule.maxStudents || 30;
        
        switch (enrollment) {
          case 'available':
            return enrolledCount < maxStudents;
          case 'full':
            return enrolledCount === maxStudents;
          case 'overbooked':
            return enrolledCount > maxStudents;
          default:
            return true;
        }
      });
      
      total = filtered.length;
      
      // Apply pagination
      const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
      
      // Remove StudentSchedule from response
      schedules = paginated.map(({ StudentSchedule, ...schedule }) => schedule);
    } else {
      // Normal query without enrollment filter
      total = await prisma.subjectSchedule.count({ where });
      schedules = await prisma.subjectSchedule.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: "asc" },
        include: {
          subject: true,
          section: true,
          instructor: true,
          room: true,
          semester: true,
        },
      });
    }
    
    return NextResponse.json({ data: schedules, total });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: "Failed to fetch schedules",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Schedule POST request received');
    
    // JWT Authentication
    const token = request.cookies.get('token')?.value;
    console.log('Token present:', !!token);
    if (!token) {
      console.log('No token found, returning 401');
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
    console.log('Schedule creation request body:', body);
    
    const {
      subjectId,
      sectionId,
      instructorId,
      roomId,
      day,
      startTime,
      endTime,
      scheduleType = 'REGULAR',
      status = 'ACTIVE',
      maxStudents = 30,
      notes,
      semesterId,
      academicYear
    } = body;

    // Validate required fields (instructorId is now optional)
    if (!subjectId || !sectionId || !roomId || !day || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that referenced entities exist
    const [subject, section, room, semester] = await Promise.all([
      prisma.subjects.findUnique({ where: { subjectId: parseInt(subjectId) } }),
      prisma.section.findUnique({ where: { sectionId: parseInt(sectionId) } }),
      prisma.room.findUnique({ where: { roomId: parseInt(roomId) } }),
      semesterId ? prisma.semester.findUnique({ where: { semesterId: parseInt(semesterId) } }) : null
    ]);

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 400 });
    }
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 400 });
    }
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 400 });
    }
    if (instructorId) {
      const instructor = await prisma.instructor.findUnique({ where: { instructorId: parseInt(instructorId) } });
      if (!instructor) {
        return NextResponse.json({ error: 'Instructor not found' }, { status: 400 });
      }
    }

    // Create the schedule with proper schema alignment
    const newSchedule = await prisma.subjectSchedule.create({
      data: {
        subjectId: parseInt(subjectId),
        sectionId: parseInt(sectionId),
        instructorId: instructorId ? parseInt(instructorId) : null,
        roomId: parseInt(roomId),
        day: day as any, // Cast to DayOfWeek enum
        startTime: startTime,
        endTime: endTime,
        scheduleType: scheduleType as any, // Cast to ScheduleType enum
        status: status as any, // Cast to ScheduleStatus enum
        maxStudents: parseInt(maxStudents) || 30,
        notes: notes || null,
        semesterId: semesterId ? parseInt(semesterId) : 1, // Default to first semester if not provided
        academicYear: academicYear || new Date().getFullYear().toString(),
        isRecurring: true, // Default to recurring
        slots: 0, // Default slots
      },
      include: {
        subject: {
          select: {
            subjectId: true,
            subjectName: true,
            subjectCode: true,
            subjectType: true,
            status: true
          }
        },
        section: {
          select: {
            sectionId: true,
            sectionName: true,
            sectionCapacity: true,
            sectionStatus: true,
            currentEnrollment: true
          }
        },
        instructor: {
          select: {
            instructorId: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true
          }
        },
        room: {
          select: {
            roomId: true,
            roomNo: true,
            roomCapacity: true,
            roomType: true,
            status: true
          }
        },
        semester: {
          select: {
            semesterId: true,
            semesterType: true,
            year: true,
            status: true
          }
        }
      },
    });

    // Notify on room capacity risk (if capacity exceeded by currentEnrollment)
    try {
      const section = newSchedule.section;
      if (section && typeof section.sectionCapacity === 'number' && section.sectionCapacity > 0) {
        const enrollment = section.currentEnrollment ?? 0;
        if (enrollment > section.sectionCapacity) {
          await createNotification(userId, {
            title: 'Room capacity exceeded',
            message: `Section ${section.sectionName} capacity ${section.sectionCapacity} exceeded by ${enrollment - section.sectionCapacity}.`,
            priority: 'HIGH',
            type: 'SCHEDULING',
          });
        }
      }
    } catch {}

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to create schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 