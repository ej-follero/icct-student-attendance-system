import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const deriveActiveSemesters = (semesters: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let activeIndex = -1;
  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;

  const normalized = semesters.map((semester: any, index: number) => {
    const start = new Date(semester.startDate);
    const end = new Date(semester.endDate);
    const isCurrent =
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start.getTime() <= today.getTime() &&
      end.getTime() >= today.getTime();

    if (isCurrent && activeIndex === -1) {
      activeIndex = index;
    }

    if (!Number.isNaN(start.getTime())) {
      if (!earliestStart || start < earliestStart) {
        earliestStart = start;
      }
    }
    if (!Number.isNaN(end.getTime())) {
      if (!latestEnd || end > latestEnd) {
        latestEnd = end;
      }
    }

    return {
      ...semester,
      isActive: false
    };
  });

  if (activeIndex >= 0) {
    normalized[activeIndex] = { ...normalized[activeIndex], isActive: true };
  }

  let withinRange = false;

  if (earliestStart && latestEnd) {
    const earliest = earliestStart as unknown as Date;
    const latest = latestEnd as unknown as Date;

    withinRange =
      earliest.getTime() <= today.getTime() &&
      latest.getTime() >= today.getTime();
  }

  return {
    semesters: normalized,
    hasCurrent: activeIndex !== -1,
    withinRange
  };
};

