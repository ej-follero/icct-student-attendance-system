const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDates() {
  try {
    console.log('🔍 Checking attendance record date range...\n');

    // Get earliest records
    const earliest = await prisma.attendance.findMany({
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
      take: 5
    });

    // Get latest records
    const latest = await prisma.attendance.findMany({
      select: { timestamp: true },
      orderBy: { timestamp: 'desc' },
      take: 5
    });

    console.log('📅 EARLIEST RECORDS:');
    earliest.forEach((record, index) => {
      console.log(`${index + 1}. ${record.timestamp.toISOString().split('T')[0]}`);
    });

    console.log('\n📅 LATEST RECORDS:');
    latest.forEach((record, index) => {
      console.log(`${index + 1}. ${record.timestamp.toISOString().split('T')[0]}`);
    });

    // Get unique months
    const uniqueMonths = await prisma.attendance.findMany({
      select: { timestamp: true },
      distinct: ['timestamp']
    });

    const months = [...new Set(uniqueMonths.map(r => r.timestamp.getMonth() + 1))].sort();
    console.log(`\n📊 UNIQUE MONTHS: ${months.join(', ')}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
