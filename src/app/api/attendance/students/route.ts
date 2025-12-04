export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

<<<<<<< HEAD
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));
=======
    console.log('Received student attendance filter parameters:', {
      studentId,
      departmentId,
      courseId,
      sectionId,
      yearLevel,
      startDate,
      endDate,
      status,
      search,
      subjectName
    });
>>>>>>> a29f51f (Cleanup devcontainer script and update calendar)

  // Build a safe where clause based on fields we've seen in your DB
  // (studentIdNum, firstName, lastName). We won’t touch your schema.
  const where = q
    ? {
        OR: [
<<<<<<< HEAD
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { studentIdNum: { contains: q, mode: 'insensitive' } },
        ],
=======
          // Full name matching for multi-word searches (e.g., "abel cruz")
          // Check if first word matches firstName and rest matches lastName
          ...(search.includes(' ') ? [
            {
              AND: [
                { firstName: { contains: search.split(' ')[0], mode: 'insensitive' } },
                { lastName: { contains: search.split(' ').slice(1).join(' '), mode: 'insensitive' } }
              ]
            },
            // Also check reverse order (last word as firstName, first words as lastName)
            {
              AND: [
                { firstName: { contains: search.split(' ').slice(-1)[0], mode: 'insensitive' } },
                { lastName: { contains: search.split(' ').slice(0, -1).join(' '), mode: 'insensitive' } }
              ]
            }
          ] : []),
          // Individual name fields (for single word or partial matches)
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          // Other student fields
          { studentIdNum: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
          { rfidTag: { contains: search, mode: 'insensitive' } },
          // Department
          {
            Department: { is: { 
              OR: [
                { departmentName: { contains: search, mode: 'insensitive' } },
                { departmentCode: { contains: search, mode: 'insensitive' } }
              ]
            } }
          },
          // Course
          {
            CourseOffering: { is: { OR: [
              { courseName: { contains: search, mode: 'insensitive' } },
              { courseCode: { contains: search, mode: 'insensitive' } }
            ] } }
          },
          // Guardian
          {
            Guardian: { is: { OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } }
            ] } }
          },
          // Section
          {
            StudentSection: { some: {
              Section: { sectionName: { contains: search, mode: 'insensitive' } }
            } }
          },
          // Subject
          {
            StudentSchedules: { some: {
              schedule: {
                OR: [
                  { subject: { subjectName: { contains: search, mode: 'insensitive' } } },
                  { subject: { subjectCode: { contains: search, mode: 'insensitive' } } }
                ]
              }
            } }
          }
        ]
      })
    };
    if (departmentId && departmentId !== 'all') {
      const deptNum = Number(departmentId);
      if (Number.isFinite(deptNum)) {
        where.departmentId = deptNum;
      } else {
        // Try to match by department code first, then by department name
        where.Department = {
          is: {
            OR: [
              { departmentCode: departmentId },
              { departmentName: { contains: departmentId, mode: 'insensitive' } }
            ]
          }
        };
>>>>>>> a29f51f (Cleanup devcontainer script and update calendar)
      }
    : {};

  try {
    const [total, items] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          studentId: true,
          studentIdNum: true,
          firstName: true,
          lastName: true,
          // If you want to display more fields later, add them here
        },
      }),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e: any) {
    console.error('GET /api/students error:', e);
    return NextResponse.json(
      { error: e?.message ?? 'Failed to fetch students' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
