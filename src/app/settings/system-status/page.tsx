"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/reusable/Skeleton";
import { Settings, Activity, Database, Wifi, AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, Server, HardDrive, Cpu, RefreshCw, Bell, Shield, Globe, Users, BarChart3, AlertCircle, Info, Search, Plus, Upload, Printer, Columns3, List, Download, Loader2, MoreHorizontal, Eye, Pencil, RotateCcw, X, Archive, Lock } from "lucide-react";
import SystemLogViewer from '@/components/SystemLogViewer';
import SystemStatusExportDialog from '@/components/SystemStatusExportDialog';
import { MQTTProvider } from '@/components/MQTTprovider';
import CacheMonitor from '@/components/CacheMonitor';
import SystemSettingsConfig from '@/components/SystemSettingsConfig';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import PageHeader from '@/components/PageHeader/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import { QuickActionsPanel } from '@/components/reusable/QuickActionsPanel';
import { EmptyState } from '@/components/reusable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: string;
  services: {
    database: { status: string; responseTime: string };
    cache: { status: string; cacheSize: number; cacheKeys: number };
    websocket: { status: string; activeConnections: number };
  };
  performance: {
    uptime: string;
    memoryUsage: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    cpuUsage: {
      user: string;
      system: string;
    };
    queryStats: {
      totalQueries: number;
      averageQueryTime: string;
      errorRate: string;
      slowQueries: number;
    };
    analytics?: {
      hourly: {
        totalQueries: number;
        averageQueryTime: string;
        successRate: string;
        slowQueryCount: number;
        errorCount: number;
      };
      daily: {
        totalQueries: number;
        averageQueryTime: string;
        successRate: string;
        slowQueryCount: number;
        errorCount: number;
      };
    };
  };
  topQueries?: Array<{
    query: string;
    count: number;
    avgDuration: string;
  }>;
  errorQueries?: Array<{
    query: string;
    error: string;
    count: number;
    lastOccurrence: string;
  }>;
  slowQueries?: Array<{
    query: string;
    avgDuration: string;
    count: number;
  }>;
  recommendations: string[];
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastCheck: string;
  description: string;
  icon: JSX.Element;
}

