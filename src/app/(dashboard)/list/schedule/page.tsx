"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Calendar, Clock, Users, BookOpen, Building2, Search,
  RefreshCw, Eye, GraduationCap, Grid3x3, List
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/PageHeader/PageHeader";
import SummaryCard from "@/components/SummaryCard";
import { EmptyState } from '@/components/reusable';
import { PageSkeleton } from '@/components/reusable/Skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';

interface Schedule {
  scheduleId: number;
  day: string;
  startTime: string;
  endTime: string;
  subject: {
    id: number;
    name: string;
    code: string;
  };
  section: {
    id: number;
    name: string;
    studentCount: number;
  };
  room: {
    roomNo: string;
    roomType: string;
    building: string;
    floor: string;
  } | null;
  semester: {
    id: number;
    type: string;
    year: number;
  } | null;
  status: string;
}

const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabels = {
  'MONDAY': 'Monday',
  'TUESDAY': 'Tuesday',
  'WEDNESDAY': 'Wednesday',
  'THURSDAY': 'Thursday',
  'FRIDAY': 'Friday',
  'SATURDAY': 'Saturday',
  'SUNDAY': 'Sunday'
};

// Generate time slots from 7 AM to 9 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 21) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function InstructorSchedulePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'timetable' | 'list'>('timetable');

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/schedules/instructor');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setSchedules(result.schedules || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchSchedules();
      toast.success('Schedule refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh schedule');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchSchedules]);

  // Filter and sort schedules
  const filteredSchedules = useMemo(() => {
    let filtered = [...schedules];

    // Apply day filter
    if (dayFilter !== 'all') {
      filtered = filtered.filter(s => s.day === dayFilter);
    }

    // Apply search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.subject.name.toLowerCase().includes(search) ||
        s.subject.code.toLowerCase().includes(search) ||
        s.section.name.toLowerCase().includes(search) ||
        (s.room?.roomNo.toLowerCase().includes(search) ?? false)
      );
    }

    // Sort by day and time
    filtered.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return filtered;
  }, [schedules, dayFilter, debouncedSearch]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    filteredSchedules.forEach(schedule => {
      if (!grouped[schedule.day]) {
        grouped[schedule.day] = [];
      }
      grouped[schedule.day].push(schedule);
    });
    return grouped;
  }, [filteredSchedules]);

  // Helper function to check if a time slot is the start of a schedule
  const getScheduleAtTimeSlot = (day: string, timeSlot: string) => {
    return filteredSchedules.find(schedule => {
      if (schedule.day !== day) return false;
      return schedule.startTime === timeSlot;
    });
  };

  // Helper function to check if a time slot is part of a schedule (but not the start)
  const isPartOfSchedule = (day: string, timeSlot: string) => {
    return filteredSchedules.some(schedule => {
      if (schedule.day !== day) return false;
      if (schedule.startTime === timeSlot) return false; // Already handled as start
      
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const [slotHour, slotMin] = timeSlot.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const slotMinutes = slotHour * 60 + slotMin;
      
      return slotMinutes > startMinutes && slotMinutes < endMinutes;
    });
  };

  // Get schedule duration in time slots (30-minute intervals)
  const getScheduleDuration = (schedule: Schedule) => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.ceil((endMinutes - startMinutes) / 30);
  };

  const handleViewSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowViewDialog(true);
  };

  const handleRecordAttendance = (scheduleId: number) => {
    router.push(`/list/attendance/record?scheduleId=${scheduleId}`);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-4">
        <div className="container mx-auto">
          <EmptyState
            icon={<Calendar className="w-12 h-12 text-red-500" />}
            title="Failed to Load Schedule"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc]">
      <div className="container mx-auto p-4 space-y-6">
        {/* Page Header */}
        <PageHeader
          title="My Schedule"
          subtitle="View your teaching schedule and class times"
          breadcrumbs={[{ label: "Schedule" }]}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Classes"
            value={schedules.length}
            icon={<BookOpen className="w-5 h-5" />}
            sublabel="All scheduled classes"
          />
          <SummaryCard
            label="Total Students"
            value={schedules.reduce((sum, s) => sum + s.section.studentCount, 0)}
            icon={<Users className="w-5 h-5" />}
            sublabel="Across all classes"
          />
          <SummaryCard
            label="This Week"
            value={filteredSchedules.length}
            icon={<Calendar className="w-5 h-5" />}
            sublabel={dayFilter !== 'all' ? `Filtered by ${dayLabels[dayFilter as keyof typeof dayLabels]}` : "All classes this week"}
          />
        </div>

        {/* Schedule View */}
        {filteredSchedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={<Calendar className="w-12 h-12 text-gray-400" />}
                title="No Schedules Found"
                description={searchTerm || dayFilter !== 'all' 
                  ? "Try adjusting your filters to see more results"
                  : "You don't have any scheduled classes yet"}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'timetable' ? (
          /* Weekly Timetable View */
          <Card className="overflow-hidden p-0">
            <CardHeader>
              {/* Blue Gradient Header */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6]">
                <div className="py-4 sm:py-6">
                  <div className="flex items-center gap-3 px-4 sm:px-6">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Weekly Timetable</h3>
                      <p className="text-blue-100 text-sm">View your weekly class schedule</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Controls */}
            <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by subject, section, or room..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={dayFilter} onValueChange={setDayFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      <SelectItem value="MONDAY">Monday</SelectItem>
                      <SelectItem value="TUESDAY">Tuesday</SelectItem>
                      <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                      <SelectItem value="THURSDAY">Thursday</SelectItem>
                      <SelectItem value="FRIDAY">Friday</SelectItem>
                      <SelectItem value="SATURDAY">Saturday</SelectItem>
                      <SelectItem value="SUNDAY">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border rounded-lg p-1 bg-gray-50">
                    <Button
                      variant={viewMode === 'timetable' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('timetable')}
                      className="h-8"
                    >
                      <Grid3x3 className="w-4 h-4 mr-1" />
                      Timetable
                    </Button>
                    <Button
                      variant={(viewMode as 'timetable' | 'list') === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8"
                    >
                      <List className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  </div>
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
            </div>
            
            <CardContent className="p-6 sm:p-6">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header with days */}
                  <div className="grid grid-cols-8 border-b-2 border-gray-200 sticky top-0 bg-white z-10">
                    <div className="p-3 font-semibold text-gray-700 border-r border-gray-200">
                      Time
                    </div>
                    {dayOrder.map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          setDayFilter(dayFilter === day ? 'all' : day);
                        }}
                        className={`p-3 font-semibold text-center border-r border-gray-200 last:border-r-0 transition-colors ${
                          dayFilter === day
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {dayLabels[day as keyof typeof dayLabels]}
                      </button>
                    ))}
                  </div>
                  
                  {/* Time slots and schedule grid */}
                  <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                    <table className="w-full border-collapse">
                      <tbody>
                        {timeSlots.map((timeSlot, slotIndex) => {
                          const isNewHour = timeSlot.endsWith(':00');
                          
                          return (
                            <tr
                              key={timeSlot}
                              className={`border-b border-gray-100 ${
                                isNewHour ? 'bg-gray-50' : ''
                              }`}
                            >
                              {/* Time column */}
                              <td className={`p-2 border-r border-gray-200 text-xs text-gray-600 w-16 ${
                                isNewHour ? 'font-semibold' : 'text-gray-400'
                              }`}>
                                {isNewHour ? timeSlot : ''}
                              </td>
                              
                              {/* Day columns */}
                              {dayOrder.map(day => {
                                const schedule = getScheduleAtTimeSlot(day, timeSlot);
                                const isPartOf = isPartOfSchedule(day, timeSlot);
                                
                                if (isPartOf) {
                                  // This cell is part of a multi-slot schedule, skip rendering
                                  return null;
                                }
                                
                                if (schedule) {
                                  const duration = getScheduleDuration(schedule);
                                  return (
                                    <td
                                      key={day}
                                      className="border-r border-gray-200 last:border-r-0 p-1 align-top"
                                      rowSpan={duration}
                                    >
                                      <div
                                        className="bg-blue-500 text-white rounded-lg p-2 cursor-pointer hover:bg-blue-600 transition-colors shadow-sm h-full flex flex-col relative group"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewSchedule(schedule);
                                        }}
                                      >
                                        <div className="font-semibold text-xs mb-1 line-clamp-1">
                                          {schedule.subject.code}
                                        </div>
                                        <div className="text-xs font-medium mb-1 line-clamp-2 flex-1">
                                          {schedule.subject.name}
                                        </div>
                                        <div className="text-xs opacity-90 flex items-center gap-1 mb-1">
                                          <Users className="w-3 h-3 flex-shrink-0" />
                                          <span className="line-clamp-1">{schedule.section.name}</span>
                                        </div>
                                        {schedule.room && (
                                          <div className="text-xs opacity-90 flex items-center gap-1 mb-1">
                                            <Building2 className="w-3 h-3 flex-shrink-0" />
                                            <span className="line-clamp-1">{schedule.room.roomNo}</span>
                                          </div>
                                        )}
                                        <div className="text-xs opacity-75 mt-auto">
                                          {schedule.startTime} - {schedule.endTime}
                                        </div>
                                        {/* Quick action button on hover */}
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRecordAttendance(schedule.scheduleId);
                                            }}
                                          >
                                            Record
                                          </Button>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }
                                
                                return (
                                  <td
                                    key={day}
                                    className="border-r border-gray-200 last:border-r-0 p-2"
                                  />
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* List View */
          <div className="space-y-6">
            {dayOrder.map(day => {
              const daySchedules = schedulesByDay[day];
              if (!daySchedules || daySchedules.length === 0) return null;

              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {dayLabels[day as keyof typeof dayLabels]}
                      <Badge variant="outline" className="ml-2">
                        {daySchedules.length} {daySchedules.length === 1 ? 'class' : 'classes'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.scheduleId}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-sm">
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{schedule.subject.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {schedule.subject.code}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{schedule.section.name}</span>
                                </div>
                                {schedule.room && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    <span>{schedule.room.roomNo}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{schedule.section.studentCount} students</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSchedule(schedule)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRecordAttendance(schedule.scheduleId)}
                            >
                              Record Attendance
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Dialog */}
        <ViewDialog
          open={showViewDialog}
          onOpenChange={(open) => {
            setShowViewDialog(open);
            if (!open) setSelectedSchedule(null);
          }}
          title={selectedSchedule ? `${selectedSchedule.subject.name} Schedule` : 'Schedule Details'}
          subtitle={selectedSchedule ? `${selectedSchedule.subject.code} - ${selectedSchedule.section.name}` : ''}
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
                  label: 'Day', 
                  value: selectedSchedule.day.charAt(0) + selectedSchedule.day.slice(1).toLowerCase(), 
                  type: 'text' as const,
                  icon: <Calendar className="w-4 h-4 text-blue-600" />
                },
                { 
                  label: 'Time', 
                  value: `${selectedSchedule.startTime} - ${selectedSchedule.endTime}`, 
                  type: 'text' as const,
                  icon: <Clock className="w-4 h-4 text-blue-600" />
                },
                { 
                  label: 'Subject', 
                  value: selectedSchedule.subject.name, 
                  type: 'text' as const,
                  icon: <BookOpen className="w-4 h-4 text-blue-600" />
                },
                { 
                  label: 'Subject Code', 
                  value: selectedSchedule.subject.code, 
                  type: 'text' as const,
                  icon: <GraduationCap className="w-4 h-4 text-blue-600" />
                },
                { 
                  label: 'Section', 
                  value: selectedSchedule.section.name, 
                  type: 'text' as const,
                  icon: <Users className="w-4 h-4 text-blue-600" />
                },
                { 
                  label: 'Students', 
                  value: `${selectedSchedule.section.studentCount} students`, 
                  type: 'text' as const,
                  icon: <Users className="w-4 h-4 text-blue-600" />
                },
                ...(selectedSchedule.room ? [{
                  label: 'Room',
                  value: `${selectedSchedule.room.roomNo} (${selectedSchedule.room.building}, ${selectedSchedule.room.floor})`,
                  type: 'text' as const,
                  icon: <Building2 className="w-4 h-4 text-blue-600" />
                }] : []),
                ...(selectedSchedule.semester ? [{
                  label: 'Semester',
                  value: `${selectedSchedule.semester.type} ${selectedSchedule.semester.year}`,
                  type: 'text' as const,
                  icon: <Calendar className="w-4 h-4 text-blue-600" />
                }] : [])
              ]
            }
          ] : []}
        />
      </div>
    </div>
  );
}

