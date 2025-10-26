import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple in-memory cache for analytics data
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for better performance

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'student';
    const timeRange = searchParams.get('timeRange') || 'week';
    const noCache = searchParams.get('noCache') === '1' || searchParams.get('noCache') === 'true';
    const departmentId = searchParams.get('departmentId');
    const riskLevel = searchParams.get('riskLevel');
    const subjectId = searchParams.get('subjectId');
    const courseId = searchParams.get('courseId');
    const sectionId = searchParams.get('sectionId');
    const yearLevel = searchParams.get('yearLevel');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('Analytics API called with params:', {
      type,
      timeRange,
      departmentId,
      riskLevel,
      subjectId,
      courseId,
      sectionId,
      startDate,
      endDate
    });

    // Create cache key
    const cacheKey = `${type}-${timeRange}-${departmentId || 'all'}-${riskLevel || 'all'}-${subjectId || 'all'}-${courseId || 'all'}-${sectionId || 'all'}-${yearLevel || 'all'}-${startDate || 'default'}-${endDate || 'default'}`;
    
    // Check cache first unless bypassed
    if (!noCache) {
      const cached = analyticsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('Returning cached analytics data');
        return NextResponse.json(cached.data);
      }
    }

    // Calculate date range based on timeRange or custom range
    let dateStart: Date;
    let dateEnd: Date;

    if (startDate && endDate) {
      // Use custom date range if provided
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
      
      // Validate dates
      if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid date range provided',
            details: 'Start or end date is invalid'
          },
          { status: 400 }
        );
      }
      
      // Set dateEnd to end of the day
      dateEnd.setHours(23, 59, 59, 999);
    } else {
    switch (timeRange) {
      case 'today':
          // Use current date
          const today = new Date();
          dateStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          dateEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;
      case 'week':
          // Use current week
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          dateStart = weekStart;
          dateEnd = weekEnd;
        break;
      case 'month':
          // Use current month
          const currentMonth = new Date();
          dateStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          dateEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        break;
      case 'quarter':
          // Use current quarter
          const currentQuarter = new Date();
          const quarterStart = new Date(currentQuarter.getFullYear(), Math.floor(currentQuarter.getMonth() / 3) * 3, 1);
          const quarterEnd = new Date(currentQuarter.getFullYear(), Math.floor(currentQuarter.getMonth() / 3) * 3 + 3, 0);
          dateStart = quarterStart;
          dateEnd = quarterEnd;
        break;
      case 'year':
          // Use current year but include the seeded semester period
          const currentYear = new Date();
          dateStart = new Date(currentYear.getFullYear(), 0, 1);
          dateEnd = new Date(currentYear.getFullYear(), 11, 31);
        break;
      case 'custom':
          // Use first semester period for custom range
          dateStart = new Date('2025-01-15');
          dateEnd = new Date('2025-04-15');
        break;
      default:
          // Default to current year to show all data
          const defaultYear = new Date();
          dateStart = new Date(defaultYear.getFullYear(), 0, 1);
          dateEnd = new Date(defaultYear.getFullYear(), 11, 31);
      }
    }

    console.log('Date range:', { dateStart, dateEnd });

    // Build where clause for attendance records
    const attendanceWhere: any = {
      timestamp: {
        gte: dateStart,
        lte: dateEnd
      }
    };

    // Build a separate student where for total enrolled count (ignores date range)
    const studentWhere: any = {};

    // Add department filter if specified (accepts numeric ID or code)
    if (departmentId && departmentId !== 'all') {
      const deptNum = Number(departmentId);
      if (!Number.isNaN(deptNum) && Number.isFinite(deptNum)) {
        attendanceWhere.student = {
          ...attendanceWhere.student,
          departmentId: deptNum
        };
        studentWhere.departmentId = deptNum;
      } else {
        attendanceWhere.student = {
          ...attendanceWhere.student,
          Department: {
            ...(attendanceWhere.student?.Department || {}),
            is: {
              ...(attendanceWhere.student?.Department?.is || {}),
              departmentCode: departmentId
            }
          }
        };
        studentWhere.Department = { is: { departmentCode: departmentId } };
      }
    }

    // Add course filter for student if specified (accepts numeric ID or courseCode)
    if (courseId && courseId !== 'all') {
      const cNum = Number(courseId);
      if (!Number.isNaN(cNum) && Number.isFinite(cNum)) {
        attendanceWhere.student = {
          ...attendanceWhere.student,
          courseId: cNum
        };
        studentWhere.courseId = cNum;
      } else {
        attendanceWhere.student = {
          ...attendanceWhere.student,
          CourseOffering: {
            ...(attendanceWhere.student?.CourseOffering || {}),
            is: {
              ...(attendanceWhere.student?.CourseOffering?.is || {}),
              courseCode: courseId
            }
          }
        };
        studentWhere.CourseOffering = { is: { courseCode: courseId } };
      }
    }

    // Add year level filter if specified (Student.yearLevel enum)
    if (yearLevel && yearLevel !== 'all') {
      attendanceWhere.student = {
        ...attendanceWhere.student,
        yearLevel: yearLevel as any
      };
      studentWhere.yearLevel = yearLevel as any;
    }

    // Add subject filter if specified
    if (subjectId && subjectId !== 'all') {
      attendanceWhere.subjectSchedule = {
        ...attendanceWhere.subjectSchedule,
        subject: {
          ...(attendanceWhere.subjectSchedule?.subject || {}),
          subjectId: parseInt(subjectId)
        }
      };
    }

    // Add course filter for subject schedule if specified (accepts numeric ID or courseCode)
    if (courseId && courseId !== 'all') {
      const cNum2 = Number(courseId);
      if (!Number.isNaN(cNum2) && Number.isFinite(cNum2)) {
        attendanceWhere.subjectSchedule = {
          ...attendanceWhere.subjectSchedule,
          subject: {
            ...(attendanceWhere.subjectSchedule?.subject || {}),
            CourseOffering: {
              ...(attendanceWhere.subjectSchedule?.subject?.CourseOffering || {}),
              courseId: cNum2
            }
          }
        };
      } else {
        attendanceWhere.subjectSchedule = {
          ...attendanceWhere.subjectSchedule,
          subject: {
            ...(attendanceWhere.subjectSchedule?.subject || {}),
            CourseOffering: {
              ...(attendanceWhere.subjectSchedule?.subject?.CourseOffering || {}),
              is: {
                ...((attendanceWhere.subjectSchedule?.subject?.CourseOffering as any)?.is || {}),
                courseCode: courseId
              }
            }
          }
        };
      }
    }

    // Add section filter if specified
    if (sectionId && sectionId !== 'all') {
      attendanceWhere.subjectSchedule = {
        ...attendanceWhere.subjectSchedule,
        sectionId: parseInt(sectionId)
      };
      studentWhere.StudentSection = {
        some: { sectionId: parseInt(sectionId) }
      };
    }

    // Get attendance records with optimized query
    let attendanceRecords;
    try {
      attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        attendanceId: true,
        status: true,
        timestamp: true,
        studentId: true,
        student: {
          select: {
            studentId: true,
            departmentId: true,
            courseId: true,
            yearLevel: true,
            Department: {
              select: {
                departmentId: true,
                departmentName: true,
                departmentCode: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10000 // Limit results for performance
    });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database query failed',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }

    console.log(`Found ${attendanceRecords.length} attendance records`);
  console.log('Sample attendance records:', attendanceRecords.slice(0, 5).map(r => ({
    timestamp: r.timestamp,
    month: r.timestamp.getMonth() + 1,
    status: r.status
  })));
  
    // Debug: Check if records have time variation
    if (attendanceRecords.length > 0) {
      const timestamps = attendanceRecords.map(r => r.timestamp);
      const uniqueTimestamps = new Set(timestamps.map(t => t.toISOString().split('T')[0]));
      console.log(`📊 Unique dates in attendance records: ${uniqueTimestamps.size}`);
      console.log(`📊 Date range: ${Math.min(...timestamps.map(t => t.getTime()))} to ${Math.max(...timestamps.map(t => t.getTime()))}`);
      
      // Check month distribution
      const monthCounts = attendanceRecords.reduce((acc, r) => {
        const month = r.timestamp.getMonth() + 1;
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      console.log(`📊 Month distribution:`, monthCounts);
      
      // Check status distribution
      const statusCounts = attendanceRecords.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📊 Status distribution:`, statusCounts);
    }

    // Compute total enrolled students matching filters (ignoring date range)
    const totalStudents = await prisma.student.count({ where: studentWhere });

    // Process data for charts
    const timeBasedData = processTimeBasedData(attendanceRecords, timeRange, dateStart, dateEnd);
    const departmentStats = processDepartmentStats(attendanceRecords);
    const riskLevelData = processRiskLevelData(attendanceRecords);
    const lateArrivalData = processLateArrivalData(attendanceRecords, timeRange, dateStart, dateEnd);

    // Process pattern and streak analysis data
    const patternData = processPatternAnalysis(attendanceRecords, timeRange, dateStart, dateEnd);
    const streakData = processStreakAnalysis(attendanceRecords, timeRange, dateStart, dateEnd);

    // Build summary for quick cards based on the filtered dataset
    console.log(`📊 Building summary from ${attendanceRecords.length} filtered records`);
    console.log(`📊 Applied filters: departmentId=${departmentId}, courseId=${courseId}, sectionId=${sectionId}, yearLevel=${yearLevel}, subjectId=${subjectId}, timeRange=${timeRange}`);
    
    const uniqueStudentIds = new Set<number>();
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;
    for (let i = 0; i < attendanceRecords.length; i++) {
      const r = attendanceRecords[i];
      if (r.studentId != null) uniqueStudentIds.add(r.studentId);
      switch (r.status) {
        case 'PRESENT':
          presentCount++;
          break;
        case 'LATE':
          lateCount++;
          break;
        case 'ABSENT':
          absentCount++;
          break;
        case 'EXCUSED':
          excusedCount++;
          break;
      }
    }
    const totalAttendance = attendanceRecords.length;
    const attendanceRateSummary = totalAttendance > 0 ? ((presentCount + lateCount) / totalAttendance) * 100 : 0;
    
    console.log(`📊 Summary counts: Present=${presentCount}, Late=${lateCount}, Absent=${absentCount}, Total=${totalAttendance}`);
    console.log(`📊 Attendance rate: ${attendanceRateSummary.toFixed(1)}%`);

    const result = {
      success: true,
      data: {
        timeBasedData,
        departmentStats,
        riskLevelData,
        lateArrivalData,
        patternData,
        streakData,
        summary: {
          totalStudents, // enrolled matching filters
          uniqueStudentsWithAttendance: uniqueStudentIds.size,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          totalAttendance,
          attendanceRate: attendanceRateSummary
        }
      }
    };

    console.log('Analytics data processed:', {
      timeBasedDataLength: timeBasedData.length,
      departmentStatsLength: departmentStats.length,
      riskLevelDataLength: riskLevelData.length,
      lateArrivalDataLength: lateArrivalData.length,
      patternDataLength: patternData.length,
      streakDataLength: streakData.data.length
    });

    // Cache the result unless bypassed
    if (!noCache) {
      analyticsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function processTimeBasedData(records: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  const dataMap = new Map();
  
  console.log(`📊 processTimeBasedData - Processing ${records.length} records for ${timeRange}`);
  console.log(`📊 Date range: ${dateStart.toISOString()} to ${dateEnd.toISOString()}`);
  console.log(`📊 processTimeBasedData - These records are already filtered by department, course, section, year level, subject, and time range`);
  
  // Pre-calculate time range multipliers for performance
  const timeMultipliers = {
    'today': 1,
    'week': 1,
    'month': 1,
    'quarter': 7 * 24 * 60 * 60 * 1000,
    'year': 1
  };
  
  const multiplier = timeMultipliers[timeRange as keyof typeof timeMultipliers] || 1;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const timestamp = new Date(record.timestamp);
    let key: string;
    
    switch (timeRange) {
      case 'today':
        key = timestamp.getHours().toString();
        break;
      case 'week':
        // Group by day for week view to show daily trends
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'month':
        // Group by day for month view to show daily trends
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'quarter':
        const weekNumber = Math.ceil((timestamp.getTime() - dateStart.getTime()) / multiplier);
        key = `Week ${weekNumber}`;
        break;
      case 'year':
        // Group by month for year view
        key = (timestamp.getMonth() + 1).toString();
        break;
      default:
        key = timestamp.toISOString().split('T')[0];
    }
    
    if (!dataMap.has(key)) {
      dataMap.set(key, {
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        totalCount: 0,
        attendanceRate: 0
      });
    }
    
    const data = dataMap.get(key);
    data.totalCount++;
    
    // Use direct property access for better performance
    switch (record.status) {
      case 'PRESENT':
        data.presentCount++;
        break;
      case 'ABSENT':
        data.absentCount++;
        break;
      case 'LATE':
        data.lateCount++;
        break;
      case 'EXCUSED':
        data.excusedCount++;
        break;
    }
  }
  
  // Calculate attendance rates in batch
  for (const [key, data] of dataMap.entries()) {
    data.attendanceRate = data.totalCount > 0 
      ? ((data.presentCount + data.lateCount) / data.totalCount) * 100 
      : 0;
  }
  
  const result = Array.from(dataMap.entries()).map(([key, value]) => {
    // Create a consistent data structure for the chart
    const baseData = {
    attendanceRate: value.attendanceRate,
    presentCount: value.presentCount,
    lateCount: value.lateCount,
    absentCount: value.absentCount,
      totalCount: value.totalCount
    };

    // Add the appropriate time-based key based on timeRange
    switch (timeRange) {
      case 'today':
        return { ...baseData, hour: key };
      case 'week':
        return { ...baseData, date: key, week: key };
      case 'month':
        return { ...baseData, date: key };
      case 'quarter':
        return { ...baseData, week: key };
      case 'year':
        return { ...baseData, month: key };
      default:
        return { ...baseData, date: key };
    }
  });
  
  // Fill in missing data points to ensure complete trend visualization
  const filledResult = fillMissingDataPoints(result, timeRange, dateStart, dateEnd);
  
  console.log(`📊 processTimeBasedData - Generated ${result.length} data points for ${timeRange}:`, result);
  console.log(`📊 processTimeBasedData - After filling missing points: ${filledResult.length} data points`);
  console.log(`📊 processTimeBasedData - DataMap entries:`, Array.from(dataMap.entries()));
  
  // Debug: Check if all data points have the same attendance rate
  if (filledResult.length > 0) {
    const attendanceRates = filledResult.map(r => r.attendanceRate);
    const uniqueRates = new Set(attendanceRates);
    console.log(`📊 Unique attendance rates: ${uniqueRates.size} (${Array.from(uniqueRates).join(', ')})`);
    
    if (uniqueRates.size === 1) {
      console.log(`⚠️ WARNING: All data points have the same attendance rate (${Array.from(uniqueRates)[0]}%)`);
      console.log(`📊 This will result in flat chart lines. Check if attendance records have proper time variation.`);
    }
  }
  
  return filledResult;
}

function fillMissingDataPoints(data: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  if (data.length === 0) return data;
  
  const result = [...data];
  const existingKeys = new Set(data.map(item => {
    if (timeRange === 'today') return item.hour;
    if (timeRange === 'week' || timeRange === 'month') return item.date;
    if (timeRange === 'quarter') return item.week;
    if (timeRange === 'year') return item.month;
    return item.date;
  }));
  
  // Generate missing data points based on time range
  const missingPoints: any[] = [];
  
  switch (timeRange) {
    case 'today':
      for (let hour = 0; hour < 24; hour++) {
        if (!existingKeys.has(hour.toString())) {
          missingPoints.push({
            hour: hour.toString(),
            attendanceRate: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            totalCount: 0
          });
        }
      }
      break;
      
    case 'week':
    case 'month':
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dateKey = current.toISOString().split('T')[0];
        if (!existingKeys.has(dateKey)) {
          missingPoints.push({
            date: dateKey,
            attendanceRate: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            totalCount: 0
          });
        }
        current.setDate(current.getDate() + 1);
      }
      break;
      
    case 'year':
      for (let month = 1; month <= 12; month++) {
        if (!existingKeys.has(month.toString())) {
          missingPoints.push({
            month: month.toString(),
            attendanceRate: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            totalCount: 0
          });
        }
      }
      break;
  }
  
  // Add missing points and sort by the appropriate key
  result.push(...missingPoints);
  
  // Sort the result
  result.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return result;
}

function processDepartmentStats(records: any[]) {
  const deptMap = new Map();
  
  console.log(`📊 Processing ${records.length} records for department stats`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  records.forEach(record => {
    const dept = record.student?.Department;
    if (!dept) {
      skippedCount++;
      return;
    }
    
    processedCount++;
    const deptKey = dept.departmentName;
    if (!deptMap.has(deptKey)) {
      deptMap.set(deptKey, {
        departmentId: dept.departmentId,
        name: dept.departmentName,
        code: dept.departmentCode,
        totalClasses: 0,
        attendedClasses: 0,
        attendanceRate: 0,
        count: 0
      });
    }
    
    const data = deptMap.get(deptKey);
    data.totalClasses++;
    data.count++;
    
    if (record.status === 'PRESENT' || record.status === 'LATE') {
      data.attendedClasses++;
    }
    
    data.attendanceRate = data.totalClasses > 0 
      ? (data.attendedClasses / data.totalClasses) * 100 
      : 0;
  });
  
  console.log(`📊 Department stats: ${processedCount} processed, ${skippedCount} skipped`);
  console.log(`📊 Found ${deptMap.size} departments:`, Array.from(deptMap.keys()));
  
  const result = Array.from(deptMap.values());
  console.log(`📊 Department stats result:`, result);
  
  return result;
}

function processRiskLevelData(records: any[]) {
  const riskMap = new Map();
  
  // Group records by entity (student or instructor)
  const entityMap = new Map();
  
  records.forEach(record => {
    const entityId = record.studentId;
    if (!entityId) return;
    
    if (!entityMap.has(entityId)) {
      entityMap.set(entityId, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
      });
    }
    
    const entityData = entityMap.get(entityId);
    entityData.total++;
    
    switch (record.status) {
      case 'PRESENT':
        entityData.present++;
        break;
      case 'ABSENT':
        entityData.absent++;
        break;
      case 'LATE':
        entityData.late++;
        break;
      case 'EXCUSED':
        entityData.excused++;
        break;
    }
  });
  
  // Calculate risk levels for each entity
  entityMap.forEach((entityData, entityId) => {
    const attendanceRate = entityData.total > 0 
      ? ((entityData.present + entityData.late) / entityData.total) * 100 
      : 0;
    
    let riskLevel: string;
    if (attendanceRate >= 90) riskLevel = 'none';
    else if (attendanceRate >= 75) riskLevel = 'low';
    else if (attendanceRate >= 50) riskLevel = 'medium';
    else riskLevel = 'high';
    
    if (!riskMap.has(riskLevel)) {
      riskMap.set(riskLevel, { level: riskLevel, count: 0 });
    }
    
    riskMap.get(riskLevel).count++;
  });
  
  return Array.from(riskMap.values());
}

function processLateArrivalData(records: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  const dataMap = new Map();
  
  console.log(`📊 processLateArrivalData - Processing ${records.length} records for ${timeRange}`);
  console.log(`📊 Date range: ${dateStart.toISOString()} to ${dateEnd.toISOString()}`);
  console.log(`📊 processLateArrivalData - These records are already filtered by department, course, section, year level, subject, and time range`);
    
  // Count all records (not just late ones) for proper percentage calculation
  const allRecordsMap = new Map();
  
  records.forEach(record => {
    const timestamp = new Date(record.timestamp);
    let key: string;
    
    switch (timeRange) {
      case 'today':
        key = timestamp.getHours().toString();
        break;
      case 'week':
        // Group by day for week view to show daily trends
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'month':
        // Group by day for month view to show daily trends
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'quarter':
        const weekNumber = Math.ceil((timestamp.getTime() - dateStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNumber}`;
        break;
      case 'year':
        // Group by month for year view
        key = (timestamp.getMonth() + 1).toString();
        break;
      default:
        key = timestamp.toISOString().split('T')[0];
    }
    
    // Count all records for total
    if (!allRecordsMap.has(key)) {
      allRecordsMap.set(key, { totalCount: 0, lateCount: 0 });
    }
    allRecordsMap.get(key).totalCount++;
    
    // Count late records specifically
    if (record.status === 'LATE') {
    if (!dataMap.has(key)) {
      dataMap.set(key, { lateCount: 0, totalCount: 0 });
    }
    dataMap.get(key).lateCount++;
    }
  });
  
  // Merge data from all records and late records
  for (const [key, allData] of allRecordsMap.entries()) {
    if (!dataMap.has(key)) {
      dataMap.set(key, { lateCount: 0, totalCount: 0 });
    }
    dataMap.get(key).totalCount = allData.totalCount;
  }
  
  // Calculate late rates as percentages
  for (const [key, data] of dataMap.entries()) {
    data.lateRate = data.totalCount > 0 ? (data.lateCount / data.totalCount) * 100 : 0;
  }
  
  const result = Array.from(dataMap.entries()).map(([key, value]) => {
    // Create a consistent data structure for the chart
    const baseData = {
    lateRate: value.lateRate,
    lateCount: value.lateCount,
      totalCount: value.totalCount
    };

    // Add the appropriate time-based key based on timeRange
    switch (timeRange) {
      case 'today':
        return { ...baseData, hour: key };
      case 'week':
        return { ...baseData, date: key, week: key };
      case 'month':
        return { ...baseData, date: key };
      case 'quarter':
        return { ...baseData, week: key };
      case 'year':
        return { ...baseData, month: key };
      default:
        return { ...baseData, date: key };
    }
  });
  
  // Fill in missing data points to ensure complete trend visualization
  const filledResult = fillMissingLateArrivalDataPoints(result, timeRange, dateStart, dateEnd);
  
  console.log(`📊 processLateArrivalData - Generated ${result.length} data points for ${timeRange}:`, result);
  console.log(`📊 processLateArrivalData - After filling missing points: ${filledResult.length} data points`);
  console.log(`📊 processLateArrivalData - DataMap entries:`, Array.from(dataMap.entries()));
  
  return filledResult;
}

function fillMissingLateArrivalDataPoints(data: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  if (data.length === 0) return data;
  
  const result = [...data];
  const existingKeys = new Set(data.map(item => {
    if (timeRange === 'today') return item.hour;
    if (timeRange === 'week' || timeRange === 'month') return item.date;
    if (timeRange === 'quarter') return item.week;
    if (timeRange === 'year') return item.month;
    return item.date;
  }));
  
  // Generate missing data points based on time range
  const missingPoints: any[] = [];
  
  switch (timeRange) {
    case 'today':
      for (let hour = 0; hour < 24; hour++) {
        if (!existingKeys.has(hour.toString())) {
          missingPoints.push({
            hour: hour.toString(),
            lateRate: 0,
            lateCount: 0,
            totalCount: 0
          });
        }
      }
      break;
      
    case 'week':
    case 'month':
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dateKey = current.toISOString().split('T')[0];
        if (!existingKeys.has(dateKey)) {
          missingPoints.push({
            date: dateKey,
            lateRate: 0,
            lateCount: 0,
            totalCount: 0
          });
        }
        current.setDate(current.getDate() + 1);
      }
      break;
      
    case 'year':
      for (let month = 1; month <= 12; month++) {
        if (!existingKeys.has(month.toString())) {
          missingPoints.push({
            month: month.toString(),
            lateRate: 0,
            lateCount: 0,
            totalCount: 0
          });
        }
      }
      break;
  }
  
  // Add missing points and sort by the appropriate key
  result.push(...missingPoints);
  
  // Sort the result
  result.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return result;
}

function processPatternAnalysis(records: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  const patternMap = new Map();
  
  console.log(`📊 processPatternAnalysis - Processing ${records.length} records for ${timeRange}`);
  console.log(`📊 Date range: ${dateStart.toISOString()} to ${dateEnd.toISOString()}`);
  console.log(`📊 processPatternAnalysis - These records are already filtered by department, course, section, year level, subject, and time range`);
  
  // Group records by appropriate time unit based on timeRange
  records.forEach(record => {
    const timestamp = new Date(record.timestamp);
    let key: string;
    
    switch (timeRange) {
      case 'today':
        key = timestamp.getHours().toString();
        break;
      case 'week':
        // Group by day for week view to show daily patterns
      key = timestamp.toISOString().split('T')[0];
        break;
      case 'month':
        // Group by day for month view to show daily patterns
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'quarter':
        const weekNumber = Math.ceil((timestamp.getTime() - dateStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNumber}`;
        break;
      case 'year':
        // Group by month for year view
        key = (timestamp.getMonth() + 1).toString();
        break;
      default:
        key = timestamp.toISOString().split('T')[0];
    }
    
    if (!patternMap.has(key)) {
      patternMap.set(key, {
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        totalClasses: 0,
        attendanceRate: 0
      });
    }
    
    const data = patternMap.get(key);
    data.totalClasses++;
    
    switch (record.status) {
      case 'PRESENT':
        data.presentCount++;
        break;
      case 'ABSENT':
        data.absentCount++;
        break;
      case 'LATE':
        data.lateCount++;
        break;
    }
    
    data.attendanceRate = data.totalClasses > 0 
      ? ((data.presentCount + data.lateCount) / data.totalClasses) * 100 
      : 0;
  });
  
  // Create consistent data structure
  const result = Array.from(patternMap.entries()).map(([key, value]) => {
    const baseData = {
      attendanceRate: value.attendanceRate,
      presentCount: value.presentCount,
      absentCount: value.absentCount,
      lateCount: value.lateCount,
      totalClasses: value.totalClasses
    };

    // Add the appropriate time-based key based on timeRange
    switch (timeRange) {
      case 'today':
        return { ...baseData, hour: key };
      case 'week':
        return { ...baseData, date: key, week: key };
      case 'month':
        return { ...baseData, date: key };
      case 'quarter':
        return { ...baseData, week: key };
      case 'year':
        return { ...baseData, month: key };
      default:
        return { ...baseData, date: key };
    }
  });
  
  // Fill in missing data points to ensure complete pattern visualization
  const filledResult = fillMissingPatternDataPoints(result, timeRange, dateStart, dateEnd);
  
  // Sort the data by appropriate time field
  filledResult.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Add moving average calculation
  const windowSize = Math.min(7, filledResult.length);
  for (let i = 0; i < filledResult.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const end = i + 1;
    const window = filledResult.slice(start, end);
    const avgRate = window.reduce((sum, day) => sum + day.attendanceRate, 0) / window.length;
    filledResult[i].movingAverage = Math.round(avgRate * 100) / 100;
  }
  
  console.log(`📊 processPatternAnalysis - Generated ${result.length} data points for ${timeRange}:`, result);
  console.log(`📊 processPatternAnalysis - After filling missing points: ${filledResult.length} data points`);
  
  return filledResult;
}

function fillMissingPatternDataPoints(data: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  if (data.length === 0) return data;
  
  const result = [...data];
  const existingKeys = new Set(data.map(item => {
    if (timeRange === 'today') return item.hour;
    if (timeRange === 'week' || timeRange === 'month') return item.date;
    if (timeRange === 'quarter') return item.week;
    if (timeRange === 'year') return item.month;
    return item.date;
  }));
  
  // Generate missing data points based on time range
  const missingPoints: any[] = [];
  
  switch (timeRange) {
    case 'today':
      for (let hour = 0; hour < 24; hour++) {
        if (!existingKeys.has(hour.toString())) {
          missingPoints.push({
            hour: hour.toString(),
            attendanceRate: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            totalClasses: 0,
            movingAverage: 0
          });
        }
      }
      break;
      
    case 'week':
    case 'month':
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dateKey = current.toISOString().split('T')[0];
        if (!existingKeys.has(dateKey)) {
          missingPoints.push({
            date: dateKey,
            attendanceRate: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            totalClasses: 0,
            movingAverage: 0
          });
        }
        current.setDate(current.getDate() + 1);
      }
      break;
      
    case 'year':
      for (let month = 1; month <= 12; month++) {
        if (!existingKeys.has(month.toString())) {
          missingPoints.push({
            month: month.toString(),
            attendanceRate: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            totalClasses: 0,
            movingAverage: 0
          });
        }
      }
      break;
  }
  
  // Add missing points and sort by the appropriate key
  result.push(...missingPoints);
  
  // Sort the result
  result.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return result;
}

function processStreakAnalysis(records: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  console.log(`📊 processStreakAnalysis - Processing ${records.length} records for ${timeRange}`);
  console.log(`📊 Date range: ${dateStart.toISOString()} to ${dateEnd.toISOString()}`);
  console.log(`📊 processStreakAnalysis - These records are already filtered by department, course, section, year level, subject, and time range`);
  
  // Create time-based streak data for chart visualization
  const timeBasedStreakMap = new Map();
  
  records.forEach(record => {
    const timestamp = new Date(record.timestamp);
    let key: string;
    
    switch (timeRange) {
      case 'today':
        key = timestamp.getHours().toString();
        break;
      case 'week':
        // Group by day for week view to show daily streak patterns
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'month':
        // Group by day for month view to show daily streak patterns
        key = timestamp.toISOString().split('T')[0];
        break;
      case 'quarter':
        const weekNumber = Math.ceil((timestamp.getTime() - dateStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNumber}`;
        break;
      case 'year':
        // Group by month for year view
        key = (timestamp.getMonth() + 1).toString();
        break;
      default:
        key = timestamp.toISOString().split('T')[0];
    }
    
    if (!timeBasedStreakMap.has(key)) {
      timeBasedStreakMap.set(key, {
        goodStreaks: 0,
        poorStreaks: 0,
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0
      });
    }
    
    const data = timeBasedStreakMap.get(key);
    data.totalStudents++;
    
    // Count attendance types
    switch (record.status) {
      case 'PRESENT':
        data.presentCount++;
        data.goodStreaks++;
        break;
      case 'LATE':
        data.lateCount++;
        data.goodStreaks++;
        break;
      case 'ABSENT':
        data.absentCount++;
        data.poorStreaks++;
        break;
    }
  });
  
  // Create consistent data structure for time-based streak chart
  const timeBasedData = Array.from(timeBasedStreakMap.entries()).map(([key, value]) => {
    const baseData = {
      goodStreaks: value.goodStreaks,
      poorStreaks: value.poorStreaks,
      totalStudents: value.totalStudents,
      presentCount: value.presentCount,
      absentCount: value.absentCount,
      lateCount: value.lateCount
    };

    // Add the appropriate time-based key based on timeRange
    switch (timeRange) {
      case 'today':
        return { ...baseData, hour: key };
      case 'week':
        return { ...baseData, date: key, week: key };
      case 'month':
        return { ...baseData, date: key };
      case 'quarter':
        return { ...baseData, week: key };
      case 'year':
        return { ...baseData, month: key };
      default:
        return { ...baseData, date: key };
    }
  });
  
  // Fill in missing data points to ensure complete streak visualization
  const filledTimeBasedData = fillMissingStreakDataPoints(timeBasedData, timeRange, dateStart, dateEnd);
  
  // Sort the data by appropriate time field
  filledTimeBasedData.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Calculate overall statistics for the UI
  const totalGoodStreaks = filledTimeBasedData.reduce((sum, d) => sum + d.goodStreaks, 0);
  const totalPoorStreaks = filledTimeBasedData.reduce((sum, d) => sum + d.poorStreaks, 0);
  const totalStudents = filledTimeBasedData.reduce((sum, d) => sum + d.totalStudents, 0);
  
  const stats = {
    maxGoodStreak: Math.max(...filledTimeBasedData.map(d => d.goodStreaks)),
    maxPoorStreak: Math.max(...filledTimeBasedData.map(d => d.poorStreaks)),
    currentStreak: filledTimeBasedData.length > 0 ? filledTimeBasedData[filledTimeBasedData.length - 1].goodStreaks : 0,
    currentStreakType: totalGoodStreaks > totalPoorStreaks ? 'good' : 'poor',
    totalGoodDays: totalGoodStreaks,
    totalStudents: totalStudents,
    averageStreak: totalStudents > 0 ? (totalGoodStreaks / totalStudents) * 100 : 0,
    longestStreak: Math.max(...filledTimeBasedData.map(d => Math.max(d.goodStreaks, d.poorStreaks))),
    presentStreaks: totalGoodStreaks,
    absentStreaks: totalPoorStreaks
  };
  
  console.log(`📊 processStreakAnalysis - Generated ${filledTimeBasedData.length} data points for ${timeRange}:`, filledTimeBasedData);
  console.log('📊 Streak analysis stats:', stats);
  
  return {
    data: filledTimeBasedData,
    stats
  };
}

function fillMissingStreakDataPoints(data: any[], timeRange: string, dateStart: Date, dateEnd: Date) {
  if (data.length === 0) return data;
  
  const result = [...data];
  const existingKeys = new Set(data.map(item => {
    if (timeRange === 'today') return item.hour;
    if (timeRange === 'week' || timeRange === 'month') return item.date;
    if (timeRange === 'quarter') return item.week;
    if (timeRange === 'year') return item.month;
    return item.date;
  }));
  
  // Generate missing data points based on time range
  const missingPoints: any[] = [];
  
  switch (timeRange) {
    case 'today':
      for (let hour = 0; hour < 24; hour++) {
        if (!existingKeys.has(hour.toString())) {
          missingPoints.push({
            hour: hour.toString(),
            goodStreaks: 0,
            poorStreaks: 0,
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
          });
        }
      }
      break;
      
    case 'week':
    case 'month':
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dateKey = current.toISOString().split('T')[0];
        if (!existingKeys.has(dateKey)) {
          missingPoints.push({
            date: dateKey,
            goodStreaks: 0,
            poorStreaks: 0,
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
          });
        }
        current.setDate(current.getDate() + 1);
      }
      break;
      
    case 'year':
      for (let month = 1; month <= 12; month++) {
        if (!existingKeys.has(month.toString())) {
          missingPoints.push({
            month: month.toString(),
            goodStreaks: 0,
            poorStreaks: 0,
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0
          });
        }
      }
      break;
  }
  
  // Add missing points and sort by the appropriate key
  result.push(...missingPoints);
  
  // Sort the result
  result.sort((a, b) => {
    if (timeRange === 'today') return parseInt(a.hour) - parseInt(b.hour);
    if (timeRange === 'week' || timeRange === 'month') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (timeRange === 'quarter') return parseInt(a.week.replace('Week ', '')) - parseInt(b.week.replace('Week ', ''));
    if (timeRange === 'year') return parseInt(a.month) - parseInt(b.month);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  return result;
}