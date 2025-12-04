'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Settings,
  GraduationCap,
  BookOpen,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AcademicYearForm from '@/components/forms/AcademicYearForm';
import { format } from 'date-fns';
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { EmptyState } from '@/components/reusable';
import { PageSkeleton } from '@/components/reusable/Skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { TableList, TableListColumn } from '@/components/reusable/Table/TableList';
import { TableRowActions } from '@/components/reusable/Table/TableRowActions';
import BulkActionsBar from '@/components/reusable/BulkActionsBar';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ViewDialog } from '@/components/reusable/Dialogs/ViewDialog';
import { ExportDialog } from '@/components/reusable/Dialogs/ExportDialog';
import { ImportDialog } from '@/components/reusable/Dialogs/ImportDialog';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel/QuickActionsPanel';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Semester {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  isActive: boolean;
  status: string;
}

interface AcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  semesters: Semester[];
  isArchived?: boolean;
}

type SortFieldKey = 'name' | 'startDate' | 'endDate' | 'isActive' | 'semesterCount';
type SortOrder = 'asc' | 'desc';


export default function AcademicYearsPage() {
  // State management
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortFieldKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  // Dialog states
  const [showForm, setShowForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);
  const [academicYearToDelete, setAcademicYearToDelete] = useState<AcademicYear | null>(null);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/academic-years');
      if (!response.ok) {
        throw new Error('Failed to fetch academic years');
      }
      const data = await response.json();
      const normalizedData = (data as AcademicYear[]).map((year) => ({
        ...year,
        isArchived: year.isArchived ?? false
      }));
      setAcademicYears(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Filtered and sorted data
  const filteredAcademicYears = useMemo(() => {
    let filtered = academicYears.filter((year) => !year.isArchived);

    // Search filter
    if (debouncedSearchTerm) {
      filtered = filtered.filter(year => 
        year.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        year.semesters.some(sem => 
          sem.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(year => 
        statusFilter === 'active' ? year.isActive : !year.isActive
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'endDate':
          aValue = new Date(a.endDate);
          bValue = new Date(b.endDate);
          break;
        case 'isActive':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case 'semesterCount':
          aValue = a.semesters.length;
          bValue = b.semesters.length;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [academicYears, debouncedSearchTerm, statusFilter, sortField, sortOrder]);

  const selectedYears = useMemo(
    () => academicYears.filter((year) => selectedIds.includes(String(year.id))),
    [academicYears, selectedIds]
  );

  const canArchiveSelected = selectedYears.length > 0 && selectedYears.every((year) => year.semesters.length === 0);

  // Event handlers
  const handleFormSuccess = (mode: 'create' | 'edit') => {
    setShowForm(false);
    setSelectedAcademicYear(null);
    fetchAcademicYears();
    toast.success(mode === 'edit' ? 'Academic year updated successfully' : 'Academic year created successfully');
  };

  const handleViewAcademicYear = (academicYear: AcademicYear) => {
    setSelectedAcademicYear(academicYear);
    setShowViewDialog(true);
  };

  const handleEditAcademicYear = (academicYear: AcademicYear) => {
    setSelectedAcademicYear(academicYear);
    setShowForm(true);
  };

  const handleDeleteAcademicYear = (academicYear: AcademicYear) => {
    setAcademicYearToDelete(academicYear);
    setShowDeleteDialog(true);
  };

  // Column configuration
  const isAllSelected = filteredAcademicYears.length > 0 && filteredAcademicYears.every(year => selectedIds.includes(String(year.id)));
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

  const academicYearColumns: TableListColumn<AcademicYear>[] = useMemo(() => [
    {
      header: '',
      accessor: 'expander',
      className: 'w-10 text-center px-2 py-3',
      expandedContent: (item: AcademicYear) => (
        <td colSpan={5} className="bg-blue-50 rounded-b-xl">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-blue-900">Semesters ({item.semesters.length})</div>
              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                {item.isActive ? 'Active Year' : 'Inactive Year'}
              </Badge>
            </div>
            {item.semesters.length === 0 ? (
              <p className="text-sm text-gray-500">No semesters available for this academic year.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.semesters.map((semester) => (
                  <div key={semester.id} className="bg-white rounded-lg border border-blue-100 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-900">{semester.name}</span>
                      </div>
                      <Badge
                        className={
                          semester.status === 'CURRENT' ? 'bg-green-100 text-green-800' :
                          semester.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                          semester.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {semester.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {format(new Date(semester.startDate), 'MMM dd, yyyy')} - {format(new Date(semester.endDate), 'MMM dd, yyyy')}
                    </p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">Type:</span>
                      <span className="uppercase">{semester.type}</span>
                      <span className="font-medium text-gray-700">Active:</span>
                      <span>{semester.isActive ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>
      )
    },
    {
      header: '',
      accessor: 'select',
      className: 'w-10 text-center px-2 py-3',
    },
    {
      header: 'Academic Year',
      accessor: 'name',
      className: 'px-4 py-3 text-center',
      headerClassName: 'justify-center text-center',
      render: (item: AcademicYear) => (
        <div className="flex items-center justify-center gap-3">
          <div>
            <div className="font-semibold text-blue-900 text-sm sm:text-base">{item.name}</div>
            <div className="text-xs sm:text-sm text-gray-500">
              {format(new Date(item.startDate), 'MMM yyyy')} - {format(new Date(item.endDate), 'MMM yyyy')}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Duration',
      accessor: 'duration',
      className: 'px-4 py-3 text-center text-sm text-blue-900 font-semibold',
      headerClassName: 'justify-center text-center text-blue-900',
      render: (item: AcademicYear) => (
        <div className="text-sm text-gray-700">
          <div>{format(new Date(item.startDate), 'MMM dd, yyyy')}</div>
          <div className="text-xs text-gray-500">to {format(new Date(item.endDate), 'MMM dd, yyyy')}</div>
        </div>
      )
    },
    {
      header: 'Semesters',
      accessor: 'semesters',
      className: 'px-4 py-3 text-center text-sm text-blue-900 font-semibold',
      headerClassName: 'justify-center text-center text-blue-900',
      render: (item: AcademicYear) => (
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-900">
          <Calendar className="w-4 h-4 text-gray-400" />
          {item.semesters.length}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      className: 'px-4 py-3 text-center',
      headerClassName: 'justify-center text-center',
      render: (item: AcademicYear) => (
        <Badge
          variant={
            item.isActive || item.semesters.some((sem) => sem.isActive)
              ? 'default'
              : 'secondary'
          }
          className="px-3 py-1 text-xs"
        >
          {item.isActive || item.semesters.some((sem) => sem.isActive) ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      className: 'px-4 py-3 text-center',
      headerClassName: 'justify-center text-center',
      render: (item: AcademicYear) => (
        <TableRowActions
          itemName={item.name}
          onView={() => handleViewAcademicYear(item)}
          onEdit={() => handleEditAcademicYear(item)}
          onDelete={() => handleDeleteAcademicYear(item)}
          deleteTooltip={
            item.semesters.length > 0
              ? 'Archive unavailable: remove connected semesters first'
              : 'Archive'
          }
          disableDelete={item.semesters.length > 0}
          deleteVariant="archive"
          deleteAriaLabel="Archive academic year"
        />
      )
    }
  ], [handleViewAcademicYear, handleEditAcademicYear, handleDeleteAcademicYear]);

  const confirmDelete = async () => {
    if (!academicYearToDelete) return;
    
  if (academicYearToDelete.semesters.length > 0) {
    toast.error('Cannot archive an academic year with connected semesters.');
    setShowDeleteDialog(false);
    setAcademicYearToDelete(null);
    return;
  }

    try {
    // TODO: replace with archive API when available
    setAcademicYears(prev =>
      prev.map((year) =>
        year.id === academicYearToDelete.id
          ? { ...year, isArchived: true, isActive: false }
          : year
      )
    );
    setSelectedIds((prev) =>
      prev.filter((id) => id !== String(academicYearToDelete.id))
    );
    toast.success('Academic year archived successfully');
    } catch (error) {
    toast.error('Failed to archive academic year');
    } finally {
      setShowDeleteDialog(false);
      setAcademicYearToDelete(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Please select academic years first');
      return;
    }

    try {
      switch (action) {
        case 'archive':
          if (!canArchiveSelected) {
            toast.error('Deselect academic years with connected semesters before archiving.');
            return;
          }
          // TODO: replace with archive API when available
          setAcademicYears((prev) =>
            prev.map((year) =>
              selectedIds.includes(String(year.id))
                ? { ...year, isArchived: true, isActive: false }
                : year
            )
          );
          setSelectedIds([]);
          toast.success('Selected academic years archived');
          break;
        case 'export':
          setShowExportDialog(true);
          break;
        default:
          toast.error('Unknown action');
      }
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAcademicYears.map(year => String(year.id)));
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedRowIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    );
  };

  const handleExport = async (formatType: string) => {
    try {
      const data = filteredAcademicYears.map(year => ({
        'Academic Year': year.name,
        'Start Date': format(new Date(year.startDate), 'yyyy-MM-dd'),
        'End Date': format(new Date(year.endDate), 'yyyy-MM-dd'),
        'Status': year.isActive ? 'Active' : 'Inactive',
        'Semesters': year.semesters.length,
        'Semester Details': year.semesters.map(s => s.name).join(', ')
      }));

      if (formatType === 'excel') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Academic Years');
        XLSX.writeFile(wb, `academic-years-${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (formatType === 'pdf') {
        const doc = new jsPDF();
        autoTable(doc, {
          head: [Object.keys(data[0] || {})],
          body: data.map(row => Object.values(row)),
        });
        doc.save(`academic-years-${new Date().toISOString().split('T')[0]}.pdf`);
      }

      toast.success(`Academic years exported to ${formatType.toUpperCase()}`);
      setShowExportDialog(false);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // Statistics
  const stats = useMemo(() => ({
    total: academicYears.length,
    active: academicYears.filter(year => year.isActive).length,
    inactive: academicYears.filter(year => !year.isActive).length,
    totalSemesters: academicYears.reduce((sum, year) => sum + year.semesters.length, 0)
  }), [academicYears]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Academic Years</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchAcademicYears}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] overflow-x-hidden">
      <div className="w-full max-w-none px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 md:py-4 lg:py-6 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
        
        {/* Page Header */}
        <div className="w-full">
          <PageHeader
            title="Academic Years"
            subtitle="Manage academic years and their semesters"
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Academic Management", href: "/academic-management" },
              { label: "Academic Years" }
            ]}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <SummaryCard
            icon={<GraduationCap className="text-blue-700 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Total Academic Years"
            value={stats.total}
            valueClassName="text-blue-900"
            sublabel="All academic years"
            loading={loading}
          />
          <SummaryCard
            icon={<CheckCircle className="text-blue-700 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Active Years"
            value={stats.active}
            valueClassName="text-blue-900"
            sublabel="Currently active"
            loading={loading}
          />
          <SummaryCard
            icon={<XCircle className="text-blue-700 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Inactive Years"
            value={stats.inactive}
            valueClassName="text-blue-900"
            sublabel="Archived years"
            loading={loading}
          />
          <SummaryCard
            icon={<Calendar className="text-blue-700 w-4 h-4 sm:w-5 sm:h-5" />}
            label="Total Semesters"
            value={stats.totalSemesters}
            valueClassName="text-blue-900"
            sublabel="All semesters"
            loading={loading}
          />
        </div>

        {/* Quick Actions Panel */}
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
              id: 'new-academic-year',
              label: 'New Academic Year',
              description: 'Create a new academic year',
              icon: <Plus className="w-5 h-5 text-white" />,
              onClick: () => setShowForm(true)
            },
            {
              id: 'import-data',
              label: 'Import Data',
              description: 'Import academic years from file',
              icon: <Upload className="w-5 h-5 text-white" />,
              onClick: () => setShowImportDialog(true)
            },
            {
              id: 'export-data',
              label: 'Export Data',
              description: 'Export academic years to file',
              icon: <Download className="w-5 h-5 text-white" />,
              onClick: () => setShowExportDialog(true)
            },
            {
              id: 'refresh-data',
              label: 'Refresh Data',
              description: 'Reload academic years data',
              icon: loading ? (
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 text-white" />
              ),
              onClick: fetchAcademicYears,
              disabled: loading,
              loading: loading
            }
          ]}
          collapsible={true}
          defaultCollapsed={false}
          className="mb-6"
        />

        {/* Content */}
        <Card className="shadow-lg rounded-xl overflow-hidden p-0 w-full max-w-full">
          <CardHeader className="p-0">
            <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] py-4 sm:py-6">
              <div className="flex items-center gap-3 px-4 sm:px-6">
                <div className="w-8 h-8 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Academic Years</h3>
                  <p className="text-blue-100 text-sm">Manage academic years and semesters</p>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Search and Filter Section */}
          <div className="border-b border-gray-200 shadow-sm p-4 sm:p-5 lg:p-6 bg-white">
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 items-start xl:items-center justify-start xl:justify-end">
              <div className="relative w-full xl:w-auto xl:min-w-[220px] xl:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search academic years..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full xl:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32 lg:w-36 xl:w-32 text-gray-500 rounded">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'table' ? 'card' : 'table')}
                  className="h-10 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
                >
                  {viewMode === 'table' ? <Calendar className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">
                    {selectedIds.length} academic year(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('archive')}
                      disabled={!canArchiveSelected}
                      className={`border-orange-300 text-orange-700 hover:bg-orange-50 ${
                        !canArchiveSelected ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''
                      }`}
                    >
                      Archive Selected
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {filteredAcademicYears.length === 0 ? (
              <EmptyState
                icon={<GraduationCap className="h-12 w-12 text-gray-400" />}
                title="No Academic Years"
                description={academicYears.length === 0 
                  ? "Create your first academic year to get started"
                  : "No academic years match your current filters"
                }
                action={
                  academicYears.length === 0 ? (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Academic Year
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}>
                      Clear Filters
                    </Button>
                  )
                }
              />
            ) : viewMode === 'table' ? (
              <TableList
                columns={academicYearColumns}
                data={filteredAcademicYears}
                loading={loading}
                emptyMessage={null}
                className="border-0 shadow-none"
                getItemId={(item) => String(item.id)}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                expandedRowIds={expandedRowIds}
                onToggleExpand={handleToggleExpand}
              />
            ) : (
              <div className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAcademicYears.map((academicYear) => (
                    <Card key={academicYear.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <CardTitle className="text-lg">{academicYear.name}</CardTitle>
                          <CardDescription>
                            {format(new Date(academicYear.startDate), 'MMM yyyy')} - {format(new Date(academicYear.endDate), 'MMM yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                          <Badge variant={academicYear.isActive ? 'default' : 'secondary'}>
                            {academicYear.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            {academicYear.semesters.length} Semester{academicYear.semesters.length !== 1 ? 's' : ''}
                          </div>
                          
                          <div className="space-y-2">
                            {academicYear.semesters.map((semester) => (
                              <div
                                key={semester.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <p className="text-sm font-medium">{semester.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(semester.startDate), 'MMM dd')} - {format(new Date(semester.endDate), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                                <Badge 
                                  className={
                                    semester.status === 'CURRENT' ? 'bg-green-100 text-green-800' :
                                    semester.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                                    semester.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-red-100 text-red-800'
                                  }
                                >
                                  {semester.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AcademicYearForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setSelectedAcademicYear(null);
          }
        }}
        onSuccess={handleFormSuccess}
        initialData={selectedAcademicYear}
      />

      {selectedAcademicYear && (
        <ViewDialog
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          title="Academic Year Details"
          sections={[
            {
              title: "Basic Information",
              fields: [
                { label: "Academic Year", value: selectedAcademicYear.name },
                { label: "Start Date", value: format(new Date(selectedAcademicYear.startDate), 'PPP') },
                { label: "End Date", value: format(new Date(selectedAcademicYear.endDate), 'PPP') },
                { label: "Status", value: selectedAcademicYear.isActive ? 'Active' : 'Inactive' }
              ]
            },
            {
              title: "Semesters",
              fields: selectedAcademicYear.semesters.map((semester, index) => ({
                label: semester.name,
                value: `${format(new Date(semester.startDate), 'MMM dd')} - ${format(new Date(semester.endDate), 'MMM dd, yyyy')} (${semester.status})`
              }))
            }
          ]}
        />
      )}

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        itemName={academicYearToDelete?.name || 'academic year'}
        onDelete={confirmDelete}
        onCancel={() => setAcademicYearToDelete(null)}
        canDelete={academicYearToDelete ? academicYearToDelete.semesters.length === 0 : true}
        loading={loading}
        description="Archiving hides the academic year without removing historical records."
        confirmLabel="Archive"
        warningMessage={
          academicYearToDelete && academicYearToDelete.semesters.length > 0
            ? 'This academic year has connected semesters. Remove or reassign them before archiving.'
            : undefined
        }
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
        dataCount={filteredAcademicYears.length}
        entityType="academic-years"
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={async (data) => {
          // Implement import logic
          toast.success('Import functionality coming soon');
          return { success: 0, failed: 0, errors: [] };
        }}
        entityName="Academic Years"
        acceptedFileTypes={['.csv', '.xlsx', '.xls']}
        maxFileSize={5}
      />
    </div>
  );
}