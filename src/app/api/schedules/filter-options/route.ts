import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Fetch all filter options in parallel
    const [
      semesters,
      days,
      instructors,
      rooms,
      subjects,
      sections,
      academicYears,
      scheduleTypes,
      departments,
      buildings,
      floors,
      roomTypes
    ] = await Promise.all([
      // Semesters
      prisma.semester.findMany({
        select: { semesterType: true, year: true },
        orderBy: { year: 'desc' }
      }).then(results => 
        results.map(s => `${s.semesterType} ${s.year}`)
      ),
      
      // Days of week
      ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      
      // Instructors
      prisma.instructor.findMany({
        where: { status: 'ACTIVE' },
        select: { 
          instructorId: true, 
          firstName: true, 
          lastName: true,
          email: true
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
      }).then(results =>
        results.map(i => ({
          id: i.instructorId,
          name: `${i.firstName} ${i.lastName}`,
          firstName: i.firstName,
          lastName: i.lastName,
          email: i.email
        }))
      ),
      
      // Rooms
      prisma.room.findMany({
        where: { status: 'AVAILABLE' },
        select: { 
          roomNo: true, 
          roomBuildingLoc: true, 
          roomFloorLoc: true, 
          roomType: true 
        },
        orderBy: { roomNo: 'asc' }
      }).then(results =>
        results.map(r => ({
          roomNo: r.roomNo,
          building: r.roomBuildingLoc,
          floor: r.roomFloorLoc,
          roomType: r.roomType
        }))
      ),
      
      // Subjects
      prisma.subjects.findMany({
        where: { status: 'ACTIVE' },
        select: { 
          subjectName: true, 
          subjectCode: true,
          Department: {
            select: { departmentName: true }
          }
        },
        orderBy: { subjectName: 'asc' }
      }).then(results =>
        results.map(s => ({
          name: s.subjectName,
          code: s.subjectCode,
          department: s.Department?.departmentName || 'Unknown'
        }))
      ),
      
      // Sections
      prisma.section.findMany({
        where: { sectionStatus: 'ACTIVE' },
        select: { sectionName: true },
        orderBy: { sectionName: 'asc' }
      }).then(results =>
        results.map(s => s.sectionName)
      ),
      
      // Academic Years
      prisma.subjectSchedule.findMany({
        where: { deletedAt: null }, // Exclude soft-deleted schedules
        select: { academicYear: true },
        distinct: ['academicYear'],
        orderBy: { academicYear: 'desc' }
      }).then(results =>
        results.map(s => s.academicYear)
      ),
      
      // Schedule Types
      ['REGULAR', 'MAKEUP', 'SPECIAL', 'REVIEW', 'EXAM'],
      
      // Departments
      prisma.department.findMany({
        where: { departmentStatus: 'ACTIVE' },
        select: { departmentName: true },
        orderBy: { departmentName: 'asc' }
      }).then(results =>
        results.map(d => d.departmentName)
      ),
      
      // Buildings
      prisma.room.findMany({
        select: { roomBuildingLoc: true },
        distinct: ['roomBuildingLoc'],
        orderBy: { roomBuildingLoc: 'asc' }
      }).then(results =>
        results.map(r => r.roomBuildingLoc)
      ),
      
      // Floors
      prisma.room.findMany({
        select: { roomFloorLoc: true },
        distinct: ['roomFloorLoc'],
        orderBy: { roomFloorLoc: 'asc' }
      }).then(results =>
        results.map(r => r.roomFloorLoc)
      ),
      
      // Room Types
      prisma.room.findMany({
        select: { roomType: true },
        distinct: ['roomType'],
        orderBy: { roomType: 'asc' }
      }).then(results =>
        results.map(r => r.roomType)
      )
    ]);

    return NextResponse.json({
      success: true,
      data: {
        semesters,
        days,
        instructors,
        rooms,
        subjects,
        sections,
        academicYears,
        scheduleTypes,
        departments,
        buildings,
        floors,
        roomTypes
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch filter options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}