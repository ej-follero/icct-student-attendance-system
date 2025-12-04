const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Check Student table columns
    const studentColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Student' 
      ORDER BY ordinal_position;
    `;
    
    console.log('Student table columns:');
    console.log(JSON.stringify(studentColumns, null, 2));
    
    // Check if firstName exists
    const hasFirstName = studentColumns.some(col => col.column_name === 'firstName');
    console.log('\nHas firstName column:', hasFirstName);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();

