"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, RefreshCw, Info, Plus, CreditCard, AlertTriangle, Search, Settings, Upload, List, Columns3, ChevronDown, ChevronUp, Download, Bell, Building2, RotateCcw, Archive, Clock, X, ChevronRight, Hash, Tag, Layers, FileText, BadgeInfo, Printer, Loader2, MoreHorizontal } from "lucide-react";
// Dynamic imports for heavy libraries to prevent chunk loading issues
import { z } from "zod";
import { toast } from "sonner";
// Dynamic import for Fuse.js to reduce initial bundle size
import React from "react";
import { TableHeaderSection } from "@/components/reusable/Table/TableHeaderSection";
import { TableCardView } from "@/components/reusable/Table/TableCardView";

import { TableList, TableListColumn } from "@/components/reusable/Table/TableList";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination } from "@/components/reusable/Table/TablePagination";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/PageHeader/PageHeader';
import { Card, CardHeader } from "@/components/ui/card";
import { PrintLayout } from '@/components/PrintLayout';
import SummaryCard from '@/components/SummaryCard';
import { EmptyState } from '@/components/reusable';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from '@/hooks/use-debounce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox as SharedCheckbox } from '@/components/ui/checkbox';
import { safeHighlight } from "@/lib/sanitizer";
import { useSocket } from '@/hooks/useSocket';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff, Zap, CheckCircle, AlertCircle } from 'lucide-react';

// Dynamic imports for heavy components to reduce initial bundle size
import dynamic from 'next/dynamic';

const SortDialog = dynamic(() => import("@/components/reusable/Dialogs/SortDialog").then(mod => ({ default: mod.SortDialog })), { ssr: false });
const ExportDialog = dynamic(() => import("@/components/reusable/Dialogs/ExportDialog").then(mod => ({ default: mod.ExportDialog })), { ssr: false });
// PrintLayout removed - using simple window.print() instead
const ViewDialog = dynamic(() => import("@/components/reusable/Dialogs/ViewDialog").then(mod => ({ default: mod.ViewDialog })), { ssr: false });
const ConfirmDeleteDialog = dynamic(() => import("@/components/ConfirmDeleteDialog").then(mod => ({ default: mod.ConfirmDeleteDialog })), { ssr: false });
const RFIDReaderFormDialog = dynamic(() => import("@/components/forms/RFIDReaderFormDialog"), { ssr: false });
const ImportDialog = dynamic(() => import("@/components/reusable/Dialogs/ImportDialog").then(mod => ({ default: mod.ImportDialog })), { ssr: false });
const BulkActionsDialog = dynamic(() => import("@/components/reusable/Dialogs/BulkActionsDialog"), { ssr: false });
const VisibleColumnsDialog = dynamic(() => import("@/components/reusable/Dialogs/VisibleColumnsDialog").then(mod => ({ default: mod.VisibleColumnsDialog })), { ssr: false });
import type { ColumnOption } from "@/components/reusable/Dialogs/VisibleColumnsDialog";
const BulkActionsBar = dynamic(() => import("@/components/reusable/BulkActionsBar"), { ssr: false });

const readerSchema = z.object({
  readerId: z.number(),
  deviceId: z.string(),
  deviceName: z.string(),
  roomId: z.number().nullable(),
  ipAddress: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "TESTING", "CALIBRATION", "REPAIR", "OFFLINE", "ERROR"]),
  lastSeen: z.string(), // Using string for simplicity in mock data
});

type RFIDReader = z.infer<typeof readerSchema> & { hasRelatedEntities?: boolean };

type SortField = 'deviceId' | 'deviceName' | 'status' | 'lastSeen';
type SortOrder = 'asc' | 'desc';

type SearchableReader = RFIDReader & {
  searchComposite: string;
};

// Add Fuse.js types for better search
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

// Helper function to highlight search matches
const highlightMatch = (text: string, matches: readonly [number, number][] | undefined) => {
  if (!matches || matches.length === 0) return text;
  let result = '';
  let lastIndex = 0;
  matches.forEach(([start, end], i) => {
    result += text.slice(lastIndex, start);
    result += `<mark class='bg-yellow-200 text-yellow-900 rounded px-1'>${text.slice(start, end + 1)}</mark>`;
    lastIndex = end + 1;
  });
  result += text.slice(lastIndex);
  return result;
};

