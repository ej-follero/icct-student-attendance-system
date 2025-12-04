"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/reusable/Table/TablePagination";
import { toast } from "sonner";
import Fuse from "fuse.js";
import React from "react";
import { Settings, Plus, Trash2, Printer, Loader2, Upload, List, Columns3, ChevronDown, ChevronUp, UserCheck, UserX, RefreshCw, Download, Search, Bell, X, ChevronRight, Clock, CreditCard, MapPin, AlertTriangle, Eye, Pencil, ScanLine } from "lucide-react";
import { ImportDialog } from "@/components/reusable/Dialogs/ImportDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportDialog } from '@/components/reusable/Dialogs/ExportDialog';
import { SortDialog } from '@/components/reusable/Dialogs/SortDialog';
import BulkActionsBar from '@/components/reusable/BulkActionsBar';
import { PrintLayout } from '@/components/PrintLayout';
// removed unused TableCardView and TableRowActions
import { TableList, TableListColumn } from '@/components/reusable/Table/TableList';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import PageHeader from '@/components/PageHeader/PageHeader';
import { Card, CardHeader } from "@/components/ui/card";
import SummaryCard from '@/components/SummaryCard';
import { EmptyState } from '@/components/reusable';
import BulkActionsDialog from '@/components/reusable/Dialogs/BulkActionsDialog';
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { VisibleColumnsDialog, ColumnOption } from '@/components/reusable/Dialogs/VisibleColumnsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BatchAssign from '@/components/rfid/BatchAssign';
import { Label } from "@/components/ui/label";
import { Checkbox as SharedCheckbox } from '@/components/ui/checkbox';
import { RFIDTagFormDialog } from "@/components/forms/RFIDTagFormDialog";
import { safeHighlight } from "@/lib/sanitizer";
import { MQTTDebugInfo } from "@/components/MQTTDebugInfo";

type TagStatus = "active" | "inactive" | "lost" | "damaged";
type SortField = 'tagId' | 'studentName' | 'status' | 'lastSeen' | 'location' | 'scanCount' | 'assignedAt';
type SortOrder = 'asc' | 'desc';
const ITEMS_PER_PAGE = 10;

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

const tagSortFieldOptions: { value: string; label: string }[] = [
  { value: 'tagId', label: 'Tag ID' },
  { value: 'studentName', label: 'Student Name' },
  { value: 'status', label: 'Status' },
  { value: 'lastSeen', label: 'Last Seen' },
  { value: 'location', label: 'Location' },
  { value: 'scanCount', label: 'Scan Count' },
  { value: 'assignedAt', label: 'Assigned Date' },
];

type TagSortField = 'tagId' | 'studentName' | 'status' | 'lastSeen' | 'location' | 'scanCount' | 'assignedAt';
type TagSortOrder = 'asc' | 'desc';

// Centralized tag columns definition
const tagColumns = [
  { key: 'tagId', label: 'Tag ID', accessor: 'tagNumber', className: 'text-blue-900', sortable: true },
  { key: 'studentName', label: 'Assigned To', accessor: 'studentName', className: 'text-blue-900', sortable: true },
  { key: 'status', label: 'Status', accessor: 'status', className: 'text-center', sortable: true },
  { key: 'lastSeen', label: 'Last Used', accessor: 'lastUsed', className: 'text-center text-blue-900', sortable: true },
  { key: 'location', label: 'Notes', accessor: 'notes', className: 'text-center text-blue-900', sortable: true },
  { key: 'scanCount', label: 'Type', accessor: 'tagType', className: 'text-center text-blue-900', sortable: true },
  { key: 'assignedAt', label: 'Assigned Date', accessor: 'assignedAt', className: 'text-center text-blue-900', sortable: true },
];

// Use accessor/label for TableHeaderSection compatibility
const exportableColumns: { accessor: string; label: string }[] = tagColumns.map((col) => ({ accessor: col.key, label: col.label }));
// For export dialogs, use the old { key, label } version
const exportableColumnsForExport: { key: string; label: string }[] = tagColumns.map((col) => ({ key: col.key, label: col.label }));

// Define column options for visible columns dialog
const COLUMN_OPTIONS: ColumnOption[] = tagColumns.map(col => ({
  accessor: typeof col.accessor === 'string' ? col.accessor : col.key,
  header: col.label,
  description: undefined,
  category: 'Tag Info',
  required: col.key === 'tagId' || col.key === 'status', // Always show tag ID and status
}));

interface RFIDTag {
  tagId: number;
  tagNumber: string;
  tagType: 'STUDENT_CARD' | 'TEMPORARY_PASS' | 'VISITOR_PASS' | 'MAINTENANCE' | 'TEST';
  assignedAt: string;
  lastUsed?: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOST' | 'DAMAGED' | 'EXPIRED' | 'REPLACED' | 'RESERVED';
  notes?: string;
  studentId?: number;
  
  assignedBy?: number;
  assignmentReason?: string;
  student?: {
    studentId: number;
    firstName: string;
    lastName: string;
    studentIdNum: string;
  };
  
}

type SearchableTag = RFIDTag & {
  studentFullName: string;
  studentFullNameReversed: string;
};

