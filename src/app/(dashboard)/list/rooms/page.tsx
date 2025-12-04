"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/reusable/Table/TablePagination";
import RoomForm from "@/components/forms/RoomForm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import Fuse from "fuse.js";
import React from "react";
import { Settings, Plus, Trash2, Printer, Loader2, MoreHorizontal, Upload, List, Columns3, ChevronDown, ChevronUp, UserCheck, UserX, Users, UserPlus, RefreshCw, Download, Search, Bell, Building2, RotateCcw, Eye, Pencil, MapPin, Home, Calendar, Clock, Info, CheckCircle } from "lucide-react";
import { ImportDialog } from "@/components/reusable/Dialogs/ImportDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog } from '@/components/reusable/Dialogs/ExportDialog';
import { SortDialog } from '@/components/reusable/Dialogs/SortDialog';
import BulkActionsBar from '@/components/reusable/BulkActionsBar';
import { PrintLayout } from '@/components/PrintLayout';
import { TableCardView } from '@/components/reusable/Table/TableCardView';
import { TableRowActions } from '@/components/reusable/Table/TableRowActions';
import { TableList, TableListColumn } from '@/components/reusable/Table/TableList';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableExpandedRow } from '@/components/reusable/Table/TableExpandedRow';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import PageHeader from '@/components/PageHeader/PageHeader';
import { useDebounce } from '@/hooks/use-debounce';
import { Card, CardHeader } from "@/components/ui/card";
import SummaryCard from '@/components/SummaryCard';
import { EmptyState } from '@/components/reusable';
import { BulkActionsDialog } from '@/components/reusable/Dialogs/BulkActionsDialog';
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { SummaryCardSkeleton, PageSkeleton } from '@/components/reusable/Skeleton';
import { VisibleColumnsDialog, ColumnOption } from '@/components/reusable/Dialogs/VisibleColumnsDialog';
import { FilterChips } from '@/components/FilterChips';
import { z } from "zod";
import CalendarView from "@/components/CalendarView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { safeHighlight } from "@/lib/sanitizer";

// Update enums to match backend

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED" | "INACTIVE";
type RoomType = "LECTURE" | "LABORATORY" | "CONFERENCE" | "OFFICE" | "OTHER";
type RoomBuilding = "BuildingA" | "BuildingB" | "BuildingC" | "BuildingD" | "BuildingE";
type RoomFloor = "F1" | "F2" | "F3" | "F4" | "F5" | "F6";

interface RoomBase {
  id: string | number;
  roomNo: string;
  roomType: RoomType;
  roomCapacity: number;
  roomBuildingLoc: RoomBuilding;
  roomFloorLoc: RoomFloor;
  readerId: string;
  status: RoomStatus;
  isActive: boolean;
  totalSchedules: number;
  totalAssignments: number;
  createdAt: string;
  updatedAt: string;
  hasRelatedEntities?: boolean;
}

interface Room extends RoomBase {
  SubjectSchedule?: Array<{
    subjectSchedId: string;
    subjectId: string;
    instructorId: string;
    day: string;
    startTime: string;
    endTime: string;
    section?: { sectionName: string };
    subject?: { subjectName: string };
    instructor?: { firstName: string; lastName: string };
  }>;
  [key: string]: any;
}

type SortField = 'roomNo' | 'roomType' | 'roomCapacity' | 'roomBuildingLoc' | 'roomFloorLoc' | 'status';
type SortOrder = 'asc' | 'desc';

interface ColumnFilter {
  field: string;
  value: string;
}

type MultiSortField = { field: SortField; order: SortOrder };

type FuseResultMatch = {
  key: string;
  indices: readonly [number, number][];
};

interface FuseResult<T> {
  item: T;
  refIndex: number;
  matches?: Array<{
    key: string;
    indices: readonly [number, number][];
  }>;
}

type RoomSortField = 'roomNo' | 'roomType' | 'roomCapacity' | 'roomBuildingLoc' | 'roomFloorLoc' | 'status' | 'totalSchedules' | 'totalAssignments';
type RoomSortOrder = 'asc' | 'desc';