export default function RFIDReadersPage() {
  const [readers, setReaders] = useState<RFIDReader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('deviceId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedReader, setSelectedReader] = useState<RFIDReader | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [readerToDelete, setReaderToDelete] = useState<RFIDReader | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formType, setFormType] = useState<'create' | 'update'>('create');
  const [selectedReaderForForm, setSelectedReaderForForm] = useState<RFIDReader | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isDeletingReader, setIsDeletingReader] = useState(false);

  // Socket.IO integration for real-time updates
  const {
    socket,
    isConnected,
    newReaderData,
    readerStatusUpdates,
    readerConnections,
    connect,
    disconnect,
    requestReaderUpdates,
    stopReaderUpdates,
    clearNewReaderData
  } = useSocket();

  // State for auto-fill functionality
  const [autoFillData, setAutoFillData] = useState<any>(null);
  const [showNewReaderNotification, setShowNewReaderNotification] = useState(false);

  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkActionsDialogOpen, setBulkActionsDialogOpen] = useState(false);
  const [visibleColumnsDialogOpen, setVisibleColumnsDialogOpen] = useState(false);



  const [lastUpdated, setLastUpdated] = useState(new Date());
  const exportableColumns = [
    { key: 'deviceId', label: 'Device ID' },
    { key: 'deviceName', label: 'Device Name' },
    { key: 'status', label: 'Status' },
    { key: 'roomId', label: 'Assigned Room ID' },
    { key: 'ipAddress', label: 'IP Address' },
    { key: 'lastSeen', label: 'Last Seen' },
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(exportableColumns.map(c => c.key));
  const [exportColumns, setExportColumns] = useState<string[]>(exportableColumns.map(c => c.key));
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | null>(null);
  
  // Add new state for enhanced UI
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roomFilter, setRoomFilter] = useState<string>("all");

  // Add Fuse.js setup with proper types - using dynamic import
  const searchTermNormalized = searchTerm.trim().toLowerCase();

  const searchableReaders = useMemo<SearchableReader[]>(() => {
    if (!Array.isArray(readers)) return [];
    return readers.map((reader) => ({
      ...reader,
      searchComposite: [
        reader.deviceId,
        reader.deviceName,
        reader.ipAddress,
        reader.roomId ? `room ${reader.roomId}` : ''
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));
  }, [readers]);

  const computeMatchIndices = (value: string, query: string): readonly [number, number][] | undefined => {
    if (!query) return undefined;
    const lowerValue = value.toLowerCase();
    const idx = lowerValue.indexOf(query);
    if (idx === -1) return undefined;
    return [[idx, idx + query.length - 1]];
  };

  const buildMatches = (reader: SearchableReader, query: string): FuseResultMatch[] | undefined => {
    if (!query) return undefined;
    const matches: FuseResultMatch[] = [];
    const addMatch = (value: string | number | null | undefined, key: string) => {
      if (value === null || value === undefined) return;
      const str = String(value);
      const indices = computeMatchIndices(str, query);
      if (indices) {
        matches.push({ key, indices });
      }
    };
    addMatch(reader.deviceId, "deviceId");
    addMatch(reader.deviceName, "deviceName");
    addMatch(reader.ipAddress, "ipAddress");
    addMatch(reader.searchComposite, "searchComposite");
    return matches.length ? matches : undefined;
  };

  const fuzzyResults = useMemo(() => {
    if (!searchTermNormalized) {
      return searchableReaders.map((reader, index) => ({
        item: reader,
        refIndex: index,
      })) as FuseResult<SearchableReader>[];
    }

    const filtered = searchableReaders.filter((reader) => {
      return (
        reader.searchComposite.includes(searchTermNormalized) ||
        reader.deviceId.toLowerCase().includes(searchTermNormalized) ||
        reader.deviceName.toLowerCase().includes(searchTermNormalized) ||
        reader.ipAddress.toLowerCase().includes(searchTermNormalized)
      );
    });

    return filtered.map((reader, index) => ({
      item: reader,
      refIndex: index,
      matches: buildMatches(reader, searchTermNormalized),
    })) as FuseResult<SearchableReader>[];
  }, [searchTermNormalized, searchableReaders]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        connect();
        requestReaderUpdates();
      } catch (error) {
        console.error('Socket.IO connection error:', error);
      }
    }
    
    return () => {
      try {
        stopReaderUpdates();
        disconnect();
      } catch (error) {
        console.error('Socket.IO cleanup error:', error);
      }
    };
  }, [isClient]); // Remove function dependencies to prevent infinite loop

  // Handle new reader data for auto-fill
  useEffect(() => {
    if (newReaderData) {
      console.log('🔄 New reader detected:', newReaderData);
      setAutoFillData(newReaderData);
      setShowNewReaderNotification(true);
      
      // Show notification
      toast.success(`New RFID reader detected: ${newReaderData.deviceId || 'Unknown Device'}`, {
        duration: 5000,
        action: {
          label: 'Add to System',
          onClick: () => {
            handleAutoFillForm(newReaderData);
          }
        }
      });
    }
  }, [newReaderData]); // Keep newReaderData dependency as it's the trigger

  // Auto-fill form when new reader is detected
  const handleAutoFillForm = (readerData: any) => {
    setFormType('create');
    setSelectedReaderForForm({
      readerId: 0, // Will be generated by backend
      deviceId: readerData.deviceId || '',
      deviceName: readerData.deviceName || `Reader ${readerData.deviceId || 'Unknown'}`,
      roomId: null, // Leave for manual input
      ipAddress: readerData.ipAddress || '',
      status: 'ACTIVE' as const,
      lastSeen: new Date().toISOString()
    });
    setFormDialogOpen(true);
    setShowNewReaderNotification(false);
    clearNewReaderData();
  };

  const fetchReaders = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      // Construct query params based on state
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString(),
        search: searchTerm,
        sortBy: sortField,
        sortDir: sortOrder,
      });
      const response = await fetch(`/api/rfid/readers?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const { data, total } = await response.json();
      if (Array.isArray(data)) {
        setReaders(data);
        setTotalItems(total || data.length);
        setTotalPages(Math.ceil((total || data.length) / itemsPerPage));
        setError(null);
        if (refresh) toast.success('Readers refreshed successfully');
      } else {
        throw new Error('Invalid data format received from server');
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching readers:', err);
      setError('Failed to load readers. Please try again later.');
      if (refresh) toast.error('Failed to refresh readers. Please try again later.');
      else toast.error('Failed to load readers. Please try again later.');
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchReaders();
  }, [currentPage, itemsPerPage, searchTerm, sortField, sortOrder]);

  // Update pagination when items per page changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when items per page changes
  }, [itemsPerPage]);

  // Recalculate total pages when items per page changes
  useEffect(() => {
    if (totalItems > 0) {
      setTotalPages(Math.ceil(totalItems / itemsPerPage));
    }
  }, [totalItems, itemsPerPage]);



  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedReaders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedReaders.map(r => r.readerId.toString()));
    }
  };

  // Filter readers based on search term and filters
  const filteredReaders = useMemo(() => {
    let filtered = fuzzyResults.map((r: FuseResult<SearchableReader>) => r.item as RFIDReader);

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(reader => reader.status === statusFilter);
    }

    // Apply room filter
    if (roomFilter !== "all") {
      filtered = filtered.filter(reader => reader.roomId === Number(roomFilter));
    }

    return filtered;
  }, [fuzzyResults, statusFilter, roomFilter]);

  const sortedReaders = useMemo(() => {
    return [...filteredReaders].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredReaders, sortField, sortOrder]);

  const paginatedReaders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedReaders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedReaders, currentPage, itemsPerPage]);


  
  const getStatusBadge = (status: "ACTIVE" | "INACTIVE" | "TESTING" | "CALIBRATION" | "REPAIR" | "OFFLINE" | "ERROR") => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" className="text-center">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary" className="text-center">Inactive</Badge>;
      case "TESTING":
        return <Badge variant="warning" className="text-center">Testing</Badge>;
      case "CALIBRATION":
        return <Badge variant="outline" className="border-blue-500 text-blue-700 text-center">Calibration</Badge>;
      case "REPAIR":
        return <Badge variant="destructive" className="text-center">Repair</Badge>;
      case "OFFLINE":
        return <Badge variant="secondary" className="bg-gray-500 text-white text-center">Offline</Badge>;
      case "ERROR":
        return <Badge variant="destructive" className="text-center">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-center">Unknown</Badge>;
    }
  };

  const columns: TableListColumn<RFIDReader>[] = [
    {
      header: (
        <SharedCheckbox 
          checked={selectedIds.length > 0 && selectedIds.length === paginatedReaders.length}
          indeterminate={selectedIds.length > 0 && selectedIds.length < paginatedReaders.length}
          onCheckedChange={handleSelectAll}
          aria-label="Select all readers"
        />
      ),
      accessor: 'select',
      className: 'w-12 text-center',
    },
    { 
      header: "Device ID", 
      accessor: "deviceId",
      render: (item) => {
        const fuseResult = fuzzyResults.find(r => r.item.readerId === item.readerId) as FuseResult<SearchableReader> | undefined;
        const deviceIdMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "deviceId")?.indices;
        return (
          <div className="text-center">
            <div 
              className="text-sm font-medium text-blue-900"
              dangerouslySetInnerHTML={{ __html: safeHighlight(item.deviceId, deviceIdMatches) }}
            />
          </div>
        );
      }
    },
    { 
      header: "Device Name", 
      accessor: "deviceName",
      render: (item) => {
        const fuseResult = fuzzyResults.find(r => r.item.readerId === item.readerId) as FuseResult<SearchableReader> | undefined;
        const deviceNameMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "deviceName")?.indices;
        return (
          <div className="text-center">
            <div 
              className="text-sm text-blue-900"
              dangerouslySetInnerHTML={{ __html: safeHighlight(item.deviceName, deviceNameMatches) }}
            />
          </div>
        );
      }
    },
    { 
      header: "Status", 
      accessor: "status", 
      render: (item) => (
        <div className="flex justify-center">
          {getStatusBadge(item.status)}
        </div>
      )
    },
    { 
      header: "Assigned Room", 
      accessor: "roomId", 
      render: (item) => (
        <div className="text-center text-sm font-medium text-blue-900">
          {item.roomId ?? "N/A"}
        </div>
      )
    },
    { 
      header: "IP Address", 
      accessor: "ipAddress",
      render: (item) => {
        const fuseResult = fuzzyResults.find(r => r.item.readerId === item.readerId) as FuseResult<SearchableReader> | undefined;
        const ipMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "ipAddress")?.indices;
        return (
          <div 
            className="text-sm text-blue-900 font-mono"
            dangerouslySetInnerHTML={{ __html: safeHighlight(item.ipAddress, ipMatches) }}
          />
        );
      }
    },
    { header: "Last Seen", accessor: "lastSeen", render: (item) => isClient ? new Date(item.lastSeen).toLocaleString() : '...' },
    {
      header: "Actions",
      accessor: "actions",
      className: "text-center",
      render: (item) => (
        <div className="flex gap-2 justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="View details" onClick={() => { setSelectedReader(item); setViewDialogOpen(true); }}>
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Edit reader" onClick={() => { setFormType('update'); setSelectedReaderForForm(item); setFormDialogOpen(true); }}>
                  <Pencil className="h-4 w-4 text-green-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="icon" aria-label="Delete reader" onClick={() => { setReaderToDelete(item); setDeleteDialogOpen(true); }} disabled={!!item.hasRelatedEntities}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{item.hasRelatedEntities ? "Cannot delete reader with assigned entities." : "Delete reader"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  const handleRefresh = () => {
    fetchReaders(true);
  };
  
  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Handler for sorting columns
  const handleSort = (field: string) => {
    setSortField((prevField) => {
      const isSameField = prevField === field;
      const newOrder = isSameField && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder as SortOrder);
      return field as SortField;
    });
  };

  // Enhanced bulk actions with better functionality
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('No readers selected for deletion');
      return;
    }
    
    try {
      const response = await fetch("/api/rfid/readers/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to delete readers");
      }

      toast.success("Selected readers deleted successfully");
      setSelectedIds([]);
      await fetchReaders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Enhanced bulk actions handler
  const handleOpenBulkActionsDialog = () => {
    setBulkActionsDialogOpen(true);
  };

  const handleBulkActionComplete = (actionType: string, results: any) => {
    toast.success(`Bulk action '${actionType}' completed.`);
    setBulkActionsDialogOpen(false);
    fetchReaders();
  };

  const handleBulkActionCancel = () => {
    setBulkActionsDialogOpen(false);
  };

  const handleProcessBulkAction = async (actionType: string, config: any) => {
    if (actionType === 'status-update') {
      const newStatusRaw: string | undefined = config?.newStatus;
      const reason: string | undefined = config?.reason;
      if (!newStatusRaw) return { success: false };
      const newStatus = newStatusRaw.toUpperCase();

      const updatePromises = selectedIds.map(async (readerId) => {
        const response = await fetch(`/api/rfid/readers/${readerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, reason }),
        });
        if (!response.ok) throw new Error(`Failed to update reader ${readerId}`);
        return response.json();
      });
      await Promise.all(updatePromises);
      await fetchReaders();
      return { success: true, processed: selectedIds.length };
    }
    if (actionType === 'export') {
      return { success: true };
    }
    if (actionType === 'notification') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    }
    return { success: false };
  };

  // Import functionality
  const handleImportReaders = async (data: any[]) => {
    try {
      console.log('Importing readers with data:', data);
      
      const response = await fetch('/api/rfid/readers/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: data,
          options: {
            skipDuplicates: true,
            updateExisting: false,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Import API error:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Import API response:', result);
      
      // Refresh the readers list
      await fetchReaders();
      
      // Show success message with details
      const successCount = result.results?.success || 0;
      const failedCount = result.results?.failed || 0;
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} readers`);
      }
      
      if (failedCount > 0) {
        toast.warning(`${failedCount} readers failed to import`);
      }
      
      return {
        success: successCount,
        failed: failedCount,
        errors: result.results?.errors || []
      };
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import readers');
      throw error;
    }
  };

  const handleExport = async () => {
    if (!exportFormat) {
      toast.error("Please select an export format");
      return;
    }
    const selectedColumnsData = exportableColumns.filter(col => exportColumns.includes(col.key));
    const headers = selectedColumnsData.map(col => col.label);
    const rows = readers.map(reader => selectedColumnsData.map(col => String(reader[col.key as keyof RFIDReader] ?? '')));

    try {
      if (exportFormat === 'pdf') {
        const [{ jsPDF }, autoTable] = await Promise.all([
          import("jspdf"),
          import("jspdf-autotable")
        ]);
        const doc = new jsPDF();
        doc.text("RFID Readers", 14, 16);
        autoTable.default(doc, { head: [headers], body: rows, startY: 20 });
        doc.save('rfid-readers.pdf');
      } else if (exportFormat === 'excel') {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RFID Readers");
        XLSX.writeFile(wb, "rfid-readers.xlsx");
      } else if (exportFormat === 'csv') {
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "rfid-readers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success(`Successfully exported to ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export data.");
    } finally {
      setExportDialogOpen(false);
    }
  };

  // Quick export selected rows to CSV
  const handleQuickExportSelected = () => {
    const selected = readers.filter(r => selectedIds.includes(r.readerId.toString()));
    if (selected.length === 0) {
      toast.error('No readers selected to export');
      return;
    }
    const selectedColumnsData = exportableColumns; // use all exportable columns
    const headers = selectedColumnsData.map(col => col.label);
    const rows = selected.map(reader => selectedColumnsData.map(col => String(reader[col.key as keyof RFIDReader] ?? '')));

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rfid-readers-selected.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selected.length} selected readers to CSV`);
  };

  const bulkActions = [
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      onClick: handleBulkDelete,
      variant: "destructive" as const,
    },
  ];

  // Column visibility management
  const COLUMN_OPTIONS: ColumnOption[] = exportableColumns.map(col => ({
    accessor: col.key,
    header: col.label,
    description: undefined,
    category: 'Reader Info',
    required: col.key === 'deviceId' || col.key === 'deviceName',
  }));

  const handleColumnToggle = (columnAccessor: string, checked: boolean) => {
    setVisibleColumns(prev => {
      if (checked) {
        return prev.includes(columnAccessor) ? prev : [...prev, columnAccessor];
      } else {
        if (COLUMN_OPTIONS.find(col => col.accessor === columnAccessor)?.required) return prev;
        return prev.filter(col => col !== columnAccessor);
      }
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(exportableColumns.map(col => col.key));
    toast.success('Column visibility reset to default');
  };





  // Analytics summary
  const summary = useMemo(() => {
    const total = filteredReaders.length;
    const online = filteredReaders.filter(r => r.status === "ACTIVE").length;
    const offline = filteredReaders.filter(r => r.status === "INACTIVE").length;
    const maintenance = filteredReaders.filter(r => r.status === "REPAIR" || r.status === "TESTING" || r.status === "CALIBRATION").length;
    return { total, online, offline, maintenance };
  }, [filteredReaders]);



  // Get unique room IDs for filter dropdown
  const roomOptions = useMemo(() => {
    const roomIds = readers.map(r => r.roomId).filter((id): id is number => id !== null);
    return Array.from(new Set(roomIds)).sort((a, b) => a - b);
  }, [readers]);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (searchTermNormalized) {
      chips.push({
        id: 'search',
        label: `Search: "${searchTerm}"`,
        onRemove: () => setSearchTerm(""),
      });
    }
    if (statusFilter !== "all") {
      chips.push({
        id: 'status',
        label: `Status: ${statusFilter}`,
        onRemove: () => setStatusFilter("all"),
      });
    }
    if (roomFilter !== "all") {
      chips.push({
        id: 'room',
        label: `Room: ${roomFilter}`,
        onRemove: () => setRoomFilter("all"),
      });
    }
    return chips;
  }, [searchTerm, searchTermNormalized, statusFilter, roomFilter]);

  // Print handler using shared PrintLayout (reference: departments page)
  const handlePrint = () => {
    const printColumns = [
      { header: 'Device ID', accessor: 'deviceId' },
      { header: 'Device Name', accessor: 'deviceName' },
      { header: 'Status', accessor: 'status' },
      { header: 'IP Address', accessor: 'ipAddress' },
      { header: 'Room', accessor: 'roomLabel' },
      { header: 'Last Seen', accessor: 'lastSeenLabel' },
    ];

    const printData = filteredReaders.map((r: any) => ({
      deviceId: r.deviceId,
      deviceName: r.deviceName || '',
      status: r.status,
      ipAddress: r.ipAddress || '',
      roomLabel: r?.room ? `${r.room.roomNo} (${r.room.roomBuildingLoc || ''})` : String(r.roomId ?? 'N/A'),
      lastSeenLabel: r.lastSeen ? new Date(r.lastSeen as any).toLocaleString() : '',
    }));

    const printFunction = PrintLayout({
      title: 'RFID Readers',
      data: printData,
      columns: printColumns,
      totalItems: filteredReaders.length,
    });
    try {
      printFunction();
      toast.success('Print dialog opened');
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Failed to open print dialog. Please check if popups are blocked.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Header */}
        <PageHeader
          title="RFID Readers"
          subtitle="Manage all RFID reader devices in the system"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'RFID Management', href: '/rfid' },
            { label: 'Readers' }
          ]}
        />

        {/* Real-time Connection Status */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Live Updates Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">Live Updates Disconnected</span>
              </div>
            )}
          </div>
          
          {newReaderData && (
            <Alert className="border-blue-200 bg-blue-50">
              <Zap className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                New RFID reader detected: <strong>{newReaderData.deviceId}</strong>
                <Button 
                  size="sm" 
                  className="ml-2"
                  onClick={() => handleAutoFillForm(newReaderData)}
                >
                  Add to System
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="w-full max-w-full">
            <div className="flex items-start justify-between p-3 sm:p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Failed to load readers</div>
                  <div className="text-sm">{error}</div>
                </div>
              </div>
              <button
                aria-label="Dismiss error"
                className="text-red-700 hover:text-red-900"
                onClick={() => setError(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <SummaryCard
            icon={<CreditCard className="text-blue-500 w-5 h-5" />}
            label="Total Readers"
            value={summary.total}
            valueClassName="text-blue-900"
            sublabel="Total number of readers"
          />
          <SummaryCard
            icon={<Wifi className="text-blue-500 w-5 h-5" />}
            label="Online Readers"
            value={summary.online}
            valueClassName="text-blue-900"
            sublabel="Currently active"
          />
          <SummaryCard
            icon={<WifiOff className="text-blue-500 w-5 h-5" />}
            label="Offline Readers"
            value={summary.offline}
            valueClassName="text-blue-900"
            sublabel="Inactive readers"
          />
          <SummaryCard
            icon={<AlertTriangle className="text-blue-500 w-5 h-5" />}
            label="Maintenance"
            value={summary.maintenance}
            valueClassName="text-blue-900"
            sublabel="Under maintenance"
          />
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
                id: 'add-reader',
                label: 'Add Reader',
                description: 'Create new RFID reader',
                icon: <Plus className="w-5 h-5 text-white" />,
                onClick: () => { 
                  setFormType('create'); 
                  setFormDialogOpen(true); 
                  setSelectedReaderForForm(undefined);
                }
              },
              {
                id: 'import-data',
                label: 'Import Data',
                description: 'Import readers from file',
                icon: <Upload className="w-5 h-5 text-white" />,
                onClick: () => setImportDialogOpen(true)
              },
              {
                id: 'print-page',
                label: 'Print Page',
                description: 'Print reader list',
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
                description: 'Reload reader data',
                icon: isRefreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                onClick: () => fetchReaders(),
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
            lastActionTime="2 minutes ago"
            onLastActionTimeChange={() => {}}
            collapsible={true}
            defaultCollapsed={true}
            onCollapseChange={(collapsed) => {
              console.log('Quick Actions Panel collapsed:', collapsed);
            }}
          />
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-full pt-4">
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
                      <h3 className="text-lg font-bold text-white">Reader List</h3>
                      <p className="text-blue-100 text-sm">Search and filter RFID reader information</p>
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
                    placeholder="Search readers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                </div>
                {/* Quick Filter Dropdowns */}
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full xl:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-28 lg:w-32 xl:w-28 text-gray-700 rounded">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ACTIVE">
                        <span className="flex items-center gap-2">
                          <span className="text-green-600"><Wifi className="w-4 h-4" /></span> Active
                        </span>
                      </SelectItem>
                      <SelectItem value="INACTIVE">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500"><WifiOff className="w-4 h-4" /></span> Inactive
                        </span>
                      </SelectItem>
                      <SelectItem value="TESTING">
                        <span className="flex items-center gap-2">
                          <span className="text-yellow-500"><AlertTriangle className="w-4 h-4" /></span> Testing
                        </span>
                      </SelectItem>
                      <SelectItem value="CALIBRATION">
                        <span className="flex items-center gap-2">
                          <span className="text-blue-500"><Settings className="w-4 h-4" /></span> Calibration
                        </span>
                      </SelectItem>
                      <SelectItem value="REPAIR">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500"><AlertTriangle className="w-4 h-4" /></span> Repair
                        </span>
                      </SelectItem>
                      <SelectItem value="OFFLINE">
                        <span className="flex items-center gap-2">
                          <span className="text-gray-500"><WifiOff className="w-4 h-4" /></span> Offline
                        </span>
                      </SelectItem>
                      <SelectItem value="ERROR">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500"><AlertTriangle className="w-4 h-4" /></span> Error
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger className="w-full sm:w-32 lg:w-40 xl:w-40 text-gray-700 rounded">
                      <SelectValue placeholder="Room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {roomOptions.map((roomId, idx) => (
                        <SelectItem key={`room-${String(roomId)}-${idx}`} value={String(roomId)}>
                          Room {roomId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activeFilterChips.map(chip => (
                    <div
                      key={chip.id}
                      className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-sm"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 p-1"
                        aria-label={`Remove ${chip.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {activeFilterChips.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setRoomFilter("all");
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="mt-2 sm:mt-3 px-2 sm:px-3 lg:px-6 max-w-full">
                <BulkActionsBar
                  selectedCount={selectedIds.length}
                  entityLabel="reader"
                  actions={[
                    {
                      key: "bulk-actions",
                      label: "Bulk Actions",
                      icon: <Settings className="w-4 h-4 mr-2" />,
                      onClick: handleOpenBulkActionsDialog,
                      tooltip: "Open enhanced bulk actions dialog with status updates, notifications, and exports",
                      variant: "default"
                    },
                    {
                      key: "export",
                      label: "Quick Export",
                      icon: <Download className="w-4 h-4 mr-2" />,
                      onClick: () => handleQuickExportSelected(),
                      tooltip: "Quick export selected readers to CSV"
                    },
                    {
                      key: "delete",
                      label: "Delete Selected",
                      icon: loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />,
                      onClick: handleBulkDelete,
                      loading: loading,
                      disabled: loading,
                      tooltip: "Delete selected readers",
                      variant: "destructive"
                    }
                  ]}
                  onClear={() => setSelectedIds([])}
                />
              </div>
            )}

            {/* Table Content */}
            <div className="relative px-2 sm:px-3 lg:px-6 mt-3 sm:mt-4 lg:mt-6">
              <div className="overflow-x-auto bg-white/70 shadow-none relative p-4 sm:p-6">
                {/* Loader overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                )}
                <div className="print-content">
                  {!loading && paginatedReaders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <EmptyState
                        icon={<CreditCard className="w-6 h-6 text-blue-400" />}
                        title="No RFID readers found"
                        description="Try adjusting your search criteria or filters to find the readers you're looking for."
                        action={
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                              onClick={() => fetchReaders()}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh Data
                            </Button>
                            <Button
                              onClick={() => { 
                                setFormType('create'); 
                                setFormDialogOpen(true); 
                                setSelectedReaderForForm(undefined);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Reader
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <TableList
                      columns={columns}
                      data={paginatedReaders.filter(r => r && r.readerId !== undefined)}
                      loading={loading}
                      selectedIds={selectedIds}
                      onSelectRow={handleSelectRow}
                      onSelectAll={handleSelectAll}
                      isAllSelected={selectedIds.length === paginatedReaders.length && paginatedReaders.length > 0}
                      isIndeterminate={selectedIds.length > 0 && selectedIds.length < paginatedReaders.length}
                      getItemId={(row: RFIDReader) => (row && row.readerId !== undefined ? row.readerId.toString() : "")}
                      className="border-0 shadow-none max-w-full transition-all duration-150 [&_tr:hover]:bg-blue-50 [&_tr.selected]:bg-blue-100"

                    />
                  )}
                </div>
              </div>
              {/* Pagination */}

                <TablePagination
                  page={currentPage}
                  pageSize={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handleItemsPerPageChange}
                  entityLabel="reader"
                />
            </div>
          </Card>
        </div>

        {/* View Dialog */}
        {selectedReader && (
          <ViewDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            title="Reader Details"
            subtitle={`Details for ${selectedReader.deviceName}`}
            sections={[
              {
                title: "Device Information",
                columns: 2,
                fields: [
                  { label: "Device ID", value: selectedReader.deviceId },
                  { label: "Device Name", value: selectedReader.deviceName },
                  { label: "IP Address", value: selectedReader.ipAddress },
                  { label: "Status", value: selectedReader.status, type: 'badge', badgeVariant: selectedReader.status === 'ACTIVE' ? 'success' : selectedReader.status === 'INACTIVE' ? 'secondary' : 'destructive' },
                  { label: "Assigned Room ID", value: selectedReader.roomId ?? "N/A" },
                  { label: "Last Seen", value: isClient ? new Date(selectedReader.lastSeen).toLocaleString() : '...', type: 'date' },
                ]
              }
            ]}
          />
        )}

        {/* Delete Dialog */}
        {readerToDelete && (
          <ConfirmDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDelete={async () => {
              if (!readerToDelete) return;
              setIsDeletingReader(true);
              try {
                const response = await fetch(`/api/rfid/readers/${readerToDelete.readerId}`, {
                  method: 'DELETE',
                });
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData?.error || `Failed to delete reader ${readerToDelete.readerId}`);
                }
                setReaders(prev => prev.filter(r => r.readerId !== readerToDelete.readerId));
                setSelectedIds(prev => prev.filter(id => id !== readerToDelete.readerId.toString()));
                toast.success('Reader deleted successfully');
              } catch (err: any) {
                toast.error(err?.message || 'Failed to delete reader');
              } finally {
                setIsDeletingReader(false);
                setDeleteDialogOpen(false);
                setReaderToDelete(null);
              }
            }}
            itemName={readerToDelete.deviceName}
          />
        )}

        {/* Add/Edit Dialog */}
        <RFIDReaderFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          type={formType}
          data={selectedReaderForForm}
          id={selectedReaderForForm?.readerId}
          onSuccess={(newReader) => {
            if (formType === 'create') {
              setReaders(prev => [...prev, newReader as RFIDReader]);
            } else {
              setReaders(prev => prev.map(r => r.readerId === (newReader as RFIDReader).readerId ? (newReader as RFIDReader) : r));
            }
            fetchReaders(); // to get the latest data
          }}
        />



        {/* Sort Dialog */}
        <SortDialog
          open={sortDialogOpen}
          onOpenChange={setSortDialogOpen}
          sortOptions={[
            { value: 'deviceId', label: 'Device ID' },
            { value: 'deviceName', label: 'Device Name' },
            { value: 'status', label: 'Status' },
            { value: 'lastSeen', label: 'Last Seen' },
          ]}
          currentSort={{ field: sortField, order: sortOrder }}
          onSortChange={(field, order) => {
            setSortField(field as SortField);
            setSortOrder(order as SortOrder);
          }}
          title="Sort Readers"
          description="Sort readers by different fields. Choose the field and order to organize your list."
          entityType="readers"
        />

        {/* Export Dialog */}
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          dataCount={readers.length}
          entityType="reader"
          onExport={async (format, options) => {
            toast.success(`Exported ${format} with ${options.selectedColumns?.length || 0} columns`);
          }}
        />

                 {/* Import Dialog */}
         <ImportDialog
           open={importDialogOpen}
           onOpenChange={setImportDialogOpen}
           onImport={handleImportReaders}
           entityName="RFIDReader"
           templateUrl="/api/rfid/readers/template"
           acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
           maxFileSize={5}
         />

         {/* Visible Columns Dialog */}
         <VisibleColumnsDialog
           open={visibleColumnsDialogOpen}
           onOpenChange={setVisibleColumnsDialogOpen}
           columns={COLUMN_OPTIONS}
           visibleColumns={visibleColumns}
           onColumnToggle={handleColumnToggle}
           onReset={handleResetColumns}
           title="Manage Reader Columns"
           description="Choose which columns to display in the RFID reader table"
           searchPlaceholder="Search reader columns..."
           enableManualSelection={true}
         />

         {/* Bulk Actions Dialog */}
         <BulkActionsDialog
           open={bulkActionsDialogOpen}
           onOpenChange={setBulkActionsDialogOpen}
           selectedItems={selectedIds.map(id => readers.find(r => r.readerId.toString() === id)).filter(Boolean) as RFIDReader[]}
           entityType="reader"
           entityLabel="reader"
           availableActions={[
            { id: 'status-update', label: 'Update Status', description: 'Update status of selected readers', icon: <Settings className="w-4 h-4" />, tabId: 'status' },
            { id: 'notification', label: 'Send Notification', description: 'Send notification to administrators', icon: <Bell className="w-4 h-4" />, tabId: 'notification' },
            { id: 'export', label: 'Export Data', description: 'Export selected readers data', icon: <Download className="w-4 h-4" />, tabId: 'export' },
           ]}
           onActionComplete={handleBulkActionComplete}
           onCancel={handleBulkActionCancel}
           onProcessAction={handleProcessBulkAction}
           getItemId={(item: any) => (item as RFIDReader).readerId.toString()}
           getItemDisplayName={(item: any) => (item as RFIDReader).deviceName}
           getItemStatus={(item: any) => (item as RFIDReader).status}
         />
      </div>
    </div>
  );
} 