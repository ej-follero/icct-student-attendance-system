const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOctober() {
  try {
    console.log('🔍 Checking October 2025 data...\n');

    // Check October records
    const octoberRecords = await prisma.attendance.findMany({
      where: {
        timestamp: {
          gte: new Date('2025-10-01'),
          lte: new Date('2025-10-31')
        }
      },
      select: { timestamp: true, status: true },
      take: 10
    });

    console.log('📅 OCTOBER RECORDS:');
    octoberRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.timestamp.toISOString().split('T')[0]} - ${record.status}`);
    });

    // Count by month
    const monthCounts = await prisma.attendance.groupBy({
      by: ['timestamp'],
      _count: { attendanceId: true },
      where: {
        timestamp: {
          gte: new Date('2025-01-01'),
          lte: new Date('2025-12-31')
        }
      }
    });

    const monthMap = new Map();
    monthCounts.forEach(item => {
      const month = item.timestamp.getMonth() + 1;
      monthMap.set(month, (monthMap.get(month) || 0) + item._count.attendanceId);
    });

    console.log('\n📊 RECORDS BY MONTH:');
    for (let month = 1; month <= 12; month++) {
      const count = monthMap.get(month) || 0;
      console.log(`Month ${month}: ${count} records`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOctober();
