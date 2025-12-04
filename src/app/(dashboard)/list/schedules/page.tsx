"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, Plus, Download, Upload, Edit, Trash2, AlertTriangle, Clock, Users, MapPin, CheckCircle, XCircle, Search, RefreshCw, Printer, Columns3, List, Settings, Bell, Building2, RotateCcw, Eye, Pencil, BookOpen, GraduationCap, BadgeInfo, X, ChevronRight, Hash, Tag, Layers, Info, UserCheck as UserCheckIcon, Archive, Filter } from "lucide-react";
import Fuse from "fuse.js";
import { useDebounce } from '@/hooks/use-debounce';
import { safeHighlight } from "@/lib/sanitizer";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Label } from "../../../../components/ui/label";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Progress } from "../../../../components/ui/progress";
import { toast } from "sonner";
import Table from "@/components/Table";
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { TableList, TableListColumn } from '@/components/reusable/Table/TableList';
import { TablePagination } from '@/components/reusable/Table/TablePagination';
import { ExportDialog } from '@/components/reusable/Dialogs/ExportDialog';
import { ImportDialog } from '@/components/reusable/Dialogs/ImportDialog';
import { VisibleColumnsDialog } from '@/components/reusable/Dialogs/VisibleColumnsDialog';
import { SortDialog } from '@/components/reusable/Dialogs/SortDialog';
import { AddScheduleDialog } from '@/components/reusable/Dialogs/AddScheduleDialog';
import { EditScheduleDialog } from '@/components/reusable/Dialogs/EditScheduleDialog';
import { DeleteScheduleDialog } from '@/components/reusable/Dialogs/DeleteScheduleDialog';
import { BulkEditDialog } from '@/components/reusable/Dialogs/BulkEditDialog';
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';
import { PrintLayout } from '@/components/PrintLayout';

import BulkActions from '../../../../components/BulkActions';
import { ICCT_CLASSES } from '../../../../lib/colors';
import { EmptyState } from '@/components/reusable';
import { Schedule } from '@/types/schedule';
import { FilterChips } from '@/components/FilterChips';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface FuseResult<T> {
  item: T;
  refIndex: number;
  matches?: Array<{
    key: string;
    indices: readonly [number, number][];
  }>;
}

