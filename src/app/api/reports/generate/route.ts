import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

// Utilities
async function ensureReportsDir() {
  const { mkdir } = await import('fs/promises');
  const { join } = await import('path');
  const outDir = join(process.cwd(), 'public', 'reports');
  await mkdir(outDir, { recursive: true });
  return outDir;
}

function sanitizeFilename(name: string) {
  return String(name || 'report').replace(/[^a-z0-9-_]/gi, '_');
}

export async function POST(req: NextRequest) {
  try {
    // Auth: require valid JWT and allowed roles
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number((decoded as any)?.userId);
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    const user = await prisma.user.findUnique({ where: { userId }, select: { role: true, status: true } });
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_HEAD', 'INSTRUCTOR'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      reportType = 'analytics_report',
      reportName = 'report',
      data = [],
      columns = [],
      format = 'excel',
      analytics,
      tableView,
      filtersSnapshot,
      timeRange,
      chartImages,
      includeFlags,
      selectedColumns
    } = body || {};

    console.log('Report generation request:', {
      reportType,
      reportName,
      format,
      dataLength: data?.length || 0,
      hasAnalytics: !!analytics,
      hasTableView: !!tableView,
      includeFlags
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = sanitizeFilename(reportName || reportType);
    await ensureReportsDir();

    const toReportType = (t: string): string => {
      const map: Record<string, string> = {
        attendance_summary: 'ATTENDANCE_SUMMARY',
        student_attendance: 'STUDENT_ATTENDANCE',
        instructor_attendance: 'INSTRUCTOR_ATTENDANCE',
        course_attendance: 'COURSE_ATTENDANCE',
        department_attendance: 'DEPARTMENT_ATTENDANCE',
        rfid_activity: 'RFID_ACTIVITY',
        system_activity: 'SYSTEM_ACTIVITY',
        user_activity: 'USER_ACTIVITY',
      };
      const key = String(t || '').toLowerCase();
      return map[key] || 'CUSTOM';
    };

    async function logReport(opts: { filePath: string; fileSize: number; fileFormat: string }) {
      try {
        const created = await prisma.reportLog.create({
          data: {
            generatedBy: userId,
            // Cast to any to accommodate enum type from Prisma at runtime
            reportType: toReportType(reportType) as any,
            reportName: reportName || 'Report',
            startDate: timeRange?.startDate ? new Date(timeRange.startDate) : new Date(),
            endDate: timeRange?.endDate ? new Date(timeRange.endDate) : new Date(),
            status: 'COMPLETED',
            filepath: opts.filePath,
            fileSize: opts.fileSize,
            fileFormat: opts.fileFormat as any,
            parameters: {
              selectedColumns: selectedColumns || null,
              includeFlags: includeFlags || null,
              filtersSnapshot: filtersSnapshot || null
            } as any
          }
        });
        // Notify creator that report is generated
        try {
          await createNotification(userId, {
            title: 'Report generated',
            message: `${reportName || 'Report'} is ready (${opts.fileFormat.toUpperCase()}, ${Math.round((opts.fileSize/1024) * 10)/10} KB)`,
            priority: 'NORMAL',
            type: 'REPORT',
          });
        } catch {}
        return created;
      } catch (e) {
        console.warn('Failed to log report:', e);
        return null;
      }
    }

    // CSV
    if (format === 'csv') {
      // Determine ordered columns. If selectedColumns provided, use those. Otherwise use provided columns or derive from first row.
      let resolvedCols;
      if (selectedColumns && selectedColumns.length > 0) {
        resolvedCols = selectedColumns.map((k: string) => ({ key: k, label: k }));
      } else if (Array.isArray(columns) && columns.length > 0) {
        resolvedCols = columns;
      } else {
        resolvedCols = Object.keys(data?.[0] || {}).map((k: string) => ({ key: k, label: k }));
      }
      
      const headers = resolvedCols.map((c: any) => c.label);
      const rows = (data || []).map((row: any) => {
        return resolvedCols.map((c: any) => {
          const raw = row[c.key];
          return `"${String(raw ?? '').replace(/"/g, '""')}"`;
        }).join(',');
      });
      // Prepend UTF-8 BOM so Excel opens characters correctly
      const csvCore = [headers.join(','), ...rows].join('\n');
      const csv = `\uFEFF${csvCore}`;

      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');
      const rel = `reports/${safeName}_${timestamp}.csv`;
      const out = join(process.cwd(), 'public', rel);
      await writeFile(out, csv, 'utf8');
      const fileSize = Buffer.byteLength(csv, 'utf8');
      const logged = await logReport({ filePath: rel, fileSize, fileFormat: 'csv' });
      return NextResponse.json({ success: true, data: { filename: `${safeName}.csv`, filePath: rel, downloadUrl: logged?.reportId ? `/api/reports/download/${logged.reportId}` : `/${rel}`, publicUrl: `/${rel}`, fileSize } });
    }

    // PDF
    if (format === 'pdf') {
      console.log('Generating PDF file...');
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');

      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Academic Header with institutional styling
      doc.setFillColor(25, 25, 112); // Dark blue background (academic color)
      doc.rect(0, 0, 297, 25, 'F'); // Full width header
      
      // Institution name
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ICCT - Institute of Creative ComputerTechnology', 14, 10);
      
      // Report title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Student Attendance Report', 14, 16);
      
      // Generation details
      doc.setFontSize(9);
      const generatedAt = new Date().toLocaleString();
      doc.text(`Generated: ${generatedAt}`, 14, 22);
      
      // Academic border line
      doc.setDrawColor(25, 25, 112);
      doc.setLineWidth(2);
      doc.line(0, 25, 297, 25);
      
      // Reset text color for content
      doc.setTextColor(0, 0, 0);

      // Academic Summary Section
      if (includeFlags?.includeSummary && analytics?.summary) {
        const s = analytics.summary;
        
        // Academic section title with underline
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(25, 25, 112); // Dark blue for academic feel
        doc.text('STUDENT ATTENDANCE SUMMARY', 14, 35);
        
        // Underline for section title
        doc.setDrawColor(25, 25, 112);
        doc.setLineWidth(1);
        doc.line(14, 37, 100, 37);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        autoTable(doc, {
          head: [[ 'ATTENDANCE METRIC', 'VALUE' ]],
          body: [
            ['Total Students Enrolled', String(s.totalStudents ?? 0)],
            ['Overall Attendance Rate', `${(s.attendanceRate ?? 0).toFixed ? s.attendanceRate.toFixed(1) : s.attendanceRate}%`],
            ['Classes Attended (Present)', String(s.presentCount ?? 0)],
            ['Classes Attended Late', String(s.lateCount ?? 0)],
            ['Classes Absent', String(s.absentCount ?? 0)],
            ['Classes Excused', String(s.excusedCount ?? 0)]
          ],
          startY: 42,
          styles: { 
            fontSize: 11,
            cellPadding: 5,
            halign: 'left',
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [25, 25, 112],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          tableLineColor: [200, 200, 200]
        });
      }

      // Academic Attendance Records Table
      if (includeFlags?.includeTable && Array.isArray(tableView) && tableView.length > 0) {
        // Check if this is a student-attendance type (single student records)
        const isStudentAttendance = reportType === 'student-attendance' || reportType === 'student_attendance';
        
        // Add student info header for student-attendance type
        let studentInfoStartY = 35;
        if (isStudentAttendance && tableView.length > 0) {
          const firstRecord = tableView[0];
          const studentName = firstRecord.studentName || 'N/A';
          const studentId = firstRecord.studentId || 'N/A';
          const department = firstRecord.department || 'N/A';
          
          studentInfoStartY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 35;
          
          // Student Information Section
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(25, 25, 112);
          doc.text('STUDENT INFORMATION', 14, studentInfoStartY);
          
          doc.setDrawColor(25, 25, 112);
          doc.setLineWidth(0.5);
          doc.line(14, studentInfoStartY + 2, 100, studentInfoStartY + 2);
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Name: ${studentName}`, 14, studentInfoStartY + 8);
          doc.text(`Student ID: ${studentId}`, 14, studentInfoStartY + 14);
          doc.text(`Department: ${department}`, 14, studentInfoStartY + 20);
          
          // Attendance Summary if available
          if (analytics?.summary) {
            const s = analytics.summary;
            doc.text(`Attendance Rate: ${(s.attendanceRate ?? 0).toFixed(1)}%`, 150, studentInfoStartY + 8);
            doc.text(`Present: ${s.presentCount ?? 0} | Late: ${s.lateCount ?? 0} | Absent: ${s.absentCount ?? 0}`, 150, studentInfoStartY + 14);
          }
        }
        
        // Calculate starting position for table
        const tableStartY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + (isStudentAttendance ? 10 : 15) : (isStudentAttendance ? 60 : 25);
        
        // Use selected columns if provided, otherwise use all columns
        let tvCols: string[];
        if (selectedColumns && selectedColumns.length > 0) {
          tvCols = selectedColumns.filter((col: string) => Object.keys(tableView[0] || {}).includes(col));
        } else {
          tvCols = Object.keys(tableView[0] || {});
        }
        
        // Format column headers
        const formattedCols = tvCols.map(col => {
          const formatted = col.replace(/([A-Z])/g, ' $1')
                             .replace(/^./, str => str.toUpperCase())
                             .trim();
          
          // Compact headers for better fit
          const compactHeaders: { [key: string]: string } = {
            'Id': 'ID',
            'Student Name': 'STUDENT NAME',
            'Student Id': 'STUDENT ID',
            'Date': 'DATE',
            'Time In': 'TIME IN',
            'Time Out': 'TIME OUT',
            'Status': 'STATUS',
            'Subject': 'SUBJECT',
            'Room': 'ROOM',
            'Notes': 'NOTES',
            'Is Manual Entry': 'MANUAL',
            'Created At': 'CREATED',
            'Updated At': 'UPDATED'
          };
          
          return compactHeaders[formatted] || formatted.toUpperCase();
        });
        
        // Format data rows with better date/time formatting
        const formattedBody = tableView.map((r: any) => {
          return tvCols.map(c => {
            const value = r[c];
            if (value === null || value === undefined) return '';
            
            // Format dates
            if (c.toLowerCase().includes('date') && value) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                }
              } catch {}
            }
            
            // Format times
            if ((c.toLowerCase().includes('time') || c.toLowerCase().includes('created') || c.toLowerCase().includes('updated')) && value) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  if (c.toLowerCase().includes('timein') || c.toLowerCase().includes('timeout')) {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  } else {
                    return date.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                  }
                }
              } catch {}
            }
            
            // Format boolean
            if (typeof value === 'boolean') {
              return value ? 'Yes' : 'No';
            }
            
            return String(value);
          });
        });
        
        // Build column styles dynamically - optimized for landscape page (297mm width)
        // Available width: 297mm - 28mm (margins) = 269mm
        const columnStyles: any = {};
        const totalAvailableWidth = 269; // mm
        let totalAllocatedWidth = 0;
        
        tvCols.forEach((col, idx) => {
          const colLower = col.toLowerCase();
          let style: any = {
            fontSize: 8,
            cellPadding: 2
          };
          
          if (colLower.includes('id') && !colLower.includes('student')) {
            style.cellWidth = 12;
            style.halign = 'center';
            totalAllocatedWidth += 12;
          } else if (colLower.includes('studentname')) {
            style.cellWidth = 30;
            style.halign = 'left';
            totalAllocatedWidth += 30;
          } else if (colLower.includes('studentid')) {
            style.cellWidth = 20;
            style.halign = 'center';
            totalAllocatedWidth += 20;
          } else if (colLower.includes('department')) {
            style.cellWidth = 35;
            style.halign = 'left';
            totalAllocatedWidth += 35;
          } else if (colLower.includes('date')) {
            style.cellWidth = 18;
            style.halign = 'center';
            totalAllocatedWidth += 18;
          } else if (colLower.includes('timein')) {
            style.cellWidth = 15;
            style.halign = 'center';
            totalAllocatedWidth += 15;
          } else if (colLower.includes('timeout')) {
            style.cellWidth = 15;
            style.halign = 'center';
            totalAllocatedWidth += 15;
          } else if (colLower.includes('status')) {
            style.cellWidth = 18;
            style.halign = 'center';
            totalAllocatedWidth += 18;
          } else if (colLower.includes('subject')) {
            style.cellWidth = 40;
            style.halign = 'left';
            totalAllocatedWidth += 40;
          } else if (colLower.includes('room')) {
            style.cellWidth = 12;
            style.halign = 'center';
            totalAllocatedWidth += 12;
          } else if (colLower.includes('notes')) {
            style.cellWidth = 25;
            style.halign = 'left';
            totalAllocatedWidth += 25;
          } else if (colLower.includes('manual')) {
            style.cellWidth = 12;
            style.halign = 'center';
            totalAllocatedWidth += 12;
          } else if (colLower.includes('created') || colLower.includes('updated')) {
            style.cellWidth = 28;
            style.halign = 'center';
            totalAllocatedWidth += 28;
          } else {
            // Auto-calculate remaining width
            const remainingWidth = totalAvailableWidth - totalAllocatedWidth;
            style.cellWidth = Math.max(15, remainingWidth / (tvCols.length - idx));
            style.halign = 'left';
            totalAllocatedWidth += style.cellWidth;
          }
          
          columnStyles[idx] = style;
        });
        
        // If total width exceeds available, scale down proportionally
        if (totalAllocatedWidth > totalAvailableWidth) {
          const scaleFactor = totalAvailableWidth / totalAllocatedWidth;
          Object.keys(columnStyles).forEach(key => {
            if (typeof columnStyles[key].cellWidth === 'number') {
              columnStyles[key].cellWidth = columnStyles[key].cellWidth * scaleFactor;
            }
          });
        }
        
        autoTable(doc, {
          head: [formattedCols],
          body: formattedBody,
          startY: tableStartY + 8,
          styles: { 
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak',
            lineWidth: 0.1,
            halign: 'left',
            lineColor: [200, 200, 200],
            valign: 'middle'
          },
          headStyles: {
            fillColor: [25, 25, 112],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2,
            minCellHeight: 8,
            halign: 'center',
            lineWidth: 0.1,
            valign: 'middle'
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          tableLineColor: [200, 200, 200],
          margin: { left: 14, right: 14, bottom: 30 },
          columnStyles: columnStyles,
          showHead: 'everyPage',
          showFoot: 'never',
          tableWidth: 'auto'
        });
      }

      // Department stats table
      if (Array.isArray(analytics?.departmentStats) && analytics.departmentStats.length > 0) {
        autoTable(doc, {
          head: [[ 'Department', 'Code', 'Attendance %', 'Count' ]],
          body: analytics.departmentStats.map((d: any) => [d.name, d.code, (d.attendanceRate ?? 0).toFixed(1), d.count ?? 0]),
          styles: { fontSize: 8 },
          startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 36,
          margin: { left: 14, right: 14, bottom: 30 }
        });
      }

      // Risk level table
      if (Array.isArray(analytics?.riskLevelData) && analytics.riskLevelData.length > 0) {
        autoTable(doc, {
          head: [[ 'Risk Level', 'Count' ]],
          body: analytics.riskLevelData.map((r: any) => [r.level, r.count]),
          styles: { fontSize: 8 },
          startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 36,
          margin: { left: 14, right: 14, bottom: 30 }
        });
      }

      // Embedded charts (captured client-side as data URLs)
      if (includeFlags?.includeCharts && chartImages && typeof chartImages === 'object') {
        let y = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 34;
        
        // Handle modal content specially - make it full page with proper margins
        const modalContentKey = Object.keys(chartImages).find(key => 
          key.toLowerCase().includes('modal') || key.toLowerCase().includes('content')
        );
        
        if (modalContentKey && chartImages[modalContentKey]) {
          try {
            // Add new page for modal content
            doc.addPage();
            
            // Calculate available space with margins
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20; // 20pt margins on all sides
            const availableWidth = pageWidth - (margin * 2);
            const availableHeight = pageHeight - (margin * 2) - 20; // Extra space for footer
            
            // Calculate optimal dimensions for modal content
            // Modal content is typically in a 2-column layout (Visual Overview + Detailed Breakdown)
            // Use landscape orientation with proper aspect ratio
            const aspectRatio = 1.8; // Slightly wider for 2-column layout
            
            let finalWidth = availableWidth;
            let finalHeight = availableWidth / aspectRatio;
            
            // Ensure we don't exceed available height
            if (finalHeight > availableHeight) {
              finalHeight = availableHeight;
              finalWidth = availableHeight * aspectRatio;
            }
            
            // Ensure minimum size for readability
            const minWidth = 200;
            const minHeight = 150;
            if (finalWidth < minWidth) {
              finalWidth = minWidth;
              finalHeight = minWidth / aspectRatio;
            }
            if (finalHeight < minHeight) {
              finalHeight = minHeight;
              finalWidth = minHeight * aspectRatio;
            }
            
            // Center the image on the page
            const x = (pageWidth - finalWidth) / 2;
            const y = margin + 10; // Start below header
            
            // Add title
         /*   doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(25, 25, 112);
            doc.text('Analytics Overview', margin, y - 5);*/
            
            // Add the modal content image
            doc.addImage(chartImages[modalContentKey], 'PNG', x, y, finalWidth, finalHeight);
            
            console.log(`✅ Modal content added to PDF: ${finalWidth}x${finalHeight} at (${x}, ${y})`);
            console.log(`📊 Page dimensions: ${pageWidth}x${pageHeight}, Available: ${availableWidth}x${availableHeight}`);
          } catch (error) {
            console.warn('Failed to add modal content to PDF:', error);
          }
        }
        
        // Handle other chart images normally
        for (const [key, dataUrl] of Object.entries(chartImages)) {
          if (key === modalContentKey) continue; // Skip modal content as it's handled above
          
          try {
            // Special handling for streak-analysis images - use larger size
            const isStreakAnalysisImage = key === 'Streak Timeline Chart' || key === 'Period Breakdown';
            
            if (isStreakAnalysisImage) {
              // Add new page for each streak-analysis image
              doc.addPage();
              y = 20;
              
              // Calculate optimal size for streak-analysis images
              const pageWidth = doc.internal.pageSize.getWidth();
              const pageHeight = doc.internal.pageSize.getHeight();
              const margin = 20;
              const availableWidth = pageWidth - (margin * 2);
              const availableHeight = pageHeight - (margin * 2) - 20;
              
              // Use larger size for better readability
              let imgWidth = availableWidth;
              let imgHeight = availableHeight * 0.7; // Use 70% of available height
              
              // Add title
              doc.setFontSize(12);
              doc.setFont('helvetica', 'bold');
              doc.text(String(key).replace(/([A-Z])/g, ' $1').trim(), margin, y);
              y += 8;
              
              // Center the image
              const x = (pageWidth - imgWidth) / 2;
              doc.addImage(String(dataUrl), 'PNG', x, y, imgWidth, imgHeight);
              y += imgHeight + 10;
            } else {
              // Standard handling for other charts
              if (y > 190) { doc.addPage(); y = 20; }
              doc.setFontSize(10);
              doc.text(String(key).replace(/([A-Z])/g, ' $1').trim(), 14, y);
              y += 2;
              doc.addImage(String(dataUrl), 'PNG', 14, y, 120, 60);
              y += 64;
            }
          } catch (error) {
            console.warn(`Failed to add chart image ${key} to PDF:`, error);
          }
        }
      }

      // Filters section removed as requested

      // Academic Footer for all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Academic footer line
        doc.setDrawColor(25, 25, 112);
        doc.setLineWidth(1);
        doc.line(14, 185, 283, 185);
        
        // Institution footer
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(25, 25, 112);
        doc.text('ICCT - Institute of Computer and Communication Technology', 14, 190);
        
        // Page numbering and date
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 250, 190);
        doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 195);
        doc.text('Smart Attendance Management System', 14, 200);
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      const rel = `reports/${safeName}_${timestamp}.pdf`;
      const out = join(process.cwd(), 'public', rel);
      await writeFile(out, pdfBuffer);
      console.log('PDF file generated successfully:', rel);
      const logged = await logReport({ filePath: rel, fileSize: pdfBuffer.byteLength, fileFormat: 'pdf' });
      return NextResponse.json({ success: true, data: { filename: `${safeName}.pdf`, filePath: rel, downloadUrl: logged?.reportId ? `/api/reports/download/${logged.reportId}` : `/${rel}`, publicUrl: `/${rel}`, fileSize: pdfBuffer.byteLength } });
    }

    // Excel (xlsx)
    if (format === 'excel') {
      console.log('Generating Excel file...');
      const XLSX = await import('xlsx');
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryRows: any[] = [];
      if (analytics?.summary) {
        const s = analytics.summary;
        summaryRows.push({
          Metric: 'Total Students',
          Value: s.totalStudents ?? 0
        });
        summaryRows.push({ Metric: 'Attendance Rate', Value: `${(s.attendanceRate ?? 0).toFixed ? s.attendanceRate.toFixed(1) : s.attendanceRate}%` });
        summaryRows.push({ Metric: 'Present', Value: s.presentCount ?? 0 });
        summaryRows.push({ Metric: 'Late', Value: s.lateCount ?? 0 });
        summaryRows.push({ Metric: 'Absent', Value: s.absentCount ?? 0 });
        summaryRows.push({ Metric: 'Excused', Value: s.excusedCount ?? 0 });
      }
      if (filtersSnapshot) {
        summaryRows.push({ Metric: 'Generated At', Value: new Date().toISOString() });
        summaryRows.push({ Metric: 'Filters', Value: JSON.stringify(filtersSnapshot) });
      }
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      
      // Set column widths for Summary sheet
      wsSummary['!cols'] = [
        { wch: 20 }, // Metric column
        { wch: 30 }  // Value column
      ];
      
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Helper to append a sheet if data exists with proper formatting
      const appendSheet = (sheetName: string, rows: any[]) => {
        if (Array.isArray(rows) && rows.length > 0) {
          // Filter columns if selectedColumns is provided
          let filteredRows = rows;
          if (selectedColumns && selectedColumns.length > 0 && sheetName === 'TableView') {
            filteredRows = rows.map(row => {
              const filteredRow: any = {};
              selectedColumns.forEach((col: string) => {
                if (row.hasOwnProperty(col)) {
                  filteredRow[col] = row[col];
                }
              });
              return filteredRow;
            });
          }
          
          const ws = XLSX.utils.json_to_sheet(filteredRows);
          
          // Set column widths for better readability
          const colWidths: { wch: number }[] = [];
          if (filteredRows.length > 0) {
            const headers = Object.keys(filteredRows[0]);
            headers.forEach(header => {
              const maxLength = Math.max(
                header.length,
                ...filteredRows.map(row => String(row[header] || '').length)
              );
              colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
            });
          }
          ws['!cols'] = colWidths;
          
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      };

      appendSheet('TimeBased', analytics?.timeBasedData || []);
      appendSheet('DepartmentStats', analytics?.departmentStats || []);
      appendSheet('RiskLevel', analytics?.riskLevelData || []);
      appendSheet('LateArrival', analytics?.lateArrivalData || []);
      appendSheet('Pattern', analytics?.patternData || []);
      appendSheet('Streak', analytics?.streakData?.data || []);
      appendSheet('TableView', tableView || data || []);
      appendSheet('Filters', filtersSnapshot ? [filtersSnapshot] : []);

      const rel = `reports/${safeName}_${timestamp}.xlsx`;
      const out = join(process.cwd(), 'public', rel);
      
      // Generate Excel file with proper formatting
      const wbout = XLSX.write(wb, { 
        type: 'buffer', 
        bookType: 'xlsx',
        compression: true,
        Props: {
          Title: reportName || 'Attendance Report',
          Subject: 'Student Attendance Records',
          Author: 'ICCT Smart Attendance System',
          CreatedDate: new Date()
        }
      });
      
      await writeFile(out, wbout);
      console.log('Excel file generated successfully:', rel);
      const fileSize = Buffer.byteLength(wbout as any);
      const logged = await logReport({ filePath: rel, fileSize, fileFormat: 'xlsx' });
    return NextResponse.json({
      success: true,
      data: {
          filename: `${safeName}.xlsx`,
          filePath: rel,
          downloadUrl: logged?.reportId ? `/api/reports/download/${logged.reportId}` : `/${rel}`,
          publicUrl: `/${rel}`,
          fileSize,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
    }

    return NextResponse.json({ success: false, error: `Unsupported format: ${format}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Report generation failed' }, { status: 500 });
  }
}

// Removed duplicate legacy handler block to avoid redeclaration and duplicate imports