function isRoomOccupiedNow(room: Room): boolean {
  if (!room.SubjectSchedule || room.SubjectSchedule.length === 0) return false;
  const now = new Date();
  // Get current day as 3-letter uppercase (e.g., 'MON', 'TUE', ...)
  const todayShort = now.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return room.SubjectSchedule.some(sched => {
    if (!sched.day) return false;
    // Normalize schedule day to 3-letter uppercase
    const schedShort = sched.day.slice(0, 3).toUpperCase();
    if (schedShort !== todayShort) return false;
    const [sh, sm] = sched.startTime.split(":").map(Number);
    const [eh, em] = sched.endTime.split(":").map(Number);
    const schedStart = sh * 60 + sm;
    const schedEnd = eh * 60 + em;
    return currentMinutes >= schedStart && currentMinutes < schedEnd;
  });
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [visibleColumnsDialogOpen, setVisibleColumnsDialogOpen] = useState(false);
  const [bulkActionsDialogOpen, setBulkActionsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<RoomSortField>('roomNo');
  const [sortOrder, setSortOrder] = useState<RoomSortOrder>('asc');
  const [sortFields, setSortFields] = useState<MultiSortField[]>([{ field: 'roomNo', order: 'asc' }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnAccessor: string } | null>(null);
  const [lastActionTime, setLastActionTime] = useState("2 minutes ago");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = React.useState<'table' | 'calendar'>("table");
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<string>('all');

  // Add missing export confirmation state
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [pendingExportRooms, setPendingExportRooms] = useState<Room[]>([]);

  // Add state for bulk deactivate/reactivate dialogs
  const [bulkDeactivateDialogOpen, setBulkDeactivateDialogOpen] = useState(false);
  const [bulkReactivateDialogOpen, setBulkReactivateDialogOpen] = useState(false);

  // Add state for enhanced bulk actions dialog and selectedRoomsForBulkAction
  const [selectedRoomsForBulkAction, setSelectedRoomsForBulkAction] = useState<Room[]>([]);

  // Add state for bulk assignment
  const [bulkAssignmentSchedule, setBulkAssignmentSchedule] = useState<string>("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const maintenanceSchedules = [
    { id: "msched1", name: "Quarterly Maintenance" },
    { id: "msched2", name: "Annual Deep Clean" },
    { id: "msched3", name: "HVAC Check" },
  ];

  const ITEMS_PER_PAGE = 10;

  // Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(rooms, {
    keys: ['roomNo', 'roomType', 'roomBuildingLoc', 'roomFloorLoc'],
    threshold: 0.3,
    includeMatches: true,
  }), [rooms]);

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fuzzy search results
  const fuzzyResults = useMemo(() => {
    if (!debouncedSearch) return rooms.map((r: Room, i: number) => ({ item: r, refIndex: i }));
    return fuse.search(debouncedSearch) as FuseResult<Room>[];
  }, [debouncedSearch, fuse, rooms]);

  // Get unique building and floor options from rooms
  const buildingOptions = useMemo(() => {
    const set = new Set(rooms.map(r => r.roomBuildingLoc).filter(Boolean));
    return Array.from(set);
  }, [rooms]);
  const floorOptions = useMemo(() => {
    const set = new Set(rooms.map(r => r.roomFloorLoc).filter(Boolean));
    return Array.from(set);
  }, [rooms]);

  // Filtered and sorted rooms
  const filteredRooms = useMemo(() => {
    let filtered = fuzzyResults.map((r: FuseResult<Room>) => r.item);

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(room => room.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(room => room.roomType === typeFilter);
    }

    // Apply building filter
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(room => room.roomBuildingLoc === buildingFilter);
    }
    // Apply floor filter
    if (floorFilter !== 'all') {
      filtered = filtered.filter(room => room.roomFloorLoc === floorFilter);
    }
    // Apply occupancy filter
    if (occupancyFilter !== 'all') {
      filtered = filtered.filter(room =>
        occupancyFilter === 'available' ? !isRoomOccupiedNow(room) : isRoomOccupiedNow(room)
      );
    }

    // Apply column filters
    if (columnFilters.length > 0) {
      filtered = filtered.filter(room => {
        return columnFilters.every(filter => {
          const value = room[filter.field as keyof Room]?.toString().toLowerCase() || '';
          return value.includes(filter.value.toLowerCase());
        });
      });
    }

    // Apply multi-sort
    if (sortFields.length > 0) {
      filtered.sort((a, b) => {
        for (const { field, order } of sortFields) {
          const aValue = a[field];
          const bValue = b[field];
          if (aValue === bValue) continue;
          const comparison = aValue < bValue ? -1 : 1;
          return order === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }

    return filtered;
  }, [fuzzyResults, columnFilters, statusFilter, typeFilter, sortFields, buildingFilter, floorFilter, occupancyFilter]);

  // Paginated rooms
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredRooms.slice(start, end);
  }, [filteredRooms, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);

  const isAllSelected = paginatedRooms.length > 0 && paginatedRooms.every(r => selectedIds.includes(String(r.id)));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRooms.map(r => String(r.id)));
    }
  };

  const handleSelectRow = (id: string | number) => {
    setSelectedIds(prev => prev.includes(String(id)) ? prev.filter(i => i !== String(id)) : [...prev, String(id)]);
  };

  // Status mapping function
  const mapStatusToLowerCase = (status: RoomStatus): "available" | "occupied" | "maintenance" | "reserved" | "inactive" => {
    return status.toLowerCase() as any;
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

  // Table columns
  const adminRoomColumns = [
    { key: 'roomNo', label: 'Room Number', accessor: 'roomNo', className: 'font-medium text-center', sortable: true, required: true },
    { key: 'roomType', label: 'Type', accessor: 'roomType', className: 'capitalize text-center', sortable: true, required: true },
    { key: 'roomCapacity', label: 'Capacity', accessor: 'roomCapacity', className: 'text-center', sortable: true },
    { key: 'roomBuildingLoc', label: 'Building', accessor: 'roomBuildingLoc', className: 'text-center', sortable: true, required: true },
    { key: 'roomFloorLoc', label: 'Floor', accessor: 'roomFloorLoc', className: 'text-center', sortable: true },
    { key: 'readerId', label: 'RFID Reader', accessor: 'readerId', className: 'text-center', sortable: true },
    { key: 'status', label: 'Status', accessor: 'status', className: 'capitalize text-center', sortable: true, required: true },
    { key: 'isActive', label: 'Active', accessor: 'isActive', className: 'text-center', sortable: true },
  ];

  // Calculate the total number of columns for colSpan
  const columnCount = 1 + 1 + adminRoomColumns.length + 1; // expander + select + admin columns + actions

  // Expanded row state
  const handleToggleExpand = (itemId: string) => {
    setExpandedRowIds(current =>
      current.includes(itemId)
        ? []
        : [itemId]
    );
  };

  // Sorting state
  const [sortBy, setSortBy] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'roomNo', order: 'asc' });
  const handleSort = (field: string) => {
    setSortBy(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Apply sorting to filteredRooms
  const sortedRooms = useMemo(() => {
    const roomsCopy = [...filteredRooms];
    roomsCopy.sort((a, b) => {
      const aValue = a[sortBy.field as keyof Room];
      const bValue = b[sortBy.field as keyof Room];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortBy.order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortBy.order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return roomsCopy;
  }, [filteredRooms, sortBy]);

  // Memoize columns to avoid re-creation on every render
  const columns: TableListColumn<Room>[] = useMemo(() => [
    {
      header: '',
      accessor: 'expander',
      className: 'w-12 px-1 py-1',
      expandedContent: (item: Room) => {
        const rowViewMode = expandedRowViewModes[item.id] || "table";
        // Map SubjectSchedule to calendar events
        const dayToIndex = {
          MONDAY: 1,
          TUESDAY: 2,
          WEDNESDAY: 3,
          THURSDAY: 4,
          FRIDAY: 5,
          SATURDAY: 6,
          SUNDAY: 0,
        };
        const events = (item.SubjectSchedule || [])
          .filter((sched: any) => sched.startTime && sched.endTime)
          .map((sched: any, idx: number) => {
            // Parse start/end time as Date objects for the next week
            const now = new Date();
            const dayKey = sched.day as keyof typeof dayToIndex;
            const nextDay = new Date(now);
            nextDay.setDate(now.getDate() + ((7 + dayToIndex[dayKey] - now.getDay()) % 7));
            const [startHour, startMinute] = sched.startTime.split(":").map(Number);
            const [endHour, endMinute] = sched.endTime.split(":").map(Number);
            const start = new Date(nextDay);
            start.setHours(startHour, startMinute, 0, 0);
            const end = new Date(nextDay);
            end.setHours(endHour, endMinute, 0, 0);
            return {
              id: sched.subjectSchedId || idx,
              title: `${sched.subject?.subjectName || ""} (${sched.section?.sectionName || ""})`.trim(),
              start,
              end,
              description: `Section: ${sched.section?.sectionName || "-"}, Instructor: ${(sched.instructor ? `${sched.instructor.firstName || ''} ${sched.instructor.lastName || ''}`.trim() : '-')}`,
              time: `${sched.startTime} - ${sched.endTime}`,
              sectionCode: sched.section?.sectionName || "-",
              subject: sched.subject?.subjectName || "-",
              instructor: sched.instructor ? `${sched.instructor.firstName || ''} ${sched.instructor.lastName || ''}`.trim() : "-",
              day: sched.day || "-",
            };
          });
        return (
          <td colSpan={columnCount} className="bg-blue-50 rounded-b-xl p-4">
            {/* Segmented Toggle for Table/Calendar View (per expanded row, right-aligned, smaller) */}
            <div className="flex justify-end items-center mb-2">
              <div className="flex bg-blue-600 rounded-full p-0.5 w-fit">
                <button
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${rowViewMode === 'table' ? 'bg-white text-blue-600 font-bold' : 'bg-blue-600 text-white font-normal'}`}
                  onClick={() => setRowViewMode(String(item.id), 'table')}
                >
                  Table View
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${rowViewMode === 'calendar' ? 'bg-white text-blue-600 font-bold' : 'bg-blue-600 text-white font-normal'}`}
                  onClick={() => setRowViewMode(String(item.id), 'calendar')}
                >
                  Calendar View
                </button>
              </div>
            </div>
           {rowViewMode === 'table' ? (
             <div className="overflow-x-auto min-w-0 w-full">
               <h4 className="text-xl font-bold text-blue-900 mb-6 text-center">Schedules</h4>
               {item.SubjectSchedule && item.SubjectSchedule.length > 0 ? (
                 <table className="w-full text-sm bg-white min-w-0">
                   <thead>
                     <tr>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Sched ID</th>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Section</th>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Subject</th>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Instructor</th>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Day</th>
                       <th className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-100">Time</th>
                     </tr>
                   </thead>
                   <tbody>
                     {item.SubjectSchedule.map((sched: any, idx: number) => (
                       <tr key={sched.subjectSchedId || idx} className={
                         `${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'} border-b border-gray-200`
                       }>
                         <td className="px-4 py-2 text-center">{sched.subjectSchedId}</td>
                         <td className="px-4 py-2 text-center">{sched.section?.sectionName || '-'}</td>
                         <td className="px-4 py-2 text-center">{sched.subject?.subjectName || '-'}</td>
                         <td className="px-4 py-2 text-center">{(sched.instructor ? `${sched.instructor.firstName || ''} ${sched.instructor.lastName || ''}`.trim() : '-')}</td>
                         <td className="px-4 py-2 text-center">{sched.day}</td>
                         <td className="px-4 py-2 text-center">{sched.startTime} - {sched.endTime}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               ) : (
                 <div className="text-gray-500 text-left">No schedules assigned to this room.</div>
               )}
             </div>
           ) : (
             <>
               <h4 className="font-bold text-lg text-blue-800 mb-2 text-center">Room Schedule Calendar</h4>
               <CalendarView
                 events={events}
                 mode="work-week"
                 showEventCards={false}
                 className="mt-2"
               />
             </>
           )}
         </td>
        );
      },
    },
    {
      header: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onCheckedChange={handleSelectAll}
          aria-label="Select all rooms"
        />
      ),
      accessor: 'select',
      className: 'w-12 px-1 py-1',
    },
    ...adminRoomColumns.map(col => {
      // Spread all properties so headerClassName is included
      if (col.key === 'roomNo') {
        return {
          ...col,
          header: col.label,
          render: (item: Room) => {
            const fuseResult = fuzzyResults.find(r => r.item.id === item.id) as FuseResult<Room> | undefined;
            const nameMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "roomNo")?.indices;
            return (
              <div
                className="text-sm font-medium text-blue-900"
                dangerouslySetInnerHTML={{ __html: safeHighlight(item.roomNo, nameMatches) }}
              />
            );
          }
        };
      }
      if (col.key === 'roomType') {
        return {
          ...col,
          header: col.label,
          render: (item: Room) => (
            <Badge variant={item.roomType === 'LECTURE' ? 'default' : item.roomType === 'LABORATORY' ? 'secondary' : 'outline'}>
              {item.roomType}
            </Badge>
          )
        };
      }
      if (col.key === 'status') {
        return {
          ...col,
          header: col.label,
          render: (item: Room) => (
            <Badge variant={isRoomOccupiedNow(item) ? 'destructive' : 'success'}>
              {isRoomOccupiedNow(item) ? 'Occupied' : 'Available'}
            </Badge>
          )
        };
      }
      if (col.key === 'isActive') {
        return {
          ...col,
          header: col.label,
          render: (item: Room) => (
            <Badge variant={item.isActive ? 'default' : 'destructive'}>
              {item.isActive ? 'Yes' : 'No'}
            </Badge>
          )
        };
      }
      return {
        ...col,
        header: col.label,
      };
    }),
    {
      header: "Actions",
      accessor: "actions",
      className: "px-1 py-1",
      render: (item: Room) => (
        <TableRowActions
          onView={() => { setSelectedRoom(item); setViewModalOpen(true); }}
          onEdit={() => { setSelectedRoom(item); setEditModalOpen(true); }}
          onDelete={() => { setSelectedRoom(item); setDeleteModalOpen(true); }}
          itemName={item.roomNo}
          disabled={!!item.hasRelatedEntities}
          deleteTooltip={item.hasRelatedEntities ? "Cannot delete: Room has related schedules or assignments" : "Delete room"}
          viewAriaLabel={`View room ${item.roomNo}`}
          editAriaLabel={`Edit room ${item.roomNo}`}
          deleteAriaLabel={`Delete room ${item.roomNo}`}
        />
      ),
    },
  ], [adminRoomColumns, isAllSelected, isIndeterminate, handleSelectAll, fuzzyResults, highlightMatch, columnCount]);

  // Export functions
  const exportableColumns = [
    { accessor: 'roomNo', label: 'Room Number' },
    { accessor: 'roomType', label: 'Type' },
    { accessor: 'roomCapacity', label: 'Capacity' },
    { accessor: 'roomBuildingLoc', label: 'Building' },
    { accessor: 'roomFloorLoc', label: 'Floor' },
    { accessor: 'status', label: 'Status' },
    { accessor: 'totalSchedules', label: 'Schedules' },
    { accessor: 'totalAssignments', label: 'Assignments' },
  ];

  const exportableColumnsForExport = [
    { key: 'roomNo', label: 'Room Number' },
    { key: 'roomType', label: 'Type' },
    { key: 'roomCapacity', label: 'Capacity' },
    { key: 'roomBuildingLoc', label: 'Building' },
    { key: 'roomFloorLoc', label: 'Floor' },
    { key: 'status', label: 'Status' },
    { key: 'totalSchedules', label: 'Schedules' },
    { key: 'totalAssignments', label: 'Assignments' },
  ];

  const [exportColumns, setExportColumns] = useState<string[]>(exportableColumns.map(col => col.accessor));
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('csv');

  const handleExport = async () => {
    console.log("handleExport called", { exportFormat, exportColumns, filteredRooms });
    if (!exportFormat) {
      toast.error("Please select an export format");
      return;
    }
    const selectedColumns = exportableColumnsForExport.filter(col => exportColumns.includes(col.key));
    const headers = selectedColumns.map(col => col.label);
    const rows = filteredRooms.map(room => selectedColumns.map(col => String(room[col.key as keyof Room] ?? '')));
    try {
      switch (exportFormat) {
        case 'pdf': {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(12, 37, 86);
          doc.text('Rooms List', doc.internal.pageSize.width / 2, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(128, 128, 128);
          const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          doc.text(`Generated on ${currentDate}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 35,
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
            headStyles: { fillColor: [12, 37, 86], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
            margin: { top: 16, right: 10, bottom: 10, left: 10 },
            theme: 'grid',
          });
          doc.save('rooms.pdf');
          break;
        }
        case 'excel': {
          const wsData = [headers, ...rows];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          const colWidths = headers.map((_: string, idx: number) => {
            const maxLength = Math.max(...wsData.map(row => (row[idx] || '').toString().length), headers[idx].length);
            return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
          });
          ws['!cols'] = colWidths;
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
          XLSX.writeFile(wb, 'rooms.xlsx');
          break;
        }
        case 'csv': {
          const csvRows = [headers, ...rows];
          const csvContent = csvRows.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(",")).join("\n");
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rooms.csv';
          document.body.appendChild(a);
          console.log('Preparing download', blob, url);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 1000);
          break;
        }
      }
      toast.success(`Successfully exported rooms to ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export rooms');
    }
  };

  // Print handler
  const handlePrint = () => {
    const printData = filteredRooms.map(room => ({ ...room }));
    const printFunction = PrintLayout({
      title: 'Rooms List',
      data: printData,
      columns: adminRoomColumns.map(col => ({ header: col.label, accessor: col.accessor })),
      totalItems: filteredRooms.length,
    });
    printFunction();
  };

  // Fetch rooms
  const fetchRooms = async (refresh: boolean = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      setLoading(true);
      const response = await fetch('/api/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      // Map roomId to id for frontend logic
      const mappedRooms = data.map((room: any) => ({
        ...room,
        id: room.roomId ?? room.id, // fallback if already has id
      }));
      setRooms(mappedRooms);
      toast.success('Rooms loaded successfully');
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      setRooms(rooms.filter(room => room.id !== id));
      toast.success("Room deleted successfully");
      setDeleteModalOpen(false);
      setSelectedRoom(null);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Failed to delete room");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected room(s)?`)) {
      setIsDeleting(true);
      try {
        for (const id of selectedIds) {
          await handleDelete(id);
        }
      setSelectedIds([]);
        toast.success(`Successfully deleted ${selectedIds.length} room(s)`);
    } catch (error) {
      toast.error('Failed to delete some rooms');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Bulk deactivate handler
  const handleBulkDeactivate = () => {
    if (selectedIds.length === 0) return;
    setBulkDeactivateDialogOpen(true);
  };

  const confirmBulkDeactivate = async () => {
    setLoading(true);
    try {
      const updatePromises = selectedIds.map(async (id) => {
        const response = await fetch(`/api/rooms/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INACTIVE' }),
        });
        if (!response.ok) throw new Error(`Failed to deactivate room ${id}`);
        return response.json();
      });
      await Promise.all(updatePromises);
      setRooms(prev => prev.map(r => selectedIds.includes(String(r.id)) ? { ...r, status: 'INACTIVE' } : r));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} room(s) deactivated successfully.`);
    } catch (err) {
      toast.error('Failed to deactivate rooms.');
    }
    setLoading(false);
    setBulkDeactivateDialogOpen(false);
  };

  // Bulk reactivate handler
  const handleBulkReactivate = () => {
    if (selectedIds.length === 0) return;
    setBulkReactivateDialogOpen(true);
  };

  const confirmBulkReactivate = async () => {
    setLoading(true);
    try {
      const inactiveRooms = selectedRooms.filter(r => r.status === 'INACTIVE');
      const updatePromises = inactiveRooms.map(async (room) => {
        const response = await fetch(`/api/rooms/${room.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'AVAILABLE' }),
        });
        if (!response.ok) throw new Error(`Failed to reactivate room ${room.id}`);
        return response.json();
      });
      await Promise.all(updatePromises);
      setRooms(prev => prev.map(r => selectedIds.includes(String(r.id)) ? { ...r, status: 'AVAILABLE' } : r));
      toast.success(`${inactiveRooms.length} room(s) reactivated successfully.`);
    } catch (err) {
      toast.error('Failed to reactivate rooms.');
    }
    setLoading(false);
    setBulkReactivateDialogOpen(false);
  };

  // Initial data fetch
  useEffect(() => {
    fetchRooms();
  }, []);

  // Handler for opening the bulk actions dialog
  const handleOpenBulkActionsDialog = () => {
    setSelectedRoomsForBulkAction(selectedRooms);
    setBulkActionsDialogOpen(true);
  };

  // Handler for dialog action complete
  const handleBulkActionComplete = (actionType: string, results: any) => {
    toast.success(`Bulk action '${actionType}' completed.`);
    setBulkActionsDialogOpen(false);
    setSelectedRoomsForBulkAction([]);
  };

  // Handler for dialog cancel
  const handleBulkActionCancel = () => {
    setBulkActionsDialogOpen(false);
    setSelectedRoomsForBulkAction([]);
  };

  const handleExportSelectedRooms = (selectedRooms: Room[]) => {
    if (selectedRooms.length === 0) {
      toast.error('No rooms selected for export');
      return;
    }
    setPendingExportRooms(selectedRooms);
    setExportConfirmOpen(true);
  };

  const confirmExport = () => {
    console.log("confirmExport called", { exportFormat, exportColumns, pendingExportRooms });
    setExportConfirmOpen(false);
    // Use the current export logic, but only for the selected rooms
    if (!exportFormat) {
      toast.error("Please select an export format");
      return;
    }
    const selectedColumns = exportableColumnsForExport.filter((col: { key: string }) => exportColumns.includes(col.key));
    const headers = selectedColumns.map((col: { label: string }) => col.label);
    const rows = pendingExportRooms.map((room: Room) => selectedColumns.map((col: { key: string }) => String(room[col.key as keyof Room] ?? '')));
    try {
      switch (exportFormat) {
        case 'pdf': {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(12, 37, 86);
          doc.text('Rooms List', doc.internal.pageSize.width / 2, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(128, 128, 128);
          const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          doc.text(`Generated on ${currentDate}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(12);
          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 35,
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', cellWidth: 'wrap' },
            headStyles: { fillColor: [12, 37, 86], textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
            margin: { top: 16, right: 10, bottom: 10, left: 10 },
            theme: 'grid',
          });
          doc.save('rooms.pdf');
          break;
        }
        case 'excel': {
          const wsData = [headers, ...rows];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          const colWidths = headers.map((_: string, idx: number) => {
            const maxLength = Math.max(...wsData.map((row: string[]) => (row[idx] || '').toString().length), headers[idx].length);
            return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
          });
          ws['!cols'] = colWidths;
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Rooms');
          XLSX.writeFile(wb, 'rooms.xlsx');
          break;
        }
        case 'csv': {
          const csvRows = [headers, ...rows];
          const csvContent = csvRows.map((row: string[]) => row.map((cell: string) => '"' + cell.replace(/"/g, '""') + '"').join(",")).join("\n");
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rooms.csv';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 1000);
          break;
        }
      }
      toast.success(`Successfully exported ${pendingExportRooms.length} room${pendingExportRooms.length !== 1 ? 's' : ''} to ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export rooms');
    }
    setPendingExportRooms([]);
  };

  const selectedRooms = rooms.filter(room => selectedIds.includes(String(room.id)));

  // Helper function to format filter values for display
  const formatFilterDisplay = (key: string, value: string): string => {
    switch (key) {
      case 'status':
        const statusMap: Record<string, string> = {
          'AVAILABLE': 'Available',
          'OCCUPIED': 'Occupied',
          'MAINTENANCE': 'Maintenance',
          'RESERVED': 'Reserved',
          'INACTIVE': 'Inactive'
        };
        return statusMap[value] || value;
      case 'type':
        const typeMap: Record<string, string> = {
          'LECTURE': 'Lecture',
          'LABORATORY': 'Laboratory',
          'CONFERENCE': 'Conference',
          'OFFICE': 'Office',
          'OTHER': 'Other'
        };
        return typeMap[value] || value;
      case 'building':
        return value.replace(/([A-Z])/g, ' $1').trim() || value;
      case 'floor':
        return value.replace('F', '') + 'F' || value;
      case 'occupancy':
        return value.charAt(0).toUpperCase() + value.slice(1);
      default:
        return value;
    }
  };

  // Convert filters to FilterChips format
  const filtersForChips = useMemo(() => {
    const filters: Record<string, string[]> = {
      status: statusFilter !== 'all' ? [statusFilter] : [],
      type: typeFilter !== 'all' ? [typeFilter] : [],
      building: buildingFilter !== 'all' ? [buildingFilter] : [],
      floor: floorFilter !== 'all' ? [floorFilter] : [],
      occupancy: occupancyFilter !== 'all' ? [occupancyFilter] : [],
    };
    return filters;
  }, [statusFilter, typeFilter, buildingFilter, floorFilter, occupancyFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setBuildingFilter('all');
    setFloorFilter('all');
    setOccupancyFilter('all');
    setSearchInput('');
  };

  // Handler for bulk assignment
  const handleBulkAssignment = async () => {
    if (!bulkAssignmentSchedule) {
      toast.error("Please select a maintenance schedule.");
      return;
    }
    setIsBulkAssigning(true);
    try {
      // Stub: PATCH each room with maintenanceScheduleId
      await Promise.all(selectedRoomsForBulkAction.map(async (room) => {
        // Replace with actual PATCH if backend supports it
        // await fetch(`/api/rooms/${room.id}`, {
        //   method: 'PATCH',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ maintenanceScheduleId: bulkAssignmentSchedule }),
        // });
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network
      }));
      toast.success(`${selectedRoomsForBulkAction.length} room(s) assigned to schedule successfully.`);
      setBulkActionsDialogOpen(false);
      setBulkAssignmentSchedule("");
    } catch (err) {
      toast.error("Failed to assign rooms to schedule.");
    }
    setIsBulkAssigning(false);
  };

  // Add this new state at the top level of RoomsPage
  const [expandedRowViewModes, setExpandedRowViewModes] = useState<Record<string, 'table' | 'calendar'>>({});

  // Handler to set view mode for a specific row
  const setRowViewMode = (rowId: string, mode: 'table' | 'calendar') => {
    setExpandedRowViewModes(prev => ({ ...prev, [rowId]: mode }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
      {/* PageHeader now renders static (non-clickable) breadcrumbs */}
      <PageHeader
        title="Rooms"
        subtitle="Manage classroom and facility assignments"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Academic Management", href: "/academic-management" },
          { label: "Rooms" }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-4 w-full max-w-full min-w-0">
            <div className="min-w-0 w-full">
              <SummaryCard
                icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />} 
                label="Total Schedules"
                value={rooms.reduce((sum, r) => sum + (Array.isArray(r.SubjectSchedule) ? r.SubjectSchedule.length : 0), 0)}
                valueClassName="text-blue-900"
                sublabel="Active schedules"
              />
            </div>
            <div className="min-w-0 w-full">
            <SummaryCard
      icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />} 
      label="Active Schedules"
      value={rooms.filter(room => room.isActive).length}
      valueClassName="text-blue-900"
      sublabel="Currently active"
    />     
</div>
<SummaryCard
  icon={<Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />} 
  label="Total Rooms"
  value={rooms.length}
  valueClassName="text-blue-900"
  sublabel="Total number of rooms"
/>
            <div className="min-w-0 w-full">
            <SummaryCard
  icon={<Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500/80" />} 
  label="Active Rooms"
  value={rooms.filter(room => room.isActive).length}
  valueClassName="text-blue-900"
  sublabel="In use"
/>
            </div>
          </div>

        {/* Quick Actions Panel */}
        <div className="w-full max-w-full pt-4">
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
              id: 'add-room',
              label: 'Add Room',
              description: 'Create new room',
              icon: <Plus className="w-5 h-5 text-white" />,
              onClick: () => { 
                setSelectedRoom(null); 
                setAddModalOpen(true); 
              }
            },
            {
              id: 'import-data',
              label: 'Import Data',
              description: 'Import rooms from file',
              icon: <Upload className="w-5 h-5 text-white" />,
              onClick: () => setImportDialogOpen(true)
            },
            {
              id: 'print-page',
              label: 'Print Page',
              description: 'Print room list',
              icon: <Printer className="w-5 h-5 text-white" />,
              onClick: handlePrint
            },
            {
              id: 'visible-columns',
              label: 'Visible Columns',
              description: 'Manage table columns',
              icon: <Columns3 className="w-5 h-5 text-white" />,
              onClick: () => setVisibleColumnsDialogOpen(true)
            },
            {
              id: 'refresh-data',
              label: 'Refresh Data',
              description: 'Reload room data',
              icon: isRefreshing ? (
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ),
              onClick: () => fetchRooms(true),
              disabled: isRefreshing,
              loading: isRefreshing
            },
            {
              id: 'sort-options',
              label: 'Sort Options',
              description: 'Configure sorting',
              icon: <List className="w-5 h-5 text-white" />,
              onClick: () => setSortDialogOpen(true)
            }
          ]}
          lastActionTime={lastActionTime}
          onLastActionTimeChange={setLastActionTime}
          collapsible={true}
          defaultCollapsed={true}
          onCollapseChange={(collapsed) => {
            console.log('Quick Actions Panel collapsed:', collapsed);
          }}
          />
        </div>

        {/* Main Content Area */}
        <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
          <CardHeader className="p-0">
            {/* Blue Gradient Header - flush to card edge, no rounded corners */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
              <div className="py-4 sm:py-6">
                <div className="flex items-center gap-3 px-4 sm:px-6">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Room List</h3>
                    <p className="text-blue-100 text-sm">Search and filter room information</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          {/* Search and Filter Section */}
          <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center justify-end">
              {/* Search Bar */}
              <div className="relative w-full xl:w-auto xl:min-w-[200px] xl:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>
              {/* Quick Filter Dropdowns */}
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full xl:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32 lg:w-36 xl:w-32 text-gray-500 rounded">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="RESERVED">Reserved</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-28 lg:w-32 xl:w-28 text-gray-500 rounded">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="LECTURE">Lecture</SelectItem>
                    <SelectItem value="LABORATORY">Laboratory</SelectItem>
                    <SelectItem value="CONFERENCE">Conference</SelectItem>
                    <SelectItem value="OFFICE">Office</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="w-full sm:w-40 lg:w-48 xl:w-44 text-gray-500 rounded">
                    <SelectValue placeholder="Building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    <SelectItem value="BuildingA">Building A</SelectItem>
                    <SelectItem value="BuildingB">Building B</SelectItem>
                    <SelectItem value="BuildingC">Building C</SelectItem>
                    <SelectItem value="BuildingD">Building D</SelectItem>
                    <SelectItem value="BuildingE">Building E</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-full sm:w-28 lg:w-32 xl:w-28 text-gray-500 rounded">
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    <SelectItem value="F1">1F</SelectItem>
                    <SelectItem value="F2">2F</SelectItem>
                    <SelectItem value="F3">3F</SelectItem>
                    <SelectItem value="F4">4F</SelectItem>
                    <SelectItem value="F5">5F</SelectItem>
                    <SelectItem value="F6">6F</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={occupancyFilter} onValueChange={setOccupancyFilter}>
                  <SelectTrigger className="w-full sm:w-32 lg:w-36 xl:w-32 text-gray-500 rounded">
                    <SelectValue placeholder="Room Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {(Object.values(filtersForChips).some(arr => arr.length > 0) || searchInput.trim()) && (
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <FilterChips
                  filters={filtersForChips}
                  fields={[
                    { key: 'status', label: 'Status', allowIndividualRemoval: true },
                    { key: 'type', label: 'Type', allowIndividualRemoval: true },
                    { key: 'building', label: 'Building', allowIndividualRemoval: true },
                    { key: 'floor', label: 'Floor', allowIndividualRemoval: true },
                    { key: 'occupancy', label: 'Occupancy', allowIndividualRemoval: true }
                  ]}
                  onRemove={(key, value) => {
                    if (value) {
                      // Remove specific filter value
                      switch (key) {
                        case 'status':
                          setStatusFilter('all');
                          break;
                        case 'type':
                          setTypeFilter('all');
                          break;
                        case 'building':
                          setBuildingFilter('all');
                          break;
                        case 'floor':
                          setFloorFilter('all');
                          break;
                        case 'occupancy':
                          setOccupancyFilter('all');
                          break;
                      }
                    } else {
                      // Remove all values for this filter
                      switch (key) {
                        case 'status':
                          setStatusFilter('all');
                          break;
                        case 'type':
                          setTypeFilter('all');
                          break;
                        case 'building':
                          setBuildingFilter('all');
                          break;
                        case 'floor':
                          setFloorFilter('all');
                          break;
                        case 'occupancy':
                          setOccupancyFilter('all');
                          break;
                      }
                    }
                  }}
                  onClearAll={handleClearFilters}
                  searchQuery={searchInput}
                  onRemoveSearch={() => setSearchInput('')}
                  showSearchChip={true}
                />
              </div>
            )}
          </div>
          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="mt-2 sm:mt-3 px-2 sm:px-3 lg:px-6 max-w-full">
              <BulkActionsBar
                selectedCount={selectedIds.length}
                entityLabel="room"
                actions={[
                  {
                    key: "bulk-actions",
                    label: "Bulk Actions",
                    icon: <Settings className="w-4 h-4 mr-2" />,
                    onClick: handleOpenBulkActionsDialog,
                    tooltip: "Open enhanced bulk actions dialog with status updates, notifications, exports, assignments, and more",
                    variant: "default"
                  },
                  {
                    key: "export",
                    label: "Quick Export",
                    icon: <Download className="w-4 h-4 mr-2" />,
                    onClick: () => handleExportSelectedRooms(selectedRooms),
                    tooltip: "Quick export selected rooms to CSV"
                  },
                  {
                    key: "delete",
                    label: "Deactivate Selected",
                    icon: loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />,
                    onClick: handleBulkDeactivate,
                    loading: loading,
                    disabled: loading,
                    tooltip: "Deactivate selected rooms (can be reactivated later)",
                    variant: "destructive",
                    hidden: selectedRooms.length === 0 || selectedRooms.every(r => r.status === "INACTIVE")
                  },
                  {
                    key: "reactivate",
                    label: "Reactivate Selected",
                    icon: loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />,
                    onClick: handleBulkReactivate,
                    loading: loading,
                    disabled: loading,
                    tooltip: "Reactivate selected inactive rooms",
                    variant: "default",
                    hidden: selectedRooms.length === 0 || selectedRooms.every(r => r.status !== "INACTIVE")
                  }
                ]}
                onClear={() => setSelectedIds([])}
              />
            </div>
          )}
          {/* Table layout for xl+ only */}
          <div className="hidden xl:block">
            <div className="px-4 sm:px-6 pt-6 pb-6"> {/* Add top and bottom padding around the table */}
              <div className="overflow-x-auto bg-white/70 shadow-none relative"> {/* border and border-blue-100 removed */}
                {/* Loader overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                )}
                <div className="print-content">
                  {filteredRooms.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <EmptyState
                        icon={<Home className="w-6 h-6 text-blue-400" />}
                        title="No rooms found"
                        description="Try adjusting your search criteria or filters to find the rooms you're looking for."
                        action={
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                              onClick={() => fetchRooms(true)}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh Data
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <TableList
                      columns={columns}
                      data={sortedRooms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                      loading={loading}
                      selectedIds={selectedIds}
                      emptyMessage={null}
                      onSelectRow={handleSelectRow}
                      onSelectAll={handleSelectAll}
                      isAllSelected={isAllSelected}
                      isIndeterminate={isIndeterminate}
                      getItemId={(item) => String(item.id)}
                      expandedRowIds={expandedRowIds}
                      onToggleExpand={handleToggleExpand}
                      sortState={sortBy}
                      onSort={handleSort}
                      className="border-0 shadow-none w-full max-w-full"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Card layout for small screens */}
          <div className="block xl:hidden p-2 sm:p-3 lg:p-4 max-w-full">
            <div className="px-2 sm:px-4 pt-6 pb-6"> {/* Add top and bottom padding for mobile card view */}
              {!loading && filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <EmptyState
                    icon={<Home className="w-6 h-6 text-blue-400" />}
                    title="No rooms found"
                    description="Try adjusting your search criteria or filters to find the rooms you're looking for."
                    action={
                      <div className="flex flex-col gap-2 w-full">
                        <Button
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                          onClick={() => fetchRooms(true)}
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
                  items={paginatedRooms}
                  selectedIds={selectedIds}
                  onSelect={handleSelectRow}
                  onView={(item) => {
                    setSelectedRoom(item);
                    setViewModalOpen(true);
                  }}
                  onEdit={(item) => {
                    setSelectedRoom(item);
                    setEditModalOpen(true);
                  }}
                  onDelete={(item) => {
                    setSelectedRoom(item);
                    setDeleteModalOpen(true);
                  }}
                  getItemId={(item) => String(item.id)}
                  getItemName={(item) => item.roomNo}
                  getItemCode={(item) => item.roomType}
                  getItemStatus={(item) =>
                    item.status === "AVAILABLE" ? "active" :
                    item.status === "INACTIVE" ? "inactive" :
                    item.status === "OCCUPIED" ? "inactive" :
                    item.status === "MAINTENANCE" ? "inactive" :
                    item.status === "RESERVED" ? "inactive" : "inactive"
                  }
                  getItemDescription={(item) => item.roomBuildingLoc}
                  getItemDetails={(item) => [
                    { label: 'Capacity', value: item.roomCapacity },
                    { label: 'Building', value: item.roomBuildingLoc },
                    { label: 'Floor', value: item.roomFloorLoc },
                    { label: 'RFID Reader', value: item.readerId },
                  ]}
                  disabled={(item) => item.hasRelatedEntities || false}
                  deleteTooltip={(item) =>
                    item.hasRelatedEntities
                      ? "Cannot delete: Room has related schedules or assignments"
                      : undefined
                  }
                  isLoading={loading}
                />
              )}
            </div>
          </div>
          {/* Pagination */}
          <TablePagination
            page={currentPage}
            pageSize={itemsPerPage}
            totalItems={filteredRooms.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            pageSizeOptions={[10, 25, 50, 100]}
            loading={loading}
          />
        </Card>
        </div>
                
      {/* Dialogs */}
      <RoomForm
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        type="create"
        onSuccess={async (formData) => {
          try {
            const res = await fetch('/api/rooms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });
            if (res.ok) {
              setAddModalOpen(false);
              fetchRooms();
            } else {
              const error = await res.text();
              window.alert('Failed to create room: ' + error);
            }
          } catch (err) {
            let msg = '';
            if (err instanceof Error) {
              msg = err.message;
            } else if (typeof err === 'string') {
              msg = err;
            } else {
              msg = JSON.stringify(err);
            }
            window.alert('Failed to create room: ' + msg);
          }
        }}
      />

      <RoomForm
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        type="update"
        data={selectedRoom ? {
          roomNo: selectedRoom.roomNo,
          roomType: selectedRoom.roomType, // RoomType now includes 'OTHER'
          roomCapacity: selectedRoom.roomCapacity,
          roomBuildingLoc: selectedRoom.roomBuildingLoc,
          roomFloorLoc: selectedRoom.roomFloorLoc,
          readerId: selectedRoom.readerId,
        } : undefined}
        id={selectedRoom ? String(selectedRoom.id) : undefined}
        onSuccess={async (formData) => {
          if (!selectedRoom) return;
          try {
            const res = await fetch(`/api/rooms/${selectedRoom.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });
            if (res.ok) {
              setEditModalOpen(false);
              fetchRooms();
            } else {
              const error = await res.text();
              window.alert('Failed to update room: ' + error);
            }
          } catch (err) {
            let msg = '';
            if (err instanceof Error) {
              msg = err.message;
            } else if (typeof err === 'string') {
              msg = err;
            } else {
              msg = JSON.stringify(err);
            }
            window.alert('Failed to update room: ' + msg);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemName={selectedRoom?.roomNo}
        onDelete={() => { if (selectedRoom) handleDelete(String(selectedRoom.id)); }}
        onCancel={() => { setDeleteModalOpen(false); setSelectedRoom(null); }}
        canDelete={true}
        deleteError={undefined}
        description={selectedRoom ? `Are you sure you want to delete the room "${selectedRoom.roomNo}"? This action cannot be undone.` : undefined}
      />

      <ViewDialog
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        title={selectedRoom ? `Room: ${selectedRoom.roomNo}` : "Room Details"}
        subtitle={selectedRoom?.roomType}
        status={selectedRoom ? {
          value: isRoomOccupiedNow(selectedRoom) ? 'Occupied' : selectedRoom.status,
          variant:
            isRoomOccupiedNow(selectedRoom) ? "destructive" :
            selectedRoom.status === "AVAILABLE" ? "success" :
            selectedRoom.status === "OCCUPIED" ? "destructive" :
            selectedRoom.status === "MAINTENANCE" ? "secondary" :
            selectedRoom.status === "RESERVED" ? "warning" :
            selectedRoom.status === "INACTIVE" ? "default" : "default"
        } : undefined}
        logo={selectedRoom?.logo}
        headerVariant="room"
        sections={selectedRoom ? ([
          {
            title: "Room Information",
            fields: [
              { label: 'Room Number', value: selectedRoom.roomNo, icon: <Home className="w-4 h-4 text-blue-600" /> },
              { label: 'Type', value: selectedRoom.roomType, icon: <Building2 className="w-4 h-4 text-blue-600" /> },
              { label: 'Capacity', value: selectedRoom.roomCapacity, type: 'number', icon: <Users className="w-4 h-4 text-blue-600" /> },
              { label: 'Building', value: selectedRoom.roomBuildingLoc, icon: <MapPin className="w-4 h-4 text-blue-600" /> },
              { label: 'Floor', value: selectedRoom.roomFloorLoc, icon: <MapPin className="w-4 h-4 text-blue-600" /> },
              { label: 'RFID Reader', value: selectedRoom.readerId, icon: <RefreshCw className="w-4 h-4 text-blue-600" /> },
              { label: 'Status', value: selectedRoom.status, type: 'text', icon: <Info className="w-4 h-4 text-blue-600" /> },
              { label: 'Active', value: selectedRoom.isActive ? 'Yes' : 'No', type: 'text', icon: <UserCheck className="w-4 h-4 text-blue-600" /> },
            ]
          },
          selectedRoom.SubjectSchedule && selectedRoom.SubjectSchedule.length > 0 ? {
            title: "Current Schedules",
            fields: selectedRoom.SubjectSchedule.map(sched => ({
              label: `${sched.subject?.subjectName || "Subject"} (${sched.section?.sectionName || "Section"})`,
              value: `${sched.day} ${sched.startTime} - ${sched.endTime}`,
              type: 'text',
              icon: <Calendar className="w-4 h-4 text-blue-600" />
            }))
          } : undefined
        ].filter(Boolean) as import("@/components/reusable/Dialogs/ViewDialog").ViewDialogSection[] ) : []}
        description={selectedRoom?.roomBuildingLoc ? `Located in ${selectedRoom.roomBuildingLoc}, Floor ${selectedRoom.roomFloorLoc}` : undefined}
        tooltipText="View detailed room information"
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        entityName="rooms"
        templateUrl="/api/rooms/template"
        acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
        maxFileSize={5}
        fileRequirements={
          <>
            <li>• File must be in CSV or Excel format</li>
            <li>• Maximum file size: 5MB</li>
            <li>• Required columns: <b>roomNo</b>, <b>roomType</b>, <b>roomCapacity</b>, <b>readerId</b>, <b>roomBuildingLoc</b>, <b>roomFloorLoc</b></li>
            <li>• Optional columns: <b>status</b>, <b>isActive</b>, <b>lastMaintenance</b>, <b>nextMaintenance</b>, <b>notes</b></li>
            <li>• <b>roomNo</b>: Must be unique (e.g., "101", "LAB-1", "CONF-A")</li>
            <li>• <b>roomType</b>: "LECTURE", "LABORATORY", "CONFERENCE", "OFFICE", or "OTHER"</li>
            <li>• <b>roomCapacity</b>: Must be positive number (e.g., 30, 50)</li>
            <li>• <b>readerId</b>: Must be unique RFID reader identifier</li>
            <li>• <b>roomBuildingLoc</b>: "BuildingA", "BuildingB", "BuildingC", "BuildingD", or "BuildingE"</li>
            <li>• <b>roomFloorLoc</b>: "F1", "F2", "F3", "F4", "F5", or "F6"</li>
            <li>• <b>status</b>: "AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED", or "INACTIVE" (defaults to "AVAILABLE")</li>
            <li>• <b>isActive</b>: "true" or "false" (defaults to "true")</li>
            <li>• <b>lastMaintenance</b>: Date in YYYY-MM-DD format (optional)</li>
            <li>• <b>nextMaintenance</b>: Date in YYYY-MM-DD format (optional)</li>
            <li>• <b>notes</b>: Additional room information (optional)</li>
          </>
        }
        onImport={async (data) => {
          try {
            const res = await fetch('/api/rooms/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            const result = await res.json();
            if (res.ok && result.success > 0) {
              toast.success(`${result.success} room(s) imported successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
              setImportDialogOpen(false);
              fetchRooms();
            } else {
              toast.error(`Import failed: ${result.errors?.join('; ') || 'Unknown error'}`);
            }
            return {
              success: result.success || 0,
              failed: result.failed || 0,
              errors: Array.isArray(result.errors) ? result.errors : [],
            };
          } catch (err) {
            toast.error('Failed to import rooms.');
            return { success: 0, failed: data.length, errors: ['Failed to import rooms'] };
          }
        }}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={async (format: 'pdf' | 'excel' | 'csv', options?: any) => {
          setExportFormat(format);
          handleExport();
        }}
        dataCount={rooms.length}
        entityType="student"
      />

      <SortDialog
        open={sortDialogOpen}
        onOpenChange={setSortDialogOpen}
        sortOptions={[
          { value: 'roomNo', label: 'Room Number' },
          { value: 'roomType', label: 'Type' },
          { value: 'roomCapacity', label: 'Capacity' },
          { value: 'roomBuildingLoc', label: 'Building' },
          { value: 'roomFloorLoc', label: 'Floor' },
          { value: 'status', label: 'Status' },
          { value: 'totalSchedules', label: 'Schedules' },
          { value: 'totalAssignments', label: 'Assignments' },
        ]}
        currentSort={{ field: sortField, order: sortOrder }}
        onSortChange={(field: string, order: 'asc' | 'desc') => {
          setSortField(field as RoomSortField);
          setSortOrder(order);
        }}
        title="Sort Rooms"
        description="Sort rooms by different fields. Choose the field and order to organize your list."
      />

      <VisibleColumnsDialog
        open={visibleColumnsDialogOpen}
        onOpenChange={setVisibleColumnsDialogOpen}
        columns={adminRoomColumns.map(col => ({
          accessor: col.accessor,
          header: col.label,
          description: `Show/hide ${col.label} column`,
          required: col.required // <-- Pass required property
        }))}
        visibleColumns={exportColumns}
        onColumnToggle={(columnAccessor: string, checked: boolean) => {
          if (checked) {
            setExportColumns(prev => [...prev, columnAccessor]);
          } else {
            setExportColumns(prev => prev.filter(col => col !== columnAccessor));
          }
        }}
        onSelectAll={() => {
          setExportColumns(adminRoomColumns.map(col => col.accessor));
        }}
        onSelectNone={() => {
          setExportColumns([]);
        }}
        onReset={() => {
          setExportColumns(adminRoomColumns.map(col => col.accessor));
        }}
      />

      <BulkActionsDialog
        open={bulkActionsDialogOpen}
        onOpenChange={setBulkActionsDialogOpen}
        selectedItems={selectedRoomsForBulkAction}
        entityType="room"
        entityLabel="room"
        availableActions={[
          {
            id: 'status-update',
            label: 'Update Status',
            description: 'Update status of selected rooms',
            icon: <Settings className="w-4 h-4" />,
            tabId: 'status'
          },
          {
            id: 'export',
            label: 'Export Data',
            description: 'Export selected rooms data',
            icon: <Download className="w-4 h-4" />,
            tabId: 'export'
          },
          {
            id: 'bulk-assignment',
            label: 'Bulk Assignment',
            description: 'Assign rooms to schedules or events',
            icon: <Calendar className="w-4 h-4" />,
            tabId: 'assignment'
          },
          {
            id: 'bulk-delete',
            label: 'Delete/Deactivate/Reactivate',
            description: 'Bulk deactivate, reactivate, or delete rooms',
            icon: <Trash2 className="w-4 h-4" />,
            tabId: 'delete'
          }
        ]}
        onActionComplete={handleBulkActionComplete}
        onCancel={handleBulkActionCancel}
        onProcessAction={async (actionType: string, config: any) => {
          if (actionType === 'bulk-assignment') {
            // Prompt user for schedule (stub)
            const schedule = window.prompt('Enter maintenance schedule name (stub):', 'Quarterly Maintenance');
            if (!schedule) {
              toast.error('No schedule selected.');
              return { success: false };
            }
            await Promise.all(selectedRoomsForBulkAction.map(async (room) => {
              // Simulate PATCH request
              await new Promise(resolve => setTimeout(resolve, 200));
            }));
            toast.success(`${selectedRoomsForBulkAction.length} room(s) assigned to schedule '${schedule}' successfully.`);
            return { success: true, processed: selectedRoomsForBulkAction.length };
          }
          // Stub: implement each action as needed
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { success: true, processed: selectedRoomsForBulkAction.length };
        }}
        getItemDisplayName={(item: Room) => item.roomNo}
        getItemStatus={(item: Room) => item.status}
        getItemId={(item: Room) => String(item.id)}
      />

      <ConfirmDeleteDialog
        open={bulkDeactivateDialogOpen}
        onOpenChange={setBulkDeactivateDialogOpen}
        itemName={selectedIds.length > 1 ? `${selectedIds.length} rooms` : 'room'}
        onDelete={confirmBulkDeactivate}
        onCancel={() => setBulkDeactivateDialogOpen(false)}
        canDelete={true}
        loading={loading}
        description={`Are you sure you want to deactivate ${selectedIds.length} selected room(s)? This action can be reversed by reactivating the rooms.`}
      />

      <ConfirmDeleteDialog
        open={bulkReactivateDialogOpen}
        onOpenChange={setBulkReactivateDialogOpen}
        itemName={selectedRooms.filter(r => r.status === "INACTIVE").length > 1
          ? `${selectedRooms.filter(r => r.status === "INACTIVE").length} rooms`
          : 'room'}
        onDelete={confirmBulkReactivate}
        onCancel={() => setBulkReactivateDialogOpen(false)}
        canDelete={true}
        loading={loading}
        description={`Are you sure you want to reactivate ${selectedRooms.filter(r => r.status === "INACTIVE").length} selected inactive room(s)?`}
        confirmLabel="Reactivate"
      />

      <ConfirmDeleteDialog
        open={exportConfirmOpen}
        onOpenChange={setExportConfirmOpen}
        itemName={pendingExportRooms.length > 1 ? `${pendingExportRooms.length} rooms` : 'room'}
        onDelete={confirmExport}
        onCancel={() => setExportConfirmOpen(false)}
        canDelete={true}
        loading={false}
        description={`Are you sure you want to export ${pendingExportRooms.length} selected room${pendingExportRooms.length !== 1 ? 's' : ''}?`}
        dangerText="Export"
        confirmLabel="Export"
      />
    </div>
  );
}