'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, TrendingUp, Users, Clock, AlertCircle, Filter, ChevronDown, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@radix-ui/react-dropdown-menu";

interface InstructorAttendance {
  id: string;
  instructorName: string;
  instructorId: string;
  department: string;
  specialization: string;
  subjects: string[];
  classes: number;
  presentClasses: number;
  absentClasses: number;
  lateClasses: number;
  totalClasses: number;
  attendanceRate: number;
  lastAttendance: string;
  avatarUrl?: string;
}

interface Filters {
  department: string;
  subject: string;
  attendanceRate: string;
}

interface DateRange {
  start: string;
  end: string;
}

// Mock Data
const mockInstructors: InstructorAttendance[] = [
  {
    id: '1',
    instructorName: 'Dr. Sarah Johnson',
    instructorId: 'INS-2024-001',
    department: 'Computer Science',
    specialization: 'Software Engineering',
    subjects: ['Web Development', 'Database Systems'],
    classes: 45,
    presentClasses: 42,
    absentClasses: 1,
    lateClasses: 2,
    totalClasses: 45,
    attendanceRate: 93.3,
    lastAttendance: new Date().toISOString(),
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    id: '2',
    instructorName: 'Prof. Michael Chen',
    instructorId: 'INS-2024-002',
    department: 'Information Technology',
    specialization: 'Network Security',
    subjects: ['Network Security', 'Cybersecurity'],
    classes: 40,
    presentClasses: 38,
    absentClasses: 0,
    lateClasses: 2,
    totalClasses: 40,
    attendanceRate: 95.0,
    lastAttendance: new Date().toISOString(),
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael'
  }
];

// Components
const SearchBar = ({
  searchQuery,
  setSearchQuery,
  departments,
  subjects,
  filters,
  setFilters
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  departments: string[];
  subjects: string[];
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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-gray-50">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
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
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Rate</label>
                <select
                  value={filters.attendanceRate}
                  onChange={(e) => setFilters({ ...filters, attendanceRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Rates</option>
                  <option value="high">High (≥90%)</option>
                  <option value="medium">Medium (75-89%)</option>
                  <option value="low">Low (&lt;75%)</option>
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
  totalInstructors,
  averageAttendanceRate,
  totalLate,
  totalAbsent,
  getAttendanceRateColor
}: {
  totalInstructors: number;
  averageAttendanceRate: number;
  totalLate: number;
  totalAbsent: number;
  getAttendanceRateColor: (rate: number) => string;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Instructors</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalInstructors}</div>
          <p className="text-xs text-gray-500 mt-1">Active instructors in selected period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Average Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageAttendanceRate.toFixed(1)}%</div>
          <p className="text-xs text-gray-500 mt-1">Overall attendance performance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLate}</div>
          <p className="text-xs text-gray-500 mt-1">Classes with late arrivals</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Absences</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAbsent}</div>
          <p className="text-xs text-gray-500 mt-1">Classes missed</p>
        </CardContent>
      </Card>
    </div>
  );
};

const AttendanceDistribution = ({
  totalPresent,
  totalLate,
  totalAbsent
}: {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}) => {
  const total = totalPresent + totalLate + totalAbsent;
  const presentPercentage = (totalPresent / total) * 100;
  const latePercentage = (totalLate / total) * 100;
  const absentPercentage = (totalAbsent / total) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Attendance Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Present</span>
              <span className="text-sm font-medium">{presentPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${presentPercentage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Late</span>
              <span className="text-sm font-medium">{latePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${latePercentage}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Absent</span>
              <span className="text-sm font-medium">{absentPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${absentPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ReportList = ({
  filteredInstructors,
  getAttendanceRateColor
}: {
  filteredInstructors: InstructorAttendance[];
  getAttendanceRateColor: (rate: number) => string;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Report</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {filteredInstructors.map((instructor) => (
              <div
                key={instructor.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={instructor.avatarUrl} />
                    <AvatarFallback>{instructor.instructorName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{instructor.instructorName}</h3>
                    <p className="text-sm text-gray-500">ID: {instructor.instructorId}</p>
                    <div className="flex space-x-2 mt-1">
                      <Badge variant="outline">{instructor.department}</Badge>
                      <Badge variant="outline">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {instructor.subjects.length} Subjects
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Attendance Rate:</span>
                    <span className={`font-bold ${getAttendanceRateColor(instructor.attendanceRate)}`}>
                      {instructor.attendanceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex space-x-4 mt-2 text-sm text-gray-500">
                    <span>Present: {instructor.presentClasses}</span>
                    <span>Late: {instructor.lateClasses}</span>
                    <span>Absent: {instructor.absentClasses}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default function InstructorAttendancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState<Filters>({
    department: '',
    subject: '',
    attendanceRate: ''
  });

  // Extract unique values for filters
  const departments = Array.from(new Set(mockInstructors.map(instructor => instructor.department)));
  const subjects = Array.from(new Set(mockInstructors.flatMap(instructor => instructor.subjects)));

  // Filter instructors based on search query and filters
  const filteredInstructors = mockInstructors.filter(instructor => {
    const matchesSearch = instructor.instructorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.instructorId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = !filters.department || instructor.department === filters.department;
    const matchesSubject = !filters.subject || instructor.subjects.includes(filters.subject);
    
    let matchesAttendanceRate = true;
    if (filters.attendanceRate) {
      switch (filters.attendanceRate) {
        case 'high':
          matchesAttendanceRate = instructor.attendanceRate >= 90;
          break;
        case 'medium':
          matchesAttendanceRate = instructor.attendanceRate >= 75 && instructor.attendanceRate < 90;
          break;
        case 'low':
          matchesAttendanceRate = instructor.attendanceRate < 75;
          break;
      }
    }

    return matchesSearch && matchesDepartment && matchesSubject && matchesAttendanceRate;
  });

  // Calculate statistics
  const totalInstructors = filteredInstructors.length;
  const averageAttendanceRate = filteredInstructors.reduce((acc, instructor) => acc + instructor.attendanceRate, 0) / totalInstructors || 0;
  const totalLate = filteredInstructors.reduce((acc, instructor) => acc + instructor.lateClasses, 0);
  const totalAbsent = filteredInstructors.reduce((acc, instructor) => acc + instructor.absentClasses, 0);
  const totalPresent = filteredInstructors.reduce((acc, instructor) => acc + instructor.presentClasses, 0);

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Instructor Attendance Reports</h1>
      
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        departments={departments}
        subjects={subjects}
        filters={filters}
        setFilters={setFilters}
      />

      <InsightsSection
        totalInstructors={totalInstructors}
        averageAttendanceRate={averageAttendanceRate}
        totalLate={totalLate}
        totalAbsent={totalAbsent}
        getAttendanceRateColor={getAttendanceRateColor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportList
            filteredInstructors={filteredInstructors}
            getAttendanceRateColor={getAttendanceRateColor}
          />
        </div>
        <div>
          <AttendanceDistribution
            totalPresent={totalPresent}
            totalLate={totalLate}
            totalAbsent={totalAbsent}
          />
        </div>
      </div>
    </div>
  );
} 