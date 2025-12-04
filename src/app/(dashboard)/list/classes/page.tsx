"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar, Users, BookOpen, Building2, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader/PageHeader";
import SummaryCard from "@/components/SummaryCard";
import { EmptyState } from "@/components/reusable";
import { PageSkeleton } from "@/components/reusable/Skeleton";
import { useDebounce } from "@/hooks/use-debounce";

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
  status: string;
}

type ClassKey = string;

interface InstructorClass {
  key: ClassKey;
  subjectName: string;
  subjectCode: string;
  sectionName: string;
  studentCount: number;
  sessionsCount: number;
  days: string[];
  rooms: string[];
  status: string;
  earliestStart?: string;
  latestEnd?: string;
}

const dayLabels: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const dayShortLabels: Record<string, string> = {
  MONDAY: "M",
  TUESDAY: "T",
  WEDNESDAY: "W",
  THURSDAY: "Th",
  FRIDAY: "F",
  SATURDAY: "Sa",
  SUNDAY: "Su",
};

function formatTime(time: string): string {
  // expects "HH:MM"
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatSchedule(days: string[], start?: string, end?: string): string {
  const dayPart =
    days.length === 0
      ? "—"
      : days
          .map((d) => dayShortLabels[d] || d.charAt(0))
          .join("");

  if (start && end) {
    return `${dayPart} ${formatTime(start)}–${formatTime(end)}`;
  }

  return dayPart;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const upper = status?.toUpperCase?.() || "";
  if (upper === "ACTIVE") return "default";
  if (upper === "INACTIVE") return "outline";
  if (upper === "DRAFT" || upper === "PENDING") return "secondary";
  return "default";
}

export default function InstructorClassesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/schedules/instructor");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setSchedules(result.schedules || []);
    } catch (err) {
      console.error("Error fetching instructor classes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch classes");
      toast.error("Failed to load classes");
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
      toast.success("Classes refreshed successfully");
    } catch (err) {
      toast.error("Failed to refresh classes");
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchSchedules]);

  const classes = useMemo<InstructorClass[]>(() => {
    const map = new Map<ClassKey, InstructorClass>();

    for (const schedule of schedules) {
      const key: ClassKey = `${schedule.subject.id}-${schedule.section.id}`;
      const existing = map.get(key);

      const roomLabel = schedule.room
        ? `${schedule.room.roomNo} • ${schedule.room.building}`
        : "TBA";

      if (!existing) {
        map.set(key, {
          key,
          subjectName: schedule.subject.name,
          subjectCode: schedule.subject.code,
          sectionName: schedule.section.name,
          studentCount: schedule.section.studentCount,
          sessionsCount: 1,
          days: [schedule.day],
          rooms: [roomLabel],
          status: schedule.status,
          earliestStart: schedule.startTime,
          latestEnd: schedule.endTime,
        });
      } else {
        existing.sessionsCount += 1;
        if (!existing.days.includes(schedule.day)) {
          existing.days.push(schedule.day);
        }
        if (!existing.rooms.includes(roomLabel)) {
          existing.rooms.push(roomLabel);
        }

        // Expand overall time range for this class
        if (!existing.earliestStart || schedule.startTime < existing.earliestStart) {
          existing.earliestStart = schedule.startTime;
        }
        if (!existing.latestEnd || schedule.endTime > existing.latestEnd) {
          existing.latestEnd = schedule.endTime;
        }

        // Prefer an "ACTIVE" status if any schedule is active
        if (existing.status !== "ACTIVE" && schedule.status === "ACTIVE") {
          existing.status = schedule.status;
        }
      }
    }

    let values = Array.from(map.values());

    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      values = values.filter((cls) =>
        cls.subjectName.toLowerCase().includes(search) ||
        cls.subjectCode.toLowerCase().includes(search) ||
        cls.sectionName.toLowerCase().includes(search)
      );
    }

    values.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return values;
  }, [schedules, debouncedSearch]);

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
  const totalSessions = schedules.length;

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-4">
        <div className="container mx-auto">
          <EmptyState
            icon={<BookOpen className="w-12 h-12 text-red-500" />}
            title="Failed to Load Classes"
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
        <PageHeader
          title="My Classes"
          subtitle="View the classes and sections you are currently handling"
          breadcrumbs={[{ label: "Academic Management" }, { label: "My Classes" }]}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Classes"
            value={totalClasses}
            icon={<BookOpen className="w-5 h-5" />}
            sublabel="Unique subject + section combinations"
          />
          <SummaryCard
            label="Total Students"
            value={totalStudents}
            icon={<Users className="w-5 h-5" />}
            sublabel="Across all your classes"
          />
          <SummaryCard
            label="Scheduled Sessions"
            value={totalSessions}
            icon={<Calendar className="w-5 h-5" />}
            sublabel="Individual schedule entries"
          />
        </div>

        {/* Controls */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-[#1e40af] to-[#3b82f6] text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Class Summary</CardTitle>
                <p className="text-sm text-blue-100">
                  Overview of all your classes and sections this term
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by subject, code, or section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {classes.length === 0 ? (
              <EmptyState
                icon={<Users className="w-12 h-12 text-gray-400" />}
                title="No Classes Found"
                description={
                  searchTerm
                    ? "Try adjusting your search to see more results."
                    : "You do not have any assigned classes yet."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Code / Section
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Enrollment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {classes.map((cls) => (
                      <tr key={cls.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {cls.subjectName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col text-sm text-gray-700">
                            <span className="font-semibold">{cls.subjectCode}</span>
                            <span className="text-xs text-gray-500">{cls.sectionName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {formatSchedule(cls.days, cls.earliestStart, cls.latestEnd)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {cls.rooms.join(", ")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {cls.studentCount} students
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(cls.status)}>
                            {cls.status.toLowerCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


