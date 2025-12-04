'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, TrendingUp, Users, Clock, AlertCircle, Filter, ChevronDown, BookOpen, Download, Printer, User, FileText, FileSpreadsheet, File } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add type declaration for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Types
interface StudentAttendance {
  id: string;
  studentName: string;
  studentId: string;
  course: string;
  yearLevel: string;
  section: string;
  avatarUrl?: string;
}

interface FilterOption {
  id: string;
  name: string;
  course?: string;
}

interface FilterOptions {
  students: StudentAttendance[];
  courses: FilterOption[];
  sections: FilterOption[];
  subjects: FilterOption[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  subject: string;
  section: string;
  instructor: string;
  timeIn: string | null;
  timeOut: string | null;
  scheduledTime: {
    start: string;
    end: string;
  };
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  remarks: string;
}

interface Filters {
  student: string;
  course: string;
  yearLevel: string;
  section: string;
  subject: string;
  dateRange: {
    from: string;
    to: string;
  };
  status: string;
}

// Components
const SearchBar = ({
  searchQuery,
  setSearchQuery,
  students,
  courses,
  yearLevels,
  sections,
  subjects,
  filters,
  setFilters
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  students: StudentAttendance[];
  courses: FilterOption[];
  yearLevels: string[];
  sections: FilterOption[];
  subjects: FilterOption[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={filters.dateRange.from}
            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, from: e.target.value } })}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.dateRange.to}
            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, to: e.target.value } })}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-gray-50">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                <select
                  value={filters.student}
                  onChange={(e) => setFilters({ ...filters, student: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Students</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.studentName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={filters.course}
                  onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                <select
                  value={filters.yearLevel}
                  onChange={(e) => setFilters({ ...filters, yearLevel: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Year Levels</option>
                  {yearLevels.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={filters.section}
                  onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sections</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const InsightsSection = ({
  totalSessions,
  totalPresent,
  totalLate,
  totalAbsent,
  attendanceRate,
  classAverage
}: {
  totalSessions: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  attendanceRate: number;
  classAverage: number;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Sessions</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions}</div>
          <p className="text-xs text-gray-500 mt-1">Scheduled classes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Present</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totalPresent}</div>
          <p className="text-xs text-gray-500 mt-1">On-time attendance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{totalLate}</div>
          <p className="text-xs text-gray-500 mt-1">Late arrivals</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Absent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
          <p className="text-xs text-gray-500 mt-1">Missed classes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{attendanceRate.toFixed(1)}%</div>
          <p className="text-xs text-gray-500 mt-1">Overall attendance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Class Average</CardTitle>
            <User className="h-4 w-4 text-purple-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{classAverage.toFixed(1)}%</div>
          <p className="text-xs text-gray-500 mt-1">Class attendance rate</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Update the ExportButton component
const ExportButton = ({ records }: { records: AttendanceRecord[] }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", "Student ID", "Student Name", "Subject", "Section", "Instructor", "Time In", "Time Out", "Status", "Remarks"];
    const tableRows = records.map(record => [
      record.date,
      record.studentId,
      record.studentName,
      record.subject,
      record.section,
      record.instructor,
      record.timeIn || '-',
      record.timeOut || '-',
      record.status,
      record.remarks
    ]);

    // Add the title
    doc.text("Student Attendance Records", 14, 15);

    // Use autoTable with proper configuration
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("attendance-records.pdf");
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(records.map(record => ({
      Date: record.date,
      'Student ID': record.studentId,
      'Student Name': record.studentName,
      Subject: record.subject,
      Section: record.section,
      Instructor: record.instructor,
      'Time In': record.timeIn || '-',
      'Time Out': record.timeOut || '-',
      Status: record.status,
      Remarks: record.remarks
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Records");
    XLSX.writeFile(workbook, "attendance-records.xlsx");
  };

  const exportToCSV = () => {
    const headers = ["Date", "Student ID", "Student Name", "Subject", "Section", "Instructor", "Time In", "Time Out", "Status", "Remarks"];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.date,
        record.studentId,
        record.studentName,
        record.subject,
        record.section,
        record.instructor,
        record.timeIn || '-',
        record.timeOut || '-',
        record.status,
        record.remarks
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "attendance-records.csv";
    link.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
        <Download className="h-5 w-5" />
        <span>Export</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border rounded-md shadow-lg">
        <DropdownMenuItem onClick={exportToPDF} className="flex items-center space-x-2 bg-white hover:bg-gray-100 cursor-pointer">
          <FileText className="h-4 w-4" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="flex items-center space-x-2 bg-white hover:bg-gray-100 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export as Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV} className="flex items-center space-x-2 bg-white hover:bg-gray-100 cursor-pointer">
          <File className="h-4 w-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AttendanceTable = ({ records }: { records: AttendanceRecord[] }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Attendance Records</h2>
        </div>
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.section}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.instructor}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.timeIn || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.timeOut || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.scheduledTime.start} - {record.scheduledTime.end}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function StudentAttendancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    students: [],
    courses: [],
    sections: [],
    subjects: [],
  });

  // Get current date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');
  const [filters, setFilters] = useState<Filters>({
    student: '',
    course: '',
    yearLevel: '',
    section: '',
    subject: '',
    dateRange: {
      from: today,
      to: today,
    },
    status: '',
  });

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        console.log('Fetching filter options...');
        const response = await fetch('/api/attendance/filters');
        if (!response.ok) {
          throw new Error('Failed to fetch filter options');
        }
        const data = await response.json();
        console.log('Filter options received:', data);
        setFilterOptions(data);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };

    fetchFilterOptions();
  }, []);

<<<<<<< HEAD
  // Fetch attendance records
=======
  // Fetch student attendance data with optional filters parameter
  const fetchStudentAttendanceWithFilters = useCallback(async (filters?: typeof analyticsFilters) => {
    const filtersToUse = filters || analyticsFilters;
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Starting to fetch student attendance data...', { filters: filtersToUse });
      
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      // Pagination
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      // Apply synced analytics filters
      if (filtersToUse.departmentId) params.append('departmentId', filtersToUse.departmentId);
      if (filtersToUse.courseId) params.append('courseId', filtersToUse.courseId);
      if (filtersToUse.sectionId) params.append('sectionId', filtersToUse.sectionId);
      if (filtersToUse.yearLevel) params.append('yearLevel', filtersToUse.yearLevel);
      if (filtersToUse.subjectId) params.append('subjectId', filtersToUse.subjectId);
      if (filtersToUse.startDate) params.append('startDate', filtersToUse.startDate);
      if (filtersToUse.endDate) params.append('endDate', filtersToUse.endDate);
      
      const url = `/api/attendance/students?${params.toString()}`;
      console.log('📡 Fetching from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        
        // Handle specific HTTP status codes
        if (response.status === 404) {
          throw new Error('Student attendance data not found. Please check if the service is running.');
        } else if (response.status === 500) {
          throw new Error('Server error occurred. Please try again later.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.');
        } else {
          throw new Error(errorData.details || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('📊 Raw API response:', data);
      
      // Handle case where API returns an error object
      if (data.error) {
        console.error('❌ API returned error:', data.error);
        throw new Error(data.details || data.error);
      }
      
      // Support both legacy array and new paged object { items, total }
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      const total = Array.isArray(data) ? (filtersToUse && Object.keys(filtersToUse).length > 0 ? items.length : items.length) : (typeof data.total === 'number' ? data.total : items.length);

      console.log('✅ Fetched student data:', items);
      console.log('📈 Page size:', pageSize, 'Page:', page, 'Total:', total);
      if (items.length > 0) {
        console.log('👤 Sample student data:', items[0]);
      }
      
      setStudents(items);
      setTotalFilteredCount(total);
      console.log('✅ Students state updated');
    } catch (err) {
      console.error('❌ Error fetching student attendance:', err);
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please check your connection and try again.');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Network error. Please check your internet connection.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
      
      setStudents([]); // Set empty array on error
    } finally {
      setLoading(false);
      setHasFetchedOnce(true);
      console.log('🏁 Fetch completed, loading set to false');
    }
  }, [debouncedSearch, page, pageSize, analyticsFilters]);

  // Alias for backward compatibility
  const fetchStudentAttendance = useCallback(() => {
    return fetchStudentAttendanceWithFilters();
  }, [fetchStudentAttendanceWithFilters]);

  // Fetch data on component mount and when search changes
>>>>>>> a29f51f (Cleanup devcontainer script and update calendar)
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        setLoading(true);
        setError(null);

<<<<<<< HEAD
        const queryParams = new URLSearchParams({
          ...(filters.student && { studentId: filters.student }),
          ...(filters.course && { courseId: filters.course }),
          ...(filters.section && { sectionId: filters.section }),
          ...(filters.dateRange.from && { startDate: filters.dateRange.from }),
          ...(filters.dateRange.to && { endDate: filters.dateRange.to }),
          ...(filters.status && { status: filters.status }),
=======
  // Refetch when analyticsFilters change (from other sources)
  useEffect(() => {
    if (hasFetchedOnce) {
      console.log('Analytics filters changed, refetching data...', analyticsFilters);
      setPage(1); // Reset to page 1 when filters change
      fetchStudentAttendanceWithFilters(analyticsFilters);
    }
  }, [analyticsFilters, hasFetchedOnce, fetchStudentAttendanceWithFilters]);

  // Handle analytics filter changes - auto-apply filters to table
  const handleAnalyticsFiltersChange = useCallback((filters: any) => {
    console.log('🔄 Analytics filters changed:', filters);
    setAnalyticsFilters(filters);
    // Reset to page 1 when filters change
    setPage(1);
    // The useEffect watching analyticsFilters will handle the refetch
  }, []);

  // Function to apply analytics filters and fetch data
  const applyAnalyticsFilters = useCallback(() => {
    console.log('Applying analytics filters and fetching data', analyticsFilters);
    setPage(1); // Reset to page 1 when applying filters
    fetchStudentAttendanceWithFilters(analyticsFilters);
    fetchSubjects();
  }, [analyticsFilters, fetchStudentAttendanceWithFilters, fetchSubjects]);

  // Removed frequent timer re-render to prevent dropdown from closing unexpectedly

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Get unique filter options from data
  const departments = useMemo(() => [...new Set(students.map(s => s.department))], [students]);
  const courses = useMemo(() => [...new Set(students.map(s => s.courseCode))], [students]);
  const yearLevels = useMemo(() => [...new Set(students.map(s => s.yearLevel))], [students]);
  const riskLevels = useMemo(() => [...new Set(students.map(s => s.riskLevel).filter(Boolean))], [students]);
  const statuses = useMemo(() => [...new Set(students.map(s => s.status).filter(Boolean))], [students]);
  
  // Subject data state
  const [subjects, setSubjects] = useState<Array<{ subjectId: number; subjectName: string; subjectCode: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  

  
  // Function to get count for each filter option
  const getFilterCount = useCallback((filterType: string, option: string): number => {
    return students.filter(student => {
      switch (filterType) {
        case 'departments':
          return student.department === option;
        case 'courses':
          return student.courseCode === option;
        case 'yearLevels':
          return student.yearLevel === option;
        case 'attendanceRates':
          if (option === 'High (≥90%)') return student.attendanceRate >= 90;
          if (option === 'Medium (75-89%)') return student.attendanceRate >= 75 && student.attendanceRate < 90;
          if (option === 'Low (<75%)') return student.attendanceRate < 75;
          return false;
        case 'riskLevels':
          return student.riskLevel === option;
        case 'subjects':
          return student.schedules?.some(s => s.subjectCode === option) || false;
        case 'statuses':
          return student.status === option;
        default:
          return false;
      }
    }).length;
  }, [students]);

  // Prepare filter sections for the FilterDialog
  const filterSections = useMemo(() => [
    {
      key: 'departments',
      title: 'Departments',
      options: departments.map(dept => ({
        value: dept,
        label: dept,
        count: getFilterCount('departments', dept)
      }))
    },
    {
      key: 'courses',
      title: 'Courses',
      options: courses.map(code => ({
        value: code,
        label: code,
        count: getFilterCount('courses', code)
      }))
    },
    {
      key: 'yearLevels',
      title: 'Year Levels',
      options: yearLevels.map(level => ({
        value: level,
        label: level.replace('_', ' '),
        count: getFilterCount('yearLevels', level)
      }))
    },
    {
      key: 'attendanceRates',
      title: 'Attendance Rates',
      options: [
        { value: 'High (≥90%)', label: 'High (≥90%)', count: getFilterCount('attendanceRates', 'High (≥90%)') },
        { value: 'Medium (75-89%)', label: 'Medium (75-89%)', count: getFilterCount('attendanceRates', 'Medium (75-89%)') },
        { value: 'Low (<75%)', label: 'Low (<75%)', count: getFilterCount('attendanceRates', 'Low (<75%)') }
      ]
    },
    {
      key: 'riskLevels',
      title: 'Risk Levels',
      options: riskLevels.map(level => ({
        value: level,
        label: level,
        count: getFilterCount('riskLevels', level)
      }))
    },
    {
      key: 'subjects',
      title: 'Subjects',
      options: subjects.map(subject => ({
        value: subject.subjectCode,
        label: `${subject.subjectCode} - ${subject.subjectName}`,
        count: getFilterCount('subjects', subject.subjectCode)
      }))
    },
    {
      key: 'statuses',
      title: 'Status',
      options: statuses.map(status => ({
        value: status,
        label: status,
        count: getFilterCount('statuses', status)
      }))
    }
  ], [departments, courses, yearLevels, riskLevels, subjects, statuses, getFilterCount]);

  // Compute department rank for a student based on attendance rate (desc)
  const getDepartmentRank = useCallback((currentStudent: StudentAttendance) => {
    const peersInDepartment = students.filter(
      (peer) => peer.department === currentStudent.department
    );

    const peersSortedByAttendance = [...peersInDepartment].sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      // Tie-breaker: alphabetical by name for stable ordering
      return a.studentName.localeCompare(b.studentName);
    });

    const currentRankIndex = peersSortedByAttendance.findIndex(
      (peer) => peer.studentId === currentStudent.studentId
    );

    return {
      rank: currentRankIndex >= 0 ? currentRankIndex + 1 : peersSortedByAttendance.length,
      total: peersInDepartment.length
    };
  }, [students]);

  // Table column definitions
  const studentColumns: TableListColumn<StudentAttendance>[] = [
    { 
      header: "Select", 
      accessor: "select", 
      className: "w-8 text-center",
      headerClassName: "justify-center"
    },
    { 
      header: "", 
      accessor: "expander", 
      className: "w-8 text-center",
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpand(student.studentId);
          }}
        >
          <ChevronRight className={`h-4 w-4 text-gray-600 transition-transform ${
            expandedRowIds.has(student.studentId) ? 'rotate-90' : ''
          }`} />
        </Button>
      ),
      expandedContent: (student: StudentAttendance) => (
        <TableCell colSpan={studentColumns.length} className="p-0">
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-l-4 border-blue-400 mx-2 mb-2 rounded-r-xl shadow-sm transition-all duration-300">
            
            {/* Header Section with Student Summary */}
            <div className="p-4 border-b border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-2 ring-white shadow-md">
                      <User className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      student.status === 'ACTIVE' ? 'bg-green-500' : 
                      'bg-gray-400'
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{student.studentName}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {student.studentIdNum}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {student.department}
                      </span>
                      <Badge variant="outline" className="text-xs bg-white/80">
                        {student.yearLevel.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Overall Performance Indicator */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800 mt-4">{student.attendanceRate}%</div>
                  <div className="text-xs text-slate-600 mb-2">Overall Attendance</div>
                  <Progress 
                    value={student.attendanceRate} 
                    className="w-24 h-2 bg-slate-200 mx-auto"
                  />
                  <div className="flex justify-center mt-1">
                    <Badge className={`text-xs px-2 py-1 ${
                      student.attendanceRate >= 90 ? 'bg-emerald-100 text-emerald-800' :
                      student.attendanceRate >= 75 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.riskLevel || 'NONE'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Tabs */}
            <div className="p-2 sm:p-4">
              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-blue-50/70 rounded p-1 gap-1 border border-blue-200">
                  <TabsTrigger value="activity" className="flex items-center justify-center gap-1 text-xs px-2 py-2 rounded text-slate-700 hover:bg-blue-100 transition data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span>Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center justify-center gap-1 text-xs px-2 py-2 rounded text-slate-700 hover:bg-blue-100 transition data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>Schedule</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center justify-center gap-1 text-xs px-2 py-2 rounded text-slate-700 hover:bg-blue-100 transition data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <BarChart3 className="w-3 h-3 flex-shrink-0" />
                    <span>Analytics</span>
                  </TabsTrigger>
                </TabsList>

                {/* Recent Activity Tab */}
                <TabsContent value="activity" className="mt-2 sm:mt-4 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Recent Days */}
                    <Card className="bg-white/70 border-slate-200/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-600" />
                          Last 7 Days
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {loadingExpandedData.has(student.studentId) ? (
                          <div className="text-center py-4 text-slate-500 text-sm">
                            Loading activity data...
                          </div>
                        ) : expandedRowData[student.studentId]?.recentActivity && expandedRowData[student.studentId].recentActivity.length > 0 ? (
                          <div className="space-y-3">
                            {expandedRowData[student.studentId].recentActivity.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 rounded bg-slate-50/50 border border-slate-200/30 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`w-3 h-3 rounded-full ${
                                    entry.status === 'present' ? 'bg-emerald-500' :
                                    entry.status === 'late' ? 'bg-amber-500' :
                                    'bg-red-500'
                                  }`}></div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-700">{entry.day}</span>
                                      <span className="text-xs text-slate-500">{entry.time}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 truncate">
                                      {entry.subject} • {entry.room}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs px-2 py-1 ${
                                    entry.status === 'present' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                    entry.status === 'late' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    'bg-red-100 text-red-700 border-red-200'
                                  }`}>
                                    {entry.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            
                            {/* Summary Stats */}
                            <div className="mt-4 pt-3 border-t border-slate-200">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-bold text-emerald-600">
                                    {expandedRowData[student.studentId]?.weeklyPerformance?.presentDays || 0}
                                  </div>
                                  <div className="text-xs text-slate-500">Present</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-amber-600">
                                    {expandedRowData[student.studentId]?.weeklyPerformance?.lateDays || 0}
                                  </div>
                                  <div className="text-xs text-slate-500">Late</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-red-600">
                                    {expandedRowData[student.studentId]?.weeklyPerformance?.absentDays || 0}
                                  </div>
                                  <div className="text-xs text-slate-500">Absent</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500 text-sm">
                            No recent activity data available
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                </TabsContent>

                {/* Schedule Tab */}
                <TabsContent value="schedule" className="mt-2 sm:mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Today's Schedule */}
                    <Card className="bg-white/70 border-slate-200/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Today&apos;s Classes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {loadingExpandedData.has(student.studentId) ? (
                          <div className="text-center py-4 text-slate-500 text-sm">
                            Loading schedule data...
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(expandedRowData[student.studentId]?.todaySchedules || []).map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 rounded bg-slate-50/50 border border-slate-200/30 hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    entry.status === 'completed' ? 'bg-emerald-500' :
                                    entry.status === 'in-progress' ? 'bg-blue-500 animate-pulse' :
                                    'bg-slate-300'
                                  }`}></div>
                                  <div>
                                    <div className="font-medium text-slate-800">{entry.time}</div>
                                    <div className="text-sm text-slate-600">{entry.subject}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700">{entry.room}</div>
                                  <Badge className={`text-xs mt-1 ${
                                    entry.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                    entry.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {entry.status?.replace('-', ' ') || 'upcoming'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            
                            {(!expandedRowData[student.studentId]?.todaySchedules || expandedRowData[student.studentId].todaySchedules.length === 0) && (
                              <div className="text-center py-4 text-slate-500 text-sm">
                                No classes scheduled for today
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Subjects Overview */}
                    <Card className="bg-white/70 border-slate-200/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          Enrolled Subjects
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {student.schedules?.map(schedule => (
                            <Badge key={schedule.scheduleId} variant="outline" className="text-xs bg-white/80 border-slate-300">
                              {schedule.subjectName}
                            </Badge>
                          ))}
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Classes This Week</span>
                            <span className="font-semibold text-slate-800">{student.totalScheduledClasses}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Classes Attended</span>
                            <span className="font-semibold text-emerald-700">{student.attendedClasses}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Upcoming Today</span>
                            <span className="font-semibold text-blue-700">
                              {(() => {
                                const now = new Date();
                                const today = now.getDay();
                                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                const todayName = dayNames[today];
                                
                                const studentSchedules = student.schedules || [];
                                const todaySchedules = studentSchedules.filter((schedule: any) => 
                                  schedule.dayOfWeek === todayName || schedule.dayOfWeek === 'DAILY'
                                );
                                
                                return todaySchedules.length;
                              })()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-2 sm:mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Weekly Performance */}
                    <Card className="bg-white/70 border-slate-200/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-600" />
                          Weekly Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Present Days</span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={expandedRowData[student.studentId]?.weeklyPerformance ? 
                                  (expandedRowData[student.studentId].weeklyPerformance.presentDays / expandedRowData[student.studentId].weeklyPerformance.totalDays) * 100 : 0} 
                                className="w-16 h-2" 
                              />
                              <span className="text-sm font-semibold text-emerald-700">
                                {expandedRowData[student.studentId]?.weeklyPerformance ? 
                                  `${expandedRowData[student.studentId].weeklyPerformance.presentDays}/${expandedRowData[student.studentId].weeklyPerformance.totalDays}` : '0/0'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">On-Time Rate</span>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={expandedRowData[student.studentId]?.weeklyPerformance?.onTimeRate || 0} 
                                className="w-16 h-2" 
                              />
                              <span className="text-sm font-semibold text-blue-700">
                                {expandedRowData[student.studentId]?.weeklyPerformance ? 
                                  `${Math.round(expandedRowData[student.studentId].weeklyPerformance.onTimeRate)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Current Streak</span>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">
                              {expandedRowData[student.studentId]?.weeklyPerformance?.currentStreak || 0} days
                            </span>
                          </div>
                        </div>
                        
                      </CardContent>
                    </Card>

                    {/* Performance Breakdown */}
                    <Card className="bg-white/70 border-slate-200/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          Performance Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Present</span>
                              <span>{student.attendedClasses}/{student.totalScheduledClasses}</span>
                            </div>
                            <Progress value={(student.attendedClasses / student.totalScheduledClasses) * 100} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Late Arrivals</span>
                              <span>{student.lateClasses}/{student.totalScheduledClasses}</span>
                            </div>
                            <Progress value={(student.lateClasses / student.totalScheduledClasses) * 100} className="h-2" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Absences</span>
                              <span>{student.absentClasses}/{student.totalScheduledClasses}</span>
                            </div>
                            <Progress value={(student.absentClasses / student.totalScheduledClasses) * 100} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </TableCell>
      )
    },
    { 
      header: "Photo", 
      accessor: "photo", 
      className: "w-16 text-center",
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ring-1 ring-gray-200">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            {student.status === 'ACTIVE' && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
        </div>
      )
    },
    { 
      header: "Student", 
      accessor: "studentName", 
      className: "text-blue-900 align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <div className="flex flex-col min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">
            <span>{student.studentName}</span>
          </div>
          <div className="text-sm text-gray-600 truncate">{student.studentIdNum}</div>
        </div>
      )
    },
    { 
      header: "Department", 
      accessor: "department", 
      className: "text-blue-900 text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center"
    },
    { 
      header: "Course Code", 
      accessor: "courseCode", 
      className: "text-blue-900 text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <Badge variant="outline" className="text-xs">
          {student.courseCode}
        </Badge>
      )
    },
    { 
      header: "Year Level", 
      accessor: "yearLevel", 
      className: "text-blue-900 text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <Badge variant="outline" className="text-xs">
          {student.yearLevel.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      header: "Attendance Rate", 
      accessor: "attendanceRate", 
      className: "text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => {
        const getAttendanceRateColor = (rate: number) => {
          if (rate >= 90) return { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' };
          if (rate >= 75) return { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' };
          return { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
        };
        const { text, bg, border } = getAttendanceRateColor(student.attendanceRate);
        return (
          <div className="flex items-center justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${text} ${bg} ${border} border`}>
              {student.attendanceRate}%
            </span>
          </div>
        );
      }
    },
    { 
      header: "Risk Level", 
      accessor: "riskLevel", 
      className: "text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => {
        const getRiskBadgeColor = (risk: string) => {
          switch (risk) {
            case 'NONE': return { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' };
            case 'LOW': return { text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' };
            case 'MEDIUM': return { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' };
            case 'HIGH': return { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
            default: return { text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200' };
          }
        };
        const { text, bg, border } = getRiskBadgeColor(student.riskLevel);
        return (
          <div className="flex items-center justify-center">
            <Badge className={`${text} ${bg} ${border} text-xs px-3 py-1 rounded-full`}>
              {student.riskLevel}
            </Badge>
          </div>
        );
      }
    },
    { 
      header: "Status", 
      accessor: "status", 
      className: "text-center align-middle", 
      sortable: true,
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => {
        const statusConfig = {
          'ACTIVE': { color: 'text-green-700', bg: 'bg-green-100', label: 'Active' },
          'INACTIVE': { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Inactive' },
  
        };
        const config = statusConfig[student.status as keyof typeof statusConfig] || statusConfig.INACTIVE;
        
        return (
          <div className="flex items-center justify-center">
            <Badge className={`${config.color} ${config.bg} text-xs px-3 py-1 rounded-full`}>
              {config.label}
            </Badge>
          </div>
        );
      }
    },
    { 
      header: "Actions", 
      accessor: "actions", 
      className: "text-center align-middle w-16",
      headerClassName: "justify-center",
      render: (student: StudentAttendance) => (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded overflow-hidden shadow-md">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-600 px-3 py-2">
                Quick Actions
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleStudentClick(student);
                }}
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 focus:bg-blue-100 px-3 py-2"
              >
                <Eye className="h-4 w-4 text-blue-600" />
                <span>View Details</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStudentForRecords(student);
                  setShowAttendanceRecordsModal(true);
                }}
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 focus:bg-blue-100 px-3 py-2"
              >
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>View Full Records</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStudentForEdit(student);
                  setShowEditStudentModal(true);
                }}
                className="flex items-center gap-2 cursor-pointer hover:bg-emerald-100 focus:bg-emerald-100 px-3 py-2"
              >
                <Edit className="h-4 w-4 text-emerald-600" />
                <span>Edit Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStudentForDelete(student);
                  setShowDeleteConfirmModal(true);
                }}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 hover:bg-red-50 px-3 py-2"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>Delete Student</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];
  
  // Memoize filtered/sorted data
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      let matchesSearch: boolean;
      if (!debouncedSearch) {
        // No search query, match all
        matchesSearch = true;
      } else {
        const searchLower = debouncedSearch.toLowerCase().trim();
        const searchTerms = searchLower.split(/\s+/).filter(term => term.length > 0);
        
        // Prepare all searchable fields
        const studentName = student.studentName.toLowerCase();
        const studentId = student.studentId.toLowerCase();
        const studentIdNum = (student.studentIdNum || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const phoneNumber = (student.phoneNumber || '').toLowerCase();
        const rfidTag = (student.rfidTag || '').toLowerCase();
        const department = (student.department || '').toLowerCase();
        const course = (student.course || '').toLowerCase();
        const courseCode = (student.courseCode || '').toLowerCase();
        const guardianName = (student.guardianName || '').toLowerCase();
        const guardianEmail = (student.guardianEmail || '').toLowerCase();
        const guardianPhone = (student.guardianPhone || '').toLowerCase();
        const sectionNames = (student.schedules || [])
          .map(s => (s.sectionName || '').toLowerCase())
          .join(' ');
        const subjectNames = (student.schedules || [])
          .map(s => ((s.subjectName || '') + ' ' + (s.subjectCode || '')).toLowerCase())
          .join(' ');
        
        // First, check if the full query matches the full name (for phrase matching like "abel cruz")
        const fullQueryMatches = studentName.includes(searchLower);
        
        if (fullQueryMatches) {
          matchesSearch = true;
        } else if (searchTerms.length > 1) {
          // Multiple terms: check if all terms match the name field OR if each term matches any field
          // This handles cases like "abel cruz" where both words should be in the name
          const allTermsInName = searchTerms.every(term => studentName.includes(term));
          
          if (allTermsInName) {
            matchesSearch = true;
          } else {
            // Fallback: each term must match at least one field
            matchesSearch = searchTerms.every(term => {
              return studentName.includes(term) ||
                studentId.includes(term) ||
                studentIdNum.includes(term) ||
                email.includes(term) ||
                phoneNumber.includes(term) ||
                rfidTag.includes(term) ||
                department.includes(term) ||
                course.includes(term) ||
                courseCode.includes(term) ||
                guardianName.includes(term) ||
                guardianEmail.includes(term) ||
                guardianPhone.includes(term) ||
                sectionNames.includes(term) ||
                subjectNames.includes(term);
            });
          }
        } else {
          // Single term: match any field
          const term = searchTerms[0];
          matchesSearch = studentName.includes(term) ||
            studentId.includes(term) ||
            studentIdNum.includes(term) ||
            email.includes(term) ||
            phoneNumber.includes(term) ||
            rfidTag.includes(term) ||
            department.includes(term) ||
            course.includes(term) ||
            courseCode.includes(term) ||
            guardianName.includes(term) ||
            guardianEmail.includes(term) ||
            guardianPhone.includes(term) ||
            sectionNames.includes(term) ||
            subjectNames.includes(term);
        }
      }
      
      // Apply filters
      const matchesDepartment = filters.departments.length === 0 || filters.departments.includes(student.department);
      const matchesCourse = filters.courses.length === 0 || filters.courses.includes(student.course);
      const matchesYearLevel = filters.yearLevels.length === 0 || filters.yearLevels.includes(student.yearLevel);
      
      let matchesAttendanceRate = filters.attendanceRates.length === 0;
      if (filters.attendanceRates.length > 0) {
        matchesAttendanceRate = filters.attendanceRates.some(rate => {
          if (rate === 'High (≥90%)') return student.attendanceRate >= 90;
          if (rate === 'Medium (75-89%)') return student.attendanceRate >= 75 && student.attendanceRate < 90;
          if (rate === 'Low (<75%)') return student.attendanceRate < 75;
          return false;
        });
      }
      
      const matchesRiskLevel = filters.riskLevels.length === 0 || (student.riskLevel && filters.riskLevels.includes(student.riskLevel));
      const matchesSubject = filters.subjects.length === 0 || filters.subjects.some(subject => student.schedules?.some(s => s.subjectCode === subject));
      const matchesStatus = filters.statuses.length === 0 || (student.status && filters.statuses.includes(student.status));
      
      return matchesSearch && matchesDepartment && matchesCourse && matchesYearLevel && 
             matchesAttendanceRate && matchesRiskLevel && matchesSubject && matchesStatus;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy.field as keyof StudentAttendance];
      const bValue = b[sortBy.field as keyof StudentAttendance];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortBy.order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortBy.order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [students, debouncedSearch, filters, sortBy]);

  // Server-driven pagination: use current page items directly
  const paginatedStudents = filteredStudents; // items already reflect current page
  const totalPages = Math.max(1, Math.ceil((totalFilteredCount || filteredStudents.length) / pageSize));

  // Transform students data to AttendanceData format for analytics
  const transformedStudentsData = useMemo(() => {
    console.log('🔄 Transforming students data:', { 
      studentsLength: students?.length, 
      students: students,
      isArray: Array.isArray(students)
    });
    
    if (!students || students.length === 0) {
      console.log('⚠️ No students data available for analytics');
      return [];
    }
    
    console.log('✅ Students data found, transforming...');
    const transformed = students.map(student => ({
      id: student.studentId,
      name: student.studentName,
      department: student.department,
      totalClasses: student.totalScheduledClasses,
      attendedClasses: student.attendedClasses,
      absentClasses: student.absentClasses,
      lateClasses: student.lateClasses,
      attendanceRate: student.attendanceRate,
      riskLevel: (student.riskLevel || 'NONE').toLowerCase() as 'none' | 'low' | 'medium' | 'high',
      lastAttendance: student.lastAttendance ? new Date(student.lastAttendance) : new Date(),
      status: student.status.toLowerCase() as 'active' | 'inactive',
      subjects: student.schedules?.map(s => s.subjectName) || [],
      weeklyData: [
        { week: 'Week 1', attendanceRate: student.attendanceRate * 0.95, totalClasses: Math.floor(student.totalScheduledClasses * 0.25), attendedClasses: Math.floor((student.attendedClasses + student.lateClasses) * 0.25), absentClasses: Math.floor(student.absentClasses * 0.25), lateClasses: Math.floor(student.lateClasses * 0.25), trend: 'up' as const, change: 2 },
        { week: 'Week 2', attendanceRate: student.attendanceRate * 0.98, totalClasses: Math.floor(student.totalScheduledClasses * 0.25), attendedClasses: Math.floor((student.attendedClasses + student.lateClasses) * 0.25), absentClasses: Math.floor(student.absentClasses * 0.25), lateClasses: Math.floor(student.lateClasses * 0.25), trend: 'up' as const, change: 1 },
        { week: 'Week 3', attendanceRate: student.attendanceRate * 1.02, totalClasses: Math.floor(student.totalScheduledClasses * 0.25), attendedClasses: Math.floor((student.attendedClasses + student.lateClasses) * 0.25), absentClasses: Math.floor(student.absentClasses * 0.25), lateClasses: Math.floor(student.lateClasses * 0.25), trend: 'stable' as const, change: 0 },
        { week: 'Week 4', attendanceRate: student.attendanceRate * 0.99, totalClasses: Math.floor(student.totalScheduledClasses * 0.25), attendedClasses: Math.floor((student.attendedClasses + student.lateClasses) * 0.25), absentClasses: Math.floor(student.absentClasses * 0.25), lateClasses: Math.floor(student.lateClasses * 0.25), trend: 'down' as const, change: -1 }
      ],
      // Student-specific fields
      parentNotifications: Math.floor(student.absentClasses * 0.8),
      attendanceStreak: Math.floor(Math.random() * 10) + 1
    }));
    
    console.log('✅ Transformed data for analytics:', transformed);
    console.log('📊 Transformed data length:', transformed.length);
    return transformed;
  }, [students]);

  // Avoid showing analytics skeleton when other actions toggle loading after initial data load
  const analyticsLoading = loading && (!students || students.length === 0);

  // Debug analytics data
  useEffect(() => {
    console.log('Analytics Debug:', {
      studentsLength: students?.length,
      transformedDataLength: transformedStudentsData?.length,
      loading,
      error,
      hasData: transformedStudentsData && transformedStudentsData.length > 0
    });
  }, [students, transformedStudentsData, loading, error]);

  const handleStudentClick = (student: StudentAttendance) => {
    setSelectedStudent(student);
    setShowStudentDetail(true);
  };

  const hasActiveFilters = useMemo(() => {
    const anyFilter = Object.values(filters).some(arr => (arr as string[]).length > 0);
    const anyAnalytics = analyticsFilters && Object.keys(analyticsFilters).length > 0;
    return anyFilter || !!searchQuery || anyAnalytics || selectedSubject !== 'all';
  }, [filters, searchQuery, analyticsFilters, selectedSubject]);

  // Check what types of filters are active
  const hasTableFilters = useMemo(() => {
    const anyFilter = Object.values(filters).some(arr => (arr as string[]).length > 0);
    return anyFilter || !!searchQuery;
  }, [filters, searchQuery]);

  const hasAnalyticsFilters = useMemo(() => {
    const anyAnalytics = analyticsFilters && Object.keys(analyticsFilters).length > 0;
    return anyAnalytics || selectedSubject !== 'all';
  }, [analyticsFilters, selectedSubject]);

  // Clear all filters (analytics + table + search)
  const handleClearAllFilters = () => {
    // Reset all table/UI filters
    setFilters({
      departments: [],
      courses: [],
      yearLevels: [],
      attendanceRates: [],
      riskLevels: [],
      subjects: [],
      statuses: []
    });
    // Reset search and analytics-linked filters
    setSearchQuery('');
    setAnalyticsFilters({});
    setSelectedSubject('all');
    // Reset pagination and selection
    setPage(1);
    setSelected(new Set());
    // Force analytics component reset
    forceAnalyticsReset();
    // Force re-fetch after state reset
    setTimeout(() => {
      fetchStudentAttendance();
      fetchSubjects();
      // Focus search and scroll to top for context
      try { searchInputRef.current?.focus(); } catch {}
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    }, 0);
    try { toast.success('All filters cleared'); } catch {}
  };

  // Clear only table filters (search + table filters)
  const handleClearTableFilters = () => {
    setFilters({
      departments: [],
      courses: [],
      yearLevels: [],
      attendanceRates: [],
      riskLevels: [],
      subjects: [],
      statuses: []
    });
    setSearchQuery('');
    setPage(1);
    setSelected(new Set());
    setTimeout(() => {
      fetchStudentAttendance();
      fetchSubjects();
    }, 0);
    try { toast.success('Table filters cleared'); } catch {}
  };

  // Clear only analytics filters
  const handleClearAnalyticsFilters = () => {
    setAnalyticsFilters({});
    setSelectedSubject('all');
    setPage(1);
    // Force analytics component reset
    forceAnalyticsReset();
    // Force analytics component to reset by passing empty filters
    setTimeout(() => {
      fetchStudentAttendance();
      fetchSubjects();
    }, 0);
    try { toast.success('Analytics filters cleared'); } catch {}
  };

  // Force analytics reset when filters are cleared
  const [analyticsResetKey, setAnalyticsResetKey] = useState(0);
  const forceAnalyticsReset = () => {
    setAnalyticsResetKey(prev => prev + 1);
  };

  // Legacy function for backward compatibility
  // Use table-only clear for filter chips (don't clear analytics)
  const handleClearFilters = handleClearTableFilters;

  const handleApplyFilters = (newFilters: Record<string, string[]>) => {
    setFilters(newFilters as Filters);
  };

  // Table handlers
  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Fetch expanded row data
  const fetchExpandedRowData = async (studentId: string) => {
    if (expandedRowData[studentId] || loadingExpandedData.has(studentId)) {
      return;
    }

    setLoadingExpandedData(prev => new Set(prev).add(studentId));
    
    try {
      console.log('🔍 Fetching real student details for:', studentId);
      
      // Ensure we pass a numeric student id to the details API
      const numericIdRegex = /^\d+$/;
      let detailsId: string = studentId;
      if (!numericIdRegex.test(detailsId)) {
        const current = students.find(s => s.studentId === studentId);
        const fallback = (current?.studentIdNum || '').match(/\d+/)?.[0] || '';
        if (fallback && numericIdRegex.test(fallback)) {
          detailsId = fallback;
        } else {
          // No valid numeric id available; show friendly message and stop
          console.warn('⚠️ No numeric student ID available for details fetch.', { studentId, studentIdNum: current?.studentIdNum });
          toast.info('Student details unavailable for this ID');
          return;
        }
      }
      
      const response = await fetch(`/api/students/${encodeURIComponent(detailsId)}/details`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout for details
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific HTTP status codes
        if (response.status === 404) {
          throw new Error('Student details not found');
        } else if (response.status === 500) {
          throw new Error('Server error while fetching student details');
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Fetched real student details:', data);
      
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received');
      }
      
      setExpandedRowData(prev => ({
        ...prev,
        [studentId]: {
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
          weeklyPerformance: data.weeklyPerformance && typeof data.weeklyPerformance === 'object' 
            ? data.weeklyPerformance 
            : {
                presentDays: 0,
                lateDays: 0,
                absentDays: 0,
                totalDays: 0,
                onTimeRate: 0,
                currentStreak: 0
              }
        }
      }));
    } catch (error) {
      console.error('❌ Error fetching expanded row data:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to load student details';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Show user-friendly error message only for non-network errors
      if (!errorMessage.includes('Network error') && !errorMessage.includes('Request timed out')) {
        toast.error(`Unable to load details for student: ${errorMessage}`);
      }
      
      // Fallback to basic data if API fails
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        setExpandedRowData(prev => ({
          ...prev,
          [studentId]: {
            recentActivity: [],
            weeklyPerformance: {
              presentDays: 0,
              lateDays: 0,
              absentDays: 0,
              totalDays: 0,
              onTimeRate: 0,
              currentStreak: 0
            }
          }
        }));
      }
    } finally {
      setLoadingExpandedData(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleToggleExpand = (studentId: string) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
        // Fetch data when expanding
        fetchExpandedRowData(studentId);
      }
      return newSet;
    });
  };

  const handleSelectRow = (studentId: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === paginatedStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedStudents.map(s => s.studentId)));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Refetch occurs via dependency in fetchStudentAttendance
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleRefresh = async () => {
    try {
      console.log('Refreshing student attendance data...');
      // Clear any existing error state
      setError(null);
      // Set loading state to show refresh is happening
      setLoading(true);
      // Clear current data to show fresh loading state
      setStudents([]);
      
      // Fetch fresh data without search parameters
      const response = await fetch('/api/attendance/students');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle case where API returns an error object
      if (data.error) {
        throw new Error(data.details || data.error);
      }
      
      console.log('Refresh successful, received data:', data);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error during refresh:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during refresh');
    } finally {
      setLoading(false);
    }
  };

  // Handle archive of student (soft delete with ARCHIVED status)
  const handleArchiveStudent = async (studentId: string, reason: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/students/${studentId}/soft-delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason,
          deletedAt: new Date().toISOString(),
          action: 'archive'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the student in the local state to reflect the archive
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.studentId === studentId 
              ? { ...student, status: 'ARCHIVED' as const, deletedAt: new Date().toISOString() }
              : student
          )
        );
        
        // Close the modal
        setShowDeleteConfirmModal(false);
        setSelectedStudentForDelete(null);
        
        // Show success message
        toast.success('Student has been successfully archived');
      } else {
        throw new Error(result.error || 'Failed to archive student');
      }
    } catch (error) {
      console.error('Error archiving student:', error);
      toast.error(`Failed to archive student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle deactivation of student (soft delete with INACTIVE status)
  const handleDeactivateStudent = async (studentId: string, reason: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/students/${studentId}/soft-delete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason,
          deletedAt: new Date().toISOString(),
          action: 'deactivate'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the student in the local state to reflect the deactivation
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.studentId === studentId 
              ? { ...student, status: 'INACTIVE' as const, deletedAt: new Date().toISOString() }
              : student
          )
        );
        
        // Close the modal
        setShowDeleteConfirmModal(false);
        setSelectedStudentForDelete(null);
        
        // Show success message
        toast.success('Student has been successfully deactivated');
      } else {
        throw new Error(result.error || 'Failed to deactivate student');
      }
    } catch (error) {
      console.error('Error deactivating student:', error);
      toast.error(`Failed to deactivate student: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle export with format and options
  // Build a unified snapshot of current filters + time range
  const buildAnalyticsSnapshot = () => {
    return {
      timeRange: { 
        preset: 'year' as const
      },
      // Table filters (department is a human-readable string here)
      tableFilters: { ...filters },
    };
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel', options: { includeFilters: boolean; includeSummary: boolean; includeTable?: boolean; selectedColumns?: string[] }) => {
    try {
      setExportLoading(true);
      setExportStage('collecting');
      console.log('Exporting data:', { format, options });
      
      // Helper: fetch all students matching current analytics filters (ignores local table page)
      const fetchAllStudentsForExport = async (): Promise<StudentAttendance[]> => {
        try {
          const params = new URLSearchParams();
          params.append('page', '1');
          params.append('pageSize', '100'); // start small to get total
          if (analyticsFilters.departmentId) params.append('departmentId', analyticsFilters.departmentId);
          if (analyticsFilters.courseId) params.append('courseId', analyticsFilters.courseId);
          if (analyticsFilters.sectionId) params.append('sectionId', analyticsFilters.sectionId);
          if (analyticsFilters.yearLevel) params.append('yearLevel', analyticsFilters.yearLevel);
          if (analyticsFilters.subjectId) params.append('subjectId', analyticsFilters.subjectId);
          if (analyticsFilters.startDate) params.append('startDate', analyticsFilters.startDate);
          if (analyticsFilters.endDate) params.append('endDate', analyticsFilters.endDate);

          const headRes = await fetch(`/api/attendance/students?${params.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
          const headJson = await headRes.json().catch(() => ({}));
          const total = typeof headJson?.total === 'number' ? headJson.total : Array.isArray(headJson) ? headJson.length : 0;
          const pageSizeForExport = 1000; // reasonable chunk
          const totalPages = Math.max(1, Math.ceil(total / pageSizeForExport));

          const allItems: StudentAttendance[] = [] as any;
          for (let p = 1; p <= totalPages; p++) {
            const loopParams = new URLSearchParams(params);
            loopParams.set('page', String(p));
            loopParams.set('pageSize', String(pageSizeForExport));
            const res = await fetch(`/api/attendance/students?${loopParams.toString()}`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
            if (!res.ok) break;
            const json = await res.json().catch(() => ({}));
            const items: StudentAttendance[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
            allItems.push(...items);
          }
          return allItems;
        } catch (e) {
          console.warn('Falling back to current page data for export due to fetch error', e);
          return students;
        }
      };

      // Use full dataset for export (not just current page)
      const allStudents = await fetchAllStudentsForExport();

      const transformForExport = (list: StudentAttendance[]) => {
        const baseTransform = (student: StudentAttendance) => ({
          id: student.studentId,
          name: student.studentName,
          department: student.department,
          courseCode: (student as any).courseCode ?? (student as any).course,
          yearLevel: student.yearLevel,
          totalClasses: (student as any).totalScheduledClasses,
          attendedClasses: (student as any).attendedClasses,
          absentClasses: (student as any).absentClasses,
          lateClasses: (student as any).lateClasses,
          attendanceRate: (student as any).attendanceRate,
          riskLevel: (student as any).riskLevel ?? 'NONE',
          status: (student as any).status ?? 'ACTIVE',
          studentNumber: (student as any).studentIdNum
>>>>>>> a29f51f (Cleanup devcontainer script and update calendar)
        });

        console.log('Fetching attendance records with params:', queryParams.toString());
        const response = await fetch(`/api/attendance/students?${queryParams}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch attendance records');
        }

        console.log('Attendance records received:', data);
        setAttendanceRecords(data);
      } catch (err) {
        console.error('Error fetching attendance records:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching attendance records');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, [filters]);

  // Calculate insights
  const totalSessions = attendanceRecords.length;
  const totalPresent = attendanceRecords.filter(r => r.status === 'PRESENT').length;
  const totalLate = attendanceRecords.filter(r => r.status === 'LATE').length;
  const totalAbsent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
  const attendanceRate = totalSessions > 0 ? ((totalPresent + totalLate) / totalSessions) * 100 : 0;
  const classAverage = attendanceRate;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-2xl mb-4">⚠️</div>
          <p className="text-red-500 text-lg mb-2">Error Loading Attendance Records</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Attendance</h1>
        <div className="flex space-x-2">
          <ExportButton records={attendanceRecords} />
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
            <Printer className="h-5 w-5" />
            <span>Print</span>
          </button>
=======
    <TooltipProvider>
      <div className="min-h-screen w-full overflow-x-hidden">
        <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-4 sm:space-y-6">

        {/* Main Navigation Header Card */}
        <PageHeader
          title="Student Attendance Management"
          subtitle="Monitor and manage student attendance records with real-time insights and comprehensive analytics"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Attendance Management', href: '/attendance' },
            { label: 'Students' }
          ]}
        />

        {/* Quick Actions Panel - moved directly after Page Header */}
        <div className="w-full pt-2 sm:pt-3 overflow-x-hidden">
          <QuickActionsPanel
            variant="premium"
            title="Quick Actions"
            subtitle="Essential tools and shortcuts"
            icon={
              <div className="w-6 h-6 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            }
            actionCards={[
              {
                id: 'mark-attendance',
                label: 'Manual Attendance',
                description: 'Manually record attendance',
                icon: <CheckCircle className="w-5 h-5 text-white" />,
                onClick: () => setShowManualAttendance(true)
              },
              {
                id: 'export-attendance',
                label: 'Export Report',
                description: 'Download attendance report',
                icon: <Download className="w-5 h-5 text-white" />,
                disabled: !transformedStudentsData || transformedStudentsData.length === 0,
                onClick: () => setShowExportDialog(true)
              },
              {
                id: 'refresh-data',
                label: 'Refresh Data',
                description: 'Reload attendance data',
                icon: loading ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-white" />
                ),
                onClick: handleRefresh,
                disabled: loading,
                loading: loading
              },
              {
                id: 'schedule-management',
                label: 'Manage Schedules',
                description: 'View student schedules',
                icon: <Clock className="w-5 h-5 text-white" />,
                onClick: () => {
                  window.location.href = '/list/schedules';
                }
              },
              {
                id: 'assign-section',
                label: 'Assign to Section',
                description: 'Enroll a student in a section',
                icon: <Plus className="w-5 h-5 text-white" />,
                onClick: () => setAssignSectionOpen(true)
              },
              {
                id: 'add-class',
                label: 'Add Class',
                description: 'Add a specific class to a student',
                icon: <Calendar className="w-5 h-5 text-white" />,
                onClick: () => setAddClassOpen(true)
              }
            ]}
            lastActionTime="2 minutes ago"
            onLastActionTimeChange={() => {}}
            collapsible={true}
            defaultCollapsed={true}
            onCollapseChange={(collapsed) => {
              console.log('Quick Actions Panel collapsed:', collapsed);
            }}
          />
        </div>

        {/* Student Attendance Management - Main Content */}
          
          {/* Analytics Dashboard */}
          <Card className="border border-blue-200 shadow-lg rounded-xl overflow-hidden p-0 w-full">
              <AttendanceAnalytics 
                key={`analytics-${analyticsResetKey}`}
                data={transformedStudentsData}
                loading={analyticsLoading}
                type="student"
                enableAdvancedFeatures={true}
                enableRealTime={false}

                enableDrillDown={true}
                enableTimeRange={true}
                showHeader={true}
                showSecondaryFilters={true}
                selectedSubject={selectedSubject}
                onSubjectChange={setSelectedSubject}
                subjects={subjects.map(subject => {
                  return { id: subject.subjectId.toString(), name: subject.subjectCode };
                })}
                onFiltersChange={handleAnalyticsFiltersChange}
                onClearAnalytics={handleClearAnalyticsFilters}
                onApplyFilters={applyAnalyticsFilters}

                onDrillDown={(filter: { type: string; value: string }) => {
                  // Handle drill down logic
                }}
                onExport={async (format: 'pdf' | 'csv' | 'excel', options?: { includeFilters: boolean; includeSummary: boolean; includeTable?: boolean; selectedColumns?: string[] }) => {
                  try {
                    setExportLoading(true);
                    console.log('Exporting analytics data:', format);
                    
                    // Validate data before export
                    if (!transformedStudentsData || transformedStudentsData.length === 0) {
                      throw new Error('No data available for export. Please ensure students are loaded.');
                    }
                    
                    // Prepare export data
                    const defaultSelectedColumns = ['studentName','studentId','department','yearLevel','riskLevel','date','timeIn','timeOut','status','subject','room'] as const;
                    const buildRowsFromAnalytics = (rows: typeof transformedStudentsData) => {
                      return rows.map(r => ({
                        studentName: r.name,
                        studentId: (r as any).studentNumber || r.id,
                        department: r.department,
                        yearLevel: (r as any).yearLevel ? String((r as any).yearLevel).toUpperCase() : '',
                        riskLevel: (r as any).riskLevel ? String((r as any).riskLevel).toUpperCase() : 'NONE',
                        date: new Date().toLocaleDateString(),
                        timeIn: 'N/A',
                        timeOut: 'N/A',
                        status: ((r as any).status ? String((r as any).status).toUpperCase() : 'ACTIVE'),
                        subject: Array.isArray(r.subjects) && r.subjects.length > 0 ? r.subjects[0] : 'N/A',
                        room: 'N/A'
                      }));
                    };
                    const exportRows = (format === 'pdf') ? transformedStudentsData : buildRowsFromAnalytics(transformedStudentsData);
                    const exportData = {
                      type: 'student' as const,
                      data: exportRows,
                      filters: {
                        department: filters.departments.length > 0 ? filters.departments.join(', ') : 'All',
                        course: filters.courses.length > 0 ? filters.courses.join(', ') : 'All',
                        yearLevel: filters.yearLevels.length > 0 ? filters.yearLevels.join(', ') : 'All',
                        attendanceRate: filters.attendanceRates.length > 0 ? filters.attendanceRates.join(', ') : 'All',
                        riskLevel: filters.riskLevels.length > 0 ? filters.riskLevels.join(', ') : 'All',
                        subject: filters.subjects.length > 0 ? filters.subjects.join(', ') : 'All',
                        status: filters.statuses.length > 0 ? filters.statuses.join(', ') : 'All'
                      },
                      timeRange: {
                        start: new Date('2025-04-01'),
                        end: new Date('2025-06-30'),
                        preset: 'semester'
                      }
                    };

                    // Capture chart elements for export with better selectors
                    const chartElements = {
                      attendanceTrend: document.querySelector('[data-chart="attendance-trend"] .recharts-wrapper, .recharts-wrapper[data-chart="attendance-trend"]') as HTMLElement,
                      departmentStats: document.querySelector('[data-chart="department-stats"] .recharts-wrapper, .recharts-wrapper[data-chart="department-stats"]') as HTMLElement,
                      riskLevelChart: document.querySelector('[data-chart="risk-level"] .recharts-wrapper, .recharts-wrapper[data-chart="risk-level"]') as HTMLElement,
                      lateArrivalChart: document.querySelector('[data-chart="late-arrival"] .recharts-wrapper, .recharts-wrapper[data-chart="late-arrival"]') as HTMLElement,
                    };

                    // Fallback to generic selectors if specific ones not found
                    if (!chartElements.attendanceTrend) {
                      chartElements.attendanceTrend = document.querySelector('.recharts-wrapper') as HTMLElement;
                    }
                    if (!chartElements.departmentStats) {
                      chartElements.departmentStats = document.querySelectorAll('.recharts-wrapper')[1] as HTMLElement;
                    }
                    if (!chartElements.riskLevelChart) {
                      chartElements.riskLevelChart = document.querySelectorAll('.recharts-wrapper')[2] as HTMLElement;
                    }
                    if (!chartElements.lateArrivalChart) {
                      chartElements.lateArrivalChart = document.querySelectorAll('.recharts-wrapper')[3] as HTMLElement;
                    }

                    // Charts and visualizations export functionality removed

                    const options = {
                      format,
                      filename: `student-attendance-analytics-${new Date().toISOString().split('T')[0]}`,
                      includeCharts: false, // Charts export disabled
                      includeFilters: true,
                      // Align columns with dialog defaults for quick export (non-PDF)
                      selectedColumns: format === 'pdf' ? undefined : [...defaultSelectedColumns],
                      // Ensure tabular data is included for Excel/CSV
                      includeTable: format !== 'pdf'
                    };

                    // Charts export functionality removed
                    await ExportService.exportAnalytics(exportData, options);
                    
                    // Show success toast
                    toast.success(`${format.toUpperCase()} export completed successfully!`);
                  } catch (error) {
                    console.error('Export failed:', error);
                    // Show error toast
                    toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setExportLoading(false);
                  }
                }}
                onRefresh={handleRefresh}
              />
          </Card>

          
          <Card className="border border-blue-200 shadow-lg rounded-xl overflow-hidden p-0 w-full">
            <CardHeader className="p-0">
              {/* Enhanced Blue Gradient Header - matching dialog styling */}
              <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 p-0">
                <div className="w-full px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                      </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">Student Attendance Records</h3>
                      <p className="text-blue-100 text-sm">Search, filter and manage student attendance records with comprehensive analytics</p>
                      </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                            onClick={handleRefresh}
                            disabled={loading}
                            aria-label="Refresh data"
                          >
                            {loading ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-5 h-5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>Refresh data</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Enhanced Search and Filter Section */}
              <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row gap-3 items-end justify-end">
                  {/* Search Bar */}
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, ID, email, phone, RFID, course, department, guardian, section, or subject..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      ref={searchInputRef}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    />
                  </div>

                  {/* Quick Filter Dropdowns */}
                  <div className="flex flex-wrap gap-3 justify-end">
                    
                    <Select value={filters.statuses[0] || 'all'} onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ ...filters, statuses: [] });
                      } else {
                        setFilters({ ...filters, statuses: [value] });
                      }
                    }}>
                      <SelectTrigger className="w-full lg:w-32 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>

                      </SelectContent>
                    </Select>
                    
                    <Select value={filters.attendanceRates[0] || 'all'} onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ ...filters, attendanceRates: [] });
                      } else {
                        setFilters({ ...filters, attendanceRates: [value] });
                      }
                    }}>
                      <SelectTrigger className="w-full lg:w-36 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                        <SelectValue placeholder="Attendance" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">All Rates</SelectItem>
                        <SelectItem value="High (≥90%)">High (≥90%)</SelectItem>
                        <SelectItem value="Medium (75-89%)">Medium (75-89%)</SelectItem>
                        <SelectItem value="Low (<75%)">Low (&lt;75%)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filters.riskLevels[0] || 'all'} onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters({ ...filters, riskLevels: [] });
                      } else {
                        setFilters({ ...filters, riskLevels: [value] });
                      }
                    }}>
                      <SelectTrigger className="w-full lg:w-32 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                        <SelectValue placeholder="Risk Level" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips - only show table filters, not analytics filters */}
              {(Object.values(filters).some(arr => arr.length > 0) || searchQuery) && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200 mx-3 sm:mx-4 lg:mx-6 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-blue-900">Active Filters:</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-700">
                      <span>{filteredStudents.length} of {students.length} students</span>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                        className={`text-xs px-2 py-1 rounded border ${hasActiveFilters ? 'border-blue-300 text-blue-700 hover:bg-blue-100' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
                        aria-disabled={!hasActiveFilters}
                        title={hasActiveFilters ? 'Clear all filters' : 'No active filters'}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                  <FilterChips
                    filters={filters}
                    fields={[
                      { key: 'departments', label: 'Department', allowIndividualRemoval: true },
                      { key: 'courses', label: 'Course', allowIndividualRemoval: true },
                      { key: 'yearLevels', label: 'Year Level', allowIndividualRemoval: true },
                      { key: 'attendanceRates', label: 'Attendance Rate', allowIndividualRemoval: true },
                      { key: 'riskLevels', label: 'Risk Level', combineValues: true, allowIndividualRemoval: true },
                      { key: 'subjects', label: 'Subject', allowIndividualRemoval: true },
                      { key: 'statuses', label: 'Status', allowIndividualRemoval: true }
                    ]}
                    onRemove={(key, value) => {
                      if (value) {
                        // Remove individual value
                        const currentValues = filters[key] as string[];
                        const newValues = currentValues.filter(v => v !== value);
                        setFilters({ ...filters, [key]: newValues });
                      } else {
                        // Remove entire filter
                        setFilters({ ...filters, [key]: [] });
                      }
                    }}
                    onClearAll={handleClearFilters}
                    searchQuery={searchQuery}
                    onRemoveSearch={() => setSearchQuery('')}
                    showSearchChip={true}
                  />
                </div>
              )}

              {/* Bulk Actions Bar */}
              {selected.size > 0 && (
                <BulkActionsBar
                  selectedCount={selected.size}
                  onClear={() => setSelected(new Set())}
                  entityLabel="student"
                  actions={[
                    {
                      key: 'export',
                      label: 'Export Selected',
                      icon: <Download className="w-4 h-4 mr-2" />,
                      onClick: async () => {
                        try {
                          setExportLoading(true);
                          
                          // Get selected students from the actual students array
                          const selectedStudentIds = Array.from(selected);
                          const selectedStudents = students.filter(student => 
                            selectedStudentIds.includes(student.studentId)
                          );
                          
                          if (selectedStudents.length === 0) {
                            toast.error('No students selected for export');
                            return;
                          }

                          // Transform selected students for export
                          const exportRows = selectedStudents.map(student => ({
                            studentName: student.studentName,
                            studentId: student.studentIdNum,
                            department: student.department,
                            course: student.course,
                            courseCode: student.courseCode || '',
                            yearLevel: student.yearLevel.replace('_', ' '),
                            attendanceRate: `${student.attendanceRate}%`,
                            riskLevel: student.riskLevel || 'NONE',
                            status: student.status,
                            totalClasses: student.totalScheduledClasses,
                            attendedClasses: student.attendedClasses,
                            absentClasses: student.absentClasses,
                            lateClasses: student.lateClasses,
                            email: student.email || '',
                            phoneNumber: student.phoneNumber || '',
                            rfidTag: student.rfidTag || ''
                          }));

                          // Build analytics summary for selected students
                          const totalSelected = selectedStudents.length;
                          const totalClasses = selectedStudents.reduce((sum, s) => sum + s.totalScheduledClasses, 0);
                          const totalAttended = selectedStudents.reduce((sum, s) => sum + s.attendedClasses, 0);
                          const totalAbsent = selectedStudents.reduce((sum, s) => sum + s.absentClasses, 0);
                          const totalLate = selectedStudents.reduce((sum, s) => sum + s.lateClasses, 0);
                          const avgAttendanceRate = totalSelected > 0 
                            ? selectedStudents.reduce((sum, s) => sum + s.attendanceRate, 0) / totalSelected 
                            : 0;

                          const exportData = {
                            type: 'student' as const,
                            data: exportRows,
                            analytics: {
                              summary: {
                                totalStudents: totalSelected,
                                attendanceRate: avgAttendanceRate,
                                presentCount: totalAttended,
                                lateCount: totalLate,
                                absentCount: totalAbsent,
                                excusedCount: 0
                              }
                            },
                            tableView: exportRows,
                            filtersSnapshot: {
                              selection: `Selected ${selected.size} students`,
                              department: filters.departments.length > 0 ? filters.departments.join(', ') : 'All',
                              course: filters.courses.length > 0 ? filters.courses.join(', ') : 'All',
                              yearLevel: filters.yearLevels.length > 0 ? filters.yearLevels.join(', ') : 'All',
                              attendanceRate: filters.attendanceRates.length > 0 ? filters.attendanceRates.join(', ') : 'All',
                              riskLevel: filters.riskLevels.length > 0 ? filters.riskLevels.join(', ') : 'All',
                              subject: filters.subjects.length > 0 ? filters.subjects.join(', ') : 'All',
                              status: filters.statuses.length > 0 ? filters.statuses.join(', ') : 'All',
                              generatedAt: new Date().toISOString()
                            },
                            timeRange: {
                              start: new Date('2025-04-01'),
                              end: new Date('2025-06-30'),
                              preset: 'semester' as const
                            }
                          };

                          const options = {
                            format: 'excel' as const,
                            filename: `selected-students-${new Date().toISOString().split('T')[0]}`,
                            includeCharts: false,
                            includeFilters: true,
                            includeSummary: true,
                            includeTable: true,
                            selectedColumns: ['studentName', 'studentId', 'department', 'course', 'courseCode', 'yearLevel', 'attendanceRate', 'riskLevel', 'status', 'totalClasses', 'attendedClasses', 'absentClasses', 'lateClasses', 'email', 'phoneNumber', 'rfidTag']
                          };

                          await ExportService.exportAnalytics(exportData, options);
                          toast.success(`Successfully exported ${selectedStudents.length} selected student(s)!`);
                        } catch (error) {
                          console.error('Export failed:', error);
                          toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        } finally {
                          setExportLoading(false);
                        }
                      }
                    },
                    {
                      key: 'update',
                      label: 'Update Status',
                      icon: <Settings className="w-4 h-4 mr-2" />,
                      onClick: () => setShowBulkStatusUpdate(true)
                    }
                  ]}
                />
              )}

              {/* Content Section */}
              {loading && !hasFetchedOnce ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Attendance Records</h3>
                    <p className="text-sm text-gray-600">Fetching student data...</p>
                  </div>
                </div>
              ) : (
                <>
              {/* Desktop table layout */}
              <div className="hidden lg:block">
                <div className="px-3 sm:px-4 lg:px-6 pt-4 pb-3">
                  <div className="overflow-x-auto bg-white/70 shadow-none relative w-full">
                    <TableList
                      columns={studentColumns}
                      data={paginatedStudents}
                          loading={loading && hasFetchedOnce}
                      emptyMessage={
                        <EmptyState
                          icon={<Users className="w-8 h-8" />}
                          title="No students found"
                          description="Try adjusting your search criteria or filters to find the students you're looking for."
                          action={
                            <Button type="button" onClick={handleClearFilters} className="bg-blue-600 hover:bg-blue-700 rounded">
                              Clear Filters
                            </Button>
                          }
                        />
                      }
                      selectedIds={Array.from(selected)}
                      onSelectRow={handleSelectRow}
                      onSelectAll={handleSelectAll}
                      isAllSelected={selected.size === paginatedStudents.length && paginatedStudents.length > 0}
                      isIndeterminate={selected.size > 0 && selected.size < paginatedStudents.length}
                      getItemId={(student) => student.studentId}
                      expandedRowIds={Array.from(expandedRowIds)}
                      onToggleExpand={handleToggleExpand}
                      sortState={sortBy}
                      onSort={handleSort}
                      className="border-0 shadow-none w-full min-w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile card layout */}
              <div className="block lg:hidden w-full">
                <div className="px-3 sm:px-4 pt-3 pb-3">
                      {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <EmptyState
                        icon={<Users className="w-6 h-6 text-blue-400" />}
                        title="No students found"
                        description="Try adjusting your search criteria or filters to find the students you're looking for."
                        action={
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                              onClick={handleRefresh}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh Data
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <TableCardView
                      items={paginatedStudents}
                      selectedIds={Array.from(selected)}
                      onSelect={handleSelectRow}
                      onView={(item) => handleStudentClick(item)}
                      onEdit={(item) => {
                        setSelectedStudentForEdit(item);
                        setShowEditStudentModal(true);
                      }}
                      onDelete={(item) => {
                        setSelectedStudentForDelete(item);
                        setShowDeleteConfirmModal(true);
                      }}
                      getItemId={(item) => item.studentId}
                      getItemName={(item) => item.studentName}
                      getItemCode={(item) => item.studentIdNum}
                      getItemStatus={(item) => item.status === 'ACTIVE' ? 'active' : 'inactive'}
                      getItemDescription={(item) => item.department}
                      getItemDetails={(item) => [
                        { label: 'Department', value: item.department },
                        { label: 'Course Code', value: item.courseCode },
                        { label: 'Year Level', value: item.yearLevel.replace('_', ' ') },
                        { label: 'Attendance', value: `${item.attendanceRate}%` },
                        { label: 'Risk Level', value: item.riskLevel || 'None' },
                      ]}
                      disabled={(item) => false}
                      deleteTooltip={(item) => item.status === "INACTIVE" ? "Student is already inactive" : undefined}
                          isLoading={loading && hasFetchedOnce}
                    />
                  )}
                </div>
              </div>
              
              {/* Pagination */}
              <TablePagination
                page={page}
                    totalItems={totalFilteredCount || filteredStudents.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                    pageSizeOptions={[10, 20, 50, 100]}
              />
                </>
              )}
            </CardContent>
          </Card>
>>>>>>> a29f51f (Cleanup devcontainer script and update calendar)
        </div>
      </div>
      
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        students={filterOptions.students}
        courses={filterOptions.courses}
        yearLevels={Array.from(new Set(filterOptions.students.map(s => s.yearLevel)))}
        sections={filterOptions.sections}
        subjects={filterOptions.subjects}
        filters={filters}
        setFilters={setFilters}
      />

      <InsightsSection
        totalSessions={totalSessions}
        totalPresent={totalPresent}
        totalLate={totalLate}
        totalAbsent={totalAbsent}
        attendanceRate={attendanceRate}
        classAverage={classAverage}
      />

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <AttendanceTable records={attendanceRecords} />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
