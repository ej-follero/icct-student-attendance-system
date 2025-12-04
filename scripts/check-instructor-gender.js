const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInstructorGender() {
  try {
    const instructor = await prisma.instructor.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Mabelle', mode: 'insensitive' } },
          { lastName: { contains: 'Rowe', mode: 'insensitive' } },
          { email: { contains: 'mabelle.rowe', mode: 'insensitive' } }
        ]
      },
      select: {
        instructorId: true,
        firstName: true,
        lastName: true,
        email: true,
        gender: true
      }
    });

    if (instructor) {
      console.log('\n=== Instructor Found ===');
      console.log(`Name: ${instructor.firstName} ${instructor.lastName}`);
      console.log(`Email: ${instructor.email}`);
      console.log(`Gender: ${instructor.gender}`);
      console.log(`\nAnswer: ${instructor.gender === 'MALE' ? 'YES' : 'NO'}, Mabelle Rowe is ${instructor.gender === 'MALE' ? 'MALE' : 'FEMALE'}`);
    } else {
      console.log('Instructor not found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstructorGender();