export default function ClassSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedSchedules, setSelectedSchedules] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Add fuzzy search functionality
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Filter options state
  const [filterOptions, setFilterOptions] = useState({
    semesters: [] as string[],
    days: [] as string[],
    instructors: [] as Array<{id: number, name: string, firstName: string, lastName: string}>,
    rooms: [] as Array<{roomNo: string, building: string, floor: string, roomType: string}>,
    subjects: [] as Array<{name: string, code: string, department: string}>,
    sections: [] as string[],
    academicYears: [] as string[],
    scheduleTypes: [] as string[],
    departments: [] as string[],
    buildings: [] as string[],
    floors: [] as string[],
    roomTypes: [] as string[]
  });
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [instructorFilter, setInstructorFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");
  // New filter states
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>("all");
  const [academicYearFilter, setAcademicYearFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>('subject');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // Dialog states
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showVisibleColumnsDialog, setShowVisibleColumnsDialog] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showAddScheduleDialog, setShowAddScheduleDialog] = useState(false);
  const [showEditScheduleDialog, setShowEditScheduleDialog] = useState(false);
  const [showDeleteScheduleDialog, setShowDeleteScheduleDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [scheduleStudents, setScheduleStudents] = useState<{[key: string]: any[]}>({});
  const [loadingStudents, setLoadingStudents] = useState<{[key: string]: boolean}>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'select', 'expander', 'subject', 'section', 'instructor', 'room', 'day', 'time', 'scheduleType', 'status', 'enrollment', 'actions'
  ]);

  // Export columns configuration
  const exportColumns = [
    { id: 'subject', label: 'Subject', default: true },
    { id: 'section', label: 'Section', default: true },
    { id: 'instructor', label: 'Instructor', default: true },
    { id: 'room', label: 'Room', default: true },
    { id: 'day', label: 'Day', default: true },
    { id: 'time', label: 'Time', default: true },
    { id: 'scheduleType', label: 'Type', default: true },
    { id: 'status', label: 'Status', default: true },
    { id: 'enrollment', label: 'Enrollment', default: true },
    { id: 'semester', label: 'Semester', default: false },
    { id: 'academicYear', label: 'Academic Year', default: false },
  ];

  // Sort options for SortDialog
  const sortOptions = [
    { value: 'subject', label: 'Subject' },
    { value: 'section', label: 'Section' },
    { value: 'instructor', label: 'Instructor' },
    { value: 'room', label: 'Room' },
    { value: 'day', label: 'Day' },
    { value: 'time', label: 'Time' },
    { value: 'scheduleType', label: 'Type' },
    { value: 'status', label: 'Status' },
    { value: 'enrollment', label: 'Enrollment' },
  ];

  // Column options for VisibleColumnsDialog
  const columnOptions = [
    { accessor: 'select', header: 'Select', required: true },
    { accessor: 'expander', header: 'Students', description: 'View enrolled students' },
    { accessor: 'subject', header: 'Subject', description: 'Subject name and code' },
    { accessor: 'section', header: 'Section', description: 'Section name' },
    { accessor: 'instructor', header: 'Instructor', description: 'Instructor name and ID' },
    { accessor: 'room', header: 'Room', description: 'Room number and capacity' },
    { accessor: 'day', header: 'Day', description: 'Day of the week' },
    { accessor: 'time', header: 'Time', description: 'Start and end time' },
    { accessor: 'scheduleType', header: 'Type', description: 'Schedule type (Regular, etc.)' },
    { accessor: 'status', header: 'Status', description: 'Active/Inactive status' },
    { accessor: 'enrollment', header: 'Enrollment', description: 'Current enrollment vs max students' },
    { accessor: 'actions', header: 'Actions', required: true },
  ];

  // Enhanced Fuse.js for fuzzy search with weighted fields and better partial matching
  const fuse = useMemo(() => new Fuse(schedules, {
    keys: [
      // High priority fields (weight: 2)
      { name: 'subject.subjectName', weight: 2 },
      { name: 'subject.subjectCode', weight: 2 },
      { name: 'section.sectionName', weight: 2 },
      // Medium priority fields (weight: 1.5)
      { name: 'instructor.firstName', weight: 1.5 },
      { name: 'instructor.lastName', weight: 1.5 },
      { name: 'room.roomNo', weight: 1.5 },
      { name: 'academicYear', weight: 1.5 },
      // Standard priority fields (weight: 1)
      { name: 'day', weight: 1 },
      { name: 'scheduleType', weight: 1 },
      { name: 'status', weight: 1 },
      { name: 'startTime', weight: 1 },
      { name: 'endTime', weight: 1 },
      // Lower priority fields (weight: 0.5)
      { name: 'notes', weight: 0.5 },
      { name: 'semester.semesterName', weight: 0.5 },
    ],
    threshold: 0.2, // Very lenient threshold for better partial matching (e.g., "bsp-sub" matches "BSP-SUB-101")
    includeMatches: true,
    ignoreLocation: true, // Search across entire strings
    minMatchCharLength: 1, // Allow single character matches for better partial matching
    findAllMatches: true, // Find all matches, not just the first
    shouldSort: true, // Sort results by relevance
    distance: 100, // Maximum distance for matching (higher = more lenient)
  }), [schedules]);

  // Fuzzy search results with normalized search query for better partial matching
  const fuzzyResults = useMemo(() => {
    if (!debouncedSearch) return schedules.map((s: Schedule, i: number) => ({ item: s, refIndex: i }));
    
    // Normalize search query: remove special characters and convert to lowercase for better matching
    // This helps match "bsp-sub" with "BSP-SUB-101" or "BSP_SUB_101"
    const normalizedSearch = debouncedSearch.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    
    // Try both original and normalized search
    const originalResults = fuse.search(debouncedSearch) as FuseResult<Schedule>[];
    const normalizedResults = normalizedSearch !== debouncedSearch.toLowerCase() 
      ? fuse.search(normalizedSearch) as FuseResult<Schedule>[]
      : [];
    
    // Combine and deduplicate results
    const combinedResults = [...originalResults, ...normalizedResults];
    const uniqueResults = combinedResults.filter((result, index, self) =>
      index === self.findIndex(r => r.item.subjectSchedId === result.item.subjectSchedId)
    );
    
    return uniqueResults;
  }, [debouncedSearch, fuse, schedules]);

  // Fetch filter options on component mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [search, page, itemsPerPage, statusFilter, semesterFilter, dayFilter, instructorFilter, roomFilter, scheduleTypeFilter, academicYearFilter, subjectFilter, sectionFilter, departmentFilter, timeRangeFilter, enrollmentFilter, buildingFilter, floorFilter, roomTypeFilter]);

  const fetchFilterOptions = async () => {
    setFilterOptionsLoading(true);
    try {
      console.log('Fetching filter options...');
      const response = await fetch('/api/schedules/filter-options');
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('Filter options fetched successfully:', data.data);
        setFilterOptions(data.data);
      } else {
        console.error('Failed to fetch filter options:', data.error);
        // Set empty arrays as fallback
        setFilterOptions({
          semesters: [],
          days: [],
          instructors: [],
          rooms: [],
          subjects: [],
          sections: [],
          academicYears: [],
          scheduleTypes: [],
          departments: [],
          buildings: [],
          floors: [],
          roomTypes: []
        });
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
      // Set empty arrays as fallback
      setFilterOptions({
        semesters: [],
        days: [],
        instructors: [],
        rooms: [],
        subjects: [],
        sections: [],
        academicYears: [],
        scheduleTypes: [],
        departments: [],
        buildings: [],
        floors: [],
        roomTypes: []
      });
    } finally {
      setFilterOptionsLoading(false);
    }
  };

  const fetchSchedules = async (refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      // Filter out "all" values and only include actual filter values
      const filterParams: Record<string, string> = {};
      if (statusFilter !== 'all') filterParams.status = statusFilter;
      if (semesterFilter !== 'all') filterParams.semester = semesterFilter;
      if (dayFilter !== 'all') filterParams.day = dayFilter;
      if (instructorFilter !== 'all') filterParams.instructor = instructorFilter;
      if (roomFilter !== 'all') filterParams.room = roomFilter;
      if (scheduleTypeFilter !== 'all') filterParams.scheduleType = scheduleTypeFilter;
      if (academicYearFilter !== 'all') filterParams.academicYear = academicYearFilter;
      if (subjectFilter !== 'all') filterParams.subject = subjectFilter;
      if (sectionFilter !== 'all') filterParams.section = sectionFilter;
      if (departmentFilter !== 'all') filterParams.department = departmentFilter;
      if (timeRangeFilter !== 'all') filterParams.timeRange = timeRangeFilter;
      if (enrollmentFilter !== 'all') filterParams.enrollment = enrollmentFilter;
      if (buildingFilter !== 'all') filterParams.building = buildingFilter;
      if (floorFilter !== 'all') filterParams.floor = floorFilter;
      if (roomTypeFilter !== 'all') filterParams.roomType = roomTypeFilter;

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(itemsPerPage),
        search,
        ...filterParams,
      });
      const response = await fetch(`/api/schedules?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setSchedules(data.data || []);
        setTotal(data.total || 0);
        if (refresh) toast.success('Schedules refreshed successfully');
      } else {
        throw new Error(data.error || 'Failed to fetch schedules');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schedules");
      if (refresh) {
        toast.error('Failed to refresh schedules. Please try again later.');
      } else {
        toast.error("Failed to fetch schedules");
      }
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Selection handlers
  const isAllSelected = schedules.length > 0 && schedules.every(s => selectedSchedules.includes(s.subjectSchedId));
  const isIndeterminate = selectedSchedules.length > 0 && !isAllSelected;
  
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSchedules([]);
    } else {
      setSelectedSchedules(schedules.map(s => s.subjectSchedId));
    }
  };
  
  const handleSelectRow = (id: string) => {
    setSelectedSchedules(prev => 
      prev.includes(Number(id)) 
        ? prev.filter(s => s !== Number(id))
        : [...prev, Number(id)]
    );
  };

  // Sort handler
  const handleSort = (field: string) => {
    setSortField(field);
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };



  // Table columns for TableList
  const columns: TableListColumn<Schedule>[] = [
    {
      header: (
        <Checkbox 
          checked={isAllSelected} 
          indeterminate={isIndeterminate} 
          onCheckedChange={handleSelectAll}
          aria-label="Select all schedules"
        />
      ),
      accessor: 'select',
      className: 'w-12 text-center',
      headerClassName: "justify-center",
    },
    {
      header: '',
      accessor: 'expander',
      className: 'w-12 text-center',
      headerClassName: "justify-center",
      expandedContent: (schedule: Schedule) => {
        const scheduleIdStr = schedule.subjectSchedId.toString();
        const students = scheduleStudents[scheduleIdStr] || [];
        const isLoading = loadingStudents[scheduleIdStr];

        return (
          <td colSpan={visibleColumns.length} className="px-4 py-2">
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Students in this Schedule ({students.length})
                </h4>
                <Badge variant="outline" className="text-xs">
                  {schedule.currentEnrollment || 0}/{schedule.maxStudents || 30}
                </Badge>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Loading students...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No students enrolled in this schedule</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.map((student: any) => (
                    <div key={student.studentId} className="bg-white rounded-lg border p-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium text-gray-900 truncate">
                            {student.firstName} {student.lastName}
                          </h5>
                          <p className="text-xs text-gray-500 truncate">
                            ID: {student.studentIdNum}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {student.CourseOffering?.courseName || 'No course'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={student.status === 'ACTIVE' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {student.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {student.enrollmentType}
                            </Badge>
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        );
      }
    },
    {
      header: 'Subject',
      accessor: 'subject',
      className: 'text-center min-w-[100px]',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => {
        const fuseResult = fuzzyResults.find(r => r.item.subjectSchedId === item.subjectSchedId) as FuseResult<Schedule> | undefined;
        const nameMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "subject.subjectName")?.indices;
        const codeMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "subject.subjectCode")?.indices;
        return (
        <div className="text-sm font-medium text-blue-900 text-center">
            <div 
              className="truncate" 
              title={item.subject.subjectName}
              dangerouslySetInnerHTML={{ __html: safeHighlight(item.subject.subjectName, nameMatches) }}
            />
            <div 
              className="text-xs text-gray-500 truncate" 
              title={item.subject.subjectCode}
              dangerouslySetInnerHTML={{ __html: safeHighlight(item.subject.subjectCode, codeMatches) }}
            />
        </div>
        );
      }
    },
    {
      header: 'Section',
      accessor: 'section',
      className: 'text-center min-w-[80px]',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <span className="text-sm text-blue-900 text-center truncate block" title={item.section.sectionName}>{item.section.sectionName}</span>
      )
    },
    {
      header: 'Instructor',
      accessor: 'instructor',
      className: 'text-center min-w-[120px]',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => {
        const fuseResult = fuzzyResults.find(r => r.item.subjectSchedId === item.subjectSchedId) as FuseResult<Schedule> | undefined;
        const firstNameMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "instructor.firstName")?.indices;
        const lastNameMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "instructor.lastName")?.indices;
        
        if (!item.instructor) {
          return (
            <div className="text-sm text-gray-500 text-center italic">
              No instructor assigned
            </div>
          );
        }
        
        const fullName = `${item.instructor.firstName} ${item.instructor.lastName}`;
        return (
        <div className="text-sm text-blue-900 text-center">
            <div 
              className="truncate" 
              title={fullName}
              dangerouslySetInnerHTML={{ __html: safeHighlight(fullName, firstNameMatches || lastNameMatches) }}
            />
          <div className="text-xs text-gray-500">ID: {item.instructor.instructorId}</div>
        </div>
        );
      }
    },
    {
      header: 'Room',
      accessor: 'room',
      className: 'text-center min-w-[80px]',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <div className="text-sm text-blue-900 text-center">
          <div className="truncate" title={item.room.roomNo}>{item.room.roomNo}</div>
          <div className="text-xs text-gray-500">Cap: {item.room.roomCapacity}</div>
        </div>
      )
    },
    {
      header: 'Day',
      accessor: 'day',
      className: 'text-center',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <Badge variant="outline" className="text-center">{item.day}</Badge>
      )
    },
    {
      header: 'Time',
      accessor: 'time',
      className: 'text-center',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <div className="flex items-center justify-center">
          <span className="text-sm text-blue-900">{item.startTime} - {item.endTime}</span>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'scheduleType',
      className: 'text-center',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <Badge variant={item.scheduleType === 'Regular' ? 'default' : 'secondary'} className="text-center">
          {item.scheduleType}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      className: 'text-center',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <Badge variant={item.status === 'Active' ? 'default' : 'destructive'} className="text-center">
          {item.status}
        </Badge>
      )
    },
    {
      header: 'Enrollment',
      accessor: 'enrollment',
      className: 'text-center',
      headerClassName: "justify-center",
      sortable: true,
      render: (item: Schedule) => (
        <div className="flex items-center gap-2 justify-center">
          <div className="text-sm text-blue-900">
            {item.currentEnrollment}/{item.maxStudents}
          </div>
          <Progress 
            value={(item.currentEnrollment / item.maxStudents) * 100} 
            className="w-16 h-2"
          />
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      className: "text-center",
      headerClassName: "justify-center",
      render: (item: Schedule) => (
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="View Schedule"
            className="hover:bg-blue-50"
            onClick={() => handleViewSchedule(item)}
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit Schedule"
            className="hover:bg-green-50"
            onClick={() => handleEditSchedule(item)}
          >
            <Edit className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete Schedule"
            className="hover:bg-red-50"
            onClick={() => handleDeleteSchedule(item)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ];



  const handleExportCSV = async () => {
    // Preload all student data before exporting
    toast.info('Loading student data for export...');
    await preloadAllStudents();
    const csvRows = [
      ['Subject', 'Section', 'Instructor', 'Room', 'Day', 'Time', 'Type', 'Status', 'Enrollment', 'Students', 'Student Count'].join(","),
      ...schedules.map((schedule) => {
        const scheduleIdStr = schedule.subjectSchedId.toString();
        const students = scheduleStudents[scheduleIdStr] || [];
        const studentNames = students.length > 0 ? students.map(s => `${s.firstName} ${s.lastName} (${s.studentIdNum})`).join('; ') : 'No students enrolled';
        
        return [
          schedule.subject.subjectName,
          schedule.section.sectionName,
          schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'No instructor',
          schedule.room.roomNo,
          schedule.day,
          `${schedule.startTime} - ${schedule.endTime}`,
          schedule.scheduleType,
          schedule.status,
          `${schedule.currentEnrollment}/${schedule.maxStudents}`,
          studentNames,
          students.length.toString()
        ].join(",");
      }),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-schedules-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Schedule exported successfully');
  };

  // Dialog handlers
  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };


  const handleVisibleColumns = () => {
    setShowVisibleColumnsDialog(true);
  };

  const handleSortOptions = () => {
    setShowSortDialog(true);
  };

  const preloadAllStudents = async () => {
    const scheduleIds = schedules.map(s => s.subjectSchedId);
    const promises = scheduleIds.map(async (scheduleId) => {
      const scheduleIdStr = scheduleId.toString();
      if (!scheduleStudents[scheduleIdStr]) {
        await fetchScheduleStudents(scheduleId);
      }
    });
    await Promise.all(promises);
  };

  const handlePrint = async () => {
    if (schedules.length === 0) {
      toast.error('No schedules to print');
      return;
    }

    // Preload all student data before printing
    toast.info('Loading student data for print...');
    await preloadAllStudents();

    const printData = schedules.map((schedule) => {
      const scheduleIdStr = schedule.subjectSchedId.toString();
      const students = scheduleStudents[scheduleIdStr] || [];
      
      return {
        subject: `${schedule.subject.subjectName} (${schedule.subject.subjectCode})`,
        section: schedule.section.sectionName,
        instructor: schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'No instructor',
        room: schedule.room.roomNo,
        day: schedule.day,
        time: `${schedule.startTime} - ${schedule.endTime}`,
        type: schedule.scheduleType,
        status: schedule.status,
        enrollment: `${schedule.currentEnrollment}/${schedule.maxStudents}`,
        students: students.length > 0 ? students.map(s => `${s.firstName} ${s.lastName} (${s.studentIdNum})`).join(', ') : 'No students enrolled',
        studentCount: students.length
      };
    });

    const printColumns = [
      { header: 'Subject', accessor: 'subject' },
      { header: 'Section', accessor: 'section' },
      { header: 'Instructor', accessor: 'instructor' },
      { header: 'Room', accessor: 'room' },
      { header: 'Day', accessor: 'day' },
      { header: 'Time', accessor: 'time' },
      { header: 'Type', accessor: 'type' },
      { header: 'Status', accessor: 'status' },
      { header: 'Enrollment', accessor: 'enrollment' },
      { header: 'Students', accessor: 'students' },
      { header: 'Student Count', accessor: 'studentCount' },
    ];

    const printFunction = PrintLayout({
      title: 'Class Schedules Report',
      data: printData,
      columns: printColumns,
      totalItems: schedules.length,
    });
    
    try {
      printFunction();
      toast.success('Print dialog opened');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print dialog. Please check if popups are blocked.');
    }
  };

  const handleColumnToggle = (columnAccessor: string, checked: boolean) => {
    if (checked) {
      setVisibleColumns(prev => [...prev, columnAccessor]);
    } else {
      setVisibleColumns(prev => prev.filter(col => col !== columnAccessor));
    }
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setShowSortDialog(false);
  };

  const handleBulkActivate = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'activate'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
    setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to activate schedules');
      }
    } catch (error) {
      console.error('Bulk activate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate schedules');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'deactivate'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
    setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to deactivate schedules');
      }
    } catch (error) {
      console.error('Bulk deactivate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate schedules');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message + ' (Soft deleted - can be restored)');
        setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to delete schedules');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete schedules');
    }
  };

  const handleBulkEdit = () => {
    setShowBulkEditDialog(true);
  };

  const handleBulkEditSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'bulkEdit',
          data: data
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message);
        setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(result.error || 'Failed to update schedules');
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update schedules');
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'duplicate'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to duplicate schedules');
      }
    } catch (error) {
      console.error('Bulk duplicate error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate schedules');
    }
  };

  const handleExportSelected = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'export'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Create CSV from the exported data
        const csvRows = [
          ['Subject', 'Section', 'Instructor', 'Room', 'Day', 'Time', 'Type', 'Status', 'Enrollment'],
          ...data.data.map((schedule: any) => [
            schedule.subject.subjectName,
            schedule.section.sectionName,
            schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'No instructor',
            schedule.room.roomNo,
            schedule.day,
            `${schedule.startTime} - ${schedule.endTime}`,
            schedule.scheduleType,
            schedule.status,
            `${schedule.currentEnrollment || 0}/${schedule.maxStudents || 30}`,
          ])
        ];
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected-schedules-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(data.message);
      } else {
        throw new Error(data.error || 'Failed to export schedules');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export schedules');
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'archive'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to archive schedules');
      }
    } catch (error) {
      console.error('Bulk archive error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to archive schedules');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const response = await fetch('/api/schedules/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIds: selectedSchedules,
          action: 'bulkStatusChange',
          data: { status }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message);
        setSelectedSchedules([]);
        fetchSchedules(true); // Refresh the data
      } else {
        throw new Error(data.error || 'Failed to change status');
      }
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to change status');
    }
  };

  // Schedule CRUD handlers
  const handleAddSchedule = () => {
    setShowAddScheduleDialog(true);
  };

  const handleViewSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowViewDialog(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowEditScheduleDialog(true);
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowDeleteScheduleDialog(true);
  };

  const fetchScheduleStudents = async (scheduleId: number) => {
    const scheduleIdStr = scheduleId.toString();
    
    // Check if we already have the students for this schedule
    if (scheduleStudents[scheduleIdStr]) {
      return;
    }

    setLoadingStudents(prev => ({ ...prev, [scheduleIdStr]: true }));

    try {
      const response = await fetch(`/api/schedules/${scheduleId}/students`);
      const data = await response.json();

      if (response.ok && data.success) {
        setScheduleStudents(prev => ({
          ...prev,
          [scheduleIdStr]: data.data
        }));
      } else {
        console.error('Failed to fetch students:', data.error);
        setScheduleStudents(prev => ({
          ...prev,
          [scheduleIdStr]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setScheduleStudents(prev => ({
        ...prev,
        [scheduleIdStr]: []
      }));
    } finally {
      setLoadingStudents(prev => ({ ...prev, [scheduleIdStr]: false }));
    }
  };

  const handleToggleExpand = (scheduleId: string) => {
    const scheduleIdNum = parseInt(scheduleId);
    
    setExpandedRowIds(prev => {
      const isExpanded = prev.includes(scheduleId);
      if (isExpanded) {
        return prev.filter(id => id !== scheduleId);
      } else {
        // Fetch students when expanding
        fetchScheduleStudents(scheduleIdNum);
        return [...prev, scheduleId];
      }
    });
  };

  const handleScheduleCreated = (newSchedule: Schedule) => {
    console.log('Schedule created:', newSchedule);
    fetchSchedules(true);
  };

  const handleScheduleUpdated = (schedule: Schedule) => {
    console.log('Schedule updated:', schedule);
    fetchSchedules(true);
  };

  const handleScheduleDeleted = (scheduleId: number) => {
    console.log('Schedule deleted:', scheduleId);
    fetchSchedules(true);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  // Use database-driven filter options
  const semesterOptions = filterOptions.semesters;
  const dayOptions = filterOptions.days;
  const instructorOptions = filterOptions.instructors.map(i => i.name);
  const roomOptions = filterOptions.rooms.map(r => r.roomNo);
  const subjectOptions = filterOptions.subjects.map(s => s.name);
  const sectionOptions = filterOptions.sections;
  const academicYearOptions = filterOptions.academicYears;
  const scheduleTypeOptions = filterOptions.scheduleTypes;
  const departmentOptions = filterOptions.departments;
  const buildingOptions = filterOptions.buildings;
  const floorOptions = filterOptions.floors;
  const roomTypeOptions = filterOptions.roomTypes;

  // Filtered instructor options based on search
  const filteredInstructorOptions = instructorOptions.filter(instructor =>
    instructor.toLowerCase().includes(instructorSearch.toLowerCase())
  );

  // Filtered room options based on search
  const filteredRoomOptions = roomOptions.filter(room =>
    room.toLowerCase().includes(roomSearch.toLowerCase())
  );

  // Filtered subject options based on search
  const filteredSubjectOptions = subjectOptions.filter(subject =>
    subject.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  // Filtered section options based on search
  const filteredSectionOptions = sectionOptions.filter(section =>
    section.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  // Clear instructor search when filter is reset
  const handleInstructorFilterChange = (value: string) => {
    setInstructorFilter(value);
    if (value === "all") {
      setInstructorSearch("");
    }
  };

  // Safe focus handler to prevent null reference errors
  const handleSafeFocus = (e: React.FocusEvent) => {
    try {
      e.stopPropagation();
    } catch (error) {
      console.warn('Focus event handling error:', error);
    }
  };

  // Highlight search matches
  const highlightMatch = (text: string, matches: readonly [number, number][] | undefined) => {
    if (!matches) return text;
    
    let result = '';
    let lastIndex = 0;
    
    matches.forEach(([start, end]) => {
      result += text.slice(lastIndex, start);
      result += `<mark class="bg-yellow-200 px-1 rounded">${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    });
    
    result += text.slice(lastIndex);
    return result;
  };

  // Clear room search when filter is reset
  const handleRoomFilterChange = (value: string) => {
    setRoomFilter(value);
    if (value === "all") {
      setRoomSearch("");
    }
  };

  // Clear subject search when filter is reset
  const handleSubjectFilterChange = (value: string) => {
    setSubjectFilter(value);
    if (value === "all") {
      setSubjectSearch("");
    }
  };

  // Clear section search when filter is reset
  const handleSectionFilterChange = (value: string) => {
    setSectionFilter(value);
    if (value === "all") {
      setSectionSearch("");
    }
  };

  // Count active filters for visual indicator
  const activeFiltersCount = [
    statusFilter !== 'all',
    semesterFilter !== 'all',
    dayFilter !== 'all',
    instructorFilter !== 'all',
    roomFilter !== 'all',
    subjectFilter !== 'all',
    scheduleTypeFilter !== 'all',
    academicYearFilter !== 'all',
    sectionFilter !== 'all',
    departmentFilter !== 'all',
    timeRangeFilter !== 'all',
    enrollmentFilter !== 'all',
    buildingFilter !== 'all',
    floorFilter !== 'all',
    roomTypeFilter !== 'all',
    search !== ''
  ].filter(Boolean).length;

  // Build filters object for FilterChips component
  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? [statusFilter] : [],
    semester: semesterFilter !== 'all' ? [semesterFilter] : [],
    day: dayFilter !== 'all' ? [dayFilter] : [],
    instructor: instructorFilter !== 'all' ? [instructorFilter] : [],
    room: roomFilter !== 'all' ? [roomFilter] : [],
    subject: subjectFilter !== 'all' ? [subjectFilter] : [],
    scheduleType: scheduleTypeFilter !== 'all' ? [scheduleTypeFilter] : [],
    academicYear: academicYearFilter !== 'all' ? [academicYearFilter] : [],
    section: sectionFilter !== 'all' ? [sectionFilter] : [],
    department: departmentFilter !== 'all' ? [departmentFilter] : [],
    timeRange: timeRangeFilter !== 'all' ? [timeRangeFilter] : [],
    enrollment: enrollmentFilter !== 'all' ? [enrollmentFilter] : [],
    building: buildingFilter !== 'all' ? [buildingFilter] : [],
    floor: floorFilter !== 'all' ? [floorFilter] : [],
    roomType: roomTypeFilter !== 'all' ? [roomTypeFilter] : [],
  }), [statusFilter, semesterFilter, dayFilter, instructorFilter, roomFilter, subjectFilter, scheduleTypeFilter, academicYearFilter, sectionFilter, departmentFilter, timeRangeFilter, enrollmentFilter, buildingFilter, floorFilter, roomTypeFilter]);

  // Handler to remove individual filter
  const handleRemoveFilter = (key: string, value?: string) => {
    switch (key) {
      case 'status':
        setStatusFilter('all');
        break;
      case 'semester':
        setSemesterFilter('all');
        break;
      case 'day':
        setDayFilter('all');
        break;
      case 'instructor':
        setInstructorFilter('all');
        setInstructorSearch('');
        break;
      case 'room':
        setRoomFilter('all');
        setRoomSearch('');
        break;
      case 'subject':
        setSubjectFilter('all');
        setSubjectSearch('');
        break;
      case 'scheduleType':
        setScheduleTypeFilter('all');
        break;
      case 'academicYear':
        setAcademicYearFilter('all');
        break;
      case 'section':
        setSectionFilter('all');
        setSectionSearch('');
        break;
      case 'department':
        setDepartmentFilter('all');
        break;
      case 'timeRange':
        setTimeRangeFilter('all');
        break;
      case 'enrollment':
        setEnrollmentFilter('all');
        break;
      case 'building':
        setBuildingFilter('all');
        break;
      case 'floor':
        setFloorFilter('all');
        break;
      case 'roomType':
        setRoomTypeFilter('all');
        break;
    }
  };

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    setStatusFilter('all');
    setSemesterFilter('all');
    setDayFilter('all');
    setInstructorFilter('all');
    setRoomFilter('all');
    setSubjectFilter('all');
    setScheduleTypeFilter('all');
    setAcademicYearFilter('all');
    setSectionFilter('all');
    setDepartmentFilter('all');
    setTimeRangeFilter('all');
    setEnrollmentFilter('all');
    setBuildingFilter('all');
    setFloorFilter('all');
    setRoomTypeFilter('all');
    setInstructorSearch('');
    setRoomSearch('');
    setSubjectSearch('');
    setSectionSearch('');
    setSearch('');
    setSearchInput('');
  };

  const hasActiveFilters = activeFiltersCount > 0;


  return (
    <>
      {/* Print Styles for Regular Browser Print (Ctrl+P) as fallback */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            color: black !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          /* Hide everything except the main content */
          nav, aside, header, footer, .sidebar {
            display: none !important;
          }
          
          /* Style the main content for print */
          .print-content {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .print-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .print-subtitle {
            font-size: 14px;
            color: #666;
          }
          
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
            margin-top: 20px;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000 !important;
            padding: 6px 4px !important;
            text-align: left !important;
            vertical-align: top !important;
          }
          
          .print-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            font-size: 10px !important;
            text-transform: uppercase !important;
          }
          
          .print-table tr:nth-child(even) {
            background-color: #f9f9f9 !important;
          }
          
          @page {
            margin: 1cm !important;
            size: A4 !important;
          }
        }

        /* Compact Table Styles */
        .compact-table table {
          font-size: 0.875rem !important;
        }
        
        .compact-table th {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          line-height: 1.25 !important;
        }
        
        .compact-table td {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.875rem !important;
          line-height: 1.25 !important;
        }
        
        .compact-table .text-sm {
          font-size: 0.75rem !important;
        }
        
        .compact-table .text-xs {
          font-size: 0.625rem !important;
        }
        
        .compact-table .h-4 {
          height: 0.875rem !important;
          width: 0.875rem !important;
        }
        
        .compact-table .w-4 {
          width: 0.875rem !important;
          height: 0.875rem !important;
        }
        
        .compact-table .gap-1 {
          gap: 0.125rem !important;
        }
        
        .compact-table .gap-2 {
          gap: 0.25rem !important;
        }
        
        .compact-table .p-2 {
          padding: 0.25rem !important;
        }
        
        .compact-table .py-1 {
          padding-top: 0.125rem !important;
          padding-bottom: 0.125rem !important;
        }
        
        .compact-table .px-2 {
          padding-left: 0.25rem !important;
          padding-right: 0.25rem !important;
        }
        
        .compact-table .min-w-\[120px\] {
          min-width: 100px !important;
        }
        
        .compact-table .min-w-\[140px\] {
          min-width: 120px !important;
        }
        
        .compact-table .min-w-\[100px\] {
          min-width: 80px !important;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] overflow-x-hidden">
        {/* Main container with responsive padding and spacing */}
        <div className="w-full max-w-none px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 md:py-4 lg:py-6 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
        <div className="no-print">
          <PageHeader
            title="Class Schedules"
            subtitle="Manage class schedules and timetables"
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Academic Management", href: "/academic-management" },
              { label: "Class Schedules" }
            ]}
          />
        </div>
        
        {/* Print Header - Only visible when printing */}
        <div className="print-only hidden">
          <div className="print-header">
            <h1 className="print-title">ICCT College Foundation</h1>
            <h2 className="print-title">Class Schedules Report</h2>
            <p className="print-subtitle">Generated on: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        {/* Summary Cards - Enhanced responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <SummaryCard
            icon={<Calendar className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Total Schedules"
            value={loading ? "..." : total}
            valueClassName="text-blue-900"
            sublabel="Total number of schedules"
          />
          <SummaryCard
            icon={<CheckCircle className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Active Schedules"
            value={loading ? "..." : schedules.filter(s => s.status === 'Active').length}
            valueClassName="text-blue-900"
            sublabel="Currently active"
          />
          <SummaryCard
            icon={<Users className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Total Instructors"
            value={loading ? "..." : new Set(schedules.filter(s => s.instructor).map(s => s.instructor!.instructorId)).size}
            valueClassName="text-blue-900"
            sublabel="Teaching this semester"
          />
          <SummaryCard
            icon={<MapPin className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Total Rooms"
            value={loading ? "..." : new Set(schedules.map(s => s.room.roomId)).size}
            valueClassName="text-blue-900"
            sublabel="In use"
          />
        </div>

        {/* Quick Actions Panel - Responsive */}
        <div className="w-full max-w-full pt-2 sm:pt-3 md:pt-4 no-print">
          <QuickActionsPanel
            variant="premium"
            title="Quick Actions"
            subtitle="Essential tools and shortcuts"
            icon={
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            }
            actionCards={[
              {
                id: 'add-schedule',
                label: 'Add Schedule',
                description: 'Create new schedule',
                icon: <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
                onClick: handleAddSchedule
              },
              {
                id: 'import-data',
                label: 'Import Data',
                description: 'Import schedules from file',
                icon: <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
                onClick: handleImport
              },
              {
                id: 'print-page',
                label: 'Print Page',
                description: 'Print schedule list',
                icon: <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
                onClick: handlePrint
              },
              {
                id: 'visible-columns',
                label: 'Visible Columns',
                description: 'Manage table columns',
                icon: <Columns3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
                onClick: handleVisibleColumns
              },
              {
                id: 'refresh-data',
                label: 'Refresh Data',
                description: 'Reload schedule data',
                icon: isRefreshing ? (
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                onClick: () => fetchSchedules(true),
                disabled: isRefreshing,
                loading: isRefreshing
              },
              {
                id: 'sort-options',
                label: 'Sort Options',
                description: 'Configure sorting',
                icon: <List className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
                onClick: handleSortOptions
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


        {/* Main Content Area - Enhanced responsive layout */}
        <div className="w-full max-w-full pt-2 sm:pt-3 md:pt-4">
          <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
            <CardHeader className="p-0">
              {/* Blue Gradient Header - Responsive padding */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-4 sm:p-5 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">Schedule List</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">Search and filter schedule information</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Search and Filter Section - Enhanced responsive layout */}
            <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-end">
                {/* Quick Filter Dropdowns - Responsive layout */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto lg:flex-shrink-0">
                {/* Search Bar - Responsive width */}
                <div className="relative w-full lg:w-auto lg:min-w-[250px] lg:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by subject, section, instructor, room, time, day, year..."
                    value={searchInput}
                    onChange={e => {
                      setSearchInput(e.target.value);
                      setSearch(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
                  />
                </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">
                        <span className="flex items-center gap-1.5">
                          <span className="text-green-600"><CheckCircle className="w-3 h-3" /></span> Active
                        </span>
                      </SelectItem>
                      <SelectItem value="Inactive">
                        <span className="flex items-center gap-1.5">
                          <span className="text-red-500"><X className="w-3 h-3" /></span> Inactive
                        </span>
                      </SelectItem>
                      <SelectItem value="Completed">
                        <span className="flex items-center gap-1.5">
                          <span className="text-blue-500"><Clock className="w-3 h-3" /></span> Completed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {semesterOptions.map((semester, index) => (
                        <SelectItem key={`semester-${index}`} value={semester}>{semester}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dayFilter} onValueChange={setDayFilter}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[100px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {dayOptions.map((day, index) => (
                        <SelectItem key={`day-${index}`} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={instructorFilter} onValueChange={handleInstructorFilterChange}>
                    <SelectTrigger className="w-36 sm:w-40 text-gray-700 text-sm h-8 rounded">
                      <SelectValue placeholder="Instructor" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search instructors..."
                            value={instructorSearch}
                            onChange={(e) => setInstructorSearch(e.target.value)}
                            className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={handleSafeFocus}
                            onBlur={handleSafeFocus}
                          />
                          {instructorSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInstructorSearch("");
                              }}
                              className="absolute right-2 top-2.5 h-3 w-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">
                          All Instructors {instructorSearch && `(${filteredInstructorOptions.length} found)`}
                        </SelectItem>
                        {filteredInstructorOptions.length > 0 ? (
                          filteredInstructorOptions.map((instructor, index) => (
                            <SelectItem key={`instructor-${index}`} value={instructor}>{instructor}</SelectItem>
                          ))
                        ) : instructorSearch ? (
                          <div className="px-2 py-1 text-xs text-gray-500 text-center">
                            No instructors found for "{instructorSearch}"
                          </div>
                        ) : null}
                      </div>
                    </SelectContent>
                  </Select>
                  <Select value={roomFilter} onValueChange={handleRoomFilterChange}>
                    <SelectTrigger className="w-24 sm:w-28 text-gray-700 text-sm h-8 rounded">
                      <SelectValue placeholder="Room" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search rooms..."
                            value={roomSearch}
                            onChange={(e) => setRoomSearch(e.target.value)}
                            className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={handleSafeFocus}
                            onBlur={handleSafeFocus}
                          />
                          {roomSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRoomSearch("");
                              }}
                              className="absolute right-2 top-2.5 h-3 w-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">
                          All Rooms {roomSearch && `(${filteredRoomOptions.length} found)`}
                        </SelectItem>
                        {filteredRoomOptions.length > 0 ? (
                          filteredRoomOptions.map((room, index) => (
                            <SelectItem key={`room-${index}`} value={room}>{room}</SelectItem>
                          ))
                        ) : roomSearch ? (
                          <div className="px-2 py-1 text-xs text-gray-500 text-center">
                            No rooms found for "{roomSearch}"
                          </div>
                        ) : null}
                      </div>
                    </SelectContent>
                  </Select>
                  <Select value={subjectFilter} onValueChange={handleSubjectFilterChange}>
                    <SelectTrigger className="w-32 sm:w-36 text-gray-700 text-sm h-8 rounded">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search subjects..."
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={handleSafeFocus}
                            onBlur={handleSafeFocus}
                          />
                          {subjectSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSubjectSearch("");
                              }}
                              className="absolute right-2 top-2.5 h-3 w-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <SelectItem value="all">
                          All Subjects {subjectSearch && `(${filteredSubjectOptions.length} found)`}
                        </SelectItem>
                        {filteredSubjectOptions.length > 0 ? (
                          filteredSubjectOptions.map((subject, index) => (
                            <SelectItem key={`subject-${index}`} value={subject}>{subject}</SelectItem>
                          ))
                        ) : subjectSearch ? (
                          <div className="px-2 py-1 text-xs text-gray-500 text-center">
                            No subjects found for "{subjectSearch}"
                          </div>
                        ) : null}
                      </div>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400 whitespace-nowrap h-8 px-2 text-sm rounded"
                  >
                    <Settings className="w-3 h-3" />
                    <span className="hidden sm:inline">Advanced</span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`} />
                  </Button>
                </div>
              </div>
              
              {/* Advanced Filters Section */}
              {showAdvancedFilters && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Advanced Filters</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllFilters}
                      className={`text-xs text-gray-500 hover:text-gray-700 h-6 px-2 flex items-center gap-1 ${activeFiltersCount > 0 ? 'text-blue-600 hover:text-blue-800' : ''}`}
                      disabled={activeFiltersCount === 0}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear All Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="text-xs h-4 px-1 ml-1">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    <Select value={scheduleTypeFilter} onValueChange={setScheduleTypeFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {scheduleTypeOptions.map((type, index) => (
                          <SelectItem key={`type-${index}`} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {academicYearOptions.map((year, index) => (
                          <SelectItem key={`year-${index}`} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sectionFilter} onValueChange={handleSectionFilterChange}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search sections..."
                              value={sectionSearch}
                              onChange={(e) => setSectionSearch(e.target.value)}
                              className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                              onFocus={handleSafeFocus}
                              onBlur={handleSafeFocus}
                            />
                            {sectionSearch && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSectionSearch("");
                                }}
                                className="absolute right-2 top-2.5 h-3 w-3 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <SelectItem value="all">
                            All Sections {sectionSearch && `(${filteredSectionOptions.length} found)`}
                          </SelectItem>
                          {filteredSectionOptions.length > 0 ? (
                            filteredSectionOptions.map((section, index) => (
                              <SelectItem key={`section-${index}`} value={section}>{section}</SelectItem>
                            ))
                          ) : sectionSearch ? (
                            <div className="px-2 py-1 text-xs text-gray-500 text-center">
                              No sections found for "{sectionSearch}"
                            </div>
                          ) : null}
                        </div>
                      </SelectContent>
                    </Select>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departmentOptions.map((department, index) => (
                          <SelectItem key={`department-${index}`} value={department}>{department}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Times</SelectItem>
                        <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                        <SelectItem value="evening">Evening (6PM-10PM)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Enrollment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="overbooked">Overbooked</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Building" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Buildings</SelectItem>
                        {buildingOptions.map((building, index) => (
                          <SelectItem key={`building-${index}`} value={building}>{building}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={floorFilter} onValueChange={setFloorFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Floors</SelectItem>
                        {floorOptions.map((floor, index) => (
                          <SelectItem key={`floor-${index}`} value={floor}>{floor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                      <SelectTrigger className="w-full text-gray-700 text-sm h-8 rounded">
                        <SelectValue placeholder="Room Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {roomTypeOptions.map((roomType, index) => (
                          <SelectItem key={`roomType-${index}`} value={roomType}>{roomType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium text-blue-900">Active Filters:</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-700">
                      <span>{schedules.length} of {total} schedules</span>
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
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
                      { key: 'status', label: 'Status' },
                      { key: 'semester', label: 'Semester' },
                      { key: 'day', label: 'Day' },
                      { key: 'instructor', label: 'Instructor' },
                      { key: 'room', label: 'Room' },
                      { key: 'subject', label: 'Subject' },
                      { key: 'scheduleType', label: 'Type' },
                      { key: 'academicYear', label: 'Academic Year' },
                      { key: 'section', label: 'Section' },
                      { key: 'department', label: 'Department' },
                      { key: 'timeRange', label: 'Time Range' },
                      { key: 'enrollment', label: 'Enrollment' },
                      { key: 'building', label: 'Building' },
                      { key: 'floor', label: 'Floor' },
                      { key: 'roomType', label: 'Room Type' },
                    ]}
                    onRemove={handleRemoveFilter}
                    onClearAll={handleClearAllFilters}
                    searchQuery={search}
                    onRemoveSearch={() => {
                      setSearch('');
                      setSearchInput('');
                    }}
                    showSearchChip={true}
                  />
                </div>
              )}
            </div>

            {/* Content Area - Responsive padding */}
            <div className="flex-1 px-3 sm:px-4 md:px-5 lg:px-6 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5 md:pb-6">

                {/* Bulk Actions */}
                {selectedSchedules.length > 0 && (
                  <div className="mb-4 no-print">
                    <BulkActions
                      selectedCount={selectedSchedules.length}
                      selectedSchedules={schedules.filter(s => selectedSchedules.includes(s.subjectSchedId))}
                      onActivate={handleBulkActivate}
                      onDeactivate={handleBulkDeactivate}
                      onDelete={handleBulkDelete}
                      onBulkEdit={handleBulkEdit}
                      onDuplicate={handleDuplicate}
                      onExport={handleExportSelected}
                      onArchive={handleArchive}
                      onBulkStatusChange={handleBulkStatusChange}
                    />
                  </div>
                )}


                {/* Print Table - Only visible when printing */}
                <div className="print-only hidden">
                  <div className="print-content">
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Section</th>
                          <th>Instructor</th>
                          <th>Room</th>
                          <th>Day</th>
                          <th>Time</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Enrollment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((schedule) => (
                          <tr key={schedule.subjectSchedId}>
                            <td>
                              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                                {schedule.subject.subjectName}
                              </div>
                              <div style={{ fontSize: '9px', color: '#666' }}>
                                {schedule.subject.subjectCode}
                              </div>
                            </td>
                            <td>{schedule.section.sectionName}</td>
                            <td>
                              <div style={{ fontSize: '11px' }}>
                                {schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'No instructor'}
                              </div>
                              {schedule.instructor && (
                                <div style={{ fontSize: '9px', color: '#666' }}>
                                  ID: {schedule.instructor.instructorId}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 'bold' }}>
                                {schedule.room.roomNo}
                              </div>
                              <div style={{ fontSize: '9px', color: '#666' }}>
                                Cap: {schedule.room.roomCapacity}
                              </div>
                            </td>
                            <td>{schedule.day}</td>
                            <td>
                              <div style={{ fontSize: '11px' }}>
                                {schedule.startTime} - {schedule.endTime}
                              </div>
                            </td>
                            <td>{schedule.scheduleType}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                backgroundColor: schedule.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                                color: schedule.status === 'Active' ? '#166534' : '#374151'
                              }}>
                                {schedule.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px' }}>
                                {schedule.currentEnrollment}/{schedule.maxStudents}
                              </div>
                              <div style={{ fontSize: '9px', color: '#666' }}>
                                {Math.round((schedule.currentEnrollment / schedule.maxStudents) * 100)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Content Area */}
                <div className="space-y-4">
                   {error ? (
                     <Alert variant="destructive">
                       <XCircle className="h-4 w-4" />
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                   ) : loading ? (
                     <div className="flex items-center justify-center py-12">
                       <div className="flex items-center space-x-2">
                         <RefreshCw className="h-4 w-4 animate-spin" />
                         <span className="text-sm text-gray-500">Loading schedules...</span>
                       </div>
                     </div>
                   ) : schedules.length === 0 ? (
                     <div className="px-4 sm:px-6 pt-6 pb-6">
                       <EmptyState
                         icon={<Calendar className="h-12 w-12 text-gray-400" />}
                         title="No schedules found"
                         description={
                           search || statusFilter !== 'all' || semesterFilter !== 'all' || dayFilter !== 'all' || 
                           instructorFilter !== 'all' || roomFilter !== 'all' || subjectFilter !== 'all' || 
                           scheduleTypeFilter !== 'all' || academicYearFilter !== 'all' || sectionFilter !== 'all' ||
                           departmentFilter !== 'all' || timeRangeFilter !== 'all' || enrollmentFilter !== 'all' ||
                           buildingFilter !== 'all' || floorFilter !== 'all' || roomTypeFilter !== 'all'
                             ? "No schedules match your current filters. Try adjusting your search criteria."
                             : "No schedules have been created yet. Get started by adding your first schedule."
                         }
                         action={
                           <Button onClick={handleAddSchedule} className="mt-4 rounded">
                             <Plus className="h-4 w-4 mr-2" />
                             Add Schedule
                           </Button>
                         }
                       />
                     </div>
                   ) : (
                     <>
                       {/* Table layout for large screens - Enhanced responsive */}
                       <div className="hidden xl:block">
                         <div className="px-3 sm:px-4 md:px-5 lg:px-6 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5 md:pb-6">
                           <div className="overflow-x-auto bg-white/70 shadow-none relative">
                              <TableList
                                columns={columns}
                                data={schedules}
                                loading={loading}
                                selectedIds={selectedSchedules.map(String)}
                                emptyMessage={null}
                                onSelectRow={handleSelectRow}
                                onSelectAll={handleSelectAll}
                                isAllSelected={isAllSelected}
                                isIndeterminate={isIndeterminate}
                                getItemId={(item) => String(item.subjectSchedId)}
                                className="border-0 shadow-none max-w-full compact-table"
                                sortState={{ field: sortField, order: sortOrder }}
                                onSort={handleSort}
                                expandedRowIds={expandedRowIds}
                                onToggleExpand={handleToggleExpand}
                              />
                           </div>
                         </div>
                       </div>
                       
                       {/* Medium screen table layout */}
                       <div className="hidden lg:block xl:hidden">
                         <div className="px-3 sm:px-4 md:px-5 lg:px-6 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5 md:pb-6">
                           <div className="overflow-x-auto bg-white/70 shadow-none relative">
                              <TableList
                                columns={columns}
                                data={schedules}
                                loading={loading}
                                selectedIds={selectedSchedules.map(String)}
                                emptyMessage={null}
                                onSelectRow={handleSelectRow}
                                onSelectAll={handleSelectAll}
                                isAllSelected={isAllSelected}
                                isIndeterminate={isIndeterminate}
                                getItemId={(item) => String(item.subjectSchedId)}
                                className="border-0 shadow-none max-w-full compact-table"
                                sortState={{ field: sortField, order: sortOrder }}
                                onSort={handleSort}
                                expandedRowIds={expandedRowIds}
                                onToggleExpand={handleToggleExpand}
                              />
                           </div>
                         </div>
                       </div>
                       
                       {/* Small screen card layout */}
                       <div className="block lg:hidden">
                         <div className="px-3 sm:px-4 md:px-5 lg:px-6 pt-4 sm:pt-5 md:pt-6 pb-4 sm:pb-5 md:pb-6">
                           <div className="space-y-3">
                             {schedules.map((schedule) => (
                               <div key={schedule.subjectSchedId} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                 <div className="flex items-start justify-between">
                                   <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2 mb-2">
                                       <Checkbox
                                         checked={selectedSchedules.includes(schedule.subjectSchedId)}
                                         onCheckedChange={() => handleSelectRow(String(schedule.subjectSchedId))}
                                       />
                                       <h3 className="text-sm font-medium text-gray-900 truncate">
                                         {schedule.subject.subjectName}
                                       </h3>
                                     </div>
                                     <div className="text-xs text-gray-500 mb-2">
                                       {schedule.subject.subjectCode} • {schedule.section.sectionName}
                                     </div>
                                     <div className="grid grid-cols-2 gap-2 text-xs">
                                       <div>
                                         <span className="font-medium text-gray-700">Instructor:</span>
                                         <div className="text-gray-600">
                                           {schedule.instructor ? `${schedule.instructor.firstName} ${schedule.instructor.lastName}` : 'No instructor'}
                                         </div>
                                       </div>
                                       <div>
                                         <span className="font-medium text-gray-700">Room:</span>
                                         <div className="text-gray-600">{schedule.room.roomNo}</div>
                                       </div>
                                       <div>
                                         <span className="font-medium text-gray-700">Day:</span>
                                         <div className="text-gray-600">{schedule.day}</div>
                                       </div>
                                       <div>
                                         <span className="font-medium text-gray-700">Time:</span>
                                         <div className="text-gray-600">{schedule.startTime} - {schedule.endTime}</div>
                                       </div>
                                     </div>
                                   </div>
                                   <div className="flex flex-col gap-1 ml-4">
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8 hover:bg-blue-50"
                                       onClick={() => handleViewSchedule(schedule)}
                                     >
                                       <Eye className="h-4 w-4 text-blue-600" />
                                     </Button>
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8 hover:bg-green-50"
                                       onClick={() => handleEditSchedule(schedule)}
                                     >
                                       <Edit className="h-4 w-4 text-green-600" />
                                     </Button>
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8 hover:bg-red-50"
                                       onClick={() => handleDeleteSchedule(schedule)}
                                     >
                                       <Trash2 className="h-4 w-4 text-red-600" />
                                     </Button>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       </div>
                     </>
                   )}
                   {/* Pagination - only show when there's data */}
                   {schedules.length > 0 && (
                   <TablePagination
                     page={page}
                     pageSize={itemsPerPage}
                     totalItems={total}
                     onPageChange={setPage}
                     onPageSizeChange={setItemsPerPage}
                     entityLabel="schedule"
                   />
                   )}
                </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        dataCount={schedules.filter(s => selectedSchedules.includes(s.subjectSchedId)).length}
        entityType="student"
        onExport={async (format, options) => {
          console.log('Export format:', format, 'options:', options);
          toast.success('Export completed successfully');
        }}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityName="Schedule"
        onImport={async (data) => {
          try {
            console.log('Importing schedule data:', data);
            
            // Call the schedule import API
            const response = await fetch('/api/schedules/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
              toast.success(`Import completed: ${result.success} successful, ${result.failed} failed`);
              fetchSchedules(true); // Refresh the data
              return { 
                success: result.success, 
                failed: result.failed, 
                errors: result.errors || [] 
              };
            } else {
              throw new Error(result.error || 'Import failed');
            }
          } catch (error) {
            console.error('Import error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to import schedules';
            toast.error(errorMessage);
            return { 
              success: 0, 
              failed: data.length, 
              errors: [errorMessage] 
            };
          }
        }}
      />


      <VisibleColumnsDialog
        open={showVisibleColumnsDialog}
        onOpenChange={setShowVisibleColumnsDialog}
        columns={columnOptions}
        visibleColumns={visibleColumns}
        onColumnToggle={handleColumnToggle}
        title="Manage Schedule Columns"
        description="Choose which columns to display in the schedule table"
      />

      <SortDialog
        open={showSortDialog}
        onOpenChange={setShowSortDialog}
        sortOptions={sortOptions}
        currentSort={{ field: sortField, order: sortOrder }}
        onSortChange={handleSortChange}
        title="Sort Schedules"
        description="Customize how your schedule data is displayed"
        entityType="schedules"
      />

      <AddScheduleDialog
        open={showAddScheduleDialog}
        onOpenChange={setShowAddScheduleDialog}
        onScheduleCreated={handleScheduleCreated}
      />

      <EditScheduleDialog
        open={showEditScheduleDialog}
        onOpenChange={setShowEditScheduleDialog}
        schedule={selectedSchedule}
        onScheduleUpdated={handleScheduleUpdated}
      />

      <DeleteScheduleDialog
        open={showDeleteScheduleDialog}
        onOpenChange={setShowDeleteScheduleDialog}
        schedule={selectedSchedule}
        onScheduleDeleted={handleScheduleDeleted}
      />

      <BulkEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        selectedCount={selectedSchedules.length}
        onBulkEdit={handleBulkEditSubmit}
      />

      <ViewDialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) setSelectedSchedule(null);
        }}
        title={selectedSchedule ? `${selectedSchedule.subject.subjectName} Schedule` : 'Schedule Details'}
        subtitle={selectedSchedule ? `${selectedSchedule.subject.subjectCode} - ${selectedSchedule.section.sectionName}` : ''}
        status={selectedSchedule ? {
          value: selectedSchedule.status,
          variant: selectedSchedule.status === 'ACTIVE' ? 'success' : 'destructive'
        } : undefined}
        headerIcon={<Calendar className="w-6 h-6 text-white" />}
        sections={selectedSchedule ? [
          {
            title: "Schedule Information",
            fields: [
              { 
                label: 'Schedule ID', 
                value: selectedSchedule.subjectSchedId?.toString() || 'N/A', 
                type: 'text',
                icon: <Hash className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Subject', 
                value: selectedSchedule.subject.subjectName, 
                type: 'text',
                icon: <BookOpen className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Subject Code', 
                value: selectedSchedule.subject.subjectCode, 
                type: 'text',
                icon: <Tag className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Section', 
                value: selectedSchedule.section.sectionName, 
                type: 'text',
                icon: <Users className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Instructor', 
                value: selectedSchedule.instructor ? `${selectedSchedule.instructor.firstName} ${selectedSchedule.instructor.lastName}` : 'No instructor assigned', 
                type: 'text',
                icon: <GraduationCap className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Room', 
                value: `${selectedSchedule.room.roomNo} (Capacity: ${selectedSchedule.room.roomCapacity || 'N/A'})`, 
                type: 'text',
                icon: <MapPin className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Day', 
                value: selectedSchedule.day, 
                type: 'badge',
                badgeVariant: 'default',
                icon: <Calendar className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Time', 
                value: `${selectedSchedule.startTime} - ${selectedSchedule.endTime}`, 
                type: 'text',
                icon: <Clock className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Schedule Type', 
                value: selectedSchedule.scheduleType, 
                type: 'badge',
                badgeVariant: selectedSchedule.scheduleType === 'REGULAR' ? 'default' : 'secondary',
                icon: <Info className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Status', 
                value: selectedSchedule.status, 
                type: 'badge',
                badgeVariant: selectedSchedule.status === 'ACTIVE' ? 'success' : 'destructive',
                icon: <CheckCircle className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Max Students', 
                value: selectedSchedule.maxStudents?.toString() || '0', 
                type: 'number',
                icon: <Users className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Current Enrollment', 
                value: selectedSchedule.currentEnrollment?.toString() || '0', 
                type: 'number',
                icon: <UserCheckIcon className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Academic Year', 
                value: selectedSchedule.academicYear, 
                type: 'text',
                icon: <Calendar className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Semester', 
                value: selectedSchedule.semester ? selectedSchedule.semester.semesterName : 'N/A', 
                type: 'text',
                icon: <Calendar className="w-4 h-4 text-blue-600" />
              },
              { 
                label: 'Notes', 
                value: selectedSchedule.notes || 'No notes available', 
                type: 'text',
                icon: <Info className="w-4 h-4 text-blue-600" />
              }
            ],
            columns: 2
          }
        ] : []}
        actions={[
          {
            label: 'Edit Schedule',
            onClick: () => {
              setShowViewDialog(false);
              setShowEditScheduleDialog(true);
            },
            variant: 'default',
            icon: <Edit className="w-4 h-4" />
          },
          {
            label: 'Delete Schedule',
            onClick: () => {
              setShowViewDialog(false);
              setShowDeleteScheduleDialog(true);
            },
            variant: 'destructive',
            icon: <Trash2 className="w-4 h-4" />
          }
        ]}
        showPrintButton={true}
        showCopyButton={true}
      />
      </div>
    </>
  );
} 