export default function SystemStatusPage() {
  const { user, hasPermission, isSuperAdmin, isAdmin, isDepartmentHead, isSystemAuditor } = useUser();
  const router = useRouter();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Check if user has access to system status
  const hasSystemMonitoringAccess = () => {
    if (!user) return false;
    
    // SUPER_ADMIN and ADMIN have full access
    if (isSuperAdmin || isAdmin) return true;
    
    // SYSTEM_AUDITOR has read-only access
    if (isSystemAuditor) return true;
    
    // DEPARTMENT_HEAD has limited access (basic monitoring only)
    if (isDepartmentHead) return true;
    
    // Check specific permissions
    return hasPermission('System Monitoring') || hasPermission('System Analytics');
  };

  // Redirect if no access
  useEffect(() => {
    if (user && !hasSystemMonitoringAccess()) {
      toast.error('You do not have permission to access system status');
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchSystemHealth = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      // Fetch real system health data from API
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const healthData: SystemHealth = await response.json();
      setSystemHealth(healthData);
      
      if (refresh) {
        toast.success('System status refreshed successfully');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system health data';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Set fallback data for display
      setSystemHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: 'N/A',
        services: {
          database: { status: 'unhealthy', responseTime: 'N/A' },
          cache: { status: 'unhealthy', cacheSize: 0, cacheKeys: 0 },
          websocket: { status: 'unhealthy', activeConnections: 0 }
        },
        performance: {
          uptime: 'N/A',
          memoryUsage: {
            rss: 'N/A',
            heapTotal: 'N/A',
            heapUsed: 'N/A',
            external: 'N/A'
          },
          cpuUsage: {
            user: 'N/A',
            system: 'N/A'
          },
          queryStats: {
            totalQueries: 0,
            averageQueryTime: 'N/A',
            errorRate: 'N/A',
            slowQueries: 0
          }
        },
        recommendations: ['Unable to connect to system monitoring service. Please check your connection and try again.']
      });
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSystemHealth();
        setLastRefresh(new Date());
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'unhealthy':
      case 'offline':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const services: ServiceStatus[] = [
    {
      name: 'Database',
      status: (systemHealth?.services?.database?.status === 'healthy') ? 'online' : 'offline',
      responseTime: parseInt((systemHealth?.services?.database?.responseTime || '').replace('ms', '').replace('< ', '').replace('timeout', '0') || '0'),
      lastCheck: systemHealth?.timestamp || '',
      description: 'PostgreSQL database connection',
      icon: <Database className="w-5 h-5" />
    },
    {
      name: 'Cache System',
      status: (systemHealth?.services?.cache?.status === 'healthy') ? 'online' : 'offline',
      responseTime: 5,
      lastCheck: systemHealth?.timestamp || '',
      description: 'Redis cache system',
      icon: <Zap className="w-5 h-5" />
    },
    {
      name: 'WebSocket Server',
      status: (systemHealth?.services?.websocket?.status === 'healthy') ? 'online' : 'offline',
      responseTime: 10,
      lastCheck: systemHealth?.timestamp || '',
      description: 'Real-time communication',
      icon: <Wifi className="w-5 h-5" />
    },
    {
      name: 'API Server',
      status: systemHealth?.status === 'healthy' ? 'online' : 'degraded',
      responseTime: parseInt(systemHealth?.responseTime.replace('ms', '') || '0'),
      lastCheck: systemHealth?.timestamp || '',
      description: 'REST API endpoints',
      icon: <Server className="w-5 h-5" />
    }
  ];

  const memoryUsagePercent = systemHealth && systemHealth.performance?.memoryUsage ? 
    (parseInt((systemHealth.performance.memoryUsage.heapUsed || '0').replace(' MB', '')) / 
     Math.max(1, parseInt((systemHealth.performance.memoryUsage.heapTotal || '1').replace(' MB', '')))) * 100 : 0;

  const cpuUsagePercent = systemHealth && systemHealth.performance?.cpuUsage ? 
    (parseInt((systemHealth.performance.cpuUsage.user || '0').replace('ms', '')) / 1000) : 0;

  // Filter services based on status filter
  const filteredServices = services.filter(service => 
    statusFilter === "all" || service.status === statusFilter
  );

  // Check if user can perform administrative actions
  const canPerformAdminActions = isSuperAdmin; // Only SUPER_ADMIN can perform admin actions
  
  // Check if user has read-only access
  const isReadOnly = isSystemAuditor;
  
  // Check if user has limited access (DEPARTMENT_HEAD)
  const hasLimitedAccess = isDepartmentHead;
  
  // Check if user is admin (view-only access)
  const isAdminViewOnly = isAdmin;

  // Show loading state while user data is being loaded
  if (!user) {
    return <PageSkeleton />;
  }

  // Show unauthorized access component
  if (user && !hasSystemMonitoringAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          <PageHeader
            title="System Status"
            subtitle="Monitor the health and performance of the ICCT Smart Attendance System"
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Settings", href: "/settings" },
              { label: "System Status" }
            ]}
          />
          
          <div className="flex items-center justify-center py-12">
            <EmptyState
              icon={<Lock className="w-6 h-6 text-red-400" />}
              title="Access Denied"
              description="You do not have permission to access system status. Please contact your administrator if you believe this is an error."
              action={
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                    onClick={() => router.push('/dashboard/admin')}
                  >
                    Return to Dashboard
                  </Button>
                </div>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f8fafc] p-0 overflow-x-hidden">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <PageHeader
          title="System Status"
          subtitle={
            isReadOnly 
              ? "Monitor system health (Read-Only Mode)" 
              : hasLimitedAccess 
              ? "Monitor system health (Limited Access)" 
              : isAdminViewOnly
              ? "Monitor system health (View-Only Mode)"
              : "Monitor the health and performance of the ICCT Smart Attendance System"
          }
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Settings", href: "/settings" },
            { label: "System Status" }
          ]}
        />

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <SummaryCard
            icon={<Server className="text-blue-500 w-5 h-5" />}
            label="System Status"
            value={systemHealth?.status ? systemHealth.status.toUpperCase() : 'UNKNOWN'}
            valueClassName="text-blue-900"
            sublabel="Overall system health"
          />
          <SummaryCard
            icon={<Activity className="text-blue-500 w-5 h-5" />}
            label="Response Time"
            value={systemHealth?.responseTime || 'N/A'}
            valueClassName="text-blue-900"
            sublabel="Average response time"
          />
          <SummaryCard
            icon={<Clock className="text-blue-500 w-5 h-5" />}
            label="Uptime"
            value={systemHealth?.performance?.uptime || 'N/A'}
            valueClassName="text-blue-900"
            sublabel="System uptime"
          />
          <SummaryCard
            icon={<BarChart3 className="text-blue-500 w-5 h-5" />}
            label="Total Queries"
            value={systemHealth?.performance?.queryStats?.totalQueries || 0}
            valueClassName="text-blue-900"
            sublabel="Database queries"
          />
        </div>

        {/* Quick Actions Panel */}
        <div className="w-full max-w-full pt-4">
          <QuickActionsPanel
            variant="premium"
            title="Quick Actions"
            subtitle={
              isReadOnly 
                ? "Read-only monitoring tools" 
                : isAdminViewOnly 
                ? "View-only monitoring tools" 
                : "Essential monitoring tools and shortcuts"
            }
            icon={
              <div className="w-6 h-6 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            }
            actionCards={[
              {
                id: 'refresh-status',
                label: 'Refresh Status',
                description: 'Update system status',
                icon: isRefreshing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-white" />
                ),
                onClick: () => fetchSystemHealth(true),
                disabled: isRefreshing || isReadOnly || isAdminViewOnly,
                loading: isRefreshing
              },
              {
                id: 'auto-refresh',
                label: 'Auto Refresh',
                description: autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF',
                icon: <Bell className="w-5 h-5 text-white" />,
                onClick: () => setAutoRefresh(!autoRefresh),
                disabled: isReadOnly || isAdminViewOnly
              },
              {
                id: 'export-report',
                label: 'Export Report',
                description: 'Export system report',
                icon: <Download className="w-5 h-5 text-white" />,
                onClick: () => {
                  if (canPerformAdminActions || hasLimitedAccess) {
                    setShowExportDialog(true);
                  } else {
                    toast.error('You do not have permission to export reports');
                  }
                },
                disabled: isReadOnly || isAdminViewOnly || (!canPerformAdminActions && !hasLimitedAccess)
              },
              {
                id: 'print-status',
                label: 'Print Status',
                description: 'Print system status',
                icon: <Printer className="w-5 h-5 text-white" />,
                onClick: () => window.print(),
                disabled: isReadOnly || isAdminViewOnly
              },
              {
                id: 'view-logs',
                label: 'View Logs',
                description: 'Access system logs',
                icon: <Eye className="w-5 h-5 text-white" />,
                onClick: () => {
                  if (canPerformAdminActions || isSystemAuditor) {
                    setShowLogViewer(true);
                  } else {
                    toast.error('You do not have permission to view system logs');
                  }
                },
                disabled: (!canPerformAdminActions && !isSystemAuditor) || isAdminViewOnly
              },
              {
                id: 'system-settings',
                label: 'System Settings',
                description: 'Configure monitoring',
                icon: <Settings className="w-5 h-5 text-white" />,
                onClick: () => {
                  if (canPerformAdminActions) {
                    toast.info('System settings coming soon');
                  } else {
                    toast.error('You do not have permission to configure system settings');
                  }
                },
                disabled: !canPerformAdminActions || isAdminViewOnly
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
              {/* Blue Gradient Header */}
              <div className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] p-0">
                <div className="py-4 sm:py-6">
                  <div className="flex items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">System Status Dashboard</h3>
                        <p className="text-blue-100 text-sm">Monitor the health and performance of the ICCT Smart Attendance System</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isReadOnly && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Lock className="w-3 h-3 mr-1" />
                          Read-Only Mode
                        </Badge>
                      )}
                      {hasLimitedAccess && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                          <Info className="w-3 h-3 mr-1" />
                          Limited Access
                        </Badge>
                      )}
                      {isAdminViewOnly && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                          <Lock className="w-3 h-3 mr-1" />
                          View-Only Mode
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          fetchSystemHealth(true);
                          setLastRefresh(new Date());
                          toast.success('System status refreshed');
                        }}
                        disabled={isRefreshing || isReadOnly || isAdminViewOnly}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            {/* Filter Section */}
            <div className="border-b border-gray-200 shadow-sm p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full xl:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-32 lg:w-40 xl:w-40 text-gray-700">
                      <SelectValue placeholder="Service Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="online">
                        <span className="flex items-center gap-2">
                          <span className="text-green-600"><CheckCircle className="w-4 h-4" /></span> Online
                        </span>
                      </SelectItem>
                      <SelectItem value="offline">
                        <span className="flex items-center gap-2">
                          <span className="text-red-500"><X className="w-4 h-4" /></span> Offline
                        </span>
                      </SelectItem>
                      <SelectItem value="degraded">
                        <span className="flex items-center gap-2">
                          <span className="text-yellow-500"><AlertTriangle className="w-4 h-4" /></span> Degraded
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative px-2 sm:px-3 lg:px-6 mt-3 sm:mt-4 lg:mt-6">
              <div className="overflow-x-auto bg-white/70 shadow-none relative">
                {/* Loader overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                )}
                
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-blue-600">Loading system status...</span>
                    </div>
                  </div>
                ) : !systemHealth ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <EmptyState
                      icon={<Activity className="w-6 h-6 text-blue-400" />}
                      title="No system data available"
                      description="Unable to fetch system status information. Please check your connection and try again."
                      action={
                        <div className="flex flex-col gap-2 w-full">
                          <Button
                            variant="outline"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl"
                            onClick={() => fetchSystemHealth(true)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Status */}
                    <Card className="border-blue-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-blue-900">Overall System Status</CardTitle>
                          <Badge className={getStatusColor(systemHealth.status)}>
                            {getStatusIcon(systemHealth.status)}
                            <span className="ml-2 capitalize">{systemHealth.status}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">{systemHealth.responseTime}</div>
                            <div className="text-sm text-gray-600">Response Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">{systemHealth.performance?.uptime || 'N/A'}</div>
                            <div className="text-sm text-gray-600">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">{systemHealth.performance?.queryStats?.totalQueries ?? 0}</div>
                            <div className="text-sm text-gray-600">Total Queries</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-900">{systemHealth.performance?.queryStats?.errorRate || 'N/A'}</div>
                            <div className="text-sm text-gray-600">Error Rate</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Service Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-blue-900">Service Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {filteredServices.map((service) => (
                            <div key={service.name} className="border rounded p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  {service.icon}
                                  <span className="font-medium text-gray-900">{service.name}</span>
                                </div>
                                <Badge className={getStatusColor(service.status)}>
                                  {getStatusIcon(service.status)}
                                  <span className="ml-1 capitalize">{service.status}</span>
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Response:</span>
                                  <span className="font-medium">{service.responseTime}ms</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Last Check:</span>
                                  <span className="font-medium">{new Date(service.lastCheck).toLocaleTimeString()}</span>
                                </div>
                                <div className="text-gray-500 text-xs">{service.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-900">Memory Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Heap Used</span>
                                <span>{systemHealth.performance?.memoryUsage?.heapUsed || 'N/A'}</span>
                              </div>
                              <Progress value={memoryUsagePercent} className="h-2" />
                            </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">RSS:</span>
                                <span className="ml-2 font-medium">{systemHealth.performance?.memoryUsage?.rss || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">External:</span>
                                <span className="ml-2 font-medium">{systemHealth.performance?.memoryUsage?.external || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-900">CPU Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>User Time</span>
                                <span>{systemHealth.performance?.cpuUsage?.user || 'N/A'}</span>
                              </div>
                              <Progress value={cpuUsagePercent} className="h-2" />
                            </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">System:</span>
                                <span className="ml-2 font-medium">{systemHealth.performance?.cpuUsage?.system || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Average Query:</span>
                                <span className="ml-2 font-medium">{systemHealth.performance?.queryStats?.averageQueryTime || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Analytics Data */}
                    {systemHealth?.performance?.analytics && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-900">Performance Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Last Hour</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Queries:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.hourly.totalQueries}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Average Time:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.hourly.averageQueryTime}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Success Rate:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.hourly.successRate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Slow Queries:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.hourly.slowQueryCount}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Last 24 Hours</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Queries:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.daily.totalQueries}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Average Time:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.daily.averageQueryTime}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Success Rate:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.daily.successRate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Slow Queries:</span>
                                  <span className="font-medium">{systemHealth.performance.analytics.daily.slowQueryCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Query Performance Details */}
                    {systemHealth.topQueries && systemHealth.topQueries.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-900">Top Queries</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {systemHealth.topQueries.slice(0, 5).map((query, index) => (
                              <div key={index} className="border rounded p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-sm font-medium text-gray-900">Query {index + 1}</span>
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-gray-600">Count: {query.count}</span>
                                    <span className="text-gray-600">Avg: {query.avgDuration}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                                  {query.query}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Error Queries */}
                    {systemHealth.errorQueries && systemHealth.errorQueries.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-red-900">Error Queries</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {systemHealth.errorQueries.slice(0, 3).map((query, index) => (
                              <Alert key={index} variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="space-y-1">
                                    <div className="font-medium">Error: {query.error}</div>
                                    <div className="text-xs opacity-75">Count: {query.count} | Last: {new Date(query.lastOccurrence).toLocaleString()}</div>
                                    <div className="text-xs font-mono bg-red-50 p-1 rounded">
                                      {query.query}
                                    </div>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {systemHealth.recommendations && systemHealth.recommendations.length > 0 && (
                      <Card className="mb-6 pb-6">
                        <CardHeader>
                          <CardTitle className="text-blue-900">System Recommendations</CardTitle>
                          {!canPerformAdminActions && (
                            <p className="text-sm text-gray-600 mt-2">
                              {isReadOnly 
                                ? "You have read-only access to system recommendations." 
                                : hasLimitedAccess 
                                ? "You have limited access to system recommendations." 
                                : "Contact an administrator for detailed recommendations."
                              }
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {systemHealth.recommendations.map((recommendation, index) => (
                              <Alert key={index}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{recommendation}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Access Level Information */}
                    {!canPerformAdminActions && (
                      <Card className="border-blue-200 mb-6">
                        <CardHeader>
                          <CardTitle className="text-blue-900">Access Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {isReadOnly && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  You are viewing this system in read-only mode. You can monitor system status but cannot perform administrative actions.
                                </AlertDescription>
                              </Alert>
                            )}
                            {isAdminViewOnly && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  You are viewing this system in view-only mode. You can monitor system status but cannot perform administrative actions like refreshing data, exporting reports, or accessing system logs.
                                </AlertDescription>
                              </Alert>
                            )}
                            {hasLimitedAccess && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  You have limited access to system monitoring. Some features may be restricted based on your role permissions.
                                </AlertDescription>
                              </Alert>
                            )}
                            {!isReadOnly && !hasLimitedAccess && !isAdminViewOnly && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                  You have basic access to system monitoring. Contact an administrator for additional permissions.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* WebSocket Monitoring */}
        {canPerformAdminActions && (
          <div className="mt-6">
            <MQTTProvider>
              <div>MQTT Provider Component</div>
            </MQTTProvider>
          </div>
        )}

        {/* Cache Monitoring */}
        {canPerformAdminActions && (
          <div className="mt-6">
            <CacheMonitor />
          </div>
        )}

        {/* System Settings Configuration */}
        {isSuperAdmin && (
          <div className="mt-6">
            <SystemSettingsConfig />
          </div>
        )}

        {/* Performance Monitoring */}
        {canPerformAdminActions && (
          <div className="mt-6">
            <PerformanceMonitor />
          </div>
        )}


        {/* Log Viewer Dialog */}
        <SystemLogViewer
          open={showLogViewer}
          onOpenChange={setShowLogViewer}
          logType="system"
        />

        {/* Export Dialog */}
        <SystemStatusExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          systemHealth={systemHealth}
        />
      </div>
    </div>
  );
} 