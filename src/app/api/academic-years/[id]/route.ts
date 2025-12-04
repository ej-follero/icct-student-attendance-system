import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

function coerceSemesterType(value: string): 'FIRST_SEMESTER' | 'SECOND_SEMESTER' | 'THIRD_SEMESTER' {
  const normalized = value.replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase();
  switch (normalized) {
    case 'FIRST_SEMESTER':
    case '1ST_SEMESTER':
    case 'FIRST_TRIMESTER':
    case '1ST_TRIMESTER':
    case '1ST':
      return 'FIRST_SEMESTER';
    case 'SECOND_SEMESTER':
    case '2ND_SEMESTER':
    case 'SECOND_TRIMESTER':
    case '2ND_TRIMESTER':
    case '2ND':
      return 'SECOND_SEMESTER';
    case 'THIRD_SEMESTER':
    case '3RD_SEMESTER':
    case 'THIRD_TRIMESTER':
    case '3RD_TRIMESTER':
    case 'SUMMER_TERM':
    case 'SUMMER':
    case '3RD':
      return 'THIRD_SEMESTER';
    default:
      return 'FIRST_SEMESTER';
  }
}

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

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return { error: NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 }) };
    }

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { status: true, role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      return { error: NextResponse.json({ error: 'User not found or inactive' }, { status: 401 }) };
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
    }

    return { userId };
  } catch (error) {
    console.error('Academic year auth error', error);
    return { error: NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 }) };
  }
}

// Match Next.js generated RouteContext typing from `.next/types`
type RouteContext = { params: Promise<{ id?: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifyAuth(request);
    if ('error' in auth) {
      return auth.error;
    }

    const { id } = await context.params;
    const academicYearId = Number(id);
    if (!Number.isFinite(academicYearId)) {
      return NextResponse.json({ error: 'Invalid academic year id' }, { status: 400 });
    }

    const body = await request.json();
    const { year, semesters } = body ?? {};

    if (!Array.isArray(semesters) || semesters.length === 0) {
      return NextResponse.json({ error: 'Semesters array is required' }, { status: 400 });
    }

    if (year && Number(year) !== academicYearId) {
      return NextResponse.json({ error: 'Academic year mismatch' }, { status: 400 });
    }

    let sanitizedSemesters = semesters.map((semester: any) => {
      const semesterType = coerceSemesterType(semester.semesterType);
      return {
        ...semester,
        semesterType,
        isActive: false
      };
    });

    const semesterTypes = new Set<string>();
    for (const [index, semester] of sanitizedSemesters.entries()) {
      if (!semester.startDate || !semester.endDate || !semester.semesterType) {
        return NextResponse.json({ error: `Semester ${index + 1} is missing required fields` }, { status: 400 });
      }

      const semesterType = semester.semesterType;
      if (semesterTypes.has(semesterType)) {
        return NextResponse.json({ error: `Duplicate semester type: ${semesterType}` }, { status: 400 });
      }
      semesterTypes.add(semesterType);

      const start = new Date(semester.startDate);
      const end = new Date(semester.endDate);
      if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: `Invalid date range for semester ${index + 1}` }, { status: 400 });
      }
      if (start >= end) {
        return NextResponse.json({ error: `Start date must be before end date for semester ${index + 1}` }, { status: 400 });
      }
    }

    const {
      semesters: semestersWithActive,
      hasCurrent,
      withinRange
    } = deriveActiveSemesters(sanitizedSemesters);
    sanitizedSemesters = semestersWithActive;
    const yearIsActive = hasCurrent || withinRange;

    const existingSemesters = await prisma.semester.findMany({
      where: { year: academicYearId }
    });

    const incomingIds = new Set<number>();
    sanitizedSemesters.forEach((semester: any) => {
      if (semester.id) {
        incomingIds.add(Number(semester.id));
      }
    });

    const semestersToDelete = existingSemesters
      .filter((sem) => !incomingIds.has(sem.semesterId))
      .map((sem) => sem.semesterId);

    if (semestersToDelete.length) {
      await prisma.semester.deleteMany({
        where: { semesterId: { in: semestersToDelete } }
      });
    }

    for (const semester of sanitizedSemesters) {
      const data = {
        startDate: new Date(semester.startDate),
        endDate: new Date(semester.endDate),
        year: academicYearId,
        semesterType: semester.semesterType,
        registrationStart: semester.registrationStart ? new Date(semester.registrationStart) : null,
        registrationEnd: semester.registrationEnd ? new Date(semester.registrationEnd) : null,
        enrollmentStart: semester.enrollmentStart ? new Date(semester.enrollmentStart) : null,
        enrollmentEnd: semester.enrollmentEnd ? new Date(semester.enrollmentEnd) : null,
        notes: semester.notes?.trim() || null,
        isActive: semester.isActive,
        updatedAt: new Date()
      };

      if (semester.id) {
        await prisma.semester.update({
          where: { semesterId: Number(semester.id) },
          data
        });
      } else {
        await prisma.semester.create({
          data: {
            ...data,
            status: 'UPCOMING'
          }
        });
      }
    }

    if (yearIsActive) {
      await prisma.semester.updateMany({
        where: {
          year: {
            not: academicYearId
          }
        },
        data: {
          isActive: false
        }
      });
    }

    const latestSemesters = await prisma.semester.findMany({
      where: { year: academicYearId },
      orderBy: { semesterType: 'asc' }
    });

    const sortedByDate = [...latestSemesters].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const responsePayload = {
      id: academicYearId,
      name: `${academicYearId}-${academicYearId + 1}`,
      startDate: sortedByDate[0]?.startDate ?? null,
      endDate: sortedByDate[sortedByDate.length - 1]?.endDate ?? null,
      isActive: yearIsActive,
      semesters: latestSemesters.map((sem) => ({
        id: sem.semesterId,
        name: getSemesterName(sem.semesterType),
        startDate: sem.startDate,
        endDate: sem.endDate,
        type: getSemesterTypeShort(sem.semesterType),
        isActive: sem.isActive,
        status: sem.status
      }))
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('PUT /api/academic-years/[id] error', error);
    return NextResponse.json({ error: 'Failed to update academic year' }, { status: 500 });
  }
}
