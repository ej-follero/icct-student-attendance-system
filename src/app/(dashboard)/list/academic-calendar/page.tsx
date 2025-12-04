"use client";

import { useState, useEffect, useMemo } from "react";
import { PageSkeleton } from "@/components/reusable/Skeleton";
import { 
  Calendar, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Users, 
  User,
  MapPin, 
  CheckCircle, 
  XCircle, 
  Search,
  Settings,
  FileText,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Copy,
  Share2,
  Archive,
  RefreshCw,
  BarChart2,
  Printer,
  X,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TablePagination } from '@/components/reusable/Table/TablePagination';
import { FilterChips } from '@/components/FilterChips';
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel/QuickActionsPanel';
import ImportDialog from "@/components/reusable/Dialogs/ImportDialog";
import { ExportDialog } from "@/components/reusable/Dialogs/ExportDialog";

// Types
interface AcademicEvent {
  id: number;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  category: 'academic' | 'administrative' | 'holiday' | 'special' | 'deadline';
  priority: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  attendees?: string[];
  isRecurring: boolean;
  recurrencePattern?: string;
  status: 'draft' | 'published' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  color: string;
  tags: string[];
}

interface AcademicYear {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  semesters: Semester[];
}

interface Semester {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  type: '1st' | '2nd' | 'Summer';
  isActive: boolean;
}

// Filter Panel Component
interface FilterPanelProps {
  academicYears: AcademicYear[];
  selectedYear: AcademicYear | null;
  selectedSemester: Semester | null;
  onYearChange: (year: AcademicYear | null) => void;
  onSemesterChange: (semester: Semester | null) => void;
  search: string;
  onSearchChange: (search: string) => void;
  filters: {
    category: string;
    priority: string;
    status: string;
    dateRange: string;
  };
  onFiltersChange: (filters: any) => void;
}

// Calendar View Component
interface CalendarViewProps {
  events: AcademicEvent[];
  currentDate: Date;
  viewMode: 'month' | 'week' | 'day' | 'timeline';
  selectedEvents: number[];
  onEventSelect: (eventId: number) => void;
}

