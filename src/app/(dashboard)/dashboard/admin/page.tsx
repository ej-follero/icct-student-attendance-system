"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Users, User, BarChart2, CalendarCheck, AlertCircle, Megaphone, FileText, Settings, RefreshCw, 
  Download, Bell, CheckCircle, ChevronRight, Search, BookOpen, Building2, GraduationCap, 
  UserCheck, UserX, Clock, Info, Hash, Tag, Layers, BadgeInfo, Plus, Upload, Printer, 
  Columns3, List, X, Loader2, Eye, Database, Shield, Wifi, WifiOff, TrendingUp, 
  Activity, Zap, Target, Award, Users2, BookOpenCheck, Building, UserPlus, 
  Calendar, Mail, MessageSquare, AlertTriangle, CheckCircle2, XCircle, 
  ArrowUp, ArrowDown, Minus, Filter, MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/PageHeader/PageHeader";
import SummaryCard from "@/components/SummaryCard";
import { EmptyState } from '@/components/reusable';
import { SummaryCardSkeleton, PageSkeleton } from '@/components/reusable/Skeleton';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { useDebounce } from '@/hooks/use-debounce';
import { NotificationDialog } from '@/components/reusable/Dialogs/NotificationDialog';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip
} from 'recharts';

// Dashboard data types
interface DashboardData {
  statistics: {
    users: {
      total: number;
      active: number;
      students: { total: number; active: number };
      instructors: { total: number; active: number };
      guardians: { total: number; active: number };
    };
    academic: {
      courses: { total: number; active: number };
      departments: { total: number; active: number };
      sections: { total: number; active: number };
      subjects: { total: number; active: number };
    };
    attendance: {
      total: number;
      today: number;
      period: number;
      rate: number;
      byStatus: Array<{ status: string; _count: { status: number } }>;
      byDepartment: Array<{ userRole: string; _count: { userRole: number } }>;
    };
    rfid: {
      tags: { total: number; active: number };
      readers: { total: number; active: number };
      scans: { total: number; today: number; period: number };
      successRate: number;
    };
    system: {
      events: { total: number; active: number };
      announcements: { total: number; recent: number };
      emails: { total: number; unread: number; failed: number };
      backups: { total: number; status: Array<{ status: string; _count: { status: number } }> };
    };
    security: {
      alerts: { total: number; unresolved: number };
    };
  };
  charts: {
    attendanceTrends: Array<{
      date: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
    }>;
    departmentPerformance: Array<{
      department: string;
      departmentCode: string;
      students: number;
      courses: number;
      attendanceRate: number;
      totalAttendance: number;
    }>;
    rfidActivity: {
      scanTrends: Array<{ scanStatus: string; _count: { scanStatus: number } }>;
      readerStatus: Array<{ status: string; _count: { status: number } }>;
      tagStatus: Array<{ status: string; _count: { status: number } }>;
    };
  };
  recentActivity: {
    attendance: Array<any>;
    rfidScans: Array<any>;
    systemLogs: Array<any>;
    announcements: Array<any>;
    events: Array<any>;
    securityLogs: Array<any>;
  };
  systemHealth: {
    database: string;
    rfidSystem: string;
    emailSystem: string;
    security: string;
  };
  metadata: {
    period: string;
    generatedAt: string;
    dataRange: { start: string; end: string };
  };
}

// Dashboard data fetching hook
const useDashboardData = (period: string = '7d') => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/dashboard?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Attendance Trends Chart Component
const AttendanceTrendsChart: React.FC<{ data: DashboardData['charts']['attendanceTrends'] }> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Attendance Trends</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Late</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip />
            <Line 
              type="monotone" 
              dataKey="present" 
              stroke="#22c55e" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#22c55e' }}
              name="Present"
            />
            <Line 
              type="monotone" 
              dataKey="absent" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#ef4444' }}
              name="Absent"
            />
            <Line 
              type="monotone" 
              dataKey="late" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#f59e0b' }}
              name="Late"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Department Performance Chart Component
