import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Fetching filter options...');

    // Fetch all students
    const students = await prisma.student.findMany({
      select: {
        studentId: true,
        firstName: true,
        lastName: true,
        studentIdNum: true,
        Department: {
          select: {
            departmentName: true,
          },
        },
        StudentSection: {
          select: {
            Section: {
              select: {
                sectionName: true,
                Course: {
                  select: {
                    courseName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    console.log('Students fetched:', students.length);

    // Fetch all courses
    const courses = await prisma.courseOffering.findMany({
      select: {
        courseId: true,
        courseName: true,
        courseCode: true,
      },
    });
    console.log('Courses fetched:', courses.length);

    // Fetch all sections
    const sections = await prisma.section.findMany({
      select: {
        sectionId: true,
        sectionName: true,
        Course: {
          select: {
            courseName: true,
          },
        },
      },
    });
    console.log('Sections fetched:', sections.length);

    // Fetch all subjects
    const subjects = await prisma.subjects.findMany({
      select: {
        subjectId: true,
        subjectName: true,
        subjectCode: true,
      },
    });
    console.log('Subjects fetched:', subjects.length);

    // Fetch all instructors
    const instructors = await prisma.instructor.findMany({
      select: {
        instructorId: true,
        firstName: true,
        lastName: true,
      },
    });
    console.log('Instructors fetched:', instructors.length);

    // Transform the data to match the frontend interface
    const transformedData = {
      students: students.map(student => ({
        id: student.studentId.toString(),
        studentName: `${student.firstName} ${student.lastName}`,
        studentId: student.studentIdNum,
        course: student.Department?.departmentName || '',
        yearLevel: student.StudentSection[0]?.Section.sectionName.split(' ')[1] || '',
        section: student.StudentSection[0]?.Section.sectionName || '',
      })),
      courses: courses.map(course => ({
        id: course.courseId.toString(),
        name: `${course.courseCode} - ${course.courseName}`,
      })),
      sections: sections.map(section => ({
        id: section.sectionId.toString(),
        name: section.sectionName,
        course: section.Course?.courseName || '',
      })),
      subjects: subjects.map(subject => ({
        id: subject.subjectId.toString(),
        name: `${subject.subjectCode} - ${subject.subjectName}`,
      })),
      instructors: instructors.map(instructor => ({
        id: instructor.instructorId.toString(),
        name: `${instructor.firstName} ${instructor.lastName}`,
      })),
    };

    console.log('Transformed data:', {
      studentsCount: transformedData.students.length,
      coursesCount: transformedData.courses.length,
      sectionsCount: transformedData.sections.length,
      subjectsCount: transformedData.subjects.length,
      instructorsCount: transformedData.instructors.length,
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    
    // Return a more detailed error message
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to fetch filter options: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
} 