export default function RFIDTagsPage() {
  const [tags, setTags] = useState<RFIDTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<RFIDTag | null>(null);
  const [assignedByUser, setAssignedByUser] = useState<{userName: string, email: string} | null>(null);
  
  // Fetch assigned by user information when selectedTag changes
  useEffect(() => {
    const fetchAssignedByUser = async () => {
      if (selectedTag?.assignedBy) {
        try {
          const response = await fetch(`/api/users/${selectedTag.assignedBy}`);
          if (response.ok) {
            const result = await response.json();
            const user = result.data || result;
            if (user) {
              setAssignedByUser({
                userName: user.userName || user.fullName || user.name || 'Unknown User',
                email: user.email || 'Unknown Email'
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch assigned by user info:', error);
          setAssignedByUser(null);
        }
      } else {
        setAssignedByUser(null);
      }
    };

    fetchAssignedByUser();
  }, [selectedTag?.assignedBy]);

  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [tagTypeFilter, setTagTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<TagSortField>('tagId');
  const [sortOrder, setSortOrder] = useState<TagSortOrder>('asc');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv' | null>(null);
  const [sortFields, setSortFields] = useState<MultiSortField[]>([
    { field: 'tagId', order: 'asc' }
  ]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(tagColumns.map(col => col.key));
  const [visibleColumnsDialogOpen, setVisibleColumnsDialogOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bulkActionsDialogOpen, setBulkActionsDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string | null>(null);
  const [selectedTagsForBulkAction, setSelectedTagsForBulkAction] = useState<RFIDTag[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [createForm, setCreateForm] = useState<{ tagNumber: string; tagType: RFIDTag['tagType']; status: RFIDTag['status']; notes?: string }>({ tagNumber: '', tagType: 'STUDENT_CARD', status: 'ACTIVE', notes: '' });
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/rfid/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch RFID tags');
      }
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      const normalized: RFIDTag[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.records)
              ? data.records
              : Array.isArray(data?.results)
                ? data.results
                : [];
      
      console.log('Normalized tags:', normalized.length); // Debug log
      setTags(normalized);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching RFID tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch RFID tags');
      toast.error('Failed to fetch RFID tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);



  // Add Fuse.js setup with proper types
  const searchableTags = useMemo<SearchableTag[]>(() => {
    if (!Array.isArray(tags)) return [];
    return tags.map(tag => {
      const first = tag.student?.firstName ?? "";
      const last = tag.student?.lastName ?? "";
      const full = `${first} ${last}`.trim();
      const reversed = `${last} ${first}`.trim();
      return {
        ...tag,
        studentFullName: full.toLowerCase(),
        studentFullNameReversed: reversed.toLowerCase(),
      };
    });
  }, [tags]);

  const fuse = useMemo(() => new Fuse<SearchableTag>(searchableTags, {
    keys: [
      { name: "tagNumber", weight: 0.4 },
      { name: "studentFullName", weight: 0.4 },
      { name: "studentFullNameReversed", weight: 0.3 },
      { name: "student.firstName", weight: 0.2 },
      { name: "student.lastName", weight: 0.2 },
    ],
    threshold: 0.2,
    ignoreLocation: true,
    distance: 40,
    minMatchCharLength: 2,
    includeMatches: true,
  }), [searchableTags]);

  const fuzzyResults = useMemo(() => {
    const list = searchableTags;
    const normalizedQuery = searchInput.trim().toLowerCase();
    if (!normalizedQuery) return list.map((t: SearchableTag, i: number) => ({ item: t, refIndex: i }));
    return fuse.search(normalizedQuery) as FuseResult<SearchableTag>[];
  }, [searchInput, fuse, searchableTags]);

  const filteredTags = useMemo(() => {
    let filtered = fuzzyResults.map((r: FuseResult<SearchableTag>) => r.item);

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(tag => tag.status === statusFilter.toUpperCase());
    }

    // Apply assignment filter
    if (assignmentFilter !== "all") {
      if (assignmentFilter === "assigned") {
        filtered = filtered.filter(tag => tag.student !== null && tag.student !== undefined);
      } else if (assignmentFilter === "unassigned") {
        filtered = filtered.filter(tag => tag.student === null || tag.student === undefined);
      }
    }

    // Apply tag type filter
    if (tagTypeFilter !== "all") {
      filtered = filtered.filter(tag => tag.tagType === tagTypeFilter);
    }

    // Apply multi-sort
    if (sortFields.length > 0) {
      const getSortValue = (tag: RFIDTag, field: SortField): string | number | null => {
        switch (field) {
          case 'tagId':
            return tag.tagId;
          case 'studentName': {
            if (tag.student) return `${tag.student.firstName} ${tag.student.lastName}`.toLowerCase();
            return '';
          }
          case 'status':
            return tag.status;
          case 'lastSeen':
            return tag.lastUsed ? new Date(tag.lastUsed).getTime() : 0;
          case 'location':
            return (tag.notes || '').toLowerCase();
          case 'scanCount':
            return tag.tagType;
          case 'assignedAt':
            return tag.assignedAt ? new Date(tag.assignedAt).getTime() : 0;
          default:
            return null;
        }
      };

      filtered.sort((a, b) => {
        for (const { field, order } of sortFields) {
          const aValue = getSortValue(a, field as SortField);
          const bValue = getSortValue(b, field as SortField);

          if (aValue === bValue) continue;

          // numeric compare for timestamps and numbers
          const aNum = typeof aValue === 'number' ? aValue : null;
          const bNum = typeof bValue === 'number' ? bValue : null;
          let comparison = 0;
          if (aNum !== null && bNum !== null) {
            comparison = aNum < bNum ? -1 : 1;
          } else {
            const aStr = String(aValue ?? '').toLowerCase();
            const bStr = String(bValue ?? '').toLowerCase();
            if (aStr === bStr) continue;
            comparison = aStr < bStr ? -1 : 1;
          }
          return order === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }

    return filtered;
  }, [fuzzyResults, statusFilter, assignmentFilter, tagTypeFilter, sortFields]);

  const paginatedTags = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTags.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTags, currentPage, itemsPerPage]);

  const isAllSelected = paginatedTags.length > 0 && paginatedTags.every(t => selectedIds.includes(t.tagId.toString()));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTags.map(t => t.tagId.toString()));
    }
  };
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalPages = Math.ceil(filteredTags.length / itemsPerPage);

  const stats = useMemo(() => {
    const list = Array.isArray(tags) ? tags : [];
    return {
      total: list.length,
      active: list.filter(t => t.status === 'ACTIVE').length,
      inactive: list.filter(t => t.status === 'INACTIVE').length,
      lost: list.filter(t => t.status === 'LOST').length,
      damaged: list.filter(t => t.status === 'DAMAGED').length,
    };
  }, [tags]);

  const getStatusBadge = (status: string) => {
    const norm = status.toUpperCase();
    switch (norm) {
      case 'ACTIVE': return <Badge variant="default">Active</Badge>;
      case 'INACTIVE': return <Badge variant="secondary">Inactive</Badge>;
      case 'LOST': return <Badge variant="destructive">Lost</Badge>;
      case 'DAMAGED': return <Badge variant="destructive">Damaged</Badge>;
      case 'EXPIRED': return <Badge variant="destructive">Expired</Badge>;
      case 'REPLACED': return <Badge variant="secondary">Replaced</Badge>;
      case 'RESERVED': return <Badge variant="default">Reserved</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level > 80) return 'text-green-500';
    if (level > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Helper Functions
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

  // Handler for toggling column visibility
  const handleColumnToggle = (columnAccessor: string, checked: boolean) => {
    setVisibleColumns(prev => {
      if (checked) {
        return prev.includes(columnAccessor) ? prev : [...prev, columnAccessor];
      } else {
        // Don't allow hiding required columns
        if (COLUMN_OPTIONS.find(col => col.accessor === columnAccessor)?.required) return prev;
        return prev.filter(col => col !== columnAccessor);
      }
    });
  };

  // Handler for resetting columns to default
  const handleResetColumns = () => {
    setVisibleColumns(tagColumns.map(col => col.key));
    toast.success('Column visibility reset to default');
  };

  // Handler for sorting columns
  const handleSort = (field: string) => {
    setSortField((prevField) => {
      const isSameField = prevField === field;
      const newOrder = isSameField && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder as TagSortOrder);
      setSortFields([{ field: field as TagSortField, order: newOrder as TagSortOrder }]);
      return field as TagSortField;
    });
  };

  // Expanded rows toggle
  const onToggleExpand = (itemId: string) => {
    setExpandedRowIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  // Top bar actions
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTags().finally(() => {
      setIsRefreshing(false);
    });
  };

  // Table columns (filtered by visibleColumns)
  const columns: TableListColumn<RFIDTag>[] = [
    {
      header: '',
      accessor: 'expander',
      className: 'w-10 text-center px-1 py-1',
      render: (item: RFIDTag) => (
        <button
          onClick={() => onToggleExpand(item.tagId.toString())}
          className="px-2 py-1 rounded-full hover:bg-gray-200 text-center"
          aria-label={expandedRowIds.includes(item.tagId.toString()) ? 'Collapse row' : 'Expand row'}
        >
          {expandedRowIds.includes(item.tagId.toString()) ? <ChevronDown size={16} className="text-blue-500" /> : <ChevronRight size={16} className="text-blue-500" />}
        </button>
      ),
      expandedContent: (item: RFIDTag) => {
        // Calculate days since assignment
        const assignedDate = new Date(item.assignedAt);
        const now = new Date();
        const daysSinceAssignment = Math.floor((now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate days until expiry (if applicable)
        const daysUntilExpiry = item.expiresAt ? Math.floor((new Date(item.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        // Calculate days since last use
        const daysSinceLastUse = item.lastUsed ? Math.floor((now.getTime() - new Date(item.lastUsed).getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        return (
          <td colSpan={columns.length} className="p-0">
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-t border-slate-200">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Usage Analytics */}
                  <div className="bg-white rounded border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-semibold text-gray-800 text-base">Usage Analytics</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Days Assigned</span>
                        <span className="font-semibold text-blue-900 text-sm">{daysSinceAssignment} days</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Last Used</span>
                        <span className="font-semibold text-blue-900 text-sm">
                          {daysSinceLastUse !== null ? `${daysSinceLastUse} days ago` : 'Never used'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Expiry Status</span>
                        <span className={`font-semibold text-sm px-2 py-1 rounded-full ${
                          daysUntilExpiry === null ? 'bg-blue-100 text-blue-700' : 
                          daysUntilExpiry > 30 ? 'bg-green-100 text-green-700' : 
                          daysUntilExpiry > 7 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {daysUntilExpiry === null ? 'No expiry' : daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600 text-sm font-medium">Usage Rate</span>
                        <span className="font-semibold text-blue-900 text-sm">
                          {daysSinceLastUse !== null && daysSinceAssignment > 0 
                            ? `${Math.round((daysSinceAssignment - daysSinceLastUse) / daysSinceAssignment * 100)}% active`
                            : '0% active'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="bg-white rounded border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-semibold text-gray-800 text-base">Technical Details</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Tag ID</span>
                        <span className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-md border">{item.tagId}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Tag Number</span>
                        <span className="font-mono text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-md border">{item.tagNumber}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Type</span>
                        <span className="font-medium text-blue-900 text-sm">{item.tagType.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600 text-sm font-medium">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border border-green-200' :
                          item.status === 'INACTIVE' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                          item.status === 'LOST' ? 'bg-red-100 text-red-800 border border-red-200' :
                          item.status === 'DAMAGED' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment History */}
                  <div className="bg-white rounded border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="font-semibold text-gray-800 text-base">Assignment History</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Assigned Date</span>
                        <span className="font-semibold text-blue-900 text-sm">{assignedDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Assigned By</span>
                        <span className="font-semibold text-blue-900 text-sm">{item.assignedBy ? `User #${item.assignedBy}` : 'System'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600 text-sm font-medium">Reason</span>
                        <span className="font-semibold text-blue-900 text-sm max-w-32 truncate" title={item.assignmentReason || 'Standard assignment'}>
                          {item.assignmentReason || 'Standard assignment'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600 text-sm font-medium">Current Holder</span>
                        <span className="font-semibold text-blue-900 text-sm max-w-32 truncate">
                          {item.student ? `${item.student.firstName} ${item.student.lastName}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                   <div className="flex flex-wrap gap-3">
                     <button 
                       className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 font-medium"
                       onClick={async () => {
                         try {
                           await navigator.clipboard.writeText(item.tagNumber);
                           toast.success('Tag number copied to clipboard');
                         } catch (err) {
                           toast.error('Failed to copy tag number');
                         }
                       }}
                     >
                       Copy Tag Number
                     </button>
                     <button 
                       className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm rounded border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 font-medium"
                       onClick={async () => {
                         try {
                           const jsonData = JSON.stringify({
                             tagId: item.tagId,
                             tagNumber: item.tagNumber,
                             status: item.status,
                             type: item.tagType,
                             assignedAt: item.assignedAt,
                             lastUsed: item.lastUsed,
                             expiresAt: item.expiresAt
                           }, null, 2);
                           await navigator.clipboard.writeText(jsonData);
                           toast.success('Tag JSON copied to clipboard');
                         } catch (err) {
                           toast.error('Failed to copy tag JSON');
                         }
                       }}
                     >
                       Copy Tag JSON
                     </button>
                     {item.student && (
                       <button 
                         className="px-4 py-2 bg-green-50 text-green-700 text-sm rounded border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all duration-200 font-medium"
                         onClick={async () => {
                           try {
                             const studentInfo = `${item.student?.firstName} ${item.student?.lastName} (${item.student?.studentIdNum})`;
                             await navigator.clipboard.writeText(studentInfo);
                             toast.success('Student info copied to clipboard');
                           } catch (err) {
                             toast.error('Failed to copy student info');
                           }
                         }}
                       >
                         Copy Student Info
                       </button>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </td>
        );
      }
    },
    {
      header: (
        <SharedCheckbox 
          checked={isAllSelected} 
          indeterminate={isIndeterminate} 
          onCheckedChange={handleSelectAll}
          aria-label="Select all tags"
        />
      ),
      accessor: 'select',
      className: 'w-12 text-center',
    },
    ...tagColumns
      .filter(col => visibleColumns.includes(col.key))
      .map(col => {
        if (col.key === 'tagId') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => {
              const fuseResult = fuzzyResults.find(r => r.item.tagId === item.tagId) as FuseResult<SearchableTag> | undefined;
              const tagIdMatches = fuseResult?.matches?.find((m: { key: string }) => m.key === "tagNumber")?.indices;
              return (
                <div 
                  className="text-sm font-medium text-blue-900 text-center"
                  dangerouslySetInnerHTML={{ __html: safeHighlight(item.tagNumber, tagIdMatches) }}
                />
              );
            }
          };
        }
        if (col.key === 'studentName') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => {
              const fuseResult = fuzzyResults.find(r => r.item.tagId === item.tagId) as FuseResult<SearchableTag> | undefined;
              const nameMatches =
                fuseResult?.matches?.find((m: { key: string }) => m.key === "studentFullName")?.indices ??
                fuseResult?.matches?.find((m: { key: string }) => m.key === "studentFullNameReversed")?.indices ??
                fuseResult?.matches?.find((m: { key: string }) => m.key === "student.firstName")?.indices ??
                fuseResult?.matches?.find((m: { key: string }) => m.key === "student.lastName")?.indices;
              return (
                <div className="text-center">
                  {item.student ? (
                    <div>
                      <div 
                        className="font-medium text-blue-900"
                        dangerouslySetInnerHTML={{ __html: safeHighlight(`${item.student.firstName} ${item.student.lastName}`, nameMatches) }}
                      />
                      <div className="text-sm text-muted-foreground">{item.student.studentIdNum}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </div>
              );
            }
          };
        }
        if (col.key === 'status') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => getStatusBadge(item.status)
          };
        }
        if (col.key === 'lastSeen') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => (
              <span className="text-sm">{item.lastUsed ? new Date(item.lastUsed).toLocaleString() : 'Never'}</span>
            )
          };
        }
        if (col.key === 'location') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => (
              <span className="text-sm">{item.notes || 'N/A'}</span>
            )
          };
        }
        if (col.key === 'scanCount') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => (
              <span className="text-sm text-blue-900">{item.tagType}</span>
            )
          };
        }
        if (col.key === 'assignedAt') {
          return {
            header: col.label,
            accessor: col.accessor,
            className: 'text-center',
            sortable: col.sortable,
            render: (item: RFIDTag) => (
              <div className="flex items-center gap-1 justify-center">
                <span className="text-sm text-blue-900">{item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            )
          };
        }
        return {
          header: col.label,
          accessor: col.accessor,
          className: 'text-center',
          sortable: col.sortable
        };
      }),
    {
      header: "Actions",
      accessor: "actions",
      className: "text-center",
      render: (item: RFIDTag) => (
        <div className="flex gap-1 justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="View Tag"
                  className="hover:bg-blue-50"
                  onClick={() => {
                    setSelectedTag(item);
                    setViewModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
                View details
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit Tag"
                  className="hover:bg-green-50"
                  onClick={() => {
                    setSelectedTag(item);
                    setEditModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 text-green-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
                Edit
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete Tag"
                  className="hover:bg-red-50"
                  onClick={() => {
                    setSelectedTag(item);
                    setDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="bg-blue-900 text-white">
                Delete
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }
  ];

  const selectedTags = (Array.isArray(tags) ? tags : []).filter(tag => selectedIds.includes(tag.tagId.toString()));

  const handleQuickExportSelectedTags = () => {
    const selected = selectedTags;
    if (selected.length === 0) {
      toast.error('No tags selected to export');
      return;
    }
    const headers = tagColumns.map(col => col.label);
    const rows = selected.map((tag) => {
      return tagColumns.map(col => {
        const accessor = col.accessor as string;
        // Handle special derived fields
        if (accessor === 'studentName') {
          return tag.student ? `${tag.student.firstName} ${tag.student.lastName}` : '';
        }
        if (accessor === 'notes') {
          return tag.notes || '';
        }
        return String((tag as any)[accessor] ?? '');
      });
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rfid-tags-selected.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} selected tags to CSV`);
  };

  const handlePrint = () => {
    const printColumns = [
      { header: 'Tag ID', accessor: 'tagId' },
      { header: 'Assigned To', accessor: 'studentName' },
      { header: 'Status', accessor: 'status' },
      { header: 'Last Used', accessor: 'lastSeen' },
      { header: 'Notes', accessor: 'location' },
      { header: 'Type', accessor: 'scanCount' },
      { header: 'Assigned Date', accessor: 'assignedAt' },
    ];

    const printData = filteredTags.map((t) => ({
      tagId: t.tagNumber,
      studentName: t.student ? `${t.student.firstName} ${t.student.lastName}` : '',
      status: t.status,
      lastSeen: t.lastUsed ? new Date(t.lastUsed).toLocaleString() : 'Never',
      location: t.notes || '',
      scanCount: t.tagType,
      assignedAt: t.assignedAt ? new Date(t.assignedAt).toLocaleDateString() : '',
    }));

    const printFn = PrintLayout({
      title: 'RFID Tags List',
      data: printData,
      columns: printColumns,
      totalItems: filteredTags.length,
    });
    printFn();
  };

  const handleImportTags = async (data: any[]) => {
    try {
      const res = await fetch('/api/rfid/tags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: data,
          options: { skipDuplicates: true, updateExisting: true }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Import failed (HTTP ${res.status})`);
      }
      const result = await res.json();
      await fetchTags();
      toast.success('Tags imported successfully');
      return {
        success: result?.results?.success ?? 0,
        failed: result?.results?.failed ?? 0,
        errors: result?.results?.errors ?? []
      };
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import tags');
      return { success: 0, failed: data.length, errors: [e?.message || 'Unknown import error'] };
    }
  };

  const handleBulkActionCompleteTags = (actionType: string, results: any) => {
    toast.success(`Bulk action '${actionType}' completed.`);
    setBulkActionsDialogOpen(false);
    fetchTags();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <PageHeader
          title="RFID Tags"
          subtitle="Manage and monitor RFID tags assigned to students"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'RFID Management', href: '/rfid' },
            { label: 'Tags' }
          ]}
        />

        {/* Error Banner */}
        {error && (
          <div className="w-full max-w-full">
            <div className="flex items-start justify-between p-3 sm:p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Failed to load tags</div>
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
            label="Total Tags"
            value={tags.length}
            valueClassName="text-blue-900"
            sublabel="Total number of tags"
          />
          <SummaryCard
            icon={<UserCheck className="text-blue-500 w-5 h-5" />}
            label="Assigned Tags"
            value={tags.filter(t => t.student !== null && t.student !== undefined).length}
            valueClassName="text-blue-900"
            sublabel="Tags assigned to students"
          />
          <SummaryCard
            icon={<UserX className="text-blue-500 w-5 h-5" />}
            label="Unassigned Tags"
            value={tags.filter(t => t.student === null || t.student === undefined).length}
            valueClassName="text-blue-900"
            sublabel="Tags not yet assigned"
          />
          <SummaryCard
            icon={<AlertTriangle className="text-blue-500 w-5 h-5" />}
            label="Student Cards"
            value={tags.filter(t => t.tagType === 'STUDENT_CARD').length}
            valueClassName="text-blue-900"
            sublabel="Student card type tags"
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
                id: 'add-tag',
                label: 'Add Tag',
                description: 'Create new RFID tag',
                icon: <Plus className="w-5 h-5 text-white" />,
                onClick: () => { 
                  setSelectedTag(null); 
                  setAddModalOpen(true); 
                }
              },
              {
                id: 'import-data',
                label: 'Import Data',
                description: 'Import tags from file',
                icon: <Upload className="w-5 h-5 text-white" />,
                onClick: () => setImportDialogOpen(true)
              },
              {
                id: 'print-page',
                label: 'Print Page',
                description: 'Print tag list',
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
                id: 'batch-assign',
                label: 'Batch-Scan Assign',
                description: 'Assign cards by scanning',
                icon: <CreditCard className="w-5 h-5 text-white" />,
                onClick: () => setBatchAssignOpen(true)
              },
              {
                id: 'refresh-data',
                label: 'Refresh Data',
                description: 'Reload tag data',
                icon: isRefreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                onClick: () => handleRefresh(),
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
                      <h3 className="text-lg font-bold text-white">RFID Tags List</h3>
                      <p className="text-blue-100 text-sm">Search and filter RFID tag information</p>
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
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
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
                          <span className="text-green-600"><UserCheck className="w-4 h-4" /></span> Active
                        </span>
                      </SelectItem>
                      <SelectItem value="INACTIVE">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500"><UserX className="w-4 h-4" /></span> Inactive
                        </span>
                      </SelectItem>
                      <SelectItem value="LOST">
                        <span className="flex items-center gap-2">
                          <span className="text-orange-500"><AlertTriangle className="w-4 h-4" /></span> Lost
                        </span>
                      </SelectItem>
                      <SelectItem value="DAMAGED">
                        <span className="flex items-center gap-2">
                          <span className="text-red-600"><AlertTriangle className="w-4 h-4" /></span> Damaged
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                    <SelectTrigger className="w-full sm:w-32 lg:w-36 xl:w-32 text-gray-700 rounded">
                      <SelectValue placeholder="Assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignment</SelectItem>
                      <SelectItem value="assigned">
                        <span className="flex items-center gap-2">
                          <span className="text-green-600"><UserCheck className="w-4 h-4" /></span> Assigned
                        </span>
                      </SelectItem>
                      <SelectItem value="unassigned">
                        <span className="flex items-center gap-2">
                          <span className="text-gray-500"><UserX className="w-4 h-4" /></span> Unassigned
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={tagTypeFilter} onValueChange={setTagTypeFilter}>
                    <SelectTrigger className="w-full sm:w-32 lg:w-36 xl:w-32 text-gray-700 rounded">
                      <SelectValue placeholder="Tag Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="STUDENT_CARD">
                        <span className="flex items-center gap-2">
                          <span className="text-blue-600"><CreditCard className="w-4 h-4" /></span> Student Card
                        </span>
                      </SelectItem>
                      <SelectItem value="TEMPORARY_PASS">
                        <span className="flex items-center gap-2">
                          <span className="text-yellow-600"><Clock className="w-4 h-4" /></span> Temporary Pass
                        </span>
                      </SelectItem>
                      <SelectItem value="VISITOR_PASS">
                        <span className="flex items-center gap-2">
                          <span className="text-purple-600"><UserCheck className="w-4 h-4" /></span> Visitor Pass
                        </span>
                      </SelectItem>
                      <SelectItem value="MAINTENANCE">
                        <span className="flex items-center gap-2">
                          <span className="text-orange-600"><Settings className="w-4 h-4" /></span> Maintenance
                        </span>
                      </SelectItem>
                      <SelectItem value="TEST">
                        <span className="flex items-center gap-2">
                          <span className="text-gray-600"><ScanLine className="w-4 h-4" /></span> Test
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <div className="mt-2 sm:mt-3 px-2 sm:px-3 lg:px-6 max-w-full">
                <BulkActionsBar
                  selectedCount={selectedIds.length}
                  entityLabel="tag"
                  actions={[
                    {
                      key: "bulk-actions",
                      label: "Bulk Actions",
                      icon: <Settings className="w-4 h-4 mr-2" />,
                      onClick: () => setBulkActionsDialogOpen(true),
                      tooltip: "Open enhanced bulk actions dialog",
                      variant: "default"
                    },
                    {
                      key: "export",
                      label: "Quick Export",
                      icon: <Download className="w-4 h-4 mr-2" />,
                    onClick: () => handleQuickExportSelectedTags(),
                      tooltip: "Quick export selected tags to CSV"
                    },
                    {
                      key: "delete",
                      label: "Delete Selected",
                      icon: loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />,
                      onClick: () => setBulkActionsDialogOpen(true),
                      loading: loading,
                      disabled: loading,
                      tooltip: "Delete selected tags",
                      variant: "destructive"
                    }
                  ]}
                  onClear={() => setSelectedIds([])}
                />
              </div>
            )}
            {/* Table Content */}
            <div className="relative px-2 sm:px-3 lg:px-6 mt-3 sm:mt-4 lg:mt-6">
              <div className="overflow-x-auto bg-white/70 shadow-none relative">
                {/* Loader overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                )}
                <div className="print-content">
                  {!loading && filteredTags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <EmptyState
                        icon={<CreditCard className="w-6 h-6 text-blue-400" />}
                        title="No RFID tags found"
                        description="Try adjusting your search criteria or filters to find the tags you're looking for."
                        action={
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                              onClick={() => handleRefresh()}
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
                      data={paginatedTags}
                      loading={loading}
                      selectedIds={selectedIds}
                      emptyMessage={null}
                      onSelectRow={handleSelectRow}
                      onSelectAll={handleSelectAll}
                      isAllSelected={isAllSelected}
                      isIndeterminate={isIndeterminate}
                      getItemId={(item) => item.tagId.toString()}
                      className="border-0 shadow-none max-w-full"
                      sortState={{ field: sortField, order: sortOrder }}
                      onSort={handleSort}
                      expandedRowIds={expandedRowIds}
                      onToggleExpand={onToggleExpand}
                    />
                  )}
                </div>
              </div>
              {/* Pagination */}
              <TablePagination
                page={currentPage}
                pageSize={itemsPerPage}
                totalItems={filteredTags.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
                entityLabel="tag"
              />
            </div>
          </Card>
        </div>

        {/* Dialogs */}
        <VisibleColumnsDialog
          open={visibleColumnsDialogOpen}
          onOpenChange={setVisibleColumnsDialogOpen}
          columns={COLUMN_OPTIONS}
          visibleColumns={visibleColumns}
          onColumnToggle={handleColumnToggle}
          onReset={handleResetColumns}
          title="Manage Tag Columns"
          description="Choose which columns to display in the tag table"
          searchPlaceholder="Search tag columns..."
          enableManualSelection={true}
        />

        <SortDialog
          open={sortDialogOpen}
          onOpenChange={setSortDialogOpen}
          sortOptions={tagSortFieldOptions}
          currentSort={{ field: sortField, order: sortOrder }}
          onSortChange={(field, order) => {
            setSortField(field as TagSortField);
            setSortOrder(order as TagSortOrder);
            setSortFields([{ field: field as SortField, order }]);
          }}
          title="Sort Tags"
          description="Sort tags by different fields."
          entityType="tags"
        />

        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          dataCount={selectedTags.length}
          entityType="student"
          onExport={async (format, _options) => {
            toast.success(`Exported ${format.toUpperCase()} for ${selectedTags.length} item(s)`);
          }}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={handleImportTags}
          entityName="RFIDTag"
          templateUrl="/api/rfid/tags/template"
          acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
          maxFileSize={5}
        />

        {/* Batch-Scan Assign Dialog */}
        <Dialog open={batchAssignOpen} onOpenChange={setBatchAssignOpen}>
          <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Batch-Scan Assign</DialogTitle>
            </DialogHeader>
            <BatchAssign isFullscreen={false} onClose={() => setBatchAssignOpen(false)} onAssigned={() => { setBatchAssignOpen(false); fetchTags(); }} />
          </DialogContent>
        </Dialog>

        {/* Kiosk Bind (Admin) Dialog - Removed as requested */}

        {/* Add Tag Dialog */}
        <RFIDTagFormDialog
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSubmit={async (data) => {
            try {
              const res = await fetch('/api/rfid/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || 'Failed to create tag');
              }
              const created = await res.json();
              setTags(prev => [created, ...prev]);
              toast.success('Tag created successfully');
              setCreateForm({ tagNumber: '', tagType: 'STUDENT_CARD', status: 'ACTIVE', notes: '' });
            } catch (e: any) {
              toast.error(e?.message || 'Failed to create tag');
              throw e; // Re-throw to prevent dialog from closing
            }
          }}
          mode="create"
        />
        
        {selectedTag && (
          <ViewDialog
            open={viewModalOpen}
            onOpenChange={setViewModalOpen}
            title="Tag Details"
            subtitle={`Tag ${selectedTag.tagNumber}`}
            sections={[
              {
                title: "Tag Information",
                fields: [
                  { label: 'Tag ID', value: String(selectedTag.tagId) },
                  { label: 'Tag Number', value: selectedTag.tagNumber },
                  { label: 'Type', value: selectedTag.tagType },
                  { label: 'Status', value: selectedTag.status },
                  { label: 'Assigned Date', value: selectedTag.assignedAt ? new Date(selectedTag.assignedAt).toLocaleString() : 'N/A' },
                  { label: 'Last Used', value: selectedTag.lastUsed ? new Date(selectedTag.lastUsed).toLocaleString() : 'Never' },
                ]
              },
              {
                title: "Assignment",
                fields: [
                  { label: 'Student', value: selectedTag.student ? `${selectedTag.student.firstName} ${selectedTag.student.lastName} (${selectedTag.student.studentIdNum})` : '—' },
                  { label: 'Assigned By', value: assignedByUser ? `${assignedByUser.userName} (${assignedByUser.email})` : selectedTag.assignedBy ? `User ID: ${selectedTag.assignedBy}` : '—' },
                  { label: 'Reason', value: selectedTag.assignmentReason || '—' },
                ]
              },
              {
                title: "Additional",
                fields: [
                  { label: 'Expires At', value: selectedTag.expiresAt ? new Date(selectedTag.expiresAt).toLocaleString() : '—' },
                  { label: 'Notes', value: selectedTag.notes || '—' },
                ]
              }
            ]}
            tooltipText="View detailed RFID tag information"
          />
        )}

        {/* Edit Tag Dialog */}
        {selectedTag && (
          <RFIDTagFormDialog
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            initialData={selectedTag}
            onSubmit={async (data) => {
              try {
                const res = await fetch(`/api/rfid/tags/${selectedTag.tagId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err?.error || 'Failed to update tag');
                }
                const updated = await res.json();
                setTags(prev => prev.map(t => t.tagId === selectedTag.tagId ? { ...t, ...updated } : t));
                toast.success('Tag updated successfully');
                setSelectedTag(null);
              } catch (e: any) {
                toast.error(e?.message || 'Failed to update tag');
                throw e; // Re-throw to prevent dialog from closing
              }
            }}
            mode="edit"
          />
        )}

        {/* Delete Tag Confirmation Dialog */}
        {selectedTag && (
          <ConfirmDeleteDialog
            open={deleteModalOpen}
            onOpenChange={(open) => {
              setDeleteModalOpen(open);
              if (!open) setSelectedTag(null);
            }}
            itemName={selectedTag.tagNumber}
            onDelete={async () => {
              try {
                const res = await fetch(`/api/rfid/tags/${selectedTag.tagId}`, { method: 'DELETE' });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err?.error || 'Failed to delete tag');
                }
                setTags(prev => prev.filter(t => t.tagId !== selectedTag.tagId));
                setSelectedIds(prev => prev.filter(id => id !== selectedTag.tagId.toString()));
                toast.success('Tag deleted successfully');
              } catch (e: any) {
                toast.error(e?.message || 'Failed to delete tag');
              } finally {
                setDeleteModalOpen(false);
                setSelectedTag(null);
              }
            }}
          />
        )}

        <BulkActionsDialog
          open={bulkActionsDialogOpen}
          onOpenChange={setBulkActionsDialogOpen}
          selectedItems={selectedTags}
          entityType="tag"
          entityLabel="tag"
          availableActions={[
            { id: 'status-update', label: 'Update Status', description: 'Update status of selected tags', icon: <Settings className="w-4 h-4" />, tabId: 'status' },
            { id: 'notification', label: 'Send Notification', description: 'Send notification to administrators', icon: <Bell className="w-4 h-4" />, tabId: 'notification' },
            { id: 'export', label: 'Export Data', description: 'Export selected tags data', icon: <Download className="w-4 h-4" />, tabId: 'export' },
          ]}
          onActionComplete={handleBulkActionCompleteTags}
          onCancel={() => setBulkActionsDialogOpen(false)}
          onProcessAction={async (actionType: string, config: any) => {
            try {
              if (actionType === 'status-update') {
                const { itemId, newStatus, reason } = config || {};
                if (!itemId || !newStatus) return { success: false };
                const res = await fetch(`/api/rfid/tags/${itemId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: String(newStatus).toUpperCase(), reason })
                });
                if (!res.ok) return { success: false };
                const updated = await res.json().catch(() => ({}));
                setTags(prev => prev.map(t => t.tagId.toString() === String(itemId) ? { ...t, ...updated, status: String(newStatus).toUpperCase() as RFIDTag['status'] } : t));
                return { success: true };
              }
              if (actionType === 'notification') {
                const { itemId, subject, message, priority, includeAttachments } = config || {};
                if (!itemId || !subject || !message) return { success: false };
                // Placeholder notification API; adjust to your backend route
                await fetch(`/api/notifications/tags`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tagId: itemId, subject, message, priority, includeAttachments })
                }).catch(() => {});
                return { success: true };
              }
              if (actionType === 'export') {
                return { success: true };
              }
              return { success: false };
            } catch {
              return { success: false };
            }
          }}
          getItemId={(item: RFIDTag) => item.tagId.toString()}
          getItemDisplayName={(item: RFIDTag) => item.tagNumber}
          getItemStatus={(item: RFIDTag) => item.status}
        />
      </div>
      
      {/* MQTT Debug Info - Remove in production */}
      <MQTTDebugInfo />
    </div>
  );
} 