function CalendarView({ events, currentDate, viewMode, selectedEvents, onEventSelect }: CalendarViewProps) {
  // Debug logging for CalendarView
  console.log('CalendarView received:', {
    eventsCount: events.length,
    events: events,
    viewMode,
    currentDate
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const checkDate = new Date(date);
      
      checkDate.setHours(0, 0, 0, 0);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      
      const isMatch = checkDate >= eventStart && checkDate <= eventEnd;
      
      // Debug logging for date matching
      if (isMatch) {
        console.log('Event matched to date:', {
          eventTitle: event.title,
          eventStart: eventStart.toDateString(),
          eventEnd: eventEnd.toDateString(),
          checkDate: checkDate.toDateString(),
          isMatch
        });
      }
      
      return isMatch;
    });
    
    return dayEvents;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (viewMode === 'month') {
    const days = getDaysInMonth(currentDate);
    const weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="calendar-month">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-200 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600' : ''}`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded cursor-pointer transition-all hover:shadow-sm ${
                        selectedEvents.includes(event.id) 
                          ? 'ring-2 ring-blue-500' 
                          : ''
                      }`}
                      style={{ backgroundColor: event.color + '20', color: event.color }}
                      onClick={() => onEventSelect(event.id)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {!event.allDay && (
                        <div className="text-xs opacity-75">
                          {formatTime(new Date(event.startDate))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`w-1.5 h-1.5 rounded-full cursor-help ${
                          event.status === 'published' ? 'bg-green-500' : 
                          event.status === 'draft' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {event.status === 'published' ? 'Published' : 
                                 event.status === 'draft' ? 'Draft' : 'Cancelled'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs opacity-75 cursor-help">
                          {event.priority === 'critical' ? '🔴' : 
                           event.priority === 'high' ? '🟡' : '🟢'}
                        </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {event.priority === 'critical' ? 'Critical Priority' : 
                                 event.priority === 'high' ? 'High Priority' : 'Medium/Low Priority'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'week') {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekDays: Date[] = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }

    const timeSlots = [];
    for (let hour = 6; hour <= 22; hour++) {
      timeSlots.push(hour);
    }

    return (
      <div className="calendar-week">
        {/* Time slots */}
        <div className="grid grid-cols-8 gap-1">
          <div className="w-16"></div> {/* Empty corner */}
          {weekDays.map(day => (
            <div key={day.toDateString()} className="p-2 text-center text-sm font-medium border-b">
              <div className="text-gray-600">{day.toLocaleDateString([], { weekday: 'short' })}</div>
              <div className={`text-lg ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-600'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
          
          {timeSlots.map(hour => (
            <div key={hour} className="contents">
              <div className="w-16 p-1 text-xs text-gray-500 text-right border-r">
                {hour}:00
              </div>
              {weekDays.map(day => {
                const dayEvents = events.filter(event => {
                  const eventDate = new Date(event.startDate);
                  const eventHour = eventDate.getHours();
                  return eventDate.toDateString() === day.toDateString() && eventHour === hour;
                }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                return (
                  <div key={`${day.toDateString()}-${hour}`} className="min-h-[60px] border-b border-r relative">
                    {dayEvents.map((event, index) => {
                      const eventDate = new Date(event.startDate);
                      const minutes = eventDate.getMinutes();
                      // Calculate top position: base offset from minutes within the hour + index offset for overlapping events
                      const topOffset = (minutes / 60) * 60 + (index * 50); // 50px per overlapping event
                      
                      return (
                      <div
                        key={event.id}
                        className={`absolute left-1 right-1 p-1 text-xs rounded cursor-pointer ${
                          selectedEvents.includes(event.id) 
                            ? 'ring-2 ring-blue-500' 
                            : ''
                        }`}
                          style={{ 
                            backgroundColor: event.color + '20', 
                            color: event.color,
                            top: `${topOffset}px`,
                            zIndex: 10 + index
                          }}
                        onClick={() => onEventSelect(event.id)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-75">
                          {formatTime(new Date(event.startDate))}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'day') {
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startDate);
      const checkDate = new Date(currentDate);
      
      checkDate.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
      return eventDate.toDateString() === checkDate.toDateString();
    });

    const allDayEvents = dayEvents.filter(event => event.allDay);
    const timedEvents = dayEvents.filter(event => !event.allDay).sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const timeSlots = [];
    for (let hour = 6; hour <= 22; hour++) {
      timeSlots.push(hour);
    }

    return (
      <div className="calendar-day">
        {/* Day Header */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h3 className="text-xl font-semibold text-blue-600">
            {currentDate.toLocaleDateString([], { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        {/* All Day Events */}
        {allDayEvents.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">All Day Events</h4>
            <div className="space-y-2">
              {allDayEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-3 border-l-4 rounded cursor-pointer transition-colors ${
                    selectedEvents.includes(event.id) 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  style={{ borderLeftColor: event.color }}
                  onClick={() => onEventSelect(event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{event.title}</h5>
                        <Badge 
                          className={`text-xs ${EVENT_CATEGORIES[event.category].textColor} bg-opacity-10`}
                        >
                          {EVENT_CATEGORIES[event.category].label}
                        </Badge>
                        <Badge className={`text-xs ${PRIORITY_LEVELS[event.priority].color}`}>
                          {PRIORITY_LEVELS[event.priority].label}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600">{event.description}</p>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEventSelect(event.id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEventSelect(event.id)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time-based Events */}
        <div className="relative">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Scheduled Events</h4>
          <div className="space-y-2">
            {timeSlots.map(hour => {
              // Get all events that start in this hour
              const hourEvents = timedEvents.filter(event => {
                const eventHour = new Date(event.startDate).getHours();
                return eventHour === hour;
              }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

              // Group events by their exact start time (hour + minutes)
              const eventsByTime = hourEvents.reduce((acc, event) => {
                const eventDate = new Date(event.startDate);
                const timeKey = `${eventDate.getHours()}:${String(eventDate.getMinutes()).padStart(2, '0')}`;
                if (!acc[timeKey]) {
                  acc[timeKey] = [];
                }
                acc[timeKey].push(event);
                return acc;
              }, {} as Record<string, typeof hourEvents>);

              // Get unique time slots for this hour
              const timeKeys = Object.keys(eventsByTime).sort();

              if (timeKeys.length === 0) {
              return (
                <div key={hour} className="flex">
                  <div className="w-20 p-2 text-sm text-gray-500 text-right border-r border-gray-200">
                    {hour}:00
                  </div>
                    <div className="flex-1 min-h-[60px] border-b border-gray-200"></div>
                  </div>
                );
              }

              return (
                <div key={hour} className="space-y-2">
                  {timeKeys.map(timeKey => {
                    const eventsAtTime = eventsByTime[timeKey];
                    const [hours, minutes] = timeKey.split(':');
                    const displayTime = `${hours}:${minutes.padStart(2, '0')}`;

                    return (
                      <div key={timeKey} className="flex">
                        <div className="w-20 p-2 text-sm text-gray-500 text-right border-r border-gray-200">
                          {displayTime}
                        </div>
                        <div className="flex-1 min-h-[60px] border-b border-gray-200">
                          <div className="flex gap-2 p-2">
                            {eventsAtTime.map((event) => (
                      <div
                        key={event.id}
                                className={`flex-1 p-3 rounded cursor-pointer shadow-sm ${
                          selectedEvents.includes(event.id) 
                            ? 'ring-2 ring-blue-500' 
                            : 'hover:shadow-md'
                        }`}
                        style={{ 
                          backgroundColor: event.color + '20', 
                                  color: event.color
                        }}
                        onClick={() => onEventSelect(event.id)}
                      >
                        <div className="flex items-start justify-between h-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm truncate">{event.title}</h5>
                              <Badge 
                                className={`text-xs ${EVENT_CATEGORIES[event.category].textColor} bg-opacity-10`}
                              >
                                {EVENT_CATEGORIES[event.category].label}
                              </Badge>
                            </div>
                            <div className="text-xs opacity-75">
                              {formatTime(new Date(event.startDate))} - {formatTime(new Date(event.endDate))}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-xs opacity-75 mt-1 line-clamp-2">{event.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                                      e.stopPropagation();
                                      onEventSelect(event.id);
                                    }}>
                              <Eye className="w-3 h-3" />
                            </Button>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                                      e.stopPropagation();
                                      onEventSelect(event.id);
                                    }}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                          </div>
                  </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* No Events Message */}
        {dayEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
            <p className="text-gray-500">
              {currentDate.toLocaleDateString([], { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })} is free
            </p>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'timeline') {
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return (
      <div className="calendar-timeline">
        <div className="space-y-4">
          {sortedEvents.map(event => (
            <div
              key={event.id}
              className={`p-4 border-l-4 rounded-r-lg cursor-pointer transition-colors ${
                selectedEvents.includes(event.id) 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              style={{ borderLeftColor: event.color }}
              onClick={() => onEventSelect(event.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge 
                      className={`text-xs ${EVENT_CATEGORIES[event.category].textColor} bg-opacity-10`}
                    >
                      {EVENT_CATEGORIES[event.category].label}
                    </Badge>
                    <Badge className={`text-xs ${PRIORITY_LEVELS[event.priority].color}`}>
                      {PRIORITY_LEVELS[event.priority].label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {event.startDate.toLocaleDateString()} - {event.endDate.toLocaleDateString()}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                    {!event.allDay && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(new Date(event.startDate))} - {formatTime(new Date(event.endDate))}
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEventSelect(event.id)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEventSelect(event.id)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function FilterPanel({
  academicYears,
  selectedYear,
  selectedSemester,
  onYearChange,
  onSemesterChange,
  search,
  onSearchChange,
  filters,
  onFiltersChange
}: FilterPanelProps) {
  return (
    <Card className="mb-6 overflow-hidden p-0">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Filter className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Filter & Search</h3>
            <p className="text-blue-100 text-sm">Refine your event search</p>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Search */}
          <div className="lg:col-span-3">
            <Label htmlFor="search" className="text-gray-700">Search Events</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by title, description, or tags..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 rounded"
              />
            </div>
          </div>
          
          {/* Academic Year */}
          <div className="lg:col-span-2">
            <Label htmlFor="academicYear" className="text-gray-700">Academic Year</Label>
            <Select 
              value={selectedYear?.id.toString()} 
              onValueChange={(value) => {
                const year = academicYears.find(y => y.id.toString() === value);
                onYearChange(year || null);
                onSemesterChange(year?.semesters[0] || null);
              }}
            >
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="Select academic year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year.id} value={year.id.toString()}>
                    {year.name} {year.isActive && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Semester */}
          <div className="lg:col-span-2">
            <Label htmlFor="semester" className="text-gray-700">Semester</Label>
            <Select 
              value={selectedSemester?.id.toString()} 
              onValueChange={(value) => {
                const semester = selectedYear?.semesters.find(s => s.id.toString() === value);
                onSemesterChange(semester || null);
              }}
            >
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {selectedYear?.semesters.map(semester => (
                  <SelectItem key={semester.id} value={semester.id.toString()}>
                    {semester.name} {semester.isActive && "(Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Category */}
          <div className="lg:col-span-1">
            <Label htmlFor="category" className="text-gray-700">Category</Label>
            <Select value={filters.category} onValueChange={(value) => onFiltersChange({ ...filters, category: value })}>
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(EVENT_CATEGORIES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Priority */}
          <div className="lg:col-span-1">
            <Label htmlFor="priority" className="text-gray-700">Priority</Label>
            <Select value={filters.priority} onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}>
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Status */}
          <div className="lg:col-span-1">
            <Label htmlFor="status" className="text-gray-700">Status</Label>
            <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range */}
          <div className="lg:col-span-2">
            <Label htmlFor="dateRange" className="text-gray-700">Date Range</Label>
            <Select value={filters.dateRange} onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value })}>
              <SelectTrigger className="rounded text-gray-600">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="semester">This semester</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const EVENT_CATEGORIES = {
  academic: { label: 'Academic', color: 'bg-blue-500', textColor: 'text-blue-500' },
  administrative: { label: 'Administrative', color: 'bg-orange-500', textColor: 'text-orange-500' },
  holiday: { label: 'Holiday', color: 'bg-red-500', textColor: 'text-red-500' },
  special: { label: 'Special Event', color: 'bg-purple-500', textColor: 'text-purple-500' },
  deadline: { label: 'Deadline', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
};

const PRIORITY_LEVELS = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

export default function AcademicCalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'list' | 'timeline'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    status: 'all',
    dateRange: 'all',
  });
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  
  // Pagination state for list and timeline views
  const [listPage, setListPage] = useState(1);
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineItemsPerPage, setTimelineItemsPerPage] = useState(10);
  
  // Add Event form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    category: 'academic' as const,
    priority: 'medium' as const,
    startDate: '',
    endDate: '',
    location: '',
    allDay: false,
    recurring: false,
    requiresApproval: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Edit Event form state
  const [editEvent, setEditEvent] = useState<{
    title: string;
    description: string;
    category: 'academic' | 'administrative' | 'holiday' | 'special' | 'deadline';
    priority: 'low' | 'medium' | 'high' | 'critical';
    startDate: string;
    endDate: string;
    location: string;
    allDay: boolean;
    recurring: boolean;
    requiresApproval: boolean;
  }>({
    title: '',
    description: '',
    category: 'academic',
    priority: 'medium',
    startDate: '',
    endDate: '',
    location: '',
    allDay: false,
    recurring: false,
    requiresApproval: false
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  
  // Import/Export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      reminders: true
    },
    display: {
      showWeekends: true,
      showHolidays: true,
      colorCoding: true
    },
    integration: {
      googleSync: false,
      outlookSync: false
    }
  });

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await loadAcademicYears();
        
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('academic-calendar-settings');
        if (savedSettings) {
          try {
            setSettings(JSON.parse(savedSettings));
          } catch (error) {
            console.error('Error loading settings:', error);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Reload events when academic year/semester selection changes
  useEffect(() => {
    if (selectedYear && selectedSemester) {
      loadEvents();
    } else {
      // Load events even without academic year/semester selection
      loadEvents();
    }
  }, [selectedYear, selectedSemester]);

  // Reload events when filters change
  useEffect(() => {
    loadEvents();
  }, [filters, search]);

  const loadAcademicYears = async () => {
    try {
      setError(null);
      const response = await fetch('/api/academic-years');
      if (!response.ok) throw new Error('Failed to fetch academic years');
      const data = await response.json();
      setAcademicYears(data);
      
      // Auto-select the first academic year and its first semester
      if (data.length > 0) {
        setSelectedYear(data[0]);
        if (data[0].semesters.length > 0) {
          setSelectedSemester(data[0].semesters[0]);
        }
      }
    } catch (error) {
      console.error('Error loading academic years:', error);
      setError('Failed to load academic years');
    }
  };

  const loadEvents = async () => {
    try {
      setError(null);
      setEventsLoading(true);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      
      // Add date range filtering if academic year/semester is selected
      if (selectedYear && selectedSemester) {
        const startDate = selectedSemester.startDate instanceof Date 
          ? selectedSemester.startDate 
          : new Date(selectedSemester.startDate);
        const endDate = selectedSemester.endDate instanceof Date 
          ? selectedSemester.endDate 
          : new Date(selectedSemester.endDate);
        
        params.append('startDate', startDate.toISOString().split('T')[0]);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      // Add other filters
      if (filters.category !== 'all') {
        params.append('eventType', filters.category.toUpperCase());
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status.toUpperCase());
      }
      if (filters.priority !== 'all') {
        params.append('priority', filters.priority.toUpperCase());
      }
      if (search) {
        params.append('search', search);
      }
      
      // Add pagination for better performance
      params.append('pageSize', '100');
      
      console.log('Fetching events from:', `/api/events?${params.toString()}`);
      
      const response = await fetch(`/api/events?${params.toString()}`);
      console.log('API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      // Transform the API response to match our AcademicEvent interface
      const transformedEvents: AcademicEvent[] = data.items?.map((event: any) => {
        console.log('Transforming event:', event);
        
        // The API returns date and startTime/endTime separately, combine them
        const startDateTime = event.startTime 
          ? new Date(event.date + 'T' + event.startTime)
          : new Date(event.date + 'T00:00:00');
        
        const endDateTime = event.endTime 
          ? new Date(event.date + 'T' + event.endTime)
          : startDateTime;

        const transformedEvent = {
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: !event.startTime || event.startTime === '00:00',
          category: mapEventTypeToCategory(event.eventType),
          priority: mapPriorityToLevel(event.priority),
          location: event.location,
          isRecurring: false, // TODO: Add recurrence support
          status: mapStatusToEventStatus(event.status),
          createdBy: event.createdBy,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt),
          requiresApproval: event.requiresRegistration || false,
          color: getEventColor(mapEventTypeToCategory(event.eventType)),
          tags: [], // TODO: Add tags support
        };
        
        console.log('Transformed event:', transformedEvent);
        return transformedEvent;
      }) || [];
      
      console.log('Events loaded from database:', {
        totalEvents: transformedEvents.length,
        events: transformedEvents,
        apiResponse: data
      });
      
      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAcademicYears(), loadEvents()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions for data transformation
  const mapEventTypeToCategory = (eventType: string): 'academic' | 'administrative' | 'holiday' | 'special' | 'deadline' => {
    switch (eventType) {
      case 'ACADEMIC':
      case 'WORKSHOP':
      case 'SEMINAR':
        return 'academic';
      case 'MEETING':
        return 'administrative';
      case 'SOCIAL':
      case 'SPORTS':
        return 'holiday';
      case 'GRADUATION':
      case 'ORIENTATION':
        return 'special';
      case 'OTHER':
        return 'deadline';
      default:
        return 'academic';
    }
  };

  const mapPriorityToLevel = (priority: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (priority) {
      case 'LOW':
        return 'low';
      case 'NORMAL':
        return 'medium';
      case 'HIGH':
        return 'high';
      case 'URGENT':
        return 'critical';
      default:
        return 'medium';
    }
  };

  const mapStatusToEventStatus = (status: string): 'draft' | 'published' | 'cancelled' => {
    switch (status) {
      case 'DRAFT':
        return 'draft';
      case 'SCHEDULED':
      case 'ONGOING':
      case 'COMPLETED':
        return 'published';
      case 'CANCELLED':
      case 'POSTPONED':
        return 'cancelled';
      default:
        return 'draft';
    }
  };

  const getEventColor = (category: string): string => {
    switch (category) {
      case 'academic':
        return '#3B82F6';
      case 'administrative':
        return '#F97316';
      case 'holiday':
        return '#EF4444';
      case 'special':
        return '#8B5CF6';
      case 'deadline':
        return '#EAB308';
      default:
        return '#6B7280';
    }
  };

  // Database mapping functions
  const mapCategoryToEventType = (category: string): string => {
    switch (category) {
      case 'academic':
        return 'ACADEMIC';
      case 'administrative':
        return 'MEETING';
      case 'holiday':
        return 'SOCIAL';
      case 'special':
        return 'GRADUATION';
      case 'deadline':
        return 'OTHER';
      default:
        return 'ACADEMIC';
    }
  };

  const mapPriorityToDbLevel = (priority: string): string => {
    switch (priority) {
      case 'low':
        return 'LOW';
      case 'medium':
        return 'NORMAL';
      case 'high':
        return 'HIGH';
      case 'critical':
        return 'URGENT';
      default:
        return 'NORMAL';
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filters.category === 'all' || event.category === filters.category;
    const matchesPriority = filters.priority === 'all' || event.priority === filters.priority;
    const matchesStatus = filters.status === 'all' || event.status === filters.status;
    
    const isMatch = matchesSearch && matchesCategory && matchesPriority && matchesStatus;
    
    // Debug logging for filtering
    if (!isMatch) {
      console.log('Event filtered out:', {
        title: event.title,
        matchesSearch,
        matchesCategory,
        matchesPriority,
        matchesStatus,
        filters,
        search
      });
    }
    
    return isMatch;
  });

  // Debug logging for filtered events
  console.log('Filtered events:', {
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    filters,
    search
  });

  // Paginated events for list view
  const paginatedListEvents = useMemo(() => {
    const startIndex = (listPage - 1) * listItemsPerPage;
    const endIndex = startIndex + listItemsPerPage;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, listPage, listItemsPerPage]);

  // Paginated events for timeline view
  const paginatedTimelineEvents = useMemo(() => {
    const startIndex = (timelinePage - 1) * timelineItemsPerPage;
    const endIndex = startIndex + timelineItemsPerPage;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, timelinePage, timelineItemsPerPage]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setListPage(1);
    setTimelinePage(1);
  }, [filters, search]);

  // Format filter values for display in chips
  const formatFilterDisplay = (key: string, value: string): string => {
    if (value === 'all') return '';
    
    switch (key) {
      case 'category':
        return EVENT_CATEGORIES[value as keyof typeof EVENT_CATEGORIES]?.label || value;
      case 'priority':
        return PRIORITY_LEVELS[value as keyof typeof PRIORITY_LEVELS]?.label || value;
      case 'status':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'dateRange':
        const rangeMap: Record<string, string> = {
          'today': 'Today',
          'week': 'This Week',
          'month': 'This Month',
          'semester': 'This Semester'
        };
        return rangeMap[value] || value;
      default:
        return value;
    }
  };

  // Convert filters to format expected by FilterChips
  const filtersForChips = useMemo(() => {
    const chips: Record<string, string[]> = {};
    
    if (filters.category !== 'all') {
      chips.category = [formatFilterDisplay('category', filters.category)];
    }
    if (filters.priority !== 'all') {
      chips.priority = [formatFilterDisplay('priority', filters.priority)];
    }
    if (filters.status !== 'all') {
      chips.status = [formatFilterDisplay('status', filters.status)];
    }
    if (filters.dateRange !== 'all') {
      chips.dateRange = [formatFilterDisplay('dateRange', filters.dateRange)];
    }
    if (selectedYear) {
      chips.academicYear = [selectedYear.name];
    }
    if (selectedSemester) {
      chips.semester = [selectedSemester.name];
    }
    
    return chips;
  }, [filters, selectedYear, selectedSemester]);

  // Handle clearing all filters
  const handleClearFilters = () => {
    setFilters({
      category: 'all',
      priority: 'all',
      status: 'all',
      dateRange: 'all',
    });
    setSearch('');
    setSelectedYear(null);
    setSelectedSemester(null);
  };

  const handleAddEvent = () => {
    setShowAddEvent(true);
  };

  const handleImportEvents = () => {
    setShowImportDialog(true);
  };

  const handleExportEvents = () => {
    setShowExportDialog(true);
  };

  const handleDeleteEvents = async () => {
    if (selectedEvents.length === 0) {
      toast.error("Please select events to delete");
      return;
    }
    
    try {
      // Delete events one by one (in a real app, you'd have a bulk delete endpoint)
      const deletePromises = selectedEvents.map(eventId => 
        fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
          headers: {
            'x-user-role': 'ADMIN', // TODO: Get from auth context
            'x-user-id': '1' // TODO: Get from auth context
          }
        })
      );
      
      await Promise.all(deletePromises);
      
      setEvents(events.filter(event => !selectedEvents.includes(event.id)));
      setSelectedEvents([]);
      toast.success(`${selectedEvents.length} event(s) deleted successfully`);
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Failed to delete some events');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEvents.length === 0) {
      toast.error("Please select events first");
      return;
    }

    try {
      const updatePromises = selectedEvents.map(eventId => {
        const event = events.find(e => e.id === eventId);
        if (!event) return Promise.resolve();

        let newStatus: string;
        switch (action) {
          case 'publish':
            newStatus = 'SCHEDULED';
            break;
          case 'archive':
            newStatus = 'CANCELLED';
            break;
          default:
            return Promise.resolve();
        }

        return fetch(`/api/events/${eventId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'ADMIN', // TODO: Get from auth context
            'x-user-id': '1' // TODO: Get from auth context
          },
          body: JSON.stringify({
            status: newStatus,
            title: event.title,
            description: event.description,
            eventType: mapCategoryToEventType(event.category),
            eventDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            location: event.location,
            priority: mapPriorityToDbLevel(event.priority),
            isPublic: true,
            requiresRegistration: event.requiresApproval,
            capacity: null,
            imageUrl: null,
            contactEmail: null,
            contactPhone: null
          })
        });
      });

      await Promise.all(updatePromises);
      
      // Reload events to get updated data
      await loadEvents();
      
      const actionText = action === 'publish' ? 'published' : 'archived';
      toast.success(`${selectedEvents.length} event(s) ${actionText}`);
      setSelectedEvents([]);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to update some events');
    }
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Use raw events array instead of filteredEvents to show all upcoming events regardless of filters
    return events
      .filter(event => event.startDate >= today && event.startDate <= nextWeek)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);
  };

  const getEventStats = () => {
    const total = events.length;
    const published = events.filter(e => e.status === 'published').length;
    const pending = events.filter(e => e.status === 'draft').length;
    const critical = events.filter(e => e.priority === 'critical').length;
    
    return { total, published, pending, critical };
  };

  // Calendar navigation functions
  const navigateToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Event action handlers
  const handleViewEvent = (event: AcademicEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEditEvent = (event: AcademicEvent) => {
    setSelectedEvent(event);
    // Populate edit form with event data
    const startDateStr = new Date(event.startDate).toISOString().slice(0, 16);
    const endDateStr = event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '';
    
    setEditEvent({
      title: event.title || '',
      description: event.description || '',
      category: event.category as 'academic' | 'administrative' | 'holiday' | 'special' | 'deadline',
      priority: event.priority as 'low' | 'medium' | 'high' | 'critical',
      startDate: startDateStr,
      endDate: endDateStr,
      location: event.location || '',
      allDay: event.allDay,
      recurring: event.isRecurring,
      requiresApproval: event.requiresApproval
    });
    setEditFormErrors({});
    setShowEditEvent(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'ADMIN', // TODO: Get from auth context
          'x-user-id': '1' // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      setEvents(events.filter(e => e.id !== eventId));
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  // Form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newEvent.title.trim()) {
      errors.title = 'Event title is required';
    }
    
    if (!newEvent.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!newEvent.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (!newEvent.endDate) {
      errors.endDate = 'End date is required';
    }
    
    if (newEvent.startDate && newEvent.endDate) {
      const startDate = new Date(newEvent.startDate);
      const endDate = new Date(newEvent.endDate);
      
      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleFormChange = (field: string, value: any) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submission
  const handleAddEventSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      // Handle all-day events: set time to start/end of day
      let eventDate: string;
      let endDate: string | null;
      
      if (newEvent.allDay) {
        // For all-day events, set start to 00:00:00 and end to 23:59:59
        const start = new Date(newEvent.startDate);
        start.setHours(0, 0, 0, 0);
        eventDate = start.toISOString();
        
        const end = newEvent.endDate ? new Date(newEvent.endDate) : new Date(newEvent.startDate);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
      } else {
        // For timed events, ensure proper ISO format
        eventDate = new Date(newEvent.startDate).toISOString();
        endDate = newEvent.endDate ? new Date(newEvent.endDate).toISOString() : null;
      }

      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        eventType: mapCategoryToEventType(newEvent.category),
        eventDate: eventDate,
        endDate: endDate,
        location: newEvent.location.trim() || null,
        priority: mapPriorityToDbLevel(newEvent.priority),
        isPublic: true,
        requiresRegistration: newEvent.requiresApproval,
        capacity: null,
        imageUrl: null,
        contactEmail: null,
        contactPhone: null
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN', // TODO: Get from auth context
          'x-user-id': '1' // TODO: Get from auth context
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const createdEvent = await response.json();
      
      // Transform the created event to match our interface
      const transformedEvent: AcademicEvent = {
        id: createdEvent.eventId,
        title: createdEvent.title,
        description: createdEvent.description,
        startDate: new Date(createdEvent.eventDate),
        endDate: createdEvent.endDate ? new Date(createdEvent.endDate) : new Date(createdEvent.eventDate),
        allDay: false, // TODO: Determine from time
        category: mapEventTypeToCategory(createdEvent.eventType),
        priority: mapPriorityToLevel(createdEvent.priority),
        location: createdEvent.location,
        attendees: [],
        isRecurring: false,
        recurrencePattern: undefined,
        status: mapStatusToEventStatus(createdEvent.status),
        createdBy: createdEvent.createdByAdmin?.userName || 'Unknown',
        createdAt: new Date(createdEvent.createdAt),
        updatedAt: new Date(createdEvent.updatedAt),
        requiresApproval: false,
        color: getEventColor(mapEventTypeToCategory(createdEvent.eventType)),
        tags: []
      };

      setEvents(prev => [...prev, transformedEvent]);
      setShowAddEvent(false);
      setNewEvent({
        title: '',
        description: '',
        category: 'academic',
        priority: 'medium',
        startDate: '',
        endDate: '',
        location: '',
        allDay: false,
        recurring: false,
        requiresApproval: false
      });
      setFormErrors({});
      toast.success('Event added successfully');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  // Reset form when dialog closes
  const handleAddEventClose = () => {
    setShowAddEvent(false);
    setNewEvent({
      title: '',
      description: '',
      category: 'academic',
      priority: 'medium',
      startDate: '',
      endDate: '',
      location: '',
      allDay: false,
      recurring: false,
      requiresApproval: false
    });
    setFormErrors({});
  };

  // Edit form validation
  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editEvent.title.trim()) {
      errors.title = 'Event title is required';
    }
    
    if (!editEvent.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!editEvent.startDate) {
      errors.startDate = 'Start date is required';
    }
    
    if (!editEvent.endDate) {
      errors.endDate = 'End date is required';
    }
    
    if (editEvent.startDate && editEvent.endDate) {
      const startDate = new Date(editEvent.startDate);
      const endDate = new Date(editEvent.endDate);
      
      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit form input changes
  const handleEditFormChange = (field: string, value: any) => {
    setEditEvent(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle edit form submission
  const handleEditEventSubmit = async () => {
    if (!validateEditForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    if (!selectedEvent) return;

    try {
      // Handle all-day events: set time to start/end of day
      let eventDate: string;
      let endDate: string | null;
      
      if (editEvent.allDay) {
        // For all-day events, set start to 00:00:00 and end to 23:59:59
        const start = new Date(editEvent.startDate);
        start.setHours(0, 0, 0, 0);
        eventDate = start.toISOString();
        
        const end = editEvent.endDate ? new Date(editEvent.endDate) : new Date(editEvent.startDate);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
      } else {
        // For timed events, ensure proper ISO format
        eventDate = new Date(editEvent.startDate).toISOString();
        endDate = editEvent.endDate ? new Date(editEvent.endDate).toISOString() : null;
      }

      const eventData = {
        title: editEvent.title.trim(),
        description: editEvent.description.trim(),
        eventType: mapCategoryToEventType(editEvent.category),
        eventDate: eventDate,
        endDate: endDate,
        location: editEvent.location.trim() || null,
        priority: mapPriorityToDbLevel(editEvent.priority),
        isPublic: true,
        requiresRegistration: editEvent.requiresApproval,
        capacity: null,
        imageUrl: null,
        contactEmail: null,
        contactPhone: null
      };

      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN', // TODO: Get from auth context
          'x-user-id': '1' // TODO: Get from auth context
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      // Reload events to get updated data
      await loadEvents();
      toast.success("Event updated successfully");
      setShowEditEvent(false);
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  // Reset edit form when dialog closes
  const handleEditEventClose = () => {
    setShowEditEvent(false);
    setEditEvent({
      title: '',
      description: '',
      category: 'academic',
      priority: 'medium',
      startDate: '',
      endDate: '',
      location: '',
      allDay: false,
      recurring: false,
      requiresApproval: false
    });
    setEditFormErrors({});
  };

  // Import functionality using shared ImportDialog
  // Matches the "events" ImportRecord shape from the shared ImportDialog
  const handleEventsImport = async (
    records: any[]
  ): Promise<{ success: number; failed: number; errors: string[] }> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const startTime = record.startTime || "09:00";
        const endTime = record.endTime || "10:00";

        const eventStart = new Date(`${record.date}T${startTime}`);
        const eventEnd = new Date(`${record.date}T${endTime}`);

        if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
          throw new Error("Invalid date or time");
        }

        const body = {
          title: record.title,
          description: record.description || "",
          eventType: record.eventType || "LECTURE",
          eventDate: eventStart.toISOString(),
          endDate: eventEnd.toISOString(),
          location: record.location || null,
          priority: record.priority || "NORMAL",
          isPublic: record.isPublic ?? true,
          requiresRegistration: record.requiresRegistration ?? false,
          capacity: record.capacity ?? null,
          imageUrl: record.imageUrl ?? null,
          contactEmail: record.contactEmail ?? null,
          contactPhone: record.contactPhone ?? null,
        };

        const response = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": "ADMIN", // TODO: Get from auth context
            "x-user-id": "1", // TODO: Get from auth context
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          failed++;
          const errorText = await response.text();
          errors.push(`Row ${i + 1}: ${errorText || response.statusText}`);
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push(
          `Row ${i + 1}: ${
            err instanceof Error ? err.message : "Unknown import error"
          }`
        );
      }
    }

    if (success > 0) {
      await loadEvents();
    }

    return { success, failed, errors };
  };

  // Export functionality
  const generateCSV = (events: AcademicEvent[]): string => {
    const headers = [
      'Title', 'Description', 'Start Date', 'End Date', 'All Day', 
      'Category', 'Priority', 'Location', 'Attendees', 'Recurring', 
      'Recurrence Pattern', 'Requires Approval', 'Tags'
    ];
    
    const rows = events.map(event => [
      event.title,
      event.description || '',
      event.startDate.toISOString(),
      event.endDate.toISOString(),
      event.allDay.toString(),
      event.category,
      event.priority,
      event.location || '',
      event.attendees?.join(';') || '',
      event.isRecurring.toString(),
      event.recurrencePattern || '',
      event.requiresApproval.toString(),
      event.tags?.join(';') || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const generateICal = (events: AcademicEvent[]): string => {
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ICCT//Academic Calendar//EN\n';
    
    events.forEach(event => {
      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${event.id}@icct.edu\n`;
      ical += `DTSTART:${event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ical += `DTEND:${event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      ical += `SUMMARY:${event.title}\n`;
      if (event.description) {
        ical += `DESCRIPTION:${event.description}\n`;
      }
      if (event.location) {
        ical += `LOCATION:${event.location}\n`;
      }
      ical += 'END:VEVENT\n';
    });
    
    ical += 'END:VCALENDAR';
    return ical;
  };

  const handleExport = async (
    format: 'pdf' | 'csv' | 'excel',
    _options: { includeFilters: boolean; includeSummary: boolean }
  ) => {
    if (events.length === 0) {
      toast.error('No events available to export');
      return;
    }

    try {
      let content = '';
      let mimeType = '';
      let fileExtension = '';
      
      switch (format) {
        case 'csv':
          content = generateCSV(events);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'excel':
          content = generateCSV(events);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;
        case 'pdf':
          content = generateCSV(events);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `academic-calendar-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
      toast.success(`Events exported to ${format.toUpperCase()} successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export events');
    }
  };

  // Settings management
  const handleSettingsChange = (category: string, setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      // Save to localStorage for now (in a real app, this would be saved to database)
      localStorage.setItem('academic-calendar-settings', JSON.stringify(settings));
      
      // TODO: Add API call to save settings to database
      // const response = await fetch('/api/settings/academic-calendar', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'x-user-role': 'ADMIN',
      //     'x-user-id': '1'
      //   },
      //   body: JSON.stringify(settings)
      // });
      
      setShowSettings(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      notifications: {
        email: true,
        push: false,
        reminders: true
      },
      display: {
        showWeekends: true,
        showHolidays: true,
        colorCoding: true
      },
      integration: {
        googleSync: false,
        outlookSync: false
      }
    };
    setSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const handleShareCalendar = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'ICCT Academic Calendar',
        text: 'Check out our academic calendar',
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Calendar link copied to clipboard');
    }
  };

  const handleGenerateReport = () => {
    const reportData = {
      totalEvents: events.length,
      publishedEvents: events.filter(e => e.status === 'published').length,
      draftEvents: events.filter(e => e.status === 'draft').length,
      criticalEvents: events.filter(e => e.priority === 'critical').length,
      upcomingEvents: events.filter(e => e.startDate > new Date()).length,
      generatedAt: new Date().toISOString()
    };

    const reportContent = `
ICCT Academic Calendar Report
Generated: ${new Date().toLocaleDateString()}

Summary:
- Total Events: ${reportData.totalEvents}
- Published Events: ${reportData.publishedEvents}
- Draft Events: ${reportData.draftEvents}
- Critical Events: ${reportData.criticalEvents}
- Upcoming Events: ${reportData.upcomingEvents}

Event Categories:
${Object.entries(EVENT_CATEGORIES).map(([key, value]) => 
  `- ${value.label}: ${events.filter(e => e.category === key).length}`
).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic-calendar-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Calendar report generated successfully');
  };

  const stats = getEventStats();
  const upcomingEvents = getUpcomingEvents();

  // Show loading state
  if (loading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen p-6 bg-gray-50">
        <PageHeader
          title="Academic Calendar"
          subtitle="Manage academic events, deadlines, and important dates"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Academic Management', href: '/academic-management' },
            { label: 'Academic Calendar' }
          ]}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Calendar</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshData} disabled={refreshing}>
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50">
      <PageHeader
        title="Academic Calendar"
        subtitle="Manage academic events, deadlines, and important dates"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academic Management', href: '/academic-management' },
          { label: 'Academic Calendar' }
        ]}
      />






      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />}
          label="Total Events"
          value={stats.total}
          valueClassName="text-blue-900"
          sublabel="All events"
          loading={loading}
        />
        <SummaryCard
          icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />}
          label="Published"
          value={stats.published}
          valueClassName="text-blue-900"
          sublabel="Active events"
          loading={loading}
        />
        <SummaryCard
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />}
          label="Pending"
          value={stats.pending}
          valueClassName="text-blue-900"
          sublabel="Draft events"
          loading={loading}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />}
          label="Critical"
          value={stats.critical}
          valueClassName="text-blue-900"
          sublabel="High priority"
          loading={loading}
        />
      </div>

      {/* Filters & Search */}
      <FilterPanel
        academicYears={academicYears}
        selectedYear={selectedYear}
        selectedSemester={selectedSemester}
        onYearChange={setSelectedYear}
        onSemesterChange={setSelectedSemester}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Active Filter Chips */}
      {(Object.values(filtersForChips).some(arr => arr.length > 0) || search.trim()) && (
        <div className="mb-6 p-3 bg-blue-50 rounded border border-blue-200">
          <FilterChips
            filters={filtersForChips}
            fields={[
              { key: 'category', label: 'Category', allowIndividualRemoval: true },
              { key: 'priority', label: 'Priority', allowIndividualRemoval: true },
              { key: 'status', label: 'Status', allowIndividualRemoval: true },
              { key: 'dateRange', label: 'Date Range', allowIndividualRemoval: true },
              { key: 'academicYear', label: 'Academic Year', allowIndividualRemoval: true },
              { key: 'semester', label: 'Semester', allowIndividualRemoval: true }
            ]}
            onRemove={(key, value) => {
              switch (key) {
                case 'category':
                  setFilters({ ...filters, category: 'all' });
                  break;
                case 'priority':
                  setFilters({ ...filters, priority: 'all' });
                  break;
                case 'status':
                  setFilters({ ...filters, status: 'all' });
                  break;
                case 'dateRange':
                  setFilters({ ...filters, dateRange: 'all' });
                  break;
                case 'academicYear':
                  setSelectedYear(null);
                  setSelectedSemester(null);
                  break;
                case 'semester':
                  setSelectedSemester(null);
                  break;
              }
            }}
            onClearAll={handleClearFilters}
            searchQuery={search}
            onRemoveSearch={() => setSearch('')}
            showSearchChip={true}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Upcoming Events */}
        <div className="lg:col-span-1">
          <Card className="mb-6 overflow-hidden p-0">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Upcoming Events</h3>
                  <p className="text-blue-100 text-sm">Next 7 days</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="p-3 border rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <p className="text-xs text-gray-500">
                            {event.startDate.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge 
                          className={`text-xs ${EVENT_CATEGORIES[event.category].textColor} bg-opacity-10`}
                        >
                          {EVENT_CATEGORIES[event.category].label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <QuickActionsPanel
            variant="premium"
            title="Quick Actions"
            subtitle="Essential tools and shortcuts"
            icon={
              <div className="w-5 h-5 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            }
            actionCards={[
              {
                id: 'add-event',
                label: 'Add Event',
                description: 'Create a new academic event',
                icon: <Plus className="w-5 h-5 text-white" />,
                onClick: handleAddEvent
              },
              {
                id: 'import-events',
                label: 'Import Events',
                description: 'Import events from file',
                icon: <Upload className="w-5 h-5 text-white" />,
                onClick: handleImportEvents
              },
              {
                id: 'export-events',
                label: 'Export Events',
                description: 'Download events report',
                icon: <Download className="w-5 h-5 text-white" />,
                onClick: handleExportEvents
              },
              {
                id: 'refresh-data',
                label: 'Refresh Data',
                description: 'Reload calendar data',
                icon: refreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-white" />
                ),
                onClick: refreshData,
                disabled: refreshing,
                loading: refreshing
              },
              {
                id: 'share-calendar',
                label: 'Share Calendar',
                description: 'Share calendar link',
                icon: <Share2 className="w-5 h-5 text-white" />,
                onClick: handleShareCalendar
              },
              {
                id: 'generate-report',
                label: 'Generate Report',
                description: 'Create calendar report',
                icon: <FileText className="w-5 h-5 text-white" />,
                onClick: handleGenerateReport
              },
              {
                id: 'settings',
                label: 'Settings',
                description: 'Configure calendar settings',
                icon: <Settings className="w-5 h-5 text-white" />,
                onClick: () => setShowSettings(true)
              }
            ]}
            collapsible={true}
            defaultCollapsed={false}
            vertical={true}
            className="mb-6"
          />
        </div>

        {/* Main Calendar Area */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden p-0">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Calendar View</h3>
                    <p className="text-blue-100 text-sm">View and manage your events</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                    <TabsList className="bg-white/20">
                      <TabsTrigger value="month" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white">
                        <CalendarDays className="w-4 h-4" />
                        Month
                      </TabsTrigger>
                      <TabsTrigger value="week" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white">
                        <Calendar className="w-4 h-4" />
                        Week
                      </TabsTrigger>
                      <TabsTrigger value="day" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white">
                        <Clock className="w-4 h-4" />
                        Day
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white">
                        <List className="w-4 h-4" />
                        List
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 text-white">
                        <BarChart2 className="w-4 h-4" />
                        Timeline
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={navigateToPrevious} className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={navigateToToday} className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={navigateToNext} className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              {/* Bulk Actions */}
              {selectedEvents.length > 0 && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{selectedEvents.length} event(s) selected</span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleBulkAction('publish')}>
                          Publish
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                          Archive
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteEvents}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Calendar Content */}
              <div className="min-h-[600px]">
                {eventsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600">Loading events from database...</p>
                    </div>
                  </div>
                )}
                
                {!eventsLoading && (
                  <>
                    {viewMode === 'month' && (
                  <CalendarView 
                    events={filteredEvents}
                    currentDate={currentDate}
                    viewMode="month"
                    selectedEvents={selectedEvents}
                    onEventSelect={(eventId) => {
                      const event = events.find(e => e.id === eventId);
                      if (event) {
                        handleViewEvent(event);
                      }
                    }}
                  />
                )}
                
                {viewMode === 'week' && (
                  <CalendarView 
                    events={filteredEvents}
                    currentDate={currentDate}
                    viewMode="week"
                    selectedEvents={selectedEvents}
                    onEventSelect={(eventId) => {
                      const event = events.find(e => e.id === eventId);
                      if (event) {
                        handleViewEvent(event);
                      }
                    }}
                  />
                )}
                
                {viewMode === 'day' && (
                  <CalendarView 
                    events={filteredEvents}
                    currentDate={currentDate}
                    viewMode="day"
                    selectedEvents={selectedEvents}
                    onEventSelect={(eventId) => {
                      const event = events.find(e => e.id === eventId);
                      if (event) {
                        handleViewEvent(event);
                      }
                    }}
                  />
                )}
                
                {viewMode === 'list' && (
                  <>
                  <div className="space-y-4">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          {events.length === 0 ? 'No events available' : 'No events found'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {events.length === 0 
                            ? 'Start by creating your first academic event.'
                            : 'Try adjusting your filters or create a new event.'
                          }
                        </p>
                        {events.length === 0 && (
                          <Button className="mt-4" onClick={handleAddEvent}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Event
                          </Button>
                        )}
                      </div>
                    ) : (
                        paginatedListEvents.map(event => (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEvents([...selectedEvents, event.id]);
                                } else {
                                  setSelectedEvents(selectedEvents.filter(id => id !== event.id));
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{event.title}</h4>
                                <Badge 
                                  className={`text-xs ${EVENT_CATEGORIES[event.category].textColor} bg-opacity-10`}
                                >
                                  {EVENT_CATEGORIES[event.category].label}
                                </Badge>
                                <Badge className={`text-xs ${PRIORITY_LEVELS[event.priority].color}`}>
                                  {PRIORITY_LEVELS[event.priority].label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {event.startDate.toLocaleDateString()} - {event.endDate.toLocaleDateString()}
                              </p>
                              {event.location && (
                                <p className="text-sm text-gray-500 mt-1">
                                  📍 {event.location}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-400">
                                  Created by: {event.createdBy}
                                </span>
                                <span className="text-xs text-gray-400">
                                  Status: {event.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewEvent(event)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                    {filteredEvents.length > 0 && (
                      <TablePagination
                        page={listPage}
                        pageSize={listItemsPerPage}
                        totalItems={filteredEvents.length}
                        onPageChange={setListPage}
                        onPageSizeChange={setListItemsPerPage}
                        entityLabel="event"
                      />
                    )}
                  </>
                )}
                
                {viewMode === 'timeline' && (
                  <>
                  <CalendarView 
                      events={paginatedTimelineEvents}
                    currentDate={currentDate}
                    viewMode="timeline"
                    selectedEvents={selectedEvents}
                    onEventSelect={(eventId) => {
                      const event = events.find(e => e.id === eventId);
                      if (event) {
                        handleViewEvent(event);
                      }
                    }}
                  />
                    {filteredEvents.length > 0 && (
                      <TablePagination
                        page={timelinePage}
                        pageSize={timelineItemsPerPage}
                        totalItems={filteredEvents.length}
                        onPageChange={setTimelinePage}
                        onPageSizeChange={setTimelineItemsPerPage}
                        entityLabel="event"
                      />
                    )}
                  </>
                )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEvent} onOpenChange={handleAddEventClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 sm:max-w-[600px] sm:mx-4 sm:my-1 md:max-w-[750px] md:mx-6 md:my-1 lg:max-w-[900px] lg:mx-8 lg:my-1 flex flex-col">
          {/* Visually hidden DialogTitle for accessibility */}
          <DialogTitle className="sr-only">
            Add New Event
          </DialogTitle>
          
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-2xl p-6 relative flex-shrink-0">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddEventClose}
              className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-start gap-4 pr-24">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">
                  Add New Event
                </h2>
                <p className="text-blue-100 text-sm">
                  Create a new academic event and add it to the calendar
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Enter event title" 
                  value={newEvent.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  className={formErrors.title ? 'border-red-500' : ''}
                />
                {formErrors.title && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
                )}
              </div>
              <div>
                    <Label htmlFor="category">Category *</Label>
                <Select 
                  value={newEvent.category} 
                  onValueChange={(value) => handleFormChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_CATEGORIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
                  <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                placeholder="Enter event description" 
                value={newEvent.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                    className={formErrors.description ? 'border-red-500' : ''}
              />
                  {formErrors.description && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
                  )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input 
                  id="startDate" 
                  type="datetime-local" 
                  value={newEvent.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                  className={formErrors.startDate ? 'border-red-500' : ''}
                />
                {formErrors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.startDate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input 
                  id="endDate" 
                  type="datetime-local" 
                  value={newEvent.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                  className={formErrors.endDate ? 'border-red-500' : ''}
                />
                {formErrors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.endDate}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newEvent.priority} 
                  onValueChange={(value) => handleFormChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  placeholder="Enter location" 
                  value={newEvent.location}
                  onChange={(e) => handleFormChange('location', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="allDay" 
                  checked={newEvent.allDay}
                  onCheckedChange={(checked) => handleFormChange('allDay', checked)}
                />
                <Label htmlFor="allDay">All day event</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring" 
                  checked={newEvent.recurring}
                  onCheckedChange={(checked) => handleFormChange('recurring', checked)}
                />
                <Label htmlFor="recurring">Recurring event</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requiresApproval" 
                  checked={newEvent.requiresApproval}
                  onCheckedChange={(checked) => handleFormChange('requiresApproval', checked)}
                />
                <Label htmlFor="requiresApproval">Requires approval</Label>
              </div>
                </div>
              </div>
            </ScrollArea>
            </div>
            
          {/* Footer Buttons */}
          <DialogFooter className="flex items-center justify-end pt-6 border-t border-gray-200 bg-gray-50/50 px-6 py-4 flex-shrink-0">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleAddEventClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddEventSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded"
              >
                Add Event
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog using shared ImportDialog component */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleEventsImport}
        entityName="Events"
      />

      {/* Export Dialog using shared ExportDialog component */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        dataCount={events.length}
        entityType="event"
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Calendar Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Notifications</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNotif">Email Notifications</Label>
                  <Switch 
                    id="emailNotif" 
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => handleSettingsChange('notifications', 'email', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushNotif">Push Notifications</Label>
                  <Switch 
                    id="pushNotif" 
                    checked={settings.notifications.push}
                    onCheckedChange={(checked) => handleSettingsChange('notifications', 'push', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminderNotif">Reminder Notifications</Label>
                  <Switch 
                    id="reminderNotif" 
                    checked={settings.notifications.reminders}
                    onCheckedChange={(checked) => handleSettingsChange('notifications', 'reminders', checked)}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-3">Display Options</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showWeekends">Show Weekends</Label>
                  <Switch 
                    id="showWeekends" 
                    checked={settings.display.showWeekends}
                    onCheckedChange={(checked) => handleSettingsChange('display', 'showWeekends', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showHolidays">Show Holidays</Label>
                  <Switch 
                    id="showHolidays" 
                    checked={settings.display.showHolidays}
                    onCheckedChange={(checked) => handleSettingsChange('display', 'showHolidays', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="colorCoding">Color Coding</Label>
                  <Switch 
                    id="colorCoding" 
                    checked={settings.display.colorCoding}
                    onCheckedChange={(checked) => handleSettingsChange('display', 'colorCoding', checked)}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-3">Integration</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="googleSync">Google Calendar Sync</Label>
                  <Switch 
                    id="googleSync" 
                    checked={settings.integration.googleSync}
                    onCheckedChange={(checked) => handleSettingsChange('integration', 'googleSync', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="outlookSync">Outlook Sync</Label>
                  <Switch 
                    id="outlookSync" 
                    checked={settings.integration.outlookSync}
                    onCheckedChange={(checked) => handleSettingsChange('integration', 'outlookSync', checked)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleResetSettings}>
                Reset to Defaults
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-full w-full max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 sm:max-w-[600px] sm:mx-4 sm:my-1 md:max-w-[750px] md:mx-6 md:my-1 lg:max-w-[900px] lg:mx-8 lg:my-1 flex flex-col h-full">
          {/* Visually hidden DialogTitle for accessibility */}
          <DialogTitle className="sr-only">
            Event Details
          </DialogTitle>
          
          {/* Gradient Header */}
          {selectedEvent && (
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-2xl p-6 relative flex-shrink-0">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEventDetails(false)}
                className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="flex items-start gap-4 pr-24">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-blue-100 text-sm mb-2">
                    Event Details
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      className={`text-xs bg-white/20 text-white border-white/30 ${EVENT_CATEGORIES[selectedEvent.category].textColor === 'text-blue-500' ? 'bg-blue-500/20' : ''}`}
                    >
                      {EVENT_CATEGORIES[selectedEvent.category].label}
                    </Badge>
                    <Badge className={`text-xs bg-white/20 text-white border-white/30`}>
                      {PRIORITY_LEVELS[selectedEvent.priority].label}
                    </Badge>
                    <Badge className={`text-xs bg-white/20 text-white border-white/30`}>
                      {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                </div>
              </div>
          )}

          {/* Scrollable Content Area */}
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Description Section */}
              {selectedEvent.description && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-blue-200 overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-blue-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                            <Info className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-lg font-semibold text-blue-900">Description</div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="text-base text-blue-800 leading-relaxed whitespace-pre-wrap">
                          {selectedEvent.description}
                        </div>
                      </div>
                </div>
              )}
              
                  {/* Event Information Section */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-blue-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-blue-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                          <Info className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-blue-900">Event Information</h4>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group relative bg-gray-50 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 rounded p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                  Start Date
                                </div>
                              </div>
                              <div className="text-base font-medium text-blue-800">
                    {selectedEvent.startDate.toLocaleDateString()} at {selectedEvent.startDate.toLocaleTimeString()}
                </div>
                            </div>
                          </div>
                        </div>
                        <div className="group relative bg-gray-50 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 rounded p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                  End Date
                                </div>
                              </div>
                              <div className="text-base font-medium text-blue-800">
                    {selectedEvent.endDate.toLocaleDateString()} at {selectedEvent.endDate.toLocaleTimeString()}
                </div>
              </div>
                          </div>
                        </div>
              {selectedEvent.location && (
                          <div className="group relative bg-gray-50 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 rounded p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                    Location
                                  </div>
                                </div>
                                <div className="text-base font-medium text-blue-800">
                                  {selectedEvent.location}
                                </div>
                              </div>
                            </div>
                </div>
              )}
                      </div>
                    </div>
                  </div>
              
                  {/* Attendees Section */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-blue-200 overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-blue-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-lg font-semibold text-blue-900">Attendees</h4>
                        </div>
                      </div>
                      <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.attendees.map((attendee, index) => (
                            <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                              {attendee}
                            </Badge>
                    ))}
                        </div>
                  </div>
                </div>
              )}
              
                  {/* Metadata Section */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-blue-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-100 to-gray-200 border-b border-blue-300">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                          <Info className="w-4 h-4 text-white" />
                </div>
                        <h4 className="text-lg font-semibold text-blue-900">Metadata</h4>
                </div>
              </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group relative bg-gray-50 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 rounded p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                  Created By
                                </div>
                              </div>
                              <div className="text-base font-medium text-blue-800">
                                {selectedEvent.createdBy}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="group relative bg-gray-50 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 rounded p-4 border border-blue-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                  Created At
                                </div>
                              </div>
                              <div className="text-base font-medium text-blue-800">
                                {selectedEvent.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Footer with actions */}
          {selectedEvent && (
            <DialogFooter className="!flex !justify-end gap-3 p-6 flex-shrink-0 border-t-2 border-blue-300 bg-blue-50/80 rounded-b-2xl shadow-inner">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEventDetails(false);
                  setShowEditEvent(true);
                }}
                className="gap-2 rounded-xl"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="default"
                onClick={() => setShowEventDetails(false)}
                className="gap-2 rounded-xl"
              >
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditEvent} onOpenChange={handleEditEventClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 sm:max-w-[600px] sm:mx-4 sm:my-1 md:max-w-[750px] md:mx-6 md:my-1 lg:max-w-[900px] lg:mx-8 lg:my-1 flex flex-col">
          {/* Visually hidden DialogTitle for accessibility */}
          <DialogTitle className="sr-only">
            Edit Event
          </DialogTitle>
          
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-2xl p-6 relative flex-shrink-0">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditEventClose}
              className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-start gap-4 pr-24">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">
                  Edit Event
                </h2>
                <p className="text-blue-100 text-sm">
                  Update event details and save changes
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="editTitle">Event Title *</Label>
                    <Input 
                      id="editTitle" 
                      placeholder="Enter event title" 
                      value={editEvent.title}
                      onChange={(e) => handleEditFormChange('title', e.target.value)}
                      className={editFormErrors.title ? 'border-red-500' : ''}
                    />
                    {editFormErrors.title && (
                      <p className="text-sm text-red-500 mt-1">{editFormErrors.title}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="editCategory">Category *</Label>
                    <Select 
                      value={editEvent.category} 
                      onValueChange={(value) => handleEditFormChange('category', value)}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_CATEGORIES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                  <Label htmlFor="editDescription">Description *</Label>
                  <Textarea 
                    id="editDescription" 
                    placeholder="Enter event description" 
                    value={editEvent.description}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    className={editFormErrors.description ? 'border-red-500' : ''}
                  />
                  {editFormErrors.description && (
                    <p className="text-sm text-red-500 mt-1">{editFormErrors.description}</p>
                  )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="editStartDate">Start Date *</Label>
                  <Input 
                    id="editStartDate" 
                    type="datetime-local" 
                      value={editEvent.startDate}
                      onChange={(e) => handleEditFormChange('startDate', e.target.value)}
                      className={editFormErrors.startDate ? 'border-red-500' : ''}
                  />
                    {editFormErrors.startDate && (
                      <p className="text-sm text-red-500 mt-1">{editFormErrors.startDate}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="editEndDate">End Date *</Label>
                  <Input 
                    id="editEndDate" 
                    type="datetime-local" 
                      value={editEvent.endDate}
                      onChange={(e) => handleEditFormChange('endDate', e.target.value)}
                      className={editFormErrors.endDate ? 'border-red-500' : ''}
                  />
                    {editFormErrors.endDate && (
                      <p className="text-sm text-red-500 mt-1">{editFormErrors.endDate}</p>
                    )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPriority">Priority</Label>
                    <Select 
                      value={editEvent.priority} 
                      onValueChange={(value) => handleEditFormChange('priority', value)}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editLocation">Location</Label>
                    <Input 
                      id="editLocation" 
                      placeholder="Enter location" 
                      value={editEvent.location}
                      onChange={(e) => handleEditFormChange('location', e.target.value)}
                    />
                </div>
              </div>
              
                <div className="space-y-3">
              <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="editAllDay" 
                      checked={editEvent.allDay}
                      onCheckedChange={(checked) => handleEditFormChange('allDay', checked)}
                    />
                <Label htmlFor="editAllDay">All day event</Label>
              </div>
              
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="editRecurring" 
                      checked={editEvent.recurring}
                      onCheckedChange={(checked) => handleEditFormChange('recurring', checked)}
                    />
                    <Label htmlFor="editRecurring">Recurring event</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="editRequiresApproval" 
                      checked={editEvent.requiresApproval}
                      onCheckedChange={(checked) => handleEditFormChange('requiresApproval', checked)}
                    />
                    <Label htmlFor="editRequiresApproval">Requires approval</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex items-center justify-end pt-6 border-t border-gray-200 bg-gray-50/50 px-6 py-4 flex-shrink-0">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleEditEventClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditEventSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded"
              >
                  Update Event
                </Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 