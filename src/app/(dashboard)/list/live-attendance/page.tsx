"use client";

import { useState, useEffect, useRef } from 'react';
import { useMQTTClient } from '@/components/MQTTprovider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableList, TableListColumn } from '@/components/reusable/Table/TableList';
import { TablePagination } from '@/components/reusable/Table/TablePagination';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Filter,
  Download,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Eye,
  Zap,
  Target,
  Building,
  MapPin,
  Calendar,
  Timer,
  UserCheck,
  UserX,
  GraduationCap,
  Home,
  ChevronRight,
  Search
} from 'lucide-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel/QuickActionsPanel';
import SummaryCard from '@/components/SummaryCard';

interface AttendanceRecord {
  attendanceId: number;
  status: string;
  timestamp: string;
  student: {
    studentId: number;
    studentIdNum: string;
    firstName: string;
    lastName: string;
    rfidTag: string;
    Department: {
      departmentName: string;
      departmentCode: string;
    };
    CourseOffering: {
      courseCode: string;
      courseName: string;
    };
  };
  subjectSchedule?: {
    subject: {
      subjectCode: string;
      subjectName: string;
    };
    section: {
      sectionName: string;
    };
    instructor: {
      firstName: string;
      lastName: string;
    };
    room: {
      roomNo: string;
    };
  };
  rfidLog?: {
    location: string;
    reader?: {
      deviceName: string;
      room: {
        roomNo: string;
        roomBuildingLoc: string;
      };
    };
  };
}

interface LiveFeedData {
  records: AttendanceRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  statistics: {
    totalRecords: number;
    statusCounts: Record<string, number>;
  };
  recentActivity: any[];
}

// Helper function for formatting time
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};


// Define column configuration for live feed records
const LIVE_FEED_COLUMNS: TableListColumn<AttendanceRecord>[] = [
  { 
    header: "Student", 
    accessor: "studentName", 
    className: "text-center align-middle min-w-[120px] max-w-[180px] whitespace-normal font-medium text-blue-900 text-xs sm:text-sm", 
    render: (item: AttendanceRecord) => (
      <div className="text-center">
        <div className="font-semibold text-blue-900 text-xs sm:text-sm">
          {item.student.firstName} {item.student.lastName}
        </div>
        <div className="text-gray-600 text-xs">
          {item.student.studentIdNum}
        </div>
      </div>
    ),
    sortable: true 
  },
  { 
    header: "Department", 
    accessor: "department", 
    className: "text-center align-middle min-w-[100px] max-w-[150px] whitespace-normal text-blue-900 text-xs sm:text-sm", 
    render: (item: AttendanceRecord) => (
      <div className="text-center text-blue-900 text-xs sm:text-sm">
        {item.student.Department?.departmentName || 'N/A'}
      </div>
    ),
    sortable: true 
  },
  { 
    header: "Subject", 
    accessor: "subject", 
    className: "text-center align-middle min-w-[100px] max-w-[150px] whitespace-normal text-blue-900 text-xs sm:text-sm", 
    render: (item: AttendanceRecord) => (
      <div className="text-center text-blue-900 text-xs sm:text-sm">
        {item.subjectSchedule?.subject.subjectName || 'N/A'}
      </div>
    ),
    sortable: true 
  },
  { 
    header: "Status", 
    accessor: "status", 
    className: "text-center align-middle min-w-[80px] max-w-[100px] whitespace-nowrap", 
    render: (item: AttendanceRecord) => (
      <Badge variant={item.status === "PRESENT" ? "default" : item.status === "LATE" ? "secondary" : "destructive"} className="text-xs px-2 py-1 rounded-full flex justify-center">
        <span className="text-xs">{item.status}</span>
      </Badge>
    ),
    sortable: true
  },
  { 
    header: "Reader", 
    accessor: "reader", 
    className: "text-center align-middle min-w-[100px] max-w-[150px] whitespace-normal text-blue-900 text-xs sm:text-sm", 
    render: (item: AttendanceRecord) => (
      <div className="text-center text-blue-900 text-xs sm:text-sm">
        {(item.rfidLog as any)?.reader?.deviceName || 'N/A'}
      </div>
    ),
    sortable: true 
  },
  { 
    header: "Time", 
    accessor: "timestamp", 
    className: "text-center align-middle min-w-[80px] max-w-[120px] whitespace-nowrap text-blue-900 text-xs sm:text-sm", 
    render: (item: AttendanceRecord) => (
      <div className="text-center text-blue-900 text-xs sm:text-sm">
        {formatTime(item.timestamp)}
      </div>
    ),
    sortable: true 
  }
];


