import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Plus, Download, Upload, Printer, Columns3, MoreHorizontal, RefreshCw, List, ChevronDown, ChevronRight, Bell, ChevronUp } from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  description?: string;
  badge?: React.ReactNode;
  toggle?: {
    enabled: boolean;
    onToggle: () => void;
  };
}

export interface QuickActionGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  items: QuickAction[];
  disabled?: boolean;
  className?: string;
}

export interface QuickActionsPanelProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  primaryAction?: QuickAction;
  secondaryActions?: QuickActionGroup[];
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  // New props for premium design
  variant?: 'default' | 'premium';
  lastActionTime?: string;
  onLastActionTimeChange?: (time: string) => void;
  // Card-based actions
  actionCards?: QuickAction[];
  // Header actions
  headerActions?: QuickAction[];
  // Collapsible functionality
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  // Vertical layout for sidebar
  vertical?: boolean;
}

export function QuickActionsPanel({
  title = "Quick Actions",
  subtitle = "Essential tools and shortcuts",
  icon = <Settings className="w-4 h-4 text-blue-600" />,
  primaryAction,
  secondaryActions = [],
  className = "",
  headerClassName = "",
  contentClassName = "",
  variant = "default",
  lastActionTime = "2 minutes ago",
  onLastActionTimeChange,
  actionCards = [],
  headerActions = [],
  collapsible = false,
  defaultCollapsed = false,
  onCollapseChange,
  vertical = false
}: QuickActionsPanelProps) {
  // Always default to expanded/open on mount, but allow prop override
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };
  // Premium variant with card-based layout
  if (variant === "premium") {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden mb-6 ${className}`}>
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <p className="text-blue-100 text-sm">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Header Actions */}
              {headerActions.map((action) => (
                <Button
                  key={action.id}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  disabled={action.disabled}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-all duration-200 rounded"
                  size="sm"
                >
                  {action.icon}
                  <span className="ml-2 ">{action.label}</span>
                </Button>
              ))}
              {/* Collapse Button */}
              {collapsible && (
                <Button
                  onClick={handleCollapseToggle}
                  variant="ghost"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-all duration-200 rounded"
                  aria-label={isCollapsed ? "Expand Quick Actions" : "Collapse Quick Actions"}
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className={`p-6 transition-all duration-300 ease-in-out ${isCollapsed ? 'hidden' : 'block'}`}>
          <div className={`grid gap-4 ${vertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {actionCards.map((action, index) => {
              const gradients = [
                "from-blue-50 to-purple-50 border-blue-200",
                "from-purple-50 to-pink-50 border-purple-200", 
                "from-orange-50 to-red-50 border-orange-200",
                "from-green-50 to-emerald-50 border-green-200",
                "from-cyan-50 to-teal-50 border-cyan-200",
                "from-gray-50 to-slate-50 border-gray-200"
              ];
              const colors = [
                "bg-blue-500",
                "bg-purple-500",
                "bg-orange-500", 
                "bg-green-500",
                "bg-cyan-500",
                "bg-gray-600"
              ];
              
              return (
                <div 
                  key={action.id}
                  className={`bg-gradient-to-br ${gradients[index % gradients.length]} border rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group ${
                    action.disabled || action.loading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  onClick={action.disabled || action.loading ? undefined : action.onClick}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colors[index % colors.length]}  rounded-xl flex items-center justify-center`}>
                        {action.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900">{action.label}</h4>
                        <p className="text-gray-600 text-sm">
                          {action.loading ? 'Loading...' : action.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {action.toggle && (
                        <div 
                          className={`w-10 h-6 ${action.toggle.enabled ? 'bg-blue-500' : 'bg-gray-300'} rounded-full relative cursor-pointer`}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.toggle?.onToggle();
                          }}
                        >
                          <div 
                            className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                              action.toggle.enabled ? 'left-5' : 'left-1'
                            }`}
                          />
                        </div>
                      )}
                      {action.badge}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


        </div>
      </div>
    );
  }

  // Default variant with dropdown-based layout
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm ${className}`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${headerClassName}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm">{subtitle}</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 flex-wrap ${contentClassName}`}>
          {/* Primary Action */}
          {primaryAction && (
            <Button 
              onClick={primaryAction.onClick}
              variant={primaryAction.variant || 'default'}
              disabled={primaryAction.disabled}
              className={`shadow-lg rounded-xl hover:shadow-xl transition-all duration-200 ${primaryAction.className || ''}`}
              aria-label={primaryAction.label}
            >
              {primaryAction.icon}
              <span className="ml-2">{primaryAction.label}</span>
            </Button>
          )}
          
          {/* Secondary Actions */}
          {secondaryActions.map((group) => (
            <DropdownMenu key={group.id}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={group.variant || 'outline'}
                  disabled={group.disabled}
                  className={`border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm rounded-xl ${group.className || ''}`}
                >
                  {group.icon}
                  <span className="ml-2">{group.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded">
                <DropdownMenuLabel className="font-semibold px-2 py-1.5 text-gray-700">
                  {group.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-300"/>
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className={`text-gray-600 focus:bg-blue-50 focus:text-blue-900 py-2 ${item.className || ''}`}
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specialized components for common use cases
export function DataOperationsGroup({
  onImport,
  onExport,
  onPrint,
  exportFormats = ['excel', 'csv', 'pdf'],
  onExportFormat,
  isExportExpanded = false,
  onToggleExportExpanded
}: {
  onImport?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  exportFormats?: string[];
  onExportFormat?: (format: string) => void;
  isExportExpanded?: boolean;
  onToggleExportExpanded?: () => void;
}) {
  return {
    id: 'data-operations',
    label: 'Data',
    icon: <Download className="h-4 w-4" />,
    variant: 'outline' as const,
    items: [
      ...(onImport ? [{
        id: 'import',
        label: 'Import Data',
        icon: <Upload className="h-4 w-4 mr-2 text-gray-700" strokeWidth={3} />,
        onClick: onImport
      }] : []),
      ...(onExport ? [{
        id: 'export',
        label: 'Export Data',
        icon: <Download className="h-4 w-4 mr-2 text-gray-700" strokeWidth={3} />,
        onClick: onExport
      }] : []),
      ...(onPrint ? [{
        id: 'print',
        label: 'Print Page',
        icon: <Printer className="h-4 w-4 mr-2 text-gray-700" strokeWidth={3} />,
        onClick: onPrint
      }] : [])
    ]
  };
}

export function ColumnVisibilityGroup({
  columns,
  visibleColumns,
  onColumnToggle
}: {
  columns: Array<{ accessor: string; header: string | React.ReactNode }>;
  visibleColumns: string[];
  onColumnToggle: (columnAccessor: string, checked: boolean) => void;
}) {
  return {
    id: 'column-visibility',
    label: 'Columns',
    icon: <Columns3 className="h-4 w-4" />,
    variant: 'outline' as const,
    items: columns.map((column) => ({
      id: column.accessor,
      label: typeof column.header === 'string' ? column.header : column.accessor,
      icon: (
        <Checkbox
          checked={visibleColumns.includes(column.accessor)}
          onCheckedChange={(checked: boolean) => onColumnToggle(column.accessor, checked)}
          className="text-blue-600 focus:ring-blue-500"
        />
      ),
      onClick: () => {} // Handled by checkbox
    }))
  };
}

export function MoreOptionsGroup({
  onRefresh,
  onSort,
  additionalItems = []
}: {
  onRefresh?: () => void;
  onSort?: () => void;
  additionalItems?: QuickAction[];
}) {
  return {
    id: 'more-options',
    label: 'More',
    icon: <MoreHorizontal className="h-4 w-4" />,
    variant: 'outline' as const,
    items: [
      ...(onRefresh ? [{
        id: 'refresh',
        label: 'Refresh Data',
        icon: <RefreshCw className="h-4 w-4 mr-2" strokeWidth={3} />,
        onClick: onRefresh
      }] : []),
      ...(onSort ? [{
        id: 'sort',
        label: 'Sort Options',
        icon: <List className="h-4 w-4 mr-2" strokeWidth={3} />,
        onClick: onSort
      }] : []),
      ...additionalItems
    ]
  };
}

// Predefined action cards for common use cases
export function getDefaultActionCards({
  onRefresh,
  onExport,
  onNotifications,
  onReports,
  onAttendance,
  onSettings,
  refreshEnabled = false,
  onToggleRefresh
}: {
  onRefresh?: () => void;
  onExport?: () => void;
  onNotifications?: () => void;
  onReports?: () => void;
  onAttendance?: () => void;
  onSettings?: () => void;
  refreshEnabled?: boolean;
  onToggleRefresh?: () => void;
}): QuickAction[] {
  return [
    {
      id: 'auto-refresh',
      label: 'Auto Refresh',
      description: 'Toggle live updates',
      icon: <RefreshCw className="w-5 h-5 text-white" />,
      onClick: onRefresh,
      toggle: refreshEnabled !== undefined ? {
        enabled: refreshEnabled,
        onToggle: onToggleRefresh || (() => {})
      } : undefined
    },
    {
      id: 'export-data',
      label: 'Export Data',
      description: 'Download reports',
      icon: <Download className="w-5 h-5 text-white" />,
      onClick: onExport
    },
    {
      id: 'send-notifications',
      label: 'Send Notifications',
      description: 'Alert instructors',
      icon: <Bell className="w-5 h-5 text-white" />,
      onClick: onNotifications,
      badge: <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
    },
    {
      id: 'generate-reports',
      label: 'Generate Reports',
      description: 'Custom analytics',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: onReports
    },
    {
      id: 'mark-attendance',
      label: 'Mark Attendance',
      description: 'Manual entry',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: onAttendance
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      description: 'Configure attendance',
      icon: <Settings className="w-5 h-5 text-white" />,
      onClick: onSettings
    }
  ];
}

// Example usage for departments page
export function getDepartmentsQuickActions({
  onAddDepartment,
  onRefresh,
  onExport,
  onImport,
  onPrint,
  onSort,
  onColumnToggle,
  visibleColumns,
  columns,
  lastActionTime,
  onLastActionTimeChange
}: {
  onAddDepartment: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onPrint: () => void;
  onSort: () => void;
  onColumnToggle: (columnAccessor: string, checked: boolean) => void;
  visibleColumns: string[];
  columns: Array<{ accessor: string; header: string | React.ReactNode }>;
  lastActionTime: string;
  onLastActionTimeChange?: (time: string) => void;
}) {
  return {
    // Premium variant with card-based layout
    premium: {
      variant: 'premium' as const,
      title: "Quick Actions",
      subtitle: "Essential tools and shortcuts",
      icon: (
        <div className="w-6 h-6 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
      ),
      headerActions: [
        {
          id: 'add-department',
          label: 'Add Department',
          icon: <Plus className="h-4 w-4" />,
          onClick: onAddDepartment
        }
      ],
      actionCards: getDefaultActionCards({
        onRefresh,
        onExport,
        onNotifications: () => console.log('Notifications coming soon'),
        onReports: onPrint,
        onAttendance: () => console.log('Attendance marking coming soon'),
        onSettings: onSort
      }),
      lastActionTime,
      onLastActionTimeChange
    },
    
    // Default variant with dropdown-based layout
    default: {
      variant: 'default' as const,
      title: "Quick Actions",
      subtitle: "Manage departments and data operations",
      icon: <Settings className="w-4 h-4 text-blue-600" />,
      primaryAction: {
        id: 'add-department',
        label: 'Add Department',
        icon: <Plus className="h-4 w-4" />,
        onClick: onAddDepartment
      },
      secondaryActions: [
        DataOperationsGroup({
          onImport,
          onExport,
          onPrint
        }),
        ColumnVisibilityGroup({
          columns,
          visibleColumns,
          onColumnToggle
        }),
        MoreOptionsGroup({
          onRefresh,
          onSort
        })
      ]
    }
  };
} 