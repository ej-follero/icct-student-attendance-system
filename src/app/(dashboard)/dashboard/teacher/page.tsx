"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Calendar, Clock, Users, BookOpen, TrendingUp, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, Eye, Plus, BarChart3,
  ChevronRight, Building2, UserCheck, FileText, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageHeader from "@/components/PageHeader/PageHeader";
import SummaryCard from "@/components/SummaryCard";
import { EmptyState } from '@/components/reusable';
import { SummaryCardSkeleton, PageSkeleton } from '@/components/reusable/Skeleton';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend, Tooltip as RechartsTooltip
} from 'recharts';

// Dashboard data types
interface TeacherDashboardData {
  instructor: {
    instructorId: number;
    firstName: string;
    lastName: string;
    email: string;
    gender: 'MALE' | 'FEMALE';
    department: string;
    departmentCode: string;
  };
  statistics: {
    totalClasses: number;
    totalStudents: number;
    totalSubjects: number;
    attendance: {
      total: number;
      today: number;
      period: number;
      rate: number;
      byStatus: Array<{ status: string; count: number }>;
    };
  };
  schedule: {
    today: Array<{
      scheduleId: number;
      time: string;
      subject: string;
      subjectCode: string;
      section: string;
      room: string;
      studentCount: number;
    }>;
    upcoming: Array<{
      scheduleId: number;
      day: string;
      time: string;
      subject: string;
      subjectCode: string;
      section: string;
      room: string;
      studentCount: number;
    }>;
  };
  classPerformance: Array<{
    scheduleId: number;
    sectionId: number;
    sectionName: string;
    subject: string;
    subjectCode: string;
    studentCount: number;
    attendanceCount: number;
    attendanceRate: number;
  }>;
  subjects: Array<{
    subjectId: number;
    subjectName: string;
    subjectCode: string;
  }>;
  recentAttendance: Array<{
    attendanceId: number;
    studentName: string;
    studentId: string;
    section: string;
    status: string;
    timestamp: string;
  }>;
  charts: {
    attendanceTrends: Array<{
      date: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
    }>;
  };
  metadata: {
    period: string;
    generatedAt: string;
    dataRange: { start: string; end: string };
  };
}

// Dashboard data fetching hook
const useTeacherDashboardData = (period: string = '7d') => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/dashboard/teacher?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching teacher dashboard data:', err);
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
const AttendanceTrendsChart: React.FC<{ data: TeacherDashboardData['charts']['attendanceTrends'] }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis />
        <RechartsTooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        />
        <Legend />
        <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
        <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
        <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
        <Line type="monotone" dataKey="excused" stroke="#6366f1" strokeWidth={2} name="Excused" />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Main Teacher Dashboard Component
export default function TeacherDashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data, loading, error, refetch } = useTeacherDashboardData(period);

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

  // Quick Actions handlers
  const handleRecordAttendance = () => {
    router.push('/list/attendance/record');
  };

  const handleViewSchedule = () => {
    router.push('/list/schedule');
  };

  const handleViewAttendanceLog = () => {
    router.push('/list/attendance/log');
  };

  const handleViewClasses = () => {
    router.push('/list/classes');
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
            icon={<Activity className="w-12 h-12 text-gray-500" />}
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXCUSED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="w-4 h-4" />;
      case 'ABSENT':
        return <XCircle className="w-4 h-4" />;
      case 'LATE':
        return <Clock className="w-4 h-4" />;
      case 'EXCUSED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc]">
      <div className="container mx-auto p-4 space-y-6">
        {/* Page Header */}
        <PageHeader
          title={`Welcome back, ${data.instructor.gender === 'MALE' ? 'Mr.' : 'Ms.'} ${data.instructor.lastName}`}
          subtitle="Here's what's happening with your classes today"
          breadcrumbs={[{ label: "Dashboard" }]}
        />

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Classes"
            value={data.statistics.totalClasses}
            icon={<BookOpen className="w-5 h-5" />}
            sublabel="Active classes"
          />
          <SummaryCard
            label="Total Students"
            value={data.statistics.totalStudents}
            icon={<Users className="w-5 h-5" />}
            sublabel="Across all classes"
          />
          <SummaryCard
            label="Attendance Rate"
            value={`${data.statistics.attendance.rate}%`}
            icon={<UserCheck className="w-5 h-5" />}
            sublabel={`${data.statistics.attendance.period} records this period`}
          />
          <SummaryCard
            label="Today's Attendance"
            value={data.statistics.attendance.today}
            icon={<Clock className="w-5 h-5" />}
            sublabel="Records today"
          />
        </div>

        {/* Today's Schedule & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Schedule
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/list/schedule">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.schedule.today.length > 0 ? (
                <div className="space-y-3">
                  {data.schedule.today.map((schedule) => (
                    <div
                      key={schedule.scheduleId}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{schedule.subject}</span>
                          <Badge variant="outline">{schedule.subjectCode}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>{schedule.section}</span>
                          <span className="mx-2">•</span>
                          <span>{schedule.time}</span>
                          <span className="mx-2">•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {schedule.room}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {schedule.studentCount} students
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/list/attendance/record?scheduleId=${schedule.scheduleId}`)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Record
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={handleRecordAttendance}
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Attendance
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleViewSchedule}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleViewAttendanceLog}
              >
                <Clock className="w-4 h-4 mr-2" />
                Attendance Log
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={handleViewClasses}
              >
                <Users className="w-4 h-4 mr-2" />
                My Classes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Attendance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.charts.attendanceTrends.length > 0 ? (
                <AttendanceTrendsChart data={data.charts.attendanceTrends} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No attendance data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Class Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Class Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.classPerformance.length > 0 ? (
                <div className="space-y-3">
                  {data.classPerformance.slice(0, 5).map((classItem) => (
                    <div
                      key={classItem.scheduleId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{classItem.sectionName}</div>
                        <div className="text-sm text-gray-600">{classItem.subject}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {classItem.studentCount} students • {classItem.attendanceCount} records
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {classItem.attendanceRate}%
                        </div>
                        <div className="text-xs text-gray-500">Attendance</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No class performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance & Upcoming Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Attendance
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/list/attendance/log">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentAttendance.length > 0 ? (
                <div className="space-y-2">
                  {data.recentAttendance.map((attendance) => (
                    <div
                      key={attendance.attendanceId}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(attendance.status)}
                        <div>
                          <div className="font-medium">{attendance.studentName}</div>
                          <div className="text-xs text-gray-500">
                            {attendance.section} • {new Date(attendance.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(attendance.status)}>
                        {attendance.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent attendance records</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Classes
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/list/schedule">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.schedule.upcoming.length > 0 ? (
                <div className="space-y-2">
                  {data.schedule.upcoming.map((schedule) => (
                    <div
                      key={schedule.scheduleId}
                      className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{schedule.subject}</span>
                        <Badge variant="outline" className="text-xs">{schedule.subjectCode}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>{schedule.section}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span>{schedule.day}</span>
                          <span>•</span>
                          <span>{schedule.time}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {schedule.room}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {schedule.studentCount} students
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming classes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
