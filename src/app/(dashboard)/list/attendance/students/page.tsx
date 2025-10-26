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

  // Fetch attendance records
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          ...(filters.student && { studentId: filters.student }),
          ...(filters.course && { courseId: filters.course }),
          ...(filters.section && { sectionId: filters.section }),
          ...(filters.dateRange.from && { startDate: filters.dateRange.from }),
          ...(filters.dateRange.to && { endDate: filters.dateRange.to }),
          ...(filters.status && { status: filters.status }),
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Attendance</h1>
        <div className="flex space-x-2">
          <ExportButton records={attendanceRecords} />
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
            <Printer className="h-5 w-5" />
            <span>Print</span>
          </button>
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
