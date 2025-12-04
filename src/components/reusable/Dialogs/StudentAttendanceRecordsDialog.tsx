"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DateRangePicker, { RangeValue, DateRangePickerDialog } from "@/components/reusable/DateRangePicker";
import { ChevronLeft, ChevronRight, Download, X, Calendar, Copy, Printer, ClipboardList, User, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExportService } from "@/lib/services/export.service";

interface AttendanceRecord {
  id: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  subject: string;
  room: string;
  notes?: string;
  isManualEntry: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentData {
  studentId: string;
  studentName: string;
  studentIdNum: string;
  department: string;
  attendanceRate: number;
  attendedClasses: number;
  absentClasses: number;
  lateClasses: number;
  totalScheduledClasses: number;
  subjects: string[];
  avatarUrl?: string;
}

interface StudentAttendanceRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentData | null;
  records?: AttendanceRecord[];
  loading?: boolean;
  showCopyButton?: boolean;
  showPrintButton?: boolean;
  showExportButton?: boolean;
}

export default function StudentAttendanceRecordsDialog({
  open,
  onOpenChange,
  student,
  records = [],
  loading = false,
  showCopyButton = true,
  showPrintButton = true,
  showExportButton = true
}: StudentAttendanceRecordsDialogProps) {
  const [dateRange, setDateRange] = useState("last-30-days");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fetchedRecords, setFetchedRecords] = useState<AttendanceRecord[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  
  // Date picker state
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');
  const [rangeSelectionStep, setRangeSelectionStep] = useState<'start' | 'end'>('start');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Initialize custom date range when dialog opens
  useEffect(() => {
    if (open && student) {
      const today = new Date();
      setCustomDateRange({
        start: today,
        end: today
      });
    }
  }, [open, student]);

  // Helper functions
  const copyToClipboard = async (text: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(text.toString());
      toast.success(`${fieldLabel} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyRecords = async () => {
    if (!student || filteredRecords.length === 0) {
      toast.error('No records to copy');
      return;
    }

    try {
      // Format records as CSV
      const headers = ['ID', 'Date', 'Time In', 'Time Out', 'Status', 'Subject', 'Room', 'Notes', 'Manual'];
      const rows = filteredRecords.map(record => [
        record.id,
        record.date,
        record.timeIn || '',
        record.timeOut || '',
        record.status,
        record.subject,
        record.room,
        record.notes || '',
        record.isManualEntry ? 'Yes' : 'No'
      ]);

      // Create CSV string
      const csvContent = [
        headers.join('\t'),
        ...rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ')).join('\t'))
      ].join('\n');

      // Add student info header
      const studentInfo = [
        `Student: ${student.studentName}`,
        `Student ID: ${student.studentIdNum}`,
        `Department: ${student.department}`,
        `Attendance Rate: ${student.attendanceRate}%`,
        '',
        csvContent
      ].join('\n');

      await navigator.clipboard.writeText(studentInfo);
      toast.success(`Copied ${filteredRecords.length} attendance record(s) to clipboard`);
    } catch (err) {
      console.error('Failed to copy records:', err);
      toast.error('Failed to copy records to clipboard');
    }
  };

  const handlePrint = () => {
    if (!student || filteredRecords.length === 0) {
      toast.error('No records to print');
      return;
    }

    try {
      // Create a print-friendly window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print');
        return;
      }

      // Build HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Attendance Records - ${student.studentName}</title>
            <style>
              @media print {
                @page {
                  margin: 1cm;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #000;
                background: #fff;
              }
              .header {
                margin-bottom: 20px;
                border-bottom: 1px solid #000;
                padding-bottom: 10px;
              }
              .header h1 {
                margin: 0;
                color: #000;
                font-size: 24px;
              }
              .student-info {
                margin: 10px 0;
                font-size: 14px;
                color: #000;
              }
              .stats {
                display: flex;
                gap: 20px;
                margin: 15px 0;
                flex-wrap: wrap;
              }
              .stat-item {
                padding: 10px;
                background: #f0f0f0;
                border-radius: 5px;
                min-width: 120px;
                border: 1px solid #000;
              }
              .stat-value {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #000;
              }
              .stat-label {
                font-size: 12px;
                color: #000;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 11px;
                border: 1px solid #000;
              }
              th {
                background-color: #fff;
                color: #000;
                padding: 8px;
                text-align: left;
                border: 1px solid #000;
                font-weight: bold;
              }
              td {
                padding: 6px;
                border: 1px solid #000;
                color: #000;
              }
              tr:nth-child(even) {
                background-color: #fff;
              }
              tr:nth-child(odd) {
                background-color: #f8f9fa;
              }
              .status-present { color: #000; font-weight: bold; }
              .status-late { color: #000; font-weight: bold; }
              .status-absent { color: #000; font-weight: bold; }
              .status-excused { color: #000; font-weight: bold; }
              .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #000;
                font-size: 10px;
                color: #000;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Student Attendance Records</h1>
              <div class="student-info">
                <strong>Name:</strong> ${student.studentName}<br>
                <strong>Student ID:</strong> ${student.studentIdNum}<br>
                <strong>Department:</strong> ${student.department}
              </div>
              <div class="stats">
                <div class="stat-item">
                  <div class="stat-value">${student.attendanceRate}%</div>
                  <div class="stat-label">Overall Attendance</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${student.attendedClasses}</div>
                  <div class="stat-label">Present</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${student.absentClasses}</div>
                  <div class="stat-label">Absent</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${student.lateClasses}</div>
                  <div class="stat-label">Late</div>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                  <th>Subject</th>
                  <th>Room</th>
                  <th>Notes</th>
                  <th>Manual</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.map(record => `
                  <tr>
                    <td>${record.id}</td>
                    <td>${record.date}</td>
                    <td>${record.timeIn || ''}</td>
                    <td>${record.timeOut || ''}</td>
                    <td class="status-${record.status.toLowerCase()}">${record.status}</td>
                    <td>${record.subject}</td>
                    <td>${record.room}</td>
                    <td>${record.notes || ''}</td>
                    <td>${record.isManualEntry ? 'Yes' : 'No'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              Generated on ${new Date().toLocaleString()} | Total Records: ${filteredRecords.length}
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to print records:', err);
      toast.error('Failed to open print dialog');
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf' = exportFormat) => {
    if (!student || filteredRecords.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      setExporting(true);
      
      // Prepare export data
      const exportData = {
        type: 'student-attendance',
        data: filteredRecords.map(record => ({
          id: record.id,
          studentName: student.studentName,
          studentId: student.studentIdNum,
          department: student.department,
          date: record.date,
          timeIn: record.timeIn || '',
          timeOut: record.timeOut || '',
          status: record.status,
          subject: record.subject,
          room: record.room,
          notes: record.notes || '',
          isManualEntry: record.isManualEntry,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        })),
        filters: {
          dateRange,
          selectedSubject,
          selectedStatus,
          customDateRange: dateRange === 'custom' ? customDateRange : null
        },
        studentInfo: {
          name: student.studentName,
          id: student.studentIdNum,
          department: student.department,
          attendanceRate: student.attendanceRate,
          attendedClasses: student.attendedClasses,
          absentClasses: student.absentClasses,
          lateClasses: student.lateClasses,
          totalScheduledClasses: student.totalScheduledClasses
        }
      };

      // Generate filename with student info and date range
      const dateStr = dateRange === 'custom' 
        ? `${customDateRange.start.toLocaleDateString()}-${customDateRange.end.toLocaleDateString()}`
        : dateRange;
      const filenameBase = `attendance-records-${student.studentName.replace(/\s+/g, '-')}-${dateStr}`;

      if (format === 'csv') {
        // Export as CSV
        await ExportService.exportToCSV(exportData, {
          filename: `${filenameBase}.csv`,
          includeHeaders: true
        });
      } else {
        // Export as Excel or PDF using the analytics export service
        // Transform data to match the expected format for the API
        const transformedData = {
          type: 'student-attendance',
          data: exportData.data,
          analytics: {
            summary: {
              totalStudents: 1, // Single student
              attendanceRate: student.attendanceRate,
              presentCount: student.attendedClasses,
              lateCount: student.lateClasses,
              absentCount: student.absentClasses,
              excusedCount: 0 // Not tracked in current data
            }
          },
          tableView: exportData.data, // Use the same data for table view
          filtersSnapshot: exportData.filters,
          timeRange: {
            start: exportData.filters.customDateRange?.start || new Date(),
            end: exportData.filters.customDateRange?.end || new Date()
          }
        };

        console.log('Exporting with data:', {
          format,
          dataLength: transformedData.data.length,
          hasAnalytics: !!transformedData.analytics,
          hasTableView: !!transformedData.tableView
        });

        await ExportService.exportAnalytics(transformedData, {
          format: format,
          filename: `${filenameBase}.${format}`,
          includeCharts: false,
          includeFilters: true,
          includeSummary: true,
          includeTable: true
        });
      }

      toast.success(`Attendance records exported as ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export attendance records as ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  // Date picker helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(firstOfMonth);
    // Calendar starts on Monday (Mo)
    const weekday = start.getDay(); // 0..6 (Sun..Sat)
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    const current = new Date(start);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const handleDateClick = (date: Date, event: React.MouseEvent) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    
    if (selectionMode === 'single') {
      setCustomDateRange({
        start: newDate,
        end: newDate
      });
      // Trigger data refresh for single date selection
      setDateRange('custom');
    } else {
      if (rangeSelectionStep === 'start') {
        setCustomDateRange({
          start: newDate,
          end: newDate
        });
        setRangeSelectionStep('end');
      } else {
        const currentStart = new Date(customDateRange.start);
        currentStart.setHours(0, 0, 0, 0);
        
        if (newDate < currentStart) {
          setCustomDateRange({
            start: newDate,
            end: currentStart
          });
        } else {
          setCustomDateRange({
            start: currentStart,
            end: newDate
          });
        }
        setRangeSelectionStep('start');
        // Trigger data refresh for range completion
        setDateRange('custom');
        // Auto-close picker after selecting the end date
        setIsDatePickerOpen(false);
      }
    }
  };

  const isInRange = (date: Date) => {
    if (!customDateRange.start || !customDateRange.end) return false;
    
    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);
    const current = new Date(date);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    return current >= start && current <= end;
  };

  const isRangeBoundary = (date: Date) => {
    if (!customDateRange.start || !customDateRange.end) return false;
    
    const start = new Date(customDateRange.start);
    const end = new Date(customDateRange.end);
    const current = new Date(date);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    return current.getTime() === start.getTime() || current.getTime() === end.getTime();
  };

  const isRangeStart = (date: Date) => {
    if (!customDateRange.start) return false;
    
    const start = new Date(customDateRange.start);
    const current = new Date(date);
    
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    return current.getTime() === start.getTime();
  };

  const isRangeEnd = (date: Date) => {
    if (!customDateRange.end) return false;
    
    const end = new Date(customDateRange.end);
    const current = new Date(date);
    
    end.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    return current.getTime() === end.getTime();
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => prev === 'single' ? 'range' : 'single');
    setRangeSelectionStep('start');
    const today = new Date();
    setCustomDateRange({
      start: today,
      end: today
    });
  };

  const navigateMonth = (delta: number) => {
    setCurrentMonth(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const getNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  const renderCalendar = (month: Date, isSecondCalendar = false) => {
    const days = getDaysInMonth(month);
    const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return (
      <div className="w-64">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-blue-900">{monthName}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-blue-600 font-medium">
              {day}
            </div>
          ))}
          
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === month.getMonth();
            const isSelected = isRangeBoundary(day);
            const isStart = isRangeStart(day);
            const isEnd = isRangeEnd(day);
            const inRange = isInRange(day);
            const isHovered = hoveredDate && day.getTime() === hoveredDate.getTime();
            
            return (
              <button
                type="button"
                key={index}
                onClick={(event) => handleDateClick(day, event)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cn(
                  "h-8 w-8 rounded-full text-xs font-medium transition-colors relative",
                  !isCurrentMonth && "text-gray-300",
                  isCurrentMonth && "text-blue-900 hover:bg-blue-50",
                  // Single date selection
                  selectionMode === 'single' && isSelected && "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200",
                  // Range selection styling
                  selectionMode === 'range' && isStart && "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200",
                  selectionMode === 'range' && isEnd && "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200",
                  selectionMode === 'range' && inRange && !isStart && !isEnd && "bg-blue-100 text-blue-700",
                  isHovered && !isSelected && !inRange && "bg-blue-50"
                )}
              >
                {day.getDate()}
                {/* Visual indicators for range boundaries */}
                {selectionMode === 'range' && isStart && (
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
                {selectionMode === 'range' && isEnd && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
                {/* Single date indicator */}
                {selectionMode === 'single' && isSelected && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDateRange = () => {
    if (customDateRange.start.getTime() === customDateRange.end.getTime()) {
      return customDateRange.start.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } else {
      const startStr = customDateRange.start.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short' 
      });
      const endStr = customDateRange.end.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      return `${startStr} - ${endStr}`;
    }
  };

  // Prefer records passed via props; otherwise, try to map student.attendanceRecords from API
  const mappedStudentRecords: AttendanceRecord[] = Array.isArray((student as any)?.attendanceRecords)
    ? ((student as any).attendanceRecords as any[]).slice(0, 50).map((r: any) => ({
        id: String(r.attendanceId ?? `${r.timestamp}-${r.subjectSchedId ?? ''}`),
        date: new Date(r.timestamp).toLocaleDateString(),
        timeIn: r.status === 'PRESENT' || r.status === 'LATE' ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        timeOut: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        status: r.status,
        subject: r.subjectSchedule?.subject?.subjectName || 'Unknown Subject',
        room: r.subjectSchedule?.room?.roomNo || 'Unknown Room',
        notes: r.notes,
        isManualEntry: r.attendanceType === 'MANUAL_ENTRY',
        createdAt: new Date(r.timestamp).toISOString(),
        updatedAt: new Date(r.timestamp).toISOString()
      }))
    : [];

  const baseRecords = records.length > 0 ? records : mappedStudentRecords;

  // Fetch records from API when filters change
  useEffect(() => {
    if (!student) return;
    const fetchFiltered = async () => {
      try {
        setFetching(true);
        const params = new URLSearchParams();
        // Compute date range
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = now;
        if (dateRange === 'last-7-days') {
          start = new Date();
          start.setDate(start.getDate() - 7);
        } else if (dateRange === 'last-30-days') {
          start = new Date();
          start.setDate(start.getDate() - 30);
        } else if (dateRange === 'this-month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'this-semester') {
          start = new Date();
          start.setMonth(start.getMonth() - 4);
        } else if (dateRange === 'custom') {
          start = customDateRange.start;
          end = customDateRange.end;
        }

        if (start) params.append('startDate', start.toISOString());
        if (end) params.append('endDate', end.toISOString());
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (selectedSubject !== 'all') params.append('subjectName', selectedSubject);

        const res = await fetch(`/api/students/${encodeURIComponent(student.studentId)}/details?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const apiRecords: AttendanceRecord[] = Array.isArray(data?.attendanceRecords)
          ? data.attendanceRecords.map((r: any) => ({
              id: String(r.attendanceId ?? `${r.timestamp}-${r.subjectSchedId ?? ''}`),
              date: new Date(r.timestamp).toLocaleDateString(),
              timeIn: r.status === 'PRESENT' || r.status === 'LATE' ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              timeOut: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
              status: r.status,
              subject: r.subjectSchedule?.subject?.subjectName || 'Unknown Subject',
              room: r.subjectSchedule?.room?.roomNo || 'Unknown Room',
              notes: r.notes,
              isManualEntry: r.attendanceType === 'MANUAL_ENTRY',
              createdAt: new Date(r.timestamp).toISOString(),
              updatedAt: new Date(r.timestamp).toISOString()
            }))
          : [];
        setFetchedRecords(apiRecords);
      } catch (err) {
        console.error('Failed to fetch filtered records:', err);
        setFetchedRecords([]);
      } finally {
        setFetching(false);
      }
    };
    fetchFiltered();
  }, [student, dateRange, selectedStatus, selectedSubject, customDateRange]);

  const allRecords = fetchedRecords !== null ? fetchedRecords : baseRecords;

  // Filter records based on current filters
  const filteredRecords = useMemo(() => {
    let filtered = allRecords;

    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(record => record.subject === selectedSubject);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(record => record.status === selectedStatus);
    }

    return filtered;
  }, [allRecords, selectedSubject, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedSubject, selectedStatus, dateRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-200';
      case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'EXCUSED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Student Attendance Records
                </DialogTitle>
                <p className="text-blue-100 text-sm">
                  {student.studentName} • {student.studentIdNum}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-white/20 text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {/* Student Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{student.attendanceRate}%</div>
              <div className="text-blue-100 text-sm">Overall Attendance</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-400">{student.attendedClasses}</div>
              <div className="text-blue-100 text-sm">Present</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-400">{student.absentClasses}</div>
              <div className="text-blue-100 text-sm">Absent</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-yellow-400">{student.lateClasses}</div>
              <div className="text-blue-100 text-sm">Late</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <div className="flex gap-2">
                <Select value={dateRange} onValueChange={(value) => {
                  setDateRange(value);
                  if (value === 'custom') {
                    // Initialize with today's date if not set
                    if (!customDateRange.start || !customDateRange.end) {
                      const today = new Date();
                      setCustomDateRange({
                        start: today,
                        end: today
                      });
                    }
                    setIsDatePickerOpen(true);
                  }
                }}>
                  <SelectTrigger className="rounded border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="this-semester">This Semester</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateRange === 'custom' && (
                  <>
                    <Button
                      variant="outline"
                      className="rounded border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsDatePickerOpen(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDateRange()}
                    </Button>
                    <DateRangePickerDialog
                      open={isDatePickerOpen}
                      onOpenChange={setIsDatePickerOpen}
                      mode={selectionMode}
                      value={selectionMode === 'single' ? customDateRange.start : (customDateRange as RangeValue)}
                      onChange={(val) => {
                        if (val instanceof Date) {
                          const d = new Date(val); d.setHours(0,0,0,0);
                          setSelectionMode('single');
                          setCustomDateRange({ start: d, end: d });
                        } else {
                          setSelectionMode('range');
                          setCustomDateRange({ start: val.start, end: val.end });
                        }
                      }}
                      onApply={() => {
                        setDateRange('custom');
                      }}
                    />
                  </>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="rounded border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {student.subjects?.map((subject, index) => (
                    <SelectItem key={`${subject}-${index}`} value={subject}>{subject}</SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="EXCUSED">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="flex-1 overflow-y-auto">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading attendance records...</p>
              </div>
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No attendance records found</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Room</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time In</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time Out</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{record.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.subject}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.room}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.timeIn || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{record.timeOut || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusColor(record.status)} text-xs px-2 py-1 rounded-full`}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {record.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            {filteredRecords.length > 0 && (
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
              </div>
            )}
            {filteredRecords.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700 px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {showCopyButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRecords}
                className="rounded border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={!student || filteredRecords.length === 0}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            )}
            {showPrintButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="rounded border-blue-300 text-blue-700 hover:bg-blue-50"
                disabled={!student || filteredRecords.length === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
            {showExportButton && (
              <div className="flex items-center gap-2">
                <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel' | 'pdf') => setExportFormat(value)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(exportFormat)}
                  disabled={exporting || filteredRecords.length === 0}
                  className="rounded border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      {exportFormat === 'csv' && <Download className="w-4 h-4 mr-2" />}
                      {exportFormat === 'excel' && <FileSpreadsheet className="w-4 h-4 mr-2" />}
                      {exportFormat === 'pdf' && <FileText className="w-4 h-4 mr-2" />}
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