export default function LiveAttendanceFeed() {
  const [data, setData] = useState<LiveFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  
  // Development flag to force mock data
  const USE_MOCK_DATA = false; // Set to false to use real database
  
  // Development flag to force empty state (for testing)
  const FORCE_EMPTY_STATE = false; // Set to true to show empty state even if data exists
  
  // MQTT connection status
  const mqttClient = useMQTTClient();
  
  // Listen for MQTT messages and refresh data when new attendance records are created
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Track rejected/unrecognized scans from MQTT feedback
  const [rejectedScans, setRejectedScans] = useState<Array<{ time: string; rfid?: string; message: string }>>([]);
  
  useEffect(() => {
    if (mqttClient?.messages && mqttClient.messages.length > 0) {
      const latestMessage = mqttClient.messages[mqttClient.messages.length - 1];
      const messageId = `${latestMessage.topic}-${latestMessage.timestamp}`;
      
      // Only process if this is a new message we haven't seen before and not already refreshing
      if (messageId !== lastProcessedMessageId && 
          latestMessage.topic === '/attendance/run' && 
          !isRefreshing) {
        console.log('📡 New MQTT attendance message received:', latestMessage);
        setLastProcessedMessageId(messageId);
        setIsRefreshing(true);
        
        console.log('🔄 Refreshing live attendance data due to MQTT scan');
        // Small delay to allow the API to process the record
        setTimeout(async () => {
          await fetchData();
          setIsRefreshing(false);
        }, 1000);
      }
      // Capture feedback for invalid/unrecognized/error cards
      if (messageId !== lastProcessedMessageId && latestMessage.topic === '/attendance/feedback') {
        const status = (latestMessage as any)?.status;
        const rfid = (latestMessage as any)?.value;
        const message = (latestMessage as any)?.message || (status === 'unrecognized' ? 'Unrecognized card' : 'Feedback');
        if (status === 'unrecognized' || status === 'error') {
          setRejectedScans((prev) => [{ time: new Date().toISOString(), rfid, message }, ...prev].slice(0, 10));
        }
      }
    }
  }, [mqttClient?.messages, lastProcessedMessageId, isRefreshing]);
  const [filters, setFilters] = useState({
    studentId: '',
    subjectId: '',
    readerId: '',
    roomId: '',
    building: '',
    status: '',
    department: '',
    course: '',
    timeRange: ''
  });
  const [readers, setReaders] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  
  // Table state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortState, setSortState] = useState<{ field: string; order: 'asc' | 'desc' } | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Fetch RFID readers and buildings
  const fetchReaders = async () => {
    try {
      const response = await fetch('/api/rfid/readers');
      const result = await response.json();
      
      console.log('Readers API response:', result);
      if (result.success) {
        setReaders(result.data?.readers || []);
        const buildingsFromReaders = Object.keys(result.data?.readersByBuilding || {});
        setBuildings(buildingsFromReaders);
        
        // If no buildings from RFID readers, try to get them from rooms
        if (buildingsFromReaders.length === 0) {
          console.log('No buildings from RFID readers, trying rooms...');
          await fetchBuildingsFromRooms();
        }
      } else {
        // If API doesn't return success, provide default buildings
        const defaultBuildings = ['BuildingA', 'BuildingB', 'BuildingC', 'BuildingD', 'BuildingE'];
        setBuildings(defaultBuildings);
        console.log('Using default buildings (API not successful):', defaultBuildings);
      }
    } catch (err) {
      console.error('Failed to fetch readers:', err);
      // Set fallback values on error
      setReaders([]);
      setBuildings([]);
      // Try to get buildings from rooms as fallback
      await fetchBuildingsFromRooms();
    }
  };

  // Fetch buildings from rooms (fallback when no RFID readers)
  const fetchBuildingsFromRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const rooms = await response.json();
      
      console.log('Rooms API response:', rooms);
      if (Array.isArray(rooms)) {
        // Extract unique buildings from rooms
        const uniqueBuildings = [...new Set(rooms.map(room => room.roomBuildingLoc))];
        setBuildings(uniqueBuildings);
        console.log('Buildings from rooms:', uniqueBuildings);
      }
    } catch (err) {
      console.error('Failed to fetch buildings from rooms:', err);
      // Provide default buildings based on schema
      const defaultBuildings = ['BuildingA', 'BuildingB', 'BuildingC', 'BuildingD', 'BuildingE'];
      setBuildings(defaultBuildings);
      console.log('Using default buildings:', defaultBuildings);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const result = await response.json();
      
      // Handle both response formats: { data: [...] } and { success: true, data: [...] }
      console.log('Departments API response:', result);
      if (result.data) {
        setDepartments(result.data || []);
      } else if (Array.isArray(result)) {
        setDepartments(result);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setDepartments([]);
    }
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const result = await response.json();
      
      // Handle both response formats: { data: [...] } and { success: true, data: [...] }
      console.log('Courses API response:', result);
      if (result.data) {
        setCourses(result.data || []);
      } else if (Array.isArray(result)) {
        setCourses(result);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setCourses([]);
    }
  };

  // Fetch unique status values from attendance records
  const fetchStatusOptions = async () => {
    try {
      const response = await fetch('/api/attendance/status-options');
      const result = await response.json();
      
      console.log('Status options API response:', result);
      if (result.success) {
        setStatusOptions(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch status options:', err);
      // Fallback to default status options
      setStatusOptions(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']);
    }
  };


  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.readerId) params.append('readerId', filters.readerId);
      if (filters.roomId) params.append('roomId', filters.roomId);
      if (filters.building) params.append('building', filters.building);
      if (filters.status) params.append('status', filters.status);
      if (filters.department) params.append('department', filters.department);
      if (filters.course) params.append('course', filters.course);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      
      // Add current day filter to only show today's attendance
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      params.append('date', today);
      params.append('currentDay', 'true');
      
      console.log('🔍 DEBUG: Fetching live attendance data from API...');
      console.log('🔍 DEBUG: Current day filter:', today);
      console.log('🔍 DEBUG: API URL:', `/api/attendance/live-feed?${params}`);
      console.log('🔍 DEBUG: Full URL:', `${window.location.origin}/api/attendance/live-feed?${params}`);
      const response = await fetch(`/api/attendance/live-feed?${params}`);
      
      if (!response.ok) {
        // If API endpoint doesn't exist (404), show empty state instead of error
        if (response.status === 404) {
          console.log('Attendance API endpoint not found - showing empty state');
          setData({
            records: [],
            pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
            statistics: { totalRecords: 0, statusCounts: {} },
            recentActivity: []
          });
          setError(null);
          return;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      console.log('Records count:', result.data?.records?.length || 0);
      console.log('Records data:', result.data?.records);
      
      if (result.success) {
        // Handle both cases: data exists or empty array
        let data = result.data || {
          records: [],
          pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
          statistics: { totalRecords: 0, statusCounts: {} },
          recentActivity: []
        };
        
        // Force empty state for testing if flag is enabled
        if (FORCE_EMPTY_STATE) {
          console.log('🔧 FORCE_EMPTY_STATE is enabled - showing empty state');
          data = {
            records: [],
            pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
            statistics: { totalRecords: 0, statusCounts: {} },
            recentActivity: []
          };
        }
        
        // Debug: Log what data we're setting
        console.log('Setting data with records:', data.records?.length || 0);
        setData(data);
        setError(null);
      } else {
        // API returned success: false, but not an error - just empty data
        setData({
          records: [],
          pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
          statistics: { totalRecords: 0, statusCounts: {} },
          recentActivity: []
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      // Don't show error for network issues, just show empty state
      setData({
        records: [],
        pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
        statistics: { totalRecords: 0, statusCounts: {} },
        recentActivity: []
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time stream
  useEffect(() => {
    // Don't set up stream if paused
    if (isPaused) {
      return;
    }

    const params = new URLSearchParams();
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    
    // Add current day filter for real-time stream
    const today = new Date().toISOString().split('T')[0];
    params.append('date', today);
    params.append('currentDay', 'true');
    
    const eventSource = new EventSource(`/api/attendance/stream?${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStreamConnected(true);
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log('📡 Real-time stream data received:', eventData);
        
        if (eventData.type === 'attendance_update' && eventData.records) {
          console.log('📊 New attendance records:', eventData.records);
          // Update the data with new records
          setData(prevData => {
            if (!prevData) return prevData;
            
            // Merge new records with existing ones, avoiding duplicates
            const existingIds = new Set(prevData.records.map(r => r.attendanceId));
            const newRecords = eventData.records.filter((r: AttendanceRecord) => 
              !existingIds.has(r.attendanceId)
            );
            
            console.log('🔄 Adding new records to table:', newRecords.length);
            return {
              ...prevData,
              records: [...newRecords, ...prevData.records].slice(0, 100) // Keep last 100 records for performance
            };
          });
        }
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    eventSource.onerror = () => {
      setStreamConnected(false);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [filters.studentId, filters.subjectId, isPaused]);

  // Initial data fetch
  useEffect(() => {
    const loadAllFilters = async () => {
      setLoadingFilters(true);
      try {
        await Promise.all([
          fetchReaders(),
          fetchDepartments(),
          fetchCourses(),
          fetchStatusOptions()
        ]);
      } finally {
        setLoadingFilters(false);
      }
    };
    
    loadAllFilters();
    fetchData();
    // Reset pagination when filters change
    setCurrentPage(1);
  }, [filters]);

  // Auto-refresh functionality with reduced frequency
  useEffect(() => {
    if (!autoRefresh || isPaused) return;

    const interval = setInterval(() => {
      fetchData();
    }, 15000); // Refresh every 15 seconds instead of 5

    return () => clearInterval(interval);
  }, [autoRefresh, isPaused]);



  // Table handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(id => id !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === data?.records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.records.map(record => record.attendanceId.toString()) || []);
    }
  };

  const handleSort = (accessor: string) => {
    setSortState(prev => {
      if (prev?.field === accessor) {
        return prev.order === 'asc' 
          ? { field: accessor, order: 'desc' }
          : null;
      }
      return { field: accessor, order: 'asc' };
    });
  };

  const isAllSelected = selectedIds.length === data?.records.length && data?.records.length > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < (data?.records.length || 0);

  // Pagination logic
  const totalPages = Math.ceil((data?.records.length || 0) / itemsPerPage);
  const paginatedRecords = data?.records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || [];



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'LATE':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'PRESENT': 'default',
      'LATE': 'secondary',
      'ABSENT': 'destructive',
      'EXCUSED': 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };


  const exportData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Timestamp', 'Student ID', 'Name', 'Department', 'Course', 'Subject', 'Status', 'RFID Reader', 'Room', 'Building', 'Location'].join(','),
      ...data.records.map(record => [
        record.timestamp,
        record.student.studentIdNum,
        `"${record.student.firstName} ${record.student.lastName}"`,
        record.student.Department?.departmentName || 'N/A',
        record.student.CourseOffering?.courseName || 'N/A',
        record.subjectSchedule?.subject.subjectName || 'N/A',
        record.status,
        (record.rfidLog as any)?.reader?.deviceName || 'N/A',
        (record.rfidLog as any)?.reader?.room?.roomNo || 'N/A',
        (record.rfidLog as any)?.reader?.room?.roomBuildingLoc || 'N/A',
        record.rfidLog?.location || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-feed-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden">
        <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading live attendance feed...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="w-full max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-4 space-y-4 sm:space-y-6">
        
        {/* Main Navigation Header Card */}
        <div className="relative">
          <PageHeader
            title="Live Attendance Feed"
            subtitle={`Real-time attendance monitoring for today (${new Date().toLocaleDateString()})`}
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Attendance Management', href: '/attendance' },
              { label: 'Live Feed' }
            ]}
          />
          
          {/* MQTT Connection Status in Header */}
          <div className="absolute top-4 right-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              mqttClient?.status === 'connected' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              <Wifi className="h-4 w-4" />
              <span>{mqttClient?.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
            </div>
        </div>
      </div>

        {/* Live Feed Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live/Pause Toggle */}
          <div className="flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setIsPaused(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                !isPaused
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Live</span>
            </button>
            <button
              onClick={() => setIsPaused(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isPaused
                  ? 'bg-white text-gray-700 shadow-sm border border-gray-200' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Timer className="h-4 w-4" />
              <span>Pause</span>
            </button>
          </div>

        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Activity className="h-5 w-5" />}
              label="Live Records"
              value={data.statistics.totalRecords}
              sublabel="Total attendance records"
            />
            <SummaryCard
              icon={<CheckCircle className="h-5 w-5" />}
              label="Present Today"
              value={data.statistics.statusCounts.PRESENT || 0}
              valueClassName="text-blue-600"
              sublabel="Students marked present"
            />
            <SummaryCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Late Arrivals"
              value={data.statistics.statusCounts.LATE || 0}
              valueClassName="text-blue-600"
              sublabel="Students arrived late"
            />
            <SummaryCard
              icon={<XCircle className="h-5 w-5" />}
              label="Absent Today"
              value={data.statistics.statusCounts.ABSENT || 0}
              valueClassName="text-blue-600"
              sublabel="Students marked absent"
            />
          </div>
        )}

        {/* Rejected scans (invalid/unregistered/not on schedule) */}
        {rejectedScans.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-yellow-800">Recent rejected scans</div>
                  <div className="text-xs text-yellow-700">Unrecognized card or not on schedule</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setRejectedScans([])} className="rounded">Clear</Button>
              </div>
              <ul className="mt-2 space-y-1">
                {rejectedScans.slice(0, 5).map((r, idx) => (
                  <li key={`${r.time}-${idx}`} className="text-xs text-yellow-800">
                    {new Date(r.time).toLocaleTimeString()} – {r.message}{r.rfid ? ` (RFID: ${r.rfid})` : ''}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions Panel */}
        <div className="w-full pt-2 sm:pt-3 overflow-x-hidden">
          <QuickActionsPanel
            variant="premium"
            title="Live Feed Controls"
            subtitle="Monitor and manage real-time attendance data"
            icon={
              <div className="w-6 h-6 text-white">
                <Activity className="w-6 h-6" />
              </div>
            }
            actionCards={[
              {
                id: 'auto-refresh',
                label: 'Auto Refresh',
                description: 'Toggle live updates',
                icon: <RefreshCw className="w-5 h-5 text-white" />,
                onClick: fetchData,
                toggle: {
                  enabled: autoRefresh && !isPaused,
                  onToggle: () => setAutoRefresh(!autoRefresh)
                }
              },
              {
                id: 'manual-refresh',
                label: 'Refresh Now',
                description: 'Check for new attendance records',
                icon: <RefreshCw className="w-5 h-5 text-white" />,
                onClick: () => {
                  console.log('🔄 Manual refresh triggered');
                  fetchData();
                }
              },
              {
                id: 'export-data',
                label: 'Export Data',
                description: 'Download attendance reports',
                icon: <Download className="w-5 h-5 text-white" />,
                onClick: exportData
              },
              {
                id: 'generate-reports',
                label: 'Generate Reports',
                description: 'Create attendance analytics',
                icon: <BarChart3 className="w-5 h-5 text-white" />,
                onClick: () => console.log('Generate reports')
              }
            ]}
          />
        </div>


      {/* Live Feed */}
      <div className="space-y-4">
        
        <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
              <CardHeader className="p-0">
                {/* Blue Gradient Header */}
                <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-4 sm:p-5 md:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
            <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">Live Attendance Records</h3>
                      <p className="text-blue-100 text-xs sm:text-sm">Real-time attendance monitoring and tracking</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {/* Search and Filter Section */}
              <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-end">
                  {/* Search Bar */}
                  <div className="relative w-full lg:w-auto lg:min-w-[250px] lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                value={filters.studentId}
                onChange={(e) => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-sm"
              />
            </div>
                  
                  {/* Quick Filter Dropdowns */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto lg:flex-shrink-0">
              <Select value={filters.building || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, building: value === "all" ? '' : value, readerId: '', roomId: '' }))}>
                      <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                        <SelectValue placeholder="Building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {loadingFilters ? (
                    <SelectItem value="loading" disabled>Loading buildings...</SelectItem>
                  ) : (
                    buildings.map(building => (
                      <SelectItem key={building} value={building}>{building}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
                    
              <Select value={filters.readerId || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, readerId: value === "all" ? '' : value, roomId: '' }))}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Reader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Readers</SelectItem>
                  {loadingFilters ? (
                    <SelectItem value="loading" disabled>Loading readers...</SelectItem>
                  ) : (
                    readers
                      .filter(reader => !filters.building || reader.room.roomBuildingLoc === filters.building)
                      .map(reader => (
                        <SelectItem key={reader.readerId} value={reader.readerId.toString()}>
                          {reader.deviceName} - {reader.room.roomNo} ({reader.room.roomBuildingLoc})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              
              <Select value={filters.status || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? '' : value }))}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[100px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {loadingFilters ? (
                    <SelectItem value="loading" disabled>Loading status options...</SelectItem>
                  ) : (
                    statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Select value={filters.department || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value === "all" ? '' : value }))}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {loadingFilters ? (
                    <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                  ) : (
                    departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name} {dept.code && `(${dept.code})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Select value={filters.course || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, course: value === "all" ? '' : value }))}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {loadingFilters ? (
                    <SelectItem value="loading" disabled>Loading courses...</SelectItem>
                  ) : (
                    courses.map(course => (
                      <SelectItem key={course.id} value={course.name}>
                        {course.name} {course.code && `(${course.code})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Select value={filters.timeRange || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value === "all" ? '' : value }))}>
                    <SelectTrigger className="w-full sm:w-auto sm:min-w-[120px] text-gray-500 rounded border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                      <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                  <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                  <SelectItem value="evening">Evening (6PM-10PM)</SelectItem>
                  <SelectItem value="last-hour">Last Hour</SelectItem>
                  <SelectItem value="last-2-hours">Last 2 Hours</SelectItem>
                </SelectContent>
              </Select>
                    
            </div>
          </div>
                </div>
              
            <CardContent>
              {error ? (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : data?.records.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No attendance records for today yet</p>
                    <p className="text-gray-400 text-sm mt-1">Start scanning RFID cards to see today's live attendance data here</p>
                </div>
              ) : (
                  <div className="overflow-x-auto bg-white/70 shadow-none relative p-4 sm:p-6">
                    <TableList
                      columns={LIVE_FEED_COLUMNS}
                      data={paginatedRecords}
                      loading={loading}
                      selectedIds={selectedIds}
                      emptyMessage="No attendance records found"
                      onSelectRow={handleSelectRow}
                      onSelectAll={handleSelectAll}
                      isAllSelected={isAllSelected}
                      isIndeterminate={isIndeterminate}
                      getItemId={(item) => item.attendanceId.toString()}
                      sortState={sortState}
                      onSort={handleSort}
                      className="border-0 shadow-none max-w-full"
                    />
                </div>
              )}
            </CardContent>
            
            {/* Pagination */}
            <div className="px-3 sm:px-4 md:px-5 lg:px-6 pb-4 sm:pb-5 md:pb-6">
              <TablePagination
                page={currentPage}
                pageSize={itemsPerPage}
                totalItems={data?.records.length || 0}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
                pageSizeOptions={[10, 25, 50, 100]}
                loading={loading}
              />
                        </div>
          </Card>
        
        </div>
      </div>
    </div>
  );
}
