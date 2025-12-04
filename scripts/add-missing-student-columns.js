const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to Student table...');
    
    // Add columns as nullable first
    await prisma.$executeRaw`
      ALTER TABLE "Student" 
      ADD COLUMN IF NOT EXISTS "firstName" TEXT,
      ADD COLUMN IF NOT EXISTS "middleName" TEXT,
      ADD COLUMN IF NOT EXISTS "lastName" TEXT,
      ADD COLUMN IF NOT EXISTS "suffix" TEXT,
      ADD COLUMN IF NOT EXISTS "email" TEXT,
      ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "img" TEXT,
      ADD COLUMN IF NOT EXISTS "gender" "UserGender",
      ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
    `;
    
    console.log('✅ Columns added successfully');
    
    // Now populate from User table where possible
    console.log('Populating data from User table...');
    
    // Get students with their user data
    const students = await prisma.student.findMany({
      include: { User: true },
      take: 100 // Process in batches
    });
    
    console.log(`Found ${students.length} students to update`);
    
    // Update each student with data from User
    for (const student of students) {
      if (student.User) {
        // Extract name from email or userName if available
        const email = student.User.email || '';
        const userName = student.User.userName || '';
        
        // Try to extract name from email (format: firstname.lastname@...)
        let firstName = '';
        let lastName = '';
        
        if (email.includes('@')) {
          const emailPart = email.split('@')[0];
          const parts = emailPart.split('.');
          if (parts.length >= 2) {
            firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            lastName = parts.slice(1).join(' ').charAt(0).toUpperCase() + parts.slice(1).join(' ').slice(1);
          }
        }
        
        // Fallback to userName if email parsing fails
        if (!firstName && userName) {
          firstName = userName;
        }
        
        await prisma.student.update({
          where: { studentId: student.studentId },
          data: {
            firstName: firstName || 'Unknown',
            lastName: lastName || 'Student',
            email: email || student.User.email || '',
            phoneNumber: '', // Will need to be filled manually
            gender: 'MALE', // Default, will need to be updated
          }
        });
      }
    }
    
    console.log('✅ Data populated successfully');
    
    // Check the result
    const sample = await prisma.student.findFirst({
      include: { User: true }
    });
    
    console.log('\nSample student after update:');
    console.log({
      studentId: sample?.studentId,
      firstName: sample?.firstName,
      lastName: sample?.lastName,
      email: sample?.email,
      userEmail: sample?.User?.email
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();