const DepartmentPerformanceChart: React.FC<{ data: DashboardData['charts']['departmentPerformance'] }> = ({ data }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Department Performance</h3>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="departmentCode" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
            <RechartsTooltip />
            <Bar 
              dataKey="attendanceRate" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
              name="Attendance Rate (%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// RFID Activity Chart Component
const RFIDActivityChart: React.FC<{ data: DashboardData['charts']['rfidActivity'] }> = ({ data }) => {
  const pieData = data.tagStatus.map(item => ({
    name: item.status,
    value: item._count.status,
    color: item.status === 'ACTIVE' ? '#22c55e' : item.status === 'INACTIVE' ? '#ef4444' : '#6b7280'
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">RFID System Status</h3>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={pieData} 
              dataKey="value" 
              nameKey="name" 
              cx="50%" 
              cy="50%" 
              outerRadius={80}
              label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Recent Activity Component
const RecentActivityWidget: React.FC<{ data: DashboardData['recentActivity'] }> = ({ data }) => {
  const allActivities = useMemo(() => {
    const activities = [
      ...data.attendance.slice(0, 3).map(item => ({
        id: `attendance-${item.attendanceId}`,
        type: 'attendance',
        title: 'Attendance Recorded',
        description: `${item.student?.firstName || 'Student'} ${item.student?.lastName || ''} - ${item.status}`,
        time: new Date(item.timestamp).toLocaleTimeString(),
        icon: CalendarCheck,
        color: 'text-green-600'
      })),
      ...data.rfidScans.slice(0, 3).map(item => ({
        id: `rfid-${item.logsId}`,
        type: 'rfid',
        title: 'RFID Scan',
        description: `Scan ${item.scanStatus} at ${item.location}`,
        time: new Date(item.timestamp).toLocaleTimeString(),
        icon: Wifi,
        color: 'text-blue-600'
      })),
      ...data.systemLogs.slice(0, 2).map(item => ({
        id: `system-${item.id}`,
        type: 'system',
        title: 'System Activity',
        description: `${item.actionType} - ${item.module}`,
        time: new Date(item.timestamp).toLocaleTimeString(),
        icon: Activity,
        color: 'text-gray-600'
      }))
    ];
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [data]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allActivities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${activity.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500 truncate">{activity.description}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// System Health Widget
const SystemHealthWidget: React.FC<{ health: DashboardData['systemHealth'] }> = ({ health }) => {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-50';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return CheckCircle2;
      case 'WARNING': return AlertTriangle;
      case 'ERROR': return XCircle;
      default: return Minus;
    }
  };

  const healthItems = [
    { name: 'Database', status: health.database, icon: Database },
    { name: 'RFID System', status: health.rfidSystem, icon: Wifi },
    { name: 'Email System', status: health.emailSystem, icon: Mail },
    { name: 'Security', status: health.security, icon: Shield }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">System Health</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {healthItems.map((item) => {
            const StatusIcon = getHealthIcon(item.status);
            return (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(item.status)}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{item.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export default function AdminDashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshIntervalMs, setAutoRefreshIntervalMs] = useState(30000); // default 30s
  const { data, loading, error, refetch } = useDashboardData(period);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Dashboard data refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh dashboard data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const id = setInterval(() => {
      refetch();
    }, autoRefreshIntervalMs);
    return () => clearInterval(id);
  }, [autoRefreshEnabled, autoRefreshIntervalMs, refetch]);

  // Quick Actions handlers (admin-focused)
  const handleManageUsers = () => {
    router.push('/list/users');
  };

  const handleManageSchedules = () => {
    router.push('/list/schedules');
  };

  const handleManageSubjects = () => {
    router.push('/list/subjects');
  };

  const handleManageCourses = () => {
    router.push('/list/courses');
  };

  const handleLiveAttendance = () => {
    router.push('/list/live-attendance');
  };

  const handleGenerateReports = () => {
    router.push('/reports');
  };

  const handleSendNotifications = () => {
    setShowNotificationDialog(true);
  };

  const handleSystemSettings = () => {
    router.push('/settings');
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-4">
        <div className="container mx-auto">
          <EmptyState
            icon={<AlertCircle className="w-12 h-12 text-red-500" />}
            title="Failed to Load Dashboard"
            description={error}
            action={
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-4">
        <div className="container mx-auto">
          <EmptyState
            icon={<Database className="w-12 h-12 text-gray-500" />}
            title="No Data Available"
            description="Unable to load dashboard data at this time."
            action={
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const { statistics } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-4">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <PageHeader
          title="Admin Dashboard"
          subtitle="Comprehensive overview of the ICCT Smart Attendance System"
          breadcrumbs={[{ label: "Dashboard" }]}
        />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 rounded">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-500">
              Last updated: {new Date(data.metadata.generatedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={autoRefreshEnabled} onCheckedChange={setAutoRefreshEnabled} />
              <span className="text-sm text-gray-600">Auto refresh</span>
            </div>
            <Select
              value={String(autoRefreshIntervalMs)}
              onValueChange={(v) => setAutoRefreshIntervalMs(Number(v))}
            >
              <SelectTrigger className="w-32 rounded">
                <SelectValue placeholder="Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15000">Every 15s</SelectItem>
                <SelectItem value="30000">Every 30s</SelectItem>
                <SelectItem value="60000">Every 1m</SelectItem>
                <SelectItem value="300000">Every 5m</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Users className="text-blue-500 w-5 h-5" />}
            label="Total Users"
            value={statistics.users.total}
            valueClassName="text-blue-900"
            sublabel={`${statistics.users.active} active`}
          />
          <SummaryCard
            icon={<CalendarCheck className="text-blue-500 w-5 h-5" />}
            label="Attendance Rate"
            value={`${statistics.attendance.rate.toFixed(1)}%`}
            valueClassName="text-blue-900"
            sublabel={`${statistics.attendance.today} today`}
          />
          <SummaryCard
            icon={<Wifi className="text-blue-500 w-5 h-5" />}
            label="RFID Scans"
            value={statistics.rfid.scans.today}
            valueClassName="text-blue-900"
            sublabel={`${statistics.rfid.successRate.toFixed(1)}% success rate`}
          />
          <SummaryCard
            icon={<BookOpen className="text-blue-500 w-5 h-5" />}
            label="Active Courses"
            value={statistics.academic.courses.active}
            valueClassName="text-blue-900"
            sublabel={`${statistics.academic.courses.total} total`}
          />
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<UserCheck className="text-blue-500 w-5 h-5" />}
            label="Students"
            value={statistics.users.students.active}
            valueClassName="text-blue-900"
            sublabel={`${statistics.users.students.total} total`}
          />
          <SummaryCard
            icon={<GraduationCap className="text-blue-500 w-5 h-5" />}
            label="Instructors"
            value={statistics.users.instructors.active}
            valueClassName="text-blue-900"
            sublabel={`${statistics.users.instructors.total} total`}
          />
          <SummaryCard
            icon={<Building2 className="text-blue-500 w-5 h-5" />}
            label="Departments"
            value={statistics.academic.departments.active}
            valueClassName="text-blue-900"
            sublabel={`${statistics.academic.departments.total} total`}
          />
          <SummaryCard
            icon={<AlertTriangle className="text-blue-500 w-5 h-5" />}
            label="Security Alerts"
            value={statistics.security.alerts.unresolved}
            valueClassName="text-blue-900"
            sublabel={`${statistics.security.alerts.total} total`}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceTrendsChart data={data.charts.attendanceTrends} />
          <DepartmentPerformanceChart data={data.charts.departmentPerformance} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RFIDActivityChart data={data.charts.rfidActivity} />
          <RecentActivityWidget data={data.recentActivity} />
          <SystemHealthWidget health={data.systemHealth} />
        </div>

        {/* Quick Actions */}
        <QuickActionsPanel
          variant="premium"
          title="Quick Actions"
          subtitle="Essential tools and shortcuts"
          icon={
            <div className="w-6 h-6 text-white">
              <Zap className="w-5 h-5" />
            </div>
          }
          actionCards={[
            {
              id: 'manage-users',
              label: 'Manage Users',
              description: 'View and manage all users',
              icon: <Users className="w-5 h-5 text-white" />,
              onClick: handleManageUsers
            },
            {
              id: 'manage-schedules',
              label: 'Manage Schedules',
              description: 'View and edit class schedules',
              icon: <Calendar className="w-5 h-5 text-white" />,
              onClick: handleManageSchedules
            },
            {
              id: 'manage-subjects',
              label: 'Manage Subjects',
              description: 'Create and update subjects',
              icon: <BookOpen className="w-5 h-5 text-white" />,
              onClick: handleManageSubjects
            },
            {
              id: 'manage-courses',
              label: 'Manage Courses',
              description: 'Create and update courses',
              icon: <GraduationCap className="w-5 h-5 text-white" />,
              onClick: handleManageCourses
            },
            {
              id: 'live-attendance',
              label: 'Live Attendance',
              description: 'Monitor real-time attendance',
              icon: <Wifi className="w-5 h-5 text-white" />,
              onClick: handleLiveAttendance
            },
            {
              id: 'generate-reports',
              label: 'Generate Reports',
              description: 'Export analytics data',
              icon: <FileText className="w-5 h-5 text-white" />,
              onClick: handleGenerateReports
            },
            {
              id: 'send-notifications',
              label: 'Send Notifications',
              description: 'Alert instructors & students',
              icon: <Bell className="w-5 h-5 text-white" />,
              onClick: handleSendNotifications
            },
            {
              id: 'system-settings',
              label: 'System Settings',
              description: 'Configure system preferences',
              icon: <Settings className="w-5 h-5 text-white" />,
              onClick: handleSystemSettings
            }
          ]}
          lastActionTime="2 minutes ago"
          onLastActionTimeChange={() => {}}
          collapsible={true}
          defaultCollapsed={false}
          onCollapseChange={(collapsed) => {
            // Handle panel collapse state if needed
            // Could save to localStorage or update user preferences
          }}
        />

        {/* Notification Dialog */}
        <NotificationDialog 
          open={showNotificationDialog}
          onOpenChange={setShowNotificationDialog}
        />
      </div>
    </div>
  );
}

