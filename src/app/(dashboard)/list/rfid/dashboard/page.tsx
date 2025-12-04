"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataChart from "@/components/DataChart";
import { FileText, CreditCard, Wifi, WifiOff, ScanLine, ArrowRight, Info, Settings, Plus, Upload, Printer, RefreshCw, Download, Search, Bell, Building2, RotateCcw, Eye, Pencil, BookOpen, GraduationCap, BadgeInfo, X, ChevronRight, ChevronDown, ChevronUp, Copy, Hash, Tag, Layers, Clock, UserCheck as UserCheckIcon, Archive, Loader2, Columns3, List, Filter, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/reusable/Skeleton";
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { EmptyState } from '@/components/reusable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterChips } from '@/components/FilterChips';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionsBar from '@/components/reusable/BulkActionsBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';
import { TablePagination } from '@/components/reusable/Table/TablePagination';
import { Label } from "@/components/ui/label";
import { RFIDTagFormDialog } from "@/components/forms/RFIDTagFormDialog";
import dynamic from 'next/dynamic';

const RFIDReaderFormDialog = dynamic(() => import("@/components/forms/RFIDReaderFormDialog"), { ssr: false });

import { rfidDashboardService, RFIDDashboardData, RFIDDashboardStats, RFIDScanLog, RFIDChartData } from "@/lib/services/rfid-dashboard.service";
import { useRFIDRealTime } from "@/hooks/useRFIDRealTime";
import { toast } from "sonner";

// Filter interfaces
interface RFIDFilters extends Record<string, string[]> {
  status: string[];
  location: string[];
  scanType: string[];
  readerId: string[];
  tagId: string[];
}

// Transform data for backward compatibility
const transformStats = (data: any) => {
  if (!data?.stats) return {
    totalTags: 0,
    activeTags: 0,
    totalReaders: 0,
    activeReaders: 0,
    totalScans: 0,
    todayScans: 0,
    weeklyScans: 0,
    monthlyScans: 0,
  };
  
  return {
    totalTags: data.stats.totalTags,
    activeTags: data.stats.activeTags,
    totalReaders: data.stats.totalReaders,
    activeReaders: data.stats.activeReaders,
    totalScans: data.stats.totalScans,
    todayScans: data.stats.todayScans,
    weeklyScans: data.stats.weeklyScans,
    monthlyScans: data.stats.monthlyScans,
  };
};

const statusBadge = (status: string) => {
  const normalized = (status || '').toLowerCase();
  switch (normalized) {
    case "success":
      return <Badge variant="default">Success</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "unauthorized":
      return <Badge variant="destructive">Unauthorized</Badge>;
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const INVALID_STRINGS = new Set(["", "undefined", "null", "unknown", "n/a", "na", "none", "not available"]);

const sanitizeString = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (INVALID_STRINGS.has(lower)) return null;
  const parts = str.split(/\s+/);
  if (parts.length > 1 && parts.every((part) => INVALID_STRINGS.has(part.toLowerCase()))) {
    return null;
  }
  return str;
};

const combineName = (...parts: Array<string | null | undefined>) => {
  const validParts = parts
    .map((part) => sanitizeString(part))
    .filter(Boolean) as string[];
  if (validParts.length === 0) return null;
  return validParts.join(" ");
};

export default function RFIDDashboardPage() {
  const router = useRouter();
  
  const deriveTagDisplay = useCallback((log: any): string | null => {
    const candidates = [
      log.tagId,
      log.tagNumber,
      log.rfidTag,
      log.tag?.tagNumber,
      log.tag?.tagId,
    ];
    for (const candidate of candidates) {
      const sanitized = sanitizeString(candidate);
      if (sanitized) return sanitized;
    }
    return null;
  }, []);

  const deriveReaderDisplay = useCallback((log: any): string | null => {
    const candidates = [
      log.readerName,
      log.reader?.deviceName,
      log.reader?.name,
      log.reader?.readerName,
      sanitizeString(typeof log.readerId === 'number' ? `Reader ${log.readerId}` : log.readerId),
    ];
    for (const candidate of candidates) {
      const sanitized = sanitizeString(candidate);
      if (sanitized) return sanitized;
    }
    return null;
  }, []);

  const deriveStudentDisplay = useCallback((log: any): string | null => {
    const nameFromPayload = sanitizeString(log.studentName);
    if (nameFromPayload) return nameFromPayload;

    const fallback = combineName(log.studentFirstName, log.studentMiddleName, log.studentLastName);
    if (fallback) return fallback;

    return null;
  }, []);

  const deriveStatusDisplay = useCallback((log: any): string => {
    const status = sanitizeString(log.status) ?? sanitizeString(log.scanStatus);
    return status ? status.toUpperCase() : 'UNKNOWN';
  }, []);

  const deriveScanTypeDisplay = useCallback((log: any): string => {
    const scanType = sanitizeString(log.scanType) ?? 'attendance';
    return scanType.toLowerCase();
  }, []);

  const deriveRoomNumberDisplay = useCallback((log: any): string | null => {
    const directRoom = sanitizeString(log.reader?.room?.roomNo);
    if (directRoom) return directRoom;

    const fromLabel = sanitizeString(log.roomLabel);
    if (fromLabel) {
      const firstToken = fromLabel.split(/\s+/)[0];
      const tokenSanitized = sanitizeString(firstToken);
      if (tokenSanitized) return tokenSanitized;
    }

    return sanitizeString(log.location) ?? sanitizeString(log.readerName) ?? null;
  }, []);

  const deriveLocationDisplay = useCallback((log: any): string => {
    const roomLabel =
      sanitizeString(log.roomLabel) ??
      combineName(
        log.reader?.room?.roomNo,
        log.reader?.room?.roomBuildingLoc
          ? `(${log.reader?.room?.roomBuildingLoc}${
              log.reader?.room?.roomFloorLoc ? ` • Floor ${log.reader?.room?.roomFloorLoc}` : ''
            })`
          : null
      );

    return (
      roomLabel ??
      sanitizeString(log.location) ??
      sanitizeString(log.readerName) ??
      'Unknown Location'
    );
  }, []);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RFIDFilters>({
    status: [],
    location: [],
    scanType: [],
    readerId: [],
    tagId: []
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [addReaderDialogOpen, setAddReaderDialogOpen] = useState(false);
  
  // Print dialog states
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeCharts: true,
    includeStats: true,
    includeRecentLogs: true,
    includeFilters: false,
    format: 'summary' as 'summary' | 'detailed' | 'charts'
  });
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data,
    loading,
    error,
    refresh,
    setFilters: setApiFilters
  } = useRFIDRealTime({
    autoRefresh: false,
    refreshInterval: 30000,
    onError: (error) => {
      toast.error(`Failed to update RFID data: ${error}`);
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transform data for backward compatibility
  const stats = useMemo(() => transformStats(data), [data]);
  
  // Enhanced chart data with fallbacks and loading states
  const tagStatusData = useMemo(() => {
    if (!data?.tagActivityChart || data.tagActivityChart.length === 0) {
      return [
        { name: 'ACTIVE', value: stats.activeTags || 0 },
        { name: 'INACTIVE', value: (stats.totalTags || 0) - (stats.activeTags || 0) }
      ];
    }
    return data.tagActivityChart;
  }, [data?.tagActivityChart, stats.activeTags, stats.totalTags]);
  const hasTagChartData = useMemo(() => (tagStatusData || []).some((d: any) => Number(d?.value) > 0), [tagStatusData]);
  
  const readerStatusData = useMemo(() => {
    if (!data?.readerStatusChart || data.readerStatusChart.length === 0) {
      return [
        { name: 'ACTIVE', value: stats.activeReaders || 0 },
        { name: 'INACTIVE', value: (stats.totalReaders || 0) - (stats.activeReaders || 0) }
      ];
    }
    return data.readerStatusChart;
  }, [data?.readerStatusChart, stats.activeReaders, stats.totalReaders]);
  const hasReaderChartData = useMemo(() => (readerStatusData || []).some((d: any) => Number(d?.value) > 0), [readerStatusData]);
  
  const scanTrendsData = useMemo(() => {
    return data?.scanTrendsChart || [];
  }, [data?.scanTrendsChart]);
  
  const recentLogs = useMemo(() => data?.recentScans || [], [data]);

  const enrichedLogs = useMemo(() => {
    return recentLogs.map((log: any) => {
      const displayTag = deriveTagDisplay(log) ?? 'Unknown Tag';
      const displayReader = deriveReaderDisplay(log) ?? 'Unknown Reader';
      const displayStudent = deriveStudentDisplay(log) ?? 'Unknown Student';
      const displayStatus = deriveStatusDisplay(log);
      const displayScanType = deriveScanTypeDisplay(log);
      const displayRoomNumber = deriveRoomNumberDisplay(log);
      const displayLocation = deriveLocationDisplay(log);
      const timestampValue = log.timestamp ? new Date(log.timestamp) : null;
      const displayTimestamp = timestampValue && !Number.isNaN(timestampValue.getTime())
        ? timestampValue.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : log.timestamp;
      const readerFilterValue =
        log.readerId !== null && log.readerId !== undefined
          ? String(log.readerId)
          : sanitizeString(log.readerIdentifier) ?? displayReader;
      const tagFilterValue =
        sanitizeString(log.tagId) ??
        sanitizeString(log.tagIdentifier) ??
        displayTag;

      const studentIdentifier = sanitizeString(log.studentIdentifier);

      const searchComposite = [
        displayTag,
        displayStudent,
        displayReader,
        displayRoomNumber,
        displayLocation,
        displayScanType,
        String(log.readerId ?? ''),
        studentIdentifier ?? '',
      ]
        .map((part) => (part ? part.toLowerCase() : ''))
        .join(' ');

      return {
        ...log,
        displayTag,
        displayReader,
        displayStudent,
        displayStatus,
        displayScanType,
        displayRoomNumber,
        displayLocation,
        displayTimestamp,
        readerFilterValue,
        tagFilterValue,
        studentIdentifier,
        searchComposite,
      };
    });
  }, [
    recentLogs,
    deriveTagDisplay,
    deriveReaderDisplay,
    deriveStudentDisplay,
    deriveStatusDisplay,
    deriveScanTypeDisplay,
    deriveRoomNumberDisplay,
    deriveLocationDisplay,
  ]);

  // Get unique filter options from data
  const statuses = useMemo(
    () => [...new Set(enrichedLogs.map((log: any) => log.displayStatus).filter(Boolean))],
    [enrichedLogs]
  );
  const roomNumbers = useMemo(
    () =>
      [
        ...new Set(
          enrichedLogs
            .map((log: any) => log.displayRoomNumber || log.displayLocation)
            .filter(Boolean)
        ),
      ],
    [enrichedLogs]
  );
  const scanTypes = useMemo(
    () => [...new Set(enrichedLogs.map((log: any) => log.displayScanType).filter(Boolean))],
    [enrichedLogs]
  );
  const readerOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    enrichedLogs.forEach((log: any) => {
      const value = log.readerFilterValue;
      const label = log.displayReader;
      if (!value || !label) return;
      if (!map.has(value)) {
        map.set(value, { value, label });
      }
    });
    return Array.from(map.values());
  }, [enrichedLogs]);

  const tagOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    enrichedLogs.forEach((log: any) => {
      const value = log.tagFilterValue;
      const label = log.displayTag;
      if (!value || !label) return;
      if (!map.has(value)) {
        map.set(value, { value, label });
      }
    });
    return Array.from(map.values());
  }, [enrichedLogs]);

  // Function to get count for each filter option
  const getFilterCount = useCallback((filterType: string, option: string): number => {
    return enrichedLogs.filter((log: any) => {
      switch (filterType) {
        case 'status':
          return log.displayStatus === option;
        case 'location':
          return (
            log.displayRoomNumber === option ||
            log.displayLocation === option
          );
        case 'scanType':
          return log.displayScanType === option;
        case 'readerId':
          return log.readerFilterValue === option;
        case 'tagId':
          return log.tagFilterValue === option;
        default:
          return false;
      }
    }).length;
  }, [enrichedLogs]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return enrichedLogs.filter((log: any) => {
      const matchesSearch = 
        !query || log.searchComposite.includes(query);
      const matchesStatus =
        filters.status.length === 0 || filters.status.includes(log.displayStatus);
      const matchesLocation =
        filters.location.length === 0 ||
        filters.location.includes(log.displayRoomNumber || log.displayLocation);
      const matchesScanType =
        filters.scanType.length === 0 || filters.scanType.includes(log.displayScanType);
      const matchesReaderId =
        filters.readerId.length === 0 || filters.readerId.includes(log.readerFilterValue);
      const matchesTagId =
        filters.tagId.length === 0 || filters.tagId.includes(log.tagFilterValue);
      
      return matchesSearch && matchesStatus && matchesLocation && matchesScanType && matchesReaderId && matchesTagId;
    });
  }, [enrichedLogs, debouncedSearch, filters]);

  // Pagination
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredLogs.length / pageSize)), [filteredLogs.length, pageSize]);
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, page, pageSize]);

  // Helpers
  const getRowId = (log: any) => String(log.id || log.logsId || `${log.tagId}-${log.timestamp}`);
  const toggleSelectAll = () => {
    if (selected.size === paginatedLogs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedLogs.map((l: any) => getRowId(l))));
    }
  };
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const openLogDetails = (log: any) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  // Bulk actions
  const handleExportSelected = () => {
    const rows = filteredLogs.filter((l: any) => selected.has(getRowId(l)));
    if (rows.length === 0) return;
    const headers = ['Status','Tag ID','Student','Reader','Room Number','Type','Timestamp'];
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [
        r.displayStatus,
        r.displayTag,
        (r.displayStudent || 'Unknown').toString().replace(/,/g,' '),
        r.displayReader,
        r.displayRoomNumber || r.displayLocation,
        (r.displayScanType || 'attendance'),
        r.displayTimestamp || r.timestamp
      ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rfid-selected-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySelectedTagIds = async () => {
    const ids = filteredLogs
      .filter((l: any) => selected.has(getRowId(l)))
      .map((l: any) => l.displayTag)
      .filter(Boolean);
    await navigator.clipboard.writeText(ids.join('\n'));
    toast.success('Tag IDs copied to clipboard');
  };

  const handleExportFiltered = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = ['Status','Tag ID','Student','Reader','Room Number','Type','Timestamp'];
    const csv = [
      headers.join(','),
      ...filteredLogs.map((r: any) => [
        r.displayStatus,
        r.displayTag,
        (r.displayStudent || 'Unknown').toString().replace(/,/g,' '),
        r.displayReader,
        r.displayRoomNumber || r.displayLocation,
        (r.displayScanType || 'attendance'),
        r.displayTimestamp || r.timestamp
      ].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rfid-filtered-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleClearFilters = () => {
    setFilters({
      status: [],
      location: [],
      scanType: [],
      readerId: [],
      tagId: []
    });
    setSearchQuery('');
  };

  // Print functionality
  const handlePrintReport = () => {
    setPrintDialogOpen(true);
  };

  const handlePrint = () => {
    try {
      // Create print content based on options
      const printContent = generatePrintContent();
      
      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
      
      setPrintDialogOpen(false);
      toast.success('Print job started');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print report');
    }
  };

  const generatePrintContent = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RFID Dashboard Report - ${currentDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { border: 1px solid #ddd; padding: 15px; text-align: center; }
          .charts { margin: 30px 0; }
          .chart-section { margin-bottom: 30px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f5f5f5; }
          .footer { margin-top: 30px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RFID Dashboard Report</h1>
          <p>Generated on ${currentDate} at ${currentTime}</p>
        </div>
    `;

    // Add stats if selected
    if (printOptions.includeStats) {
      content += `
        <div class="stats">
          <div class="stat-card">
            <h3>Total Tags</h3>
            <p>${stats.totalTags}</p>
          </div>
          <div class="stat-card">
            <h3>Active Readers</h3>
            <p>${stats.activeReaders}</p>
          </div>
          <div class="stat-card">
            <h3>Today's Scans</h3>
            <p>${stats.todayScans}</p>
          </div>
          <div class="stat-card">
            <h3>Total Scans</h3>
            <p>${stats.totalScans}</p>
          </div>
        </div>
      `;
    }

    // Add charts if selected
    if (printOptions.includeCharts) {
      content += `
        <div class="charts">
          <h2>Analytics Charts</h2>
          <div class="chart-section">
            <h3>Tag Status Distribution</h3>
            <p>Active Tags: ${stats.activeTags} | Inactive Tags: ${stats.totalTags - stats.activeTags}</p>
          </div>
          <div class="chart-section">
            <h3>Reader Status</h3>
            <p>Active Readers: ${stats.activeReaders} | Inactive Readers: ${stats.totalReaders - stats.activeReaders}</p>
          </div>
        </div>
      `;
    }

    // Add recent logs if selected
    if (printOptions.includeRecentLogs && recentLogs.length > 0) {
      content += `
        <div class="recent-logs">
          <h2>Recent RFID Activity</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Tag ID</th>
                <th>Student</th>
                <th>Reader</th>
                <th>Location</th>
                <th>Type</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      recentLogs.slice(0, 20).forEach((log: any) => {
        content += `
          <tr>
            <td>${log.status}</td>
            <td>${log.tagId}</td>
            <td>${log.studentName || 'Unknown'}</td>
            <td>${log.readerId}</td>
            <td>${log.location}</td>
            <td>${log.scanType || 'attendance'}</td>
            <td>${log.timestamp}</td>
          </tr>
        `;
      });
      
      content += `
            </tbody>
          </table>
        </div>
      `;
    }

    content += `
        <div class="footer">
          <p>RFID Dashboard Report - ICCT Smart Attendance System</p>
        </div>
      </body>
      </html>
    `;

    return content;
  };

  // Update API filters when local filters change
  useEffect(() => {
    const apiFilterParams: any = {};
    if (filters.status.length > 0) apiFilterParams.status = filters.status;
    if (filters.location.length > 0) apiFilterParams.location = filters.location;
    if (filters.scanType.length > 0) apiFilterParams.scanType = filters.scanType;
    if (filters.readerId.length > 0) apiFilterParams.readerId = filters.readerId[0]; // Single value
    if (filters.tagId.length > 0) apiFilterParams.tagId = filters.tagId[0]; // Single value
    
    setApiFilters(apiFilterParams);
  }, [filters, setApiFilters]);

  // Show loading state
  if (loading) {
    return <PageSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          <PageHeader
            title="RFID Overview"
            subtitle="Error loading dashboard data"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'RFID Management', href: '/list/rfid' },
              { label: 'Overview' }
            ]}
          />
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refresh} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Header */}
        <PageHeader
          title="RFID Overview"
          subtitle="Monitor, analyze, and manage your RFID system at a glance."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'RFID Management', href: '/list/rfid' },
            { label: 'Overview' }
          ]}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <SummaryCard
            icon={<CreditCard className="text-blue-500 w-5 h-5" />}
            label="Total Tags"
            value={stats.totalTags}
            valueClassName="text-blue-900"
            sublabel="Total RFID tags in system"
          />
          <SummaryCard
            icon={<Wifi className="text-blue-500 w-5 h-5" />}
            label="Active Readers"
            value={stats.activeReaders}
            valueClassName="text-blue-900"
            sublabel="Currently active"
          />
          <SummaryCard
            icon={<ScanLine className="text-blue-500 w-5 h-5" />}
            label="Today's Scans"
            value={stats.todayScans}
            valueClassName="text-blue-900"
            sublabel="Scans recorded today"
          />
          <SummaryCard
            icon={<FileText className="text-blue-500 w-5 h-5" />}
            label="Total Scans"
            value={stats.totalScans}
            valueClassName="text-blue-900"
            sublabel="All-time scan records"
          />
        </div>

        

        {/* Advanced Filters removed */}

        {/* Quick Actions Panel */}
        <div className="w-full max-w-full pt-4">
          <QuickActionsPanel
            variant="premium"
            title="Quick Actions"
            subtitle="Essential RFID management tools"
            icon={
              <div className="w-6 h-6 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            }
            actionCards={[
              {
                id: 'add-tag',
                label: 'Add Tag',
                description: 'Register new RFID tag',
                icon: <Plus className="w-5 h-5 text-white" />,
                onClick: () => setAddTagDialogOpen(true)
              },
              {
                id: 'configure-reader',
                label: 'Configure Reader',
                description: 'Setup RFID reader',
                icon: <Settings className="w-5 h-5 text-white" />,
                onClick: () => setAddReaderDialogOpen(true)
              },
              {
                id: 'view-logs',
                label: 'View Logs',
                description: 'Check RFID activity logs',
                icon: <FileText className="w-5 h-5 text-white" />,
                onClick: () => router.push('/list/rfid/logs')
              },
              {
                id: 'export-data',
                label: 'Export Data',
                description: 'Export RFID data',
                icon: <Download className="w-5 h-5 text-white" />,
                onClick: handleExportFiltered
              },
              {
                id: 'print-report',
                label: 'Print Report',
                description: 'Generate RFID report',
                icon: <Printer className="w-5 h-5 text-white" />,
                onClick: handlePrintReport
              },
              {
                id: 'refresh-data',
                label: 'Refresh Data',
                description: 'Reload RFID data',
                icon: isRefreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-white" />
                ),
                onClick: handleRefresh,
                disabled: isRefreshing,
                loading: isRefreshing
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

        {/* Charts Section with Enhanced UI/UX */}
        <div className="w-full max-w-full pt-4">
          <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
            <CardHeader className="p-0">
              {/* Blue Gradient Header - flush to card edge, no rounded corners */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
                <div className="py-4 sm:py-6">
                  <div className="flex items-center gap-3 px-4 sm:px-6 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-white">
                          <path d="M3 3v18h18"/>
                          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">RFID Analytics & Charts</h3>
                        <p className="text-blue-100 text-sm">Visual insights and data trends</p>
                      </div>
                    </div>
                    {/* Refresh button removed as requested */}
                  </div>
                </div>
              </div>
            </CardHeader>
            {/* Charts Content */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/70 rounded p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-blue-900">Tag Status Distribution</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-blue-400 cursor-pointer" aria-label="Info about tag status distribution" />
                        </TooltipTrigger>
                        <TooltipContent>Breakdown of all RFID tag statuses</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div style={{ height: 300 }} className="flex items-center justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-500">Loading tag data...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                        <p className="text-sm text-red-600 mb-2">Failed to load tag data</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      hasTagChartData ? (
                        <DataChart
                          type="pie"
                          data={tagStatusData}
                          title=""
                          height={250}
                          colors={["#10b981", "#ef4444"]}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <EmptyState
                            icon={<Tag className="w-6 h-6 text-blue-400" />}
                            title="No data available"
                            description="Tag status data will appear here once available."
                            action={
                              <Button
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                                onClick={handleRefresh}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Data
                              </Button>
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                <div className="bg-white/70 rounded p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-blue-900">Reader Status</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-blue-500 cursor-pointer" aria-label="Info about reader status" />
                        </TooltipTrigger>
                        <TooltipContent>Online vs Offline readers</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div style={{ height: 300 }} className="flex items-center justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-500">Loading reader data...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                        <p className="text-sm text-red-600 mb-2">Failed to load reader data</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      hasReaderChartData ? (
                        <DataChart
                          type="pie"
                          data={readerStatusData}
                          title=""
                          height={250}
                          colors={["#22c55e", "#ef4444"]}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <EmptyState
                            icon={<Wifi className="w-6 h-6 text-blue-400" />}
                            title="No data available"
                            description="Reader status data will appear here once available."
                            action={
                              <Button
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                                onClick={handleRefresh}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Data
                              </Button>
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2 bg-white/70 rounded p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-semibold text-bblue-900">Scan Trends (This Week)</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-blue-400 cursor-pointer" aria-label="Info about scan trends" />
                        </TooltipTrigger>
                        <TooltipContent>RFID scans per day</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div style={{ height: 300 }} className="flex items-center justify-center">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-500">Loading scan trends...</p>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                        <p className="text-sm text-red-600 mb-2">Failed to load scan trends</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    ) : (
                      scanTrendsData && scanTrendsData.length > 0 ? (
                        <DataChart
                          type="bar"
                          data={scanTrendsData}
                          title="Scan Trends"
                          height={250}
                          colors={["#3b82f6"]}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <EmptyState
                            icon={<Layers className="w-6 h-6 text-blue-400" />}
                            title="No trend data available"
                            description="RFID scans per day will appear here once available."
                            action={
                              <Button
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                                onClick={handleRefresh}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh Data
                              </Button>
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity with Enhanced UI/UX from Course List */}
        <div className="w-full max-w-full pt-4">
          <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
            <CardHeader className="p-0">
              {/* Blue Gradient Header - flush to card edge, no rounded corners */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
                <div className="py-4 sm:py-6">
                  <div className="flex items-center gap-3 px-4 sm:px-6">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Recent RFID Activity</h3>
                      <p className="text-blue-100 text-sm">Latest scans and events</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            {/* Search & Filters */}
            <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row gap-3 items-center lg:justify-end lg:ml-auto">
                {/* Search Bar */}
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tag, student, reader, location..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                </div>

                {/* Quick Filter Dropdowns */}
                <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-start lg:justify-end">
                  {/* Status */}
                  <Select value={filters.status[0] || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ ...filters, status: [] });
                    } else {
                      setFilters({ ...filters, status: [value] });
                    }
                  }}>
                    <SelectTrigger className="w-full lg:w-40 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {statuses.map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Location */}
                  <Select value={filters.location[0] || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ ...filters, location: [] });
                    } else {
                      setFilters({ ...filters, location: [value] });
                    }
                  }}>
                    <SelectTrigger className="w-full lg:w-40 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                      <SelectValue placeholder="Room Number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {roomNumbers.map((room: string) => (
                        <SelectItem key={room} value={room}>{room}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Scan Type */}
                  <Select value={filters.scanType[0] || 'all'} onValueChange={(value) => {
                    if (value === 'all') {
                      setFilters({ ...filters, scanType: [] });
                    } else {
                      setFilters({ ...filters, scanType: [value] });
                    }
                  }}>
                    <SelectTrigger className="w-full lg:w-36 text-sm text-gray-500 min-w-0 rounded border-gray-300 bg-white hover:bg-gray-50">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {scanTypes.map((t: string) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(Object.values(filters).some(arr => arr.length > 0) || searchQuery.trim()) && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <FilterChips
                    filters={filters}
                    fields={[
                      { key: 'status', label: 'Status', allowIndividualRemoval: true },
                      { key: 'location', label: 'Room', allowIndividualRemoval: true },
                      { key: 'scanType', label: 'Type', allowIndividualRemoval: true },
                      { key: 'readerId', label: 'Reader', allowIndividualRemoval: true },
                      { key: 'tagId', label: 'Tag', allowIndividualRemoval: true }
                    ]}
                    onRemove={(key, value) => {
                      if (value) {
                        const current = (filters as any)[key] as string[];
                        const next = current.filter(v => v !== value);
                        setFilters({ ...filters, [key]: next } as any);
                      } else {
                        setFilters({ ...filters, [key]: [] } as any);
                      }
                    }}
                    onClearAll={handleClearFilters}
                    searchQuery={searchQuery}
                    onRemoveSearch={() => setSearchQuery('')}
                    showSearchChip={true}
                  />
                </div>
              )}
            </div>
            {/* Real-time status controls removed */}
            {/* Table Content */}
            <div className="relative px-2 sm:px-3 lg:px-6 mt-3 sm:mt-4 lg:mt-6">
              <div className="overflow-x-auto bg-white/70 shadow-none relative">
                {/* Bulk Actions Bar */}
                {selected.size > 0 && (
                  <div className="px-3 pt-3">
                    <BulkActionsBar
                      selectedCount={selected.size}
                      onClear={() => setSelected(new Set())}
                      entityLabel="log"
                      actions={[
                        { key: 'export', label: 'Export Selected', icon: <Download className="w-4 h-4 mr-2" />, onClick: handleExportSelected },
                        { key: 'copy', label: 'Copy Tag IDs', icon: <Copy className="w-4 h-4 mr-2" />, onClick: handleCopySelectedTagIds }
                      ]}
                    />
                  </div>
                )}
                {/* Loader overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                )}
                <div className="print-content">
                  {!isRefreshing && filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <EmptyState
                        icon={<FileText className="w-6 h-6 text-blue-400" />}
                        title="No RFID activity found"
                        description="Try adjusting your search criteria or filters to find the RFID logs you're looking for."
                        action={
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                              onClick={handleRefresh}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh Data
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <Table className="border-0 shadow-none max-w-full">
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead className="w-8 text-center">
                            <Checkbox
                              checked={selected.size === paginatedLogs.length && paginatedLogs.length > 0}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead className="w-8 text-center">{''}</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Status</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Tag ID</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Student</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Reader</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Location</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Type</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Timestamp</TableHead>
                          <TableHead className="text-blue-900 font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&>tr>td]:text-blue-900">
                        {paginatedLogs.map((log: any) => {
                          const id = getRowId(log);
                          const isExpanded = expanded.has(id);
                          return (
                            <Fragment key={id}>
                              <TableRow className="hover:bg-muted/50 border-b">
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={selected.has(id)}
                                    onCheckedChange={() => toggleSelect(id)}
                                    aria-label="Select row"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <button onClick={() => toggleExpand(id)} aria-label="Toggle details" className="p-1 text-blue-700">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </TableCell>
                                <TableCell className="text-center">{statusBadge(log.displayStatus)}</TableCell>
                                <TableCell className="font-medium text-center">{log.displayTag}</TableCell>
                                <TableCell className="text-center">{log.displayStudent}</TableCell>
                                <TableCell className="text-center">{log.displayReader}</TableCell>
                                <TableCell className="text-center">{log.displayRoomNumber || log.displayLocation}</TableCell>
                                <TableCell className="capitalize text-center">{log.displayScanType}</TableCell>
                                <TableCell className="text-center">{log.displayTimestamp}</TableCell>
                                <TableCell className="text-center">
                                  <Button variant="ghost" size="sm" onClick={() => openLogDetails(log)} aria-label="View details" className="hover:rounded transition-[border-radius] duration-200">
                                    <Eye className="w-4 h-4 text-blue-700" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-white/60">
                                  <TableCell colSpan={10} className="py-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-blue-900">
                                      <div className="bg-blue-50/50 border border-blue-200 rounded p-3">
                                        <div className="font-semibold mb-1">Scan Details</div>
                                        <div>Tag ID: {log.displayTag}</div>
                                        <div>Type: {log.displayScanType}</div>
                                        <div>Status: {log.displayStatus}</div>
                                      </div>
                                      <div className="bg-blue-50/50 border border-blue-200 rounded p-3">
                                        <div className="font-semibold mb-1">Reader</div>
                                        <div>ID: {log.displayReader}</div>
                                        <div>Room: {log.displayRoomNumber || log.displayLocation}</div>
                                        <div>Location: {log.displayLocation}</div>
                                      </div>
                                      <div className="bg-blue-50/50 border border-blue-200 rounded p-3">
                                        <div className="font-semibold mb-1">Subject</div>
                                        <div>Student: {log.displayStudent}</div>
                                        <div>Timestamp: {log.displayTimestamp}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
            {/* Pagination (matching Instructors page) */}
            <div className="px-3 sm:px-4 lg:px-6 py-3">
              <TablePagination
                page={page}
                totalItems={filteredLogs.length}
                pageSize={pageSize}
                onPageChange={(newPage: number) => setPage(newPage)}
                onPageSizeChange={(newSize: number) => { setPageSize(newSize); setPage(1); }}
                pageSizeOptions={[5,10,20,50]}
              />
            </div>
          </Card>
        </div>

        <ViewDialog
          open={showLogDetails}
          onOpenChange={setShowLogDetails}
          title="RFID Scan Details"
          subtitle="Full information for the selected scan"
          sections={selectedLog ? ([
            {
              title: 'Scan',
              columns: 2,
              fields: [
                { label: 'Tag ID', value: selectedLog.displayTag },
                { label: 'Type', value: selectedLog.displayScanType || 'attendance' },
                { label: 'Status', value: selectedLog.displayStatus, type: 'badge', badgeVariant: 'default' },
                { label: 'Timestamp', value: selectedLog.displayTimestamp || selectedLog.timestamp }
              ]
            },
            {
              title: 'Reader',
              columns: 2,
              fields: [
                { label: 'Reader', value: selectedLog.displayReader },
                { label: 'Room Number', value: selectedLog.displayRoomNumber || 'Unknown' },
                { label: 'Location', value: selectedLog.displayLocation || 'Unknown' }
              ]
            },
            {
              title: 'Subject',
              columns: 2,
              fields: [
                { label: 'Student', value: selectedLog.displayStudent || 'Unknown' }
              ]
            }
          ]) : []}
          showCopyButton={true}
          showPrintButton={true}
          showExportButton={true}
        />

        {/* Print Dialog */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print RFID Report
              </DialogTitle>
              <DialogDescription>
                Choose what to include in your RFID dashboard report
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Print Format */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Report Format</Label>
                <Select
                  value={printOptions.format}
                  onValueChange={(value: 'summary' | 'detailed' | 'charts') => 
                    setPrintOptions(prev => ({ ...prev, format: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="charts">Charts Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Include Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Include Sections</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeStats"
                      checked={printOptions.includeStats}
                      onCheckedChange={(checked) =>
                        setPrintOptions(prev => ({ ...prev, includeStats: !!checked }))
                      }
                    />
                    <Label htmlFor="includeStats" className="text-sm">Summary Statistics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCharts"
                      checked={printOptions.includeCharts}
                      onCheckedChange={(checked) =>
                        setPrintOptions(prev => ({ ...prev, includeCharts: !!checked }))
                      }
                    />
                    <Label htmlFor="includeCharts" className="text-sm">Analytics Charts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeRecentLogs"
                      checked={printOptions.includeRecentLogs}
                      onCheckedChange={(checked) =>
                        setPrintOptions(prev => ({ ...prev, includeRecentLogs: !!checked }))
                      }
                    />
                    <Label htmlFor="includeRecentLogs" className="text-sm">Recent Activity Logs</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeFilters"
                      checked={printOptions.includeFilters}
                      onCheckedChange={(checked) =>
                        setPrintOptions(prev => ({ ...prev, includeFilters: !!checked }))
                      }
                    />
                    <Label htmlFor="includeFilters" className="text-sm">Applied Filters</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setPrintDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Tag Dialog */}
        <RFIDTagFormDialog
          open={addTagDialogOpen}
          onOpenChange={setAddTagDialogOpen}
          mode="create"
          onSubmit={async (data) => {
            try {
              const res = await fetch('/api/rfid/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error('Failed to create tag');
              setAddTagDialogOpen(false);
              handleRefresh();
              toast.success('Tag added successfully');
            } catch (error: any) {
              toast.error(error.message || 'Failed to add tag');
              throw error;
            }
          }}
        />

        {/* Add Reader Dialog */}
        <RFIDReaderFormDialog
          open={addReaderDialogOpen}
          onOpenChange={setAddReaderDialogOpen}
          type="create"
          onSuccess={() => {
            setAddReaderDialogOpen(false);
            handleRefresh();
            toast.success('Reader added successfully');
          }}
        />
      </div>
    </div>
  );
}