export async function GET(request: NextRequest) {
  try {
    // Authorization: allow ADMIN, DEPARTMENT_HEAD, INSTRUCTOR
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev) {
      const token = request.cookies.get('token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId as number;
        const user = await prisma.user.findUnique({ where: { userId }, select: { role: true } });
        const allowed = user && (user.role === 'ADMIN' || user.role === 'DEPARTMENT_HEAD' || user.role === 'INSTRUCTOR');
        if (!allowed) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    }

    // Get all semesters grouped by year
    const semesters = await prisma.semester.findMany({
      where: {
        status: {
          not: 'CANCELLED'
        }
      },
      orderBy: [
        { year: 'desc' },
        { semesterType: 'asc' }
      ]
    });

    // Group semesters by year and create academic year structure
    const academicYearsMap = new Map<number, any>();
    
    semesters.forEach(semester => {
      const year = semester.year;
      
      if (!academicYearsMap.has(year)) {
        academicYearsMap.set(year, {
          id: year,
          name: `${year}-${year + 1}`,
          startDate: new Date(semester.startDate),
          endDate: new Date(semester.endDate),
          isActive: semester.isActive,
          semesters: []
        });
      }
      
      const academicYear = academicYearsMap.get(year);
      
      // Update academic year dates to cover the full range
      if (new Date(semester.startDate) < new Date(academicYear.startDate)) {
        academicYear.startDate = new Date(semester.startDate);
      }
      if (new Date(semester.endDate) > new Date(academicYear.endDate)) {
        academicYear.endDate = new Date(semester.endDate);
      }
      
      // Add semester to the academic year
      academicYear.semesters.push({
        id: semester.semesterId,
        name: getSemesterName(semester.semesterType),
        startDate: new Date(semester.startDate),
        endDate: new Date(semester.endDate),
        type: getSemesterTypeShort(semester.semesterType),
        isActive: semester.isActive,
        status: semester.status
      });
    });

    // Convert map to array and sort by year (newest first)
    const academicYears = Array.from(academicYearsMap.values())
      .sort((a, b) => b.id - a.id);

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error('GET /api/academic-years error', error);
    return NextResponse.json({ 
      error: 'Failed to fetch academic years',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // JWT Authentication (SUPER_ADMIN, ADMIN only)
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

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      year,
      semesters,
      notes
    } = body;

    // Validation
    if (!year || !semesters || !Array.isArray(semesters) || semesters.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: year, semesters array' 
      }, { status: 400 });
    }

    // Validate year
    const academicYear = Number(year);
    if (isNaN(academicYear) || academicYear < 2000 || academicYear > 2100) {
      return NextResponse.json({ 
        error: 'Invalid year. Must be between 2000 and 2100' 
      }, { status: 400 });
    }

    // Check if academic year already exists
    const existingYear = await prisma.semester.findFirst({
      where: { year: academicYear }
    });

    if (existingYear) {
      return NextResponse.json({ 
        error: `Academic year ${academicYear}-${academicYear + 1} already exists` 
      }, { status: 400 });
    }

    let sanitizedSemesters = semesters.map((semester: any) => ({
      ...semester,
      semesterType: semester.semesterType,
      startDate: semester.startDate,
      endDate: semester.endDate,
      registrationStart: semester.registrationStart,
      registrationEnd: semester.registrationEnd,
      enrollmentStart: semester.enrollmentStart,
      enrollmentEnd: semester.enrollmentEnd,
      notes: semester.notes,
      isActive: false
    }));

    // Validate semesters data
    const semesterTypes = new Set();
    for (const semester of sanitizedSemesters) {
      if (!semester.startDate || !semester.endDate || !semester.semesterType) {
        return NextResponse.json({ 
          error: 'Each semester must have startDate, endDate, and semesterType' 
        }, { status: 400 });
      }

      if (semesterTypes.has(semester.semesterType)) {
        return NextResponse.json({ 
          error: `Duplicate semester type: ${semester.semesterType}` 
        }, { status: 400 });
      }
      semesterTypes.add(semester.semesterType);

      // Validate date ranges
      const start = new Date(semester.startDate);
      const end = new Date(semester.endDate);
      if (start >= end) {
        return NextResponse.json({ 
          error: `Start date must be before end date for ${semester.semesterType}` 
        }, { status: 400 });
      }
    }

    // Check for date overlaps with existing semesters
    for (const semester of sanitizedSemesters) {
      const start = new Date(semester.startDate);
      const end = new Date(semester.endDate);

      const overlappingSemester = await prisma.semester.findFirst({
        where: {
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: start } }
              ]
            },
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: end } }
              ]
            },
            {
              AND: [
                { startDate: { gte: start } },
                { endDate: { lte: end } }
              ]
            }
          ]
        }
      });

      if (overlappingSemester) {
        return NextResponse.json({ 
          error: `Date range overlaps with existing semester: ${overlappingSemester.year} ${overlappingSemester.semesterType}` 
        }, { status: 400 });
      }
    }

    const {
      semesters: semestersWithActive,
      hasCurrent,
      withinRange
    } = deriveActiveSemesters(sanitizedSemesters);
    sanitizedSemesters = semestersWithActive;
    const yearIsActive = hasCurrent || withinRange;

    // Create all semesters for the academic year
    const createdSemesters = [];
    for (const semesterData of sanitizedSemesters) {
      const semester = await prisma.semester.create({
        data: {
          startDate: new Date(semesterData.startDate),
          endDate: new Date(semesterData.endDate),
          year: academicYear,
          semesterType: semesterData.semesterType,
          status: 'UPCOMING',
          isActive: semesterData.isActive,
          registrationStart: semesterData.registrationStart ? new Date(semesterData.registrationStart) : null,
          registrationEnd: semesterData.registrationEnd ? new Date(semesterData.registrationEnd) : null,
          enrollmentStart: semesterData.enrollmentStart ? new Date(semesterData.enrollmentStart) : null,
          enrollmentEnd: semesterData.enrollmentEnd ? new Date(semesterData.enrollmentEnd) : null,
          notes: semesterData.notes || notes || null
        }
      });
      createdSemesters.push(semester);
    }

    if (yearIsActive) {
      await prisma.semester.updateMany({
        where: {
          year: {
            not: academicYear
          }
        },
        data: {
          isActive: false
        }
      });
    }

    // Return the created academic year structure
    const academicYearData = {
      id: academicYear,
      name: `${academicYear}-${academicYear + 1}`,
      startDate: createdSemesters[0].startDate,
      endDate: createdSemesters[createdSemesters.length - 1].endDate,
      isActive: yearIsActive,
      semesters: createdSemesters.map(sem => ({
        id: sem.semesterId,
        name: getSemesterName(sem.semesterType),
        startDate: sem.startDate,
        endDate: sem.endDate,
        type: getSemesterTypeShort(sem.semesterType),
        isActive: sem.isActive,
        status: sem.status
      }))
    };

    return NextResponse.json(academicYearData, { status: 201 });
  } catch (error) {
    console.error('Error creating academic year:', error);
    return NextResponse.json(
      { error: 'Failed to create academic year' },
      { status: 500 }
    );
  }
}

function getSemesterName(semesterType: string): string {
  switch (semesterType) {
    case 'FIRST_SEMESTER':
      return '1st Semester';
    case 'SECOND_SEMESTER':
      return '2nd Semester';
    case 'THIRD_SEMESTER':
      return 'Summer';
    default:
      return 'Unknown Semester';
  }
}

function getSemesterTypeShort(semesterType: string): string {
  switch (semesterType) {
    case 'FIRST_SEMESTER':
      return '1st';
    case 'SECOND_SEMESTER':
      return '2nd';
    case 'THIRD_SEMESTER':
      return 'Summer';
    default:
      return 'Unknown';
  }
}