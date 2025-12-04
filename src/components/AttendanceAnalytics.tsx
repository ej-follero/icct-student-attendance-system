'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  BarChart3, 
  Users, 
  Activity, 
  AlertTriangle, 
  Download, 
  Eye, 
  EyeOff,
  Maximize2, 
  Minimize2, 
  Info, 
  Settings, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Calendar,
  Clock,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Building,
  Target,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  MoreVertical,
  Share2,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ReferenceLine
} from 'recharts';
import { AnalyticsHeader, AnalyticsFilters, QuickStats, ChartCard, DrillDownBreadcrumbs, TimeRangeSelector } from './analytics';
import { 
  processRealTimeData, 
  calculateAttendanceRate, 
  getRiskLevelColor, 
  getTrendIcon, 
  calculateWeeklyAttendanceData, 
  validateAttendanceData, 
  type AttendanceData, 
  type AnalyticsData,
  type WeeklyData,
  type DataValidationResult,
  type RiskLevelData
} from '@/lib/analytics-utils';
import { ExportService } from '@/lib/services/export.service';
import { Toast } from '@/components/ui/toast';

// Enhanced TypeScript interfaces for advanced interactivity
interface DrillDownState {
  isActive: boolean;
  level: 'department' | 'class' | 'session';
  data: any;
  breadcrumbs: string[];
  filters: Record<string, any>;
}



interface TimeRange {
  start: Date;
  end: Date;
  preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface AdvancedInteractivityProps {
  drillDown: DrillDownState;
  timeRange: TimeRange;
  onDrillDown: (level: string, data: any) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onResetFilters: () => void;
}

// Enhanced data interfaces - imported from analytics-utils

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  stage: 'fetching' | 'processing' | 'validating' | 'rendering';
}

interface AttendanceAnalyticsProps {
  data: AttendanceData[];
  loading?: boolean;
  type: 'student';
  onDrillDown?: (filter: { type: string; value: string }) => void;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  onRefresh?: () => void;
  enableAdvancedFeatures?: boolean;
  enableRealTime?: boolean;

  enableDrillDown?: boolean;
  enableTimeRange?: boolean;
  showHeader?: boolean;
  showSecondaryFilters?: boolean;
  selectedSubject?: string;
  onSubjectChange?: (value: string) => void;
  subjects?: Array<{ id: string; name: string }>;
  // Callback to bubble up filter snapshot for table sync
  onFiltersChange?: (filters: {
    departmentId?: string;
    courseId?: string;
    sectionId?: string;
    yearLevel?: string;
    subjectId?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  // Clear analytics filters callback
  onClearAnalytics?: () => void;
  // Apply filters callback - called when Apply button is clicked
  onApplyFilters?: () => void;
}

// Utility functions imported from analytics-utils





// Utility functions imported from analytics-utils

// Calculate trend indicators based on data
const calculateTrends = (data: AttendanceData[], type: 'student') => {
  if (!data || data.length === 0) {
    return {
      totalCount: { change: 0, direction: 'neutral' },
      attendanceRate: { change: 0, direction: 'neutral' },
      departments: { change: 0, direction: 'neutral' },
      highRisk: { change: 0, direction: 'neutral' }
    };
  }

  // Calculate current period metrics from the data
  const currentTotal = data.length;
  const currentPresent = data.reduce((sum, item) => sum + item.attendedClasses, 0);
  const currentLate = data.reduce((sum, item) => sum + item.lateClasses, 0);
  const currentAbsent = data.reduce((sum, item) => sum + item.absentClasses, 0);
  const currentTotalClasses = data.reduce((sum, item) => sum + item.totalClasses, 0);
  const currentAttendanceRate = currentTotalClasses > 0 ? (currentPresent / currentTotalClasses) * 100 : 0;

  // Calculate department changes (count unique departments)
  const currentDepartments = new Set(data.map(item => item.department)).size;

  // Calculate high risk changes (count high risk individuals)
  const currentHighRisk = data.filter(item => item.riskLevel === 'high').length;

  // For demo purposes, simulate previous period data
  // In a real implementation, you would compare with historical data
  const previousTotal = Math.max(1, Math.floor(currentTotal * 0.95)); // Simulate 5% change
  const previousAttendanceRate = currentAttendanceRate * 0.98; // Simulate 2% change
  const previousDepartments = Math.max(1, currentDepartments - 1); // Simulate department change
  const previousHighRisk = Math.max(0, currentHighRisk - 1); // Simulate risk change

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalCountChange = calculateChange(currentTotal, previousTotal);
  const attendanceRateChange = currentAttendanceRate - previousAttendanceRate;
  const departmentsChange = calculateChange(currentDepartments, previousDepartments);
  const highRiskChange = calculateChange(currentHighRisk, previousHighRisk);

  return {
    totalCount: {
      change: Math.abs(totalCountChange),
      direction: totalCountChange > 0 ? 'up' : totalCountChange < 0 ? 'down' : 'neutral'
    },
    attendanceRate: {
      change: Math.abs(attendanceRateChange),
      direction: attendanceRateChange > 0 ? 'up' : attendanceRateChange < 0 ? 'down' : 'neutral'
    },
    departments: {
      change: Math.abs(departmentsChange),
      direction: departmentsChange > 0 ? 'up' : departmentsChange < 0 ? 'down' : 'neutral'
    },
    highRisk: {
      change: Math.abs(highRiskChange),
      direction: highRiskChange > 0 ? 'up' : highRiskChange < 0 ? 'down' : 'neutral'
    }
  };
};

// Attendance Distribution Component (for Modal)
export const AttendanceDistribution = ({
  totalPresent,
  totalLate,
  totalAbsent
}: {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}) => {
  const total = totalPresent + totalLate + totalAbsent;
  const presentPercentage = (totalPresent / total) * 100;
  const latePercentage = (totalLate / total) * 100;
  const absentPercentage = (totalAbsent / total) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700 mb-1">{totalPresent}</div>
          <div className="text-sm text-blue-600 font-medium">Present</div>
          <div className="text-xs text-blue-500 mt-1">{presentPercentage.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-700 mb-1">{totalLate}</div>
          <div className="text-sm text-cyan-600 font-medium">Late</div>
          <div className="text-xs text-cyan-500 mt-1">{latePercentage.toFixed(1)}%</div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-700 mb-1">{totalAbsent}</div>
          <div className="text-sm text-gray-600 font-medium">Absent</div>
          <div className="text-xs text-gray-500 mt-1">{absentPercentage.toFixed(1)}%</div>
        </div>
      </div>

      {/* Enhanced Progress Bars */}
      <div className="space-y-5">
        <div className="group">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e40af' }}></div>
              <span className="text-sm font-semibold text-gray-900">Present</span>
            </div>
            <span className="text-sm font-medium text-gray-600">{presentPercentage.toFixed(1)}% ({totalPresent})</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 flex items-center overflow-hidden group-hover:bg-gray-200 transition-colors" aria-label={`Present: ${presentPercentage.toFixed(1)}% (${totalPresent})`}>
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${presentPercentage}%`, backgroundColor: '#1e40af' }}
            />
          </div>
        </div>
        
        <div className="group">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0ea5e9' }}></div>
              <span className="text-sm font-semibold text-gray-900">Late</span>
            </div>
            <span className="text-sm font-medium text-gray-600">{latePercentage.toFixed(1)}% ({totalLate})</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 flex items-center overflow-hidden group-hover:bg-gray-200 transition-colors" aria-label={`Late: ${latePercentage.toFixed(1)}% (${totalLate})`}>
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${latePercentage}%`, backgroundColor: '#0ea5e9' }}
            />
          </div>
        </div>
        
        <div className="group">
          <div className="flex justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9ca3af' }}></div>
              <span className="text-sm font-semibold text-gray-900">Absent</span>
            </div>
            <span className="text-sm font-medium text-gray-600">{absentPercentage.toFixed(1)}% ({totalAbsent})</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 flex items-center overflow-hidden group-hover:bg-gray-200 transition-colors" aria-label={`Absent: ${absentPercentage.toFixed(1)}% (${totalAbsent})`}>
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${absentPercentage}%`, backgroundColor: '#9ca3af' }}
            />
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-blue-900">Total Records</span>
          </div>
          <span className="text-lg font-bold text-blue-700">{total}</span>
        </div>
      </div>
    </div>
  );
};

// Attendance Distribution Modal Component
export const AttendanceDistributionModal = ({
  totalPresent,
  totalLate,
  totalAbsent,
  type
}: {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  type: 'student';
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
          <Eye className="w-4 h-4" />
          View Detailed Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">Detailed Attendance Breakdown</div>
              <div className="text-sm text-gray-600">Comprehensive analysis for students</div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <AttendanceDistribution
            totalPresent={totalPresent}
            totalLate={totalLate}
            totalAbsent={totalAbsent}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fullscreen Attendance Distribution Modal
export const FullscreenAttendanceDistributionModal = ({
  totalPresent,
  totalLate,
  totalAbsent,
  type,
  trigger,
  onExport,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true,
  loading = false,
  appliedFilters
}: {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
  loading?: boolean;
  appliedFilters?: {
    department?: string;
    course?: string;
    section?: string;
    yearLevel?: string;
    subject?: string;
    timeRange?: any;
  };
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">Attendance Distribution</div>
                <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                  Complete analysis with chart and detailed breakdown for students
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Section */}
            <div className="space-y-4 h-full">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Visual Overview</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 pb-8 h-full min-h-[400px] flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div data-chart="attendance-distribution" className="w-full h-full">
                  <AttendanceDistributionChart
                    totalPresent={totalPresent}
                    totalLate={totalLate}
                    totalAbsent={totalAbsent}
                  />
                </div>
              </div>
            </div>
            
            {/* Detailed Breakdown Section */}
            <div className="space-y-4 h-full">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Detailed Breakdown</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 pb-8 h-full min-h-[400px] flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <AttendanceDistribution
                  totalPresent={totalPresent}
                  totalLate={totalLate}
                  totalAbsent={totalAbsent}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="attendance-distribution"
            chartData={[{ totalPresent, totalLate, totalAbsent }]}
            appliedFilters={appliedFilters}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fullscreen Weekly Trend Modal
export const FullscreenWeeklyTrendModal = ({
  weeklyData,
  type,
  trigger,
  onExport,
  getXAxisConfig,
  showComparison = false,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  weeklyData: any[];
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  getXAxisConfig?: () => any;
  showComparison?: boolean;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);
    return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  Attendance Trend Analysis
                  {showComparison && (
                    <span className="ml-3 inline-flex items-center gap-1 text-sm bg-white/20 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                      <TrendingUp className="w-3 h-3" />
                      Comparison enabled
                    </span>
                  )}
                </div>
                <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                  Complete trend analysis for students
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Trend Visualization</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="h-96">
                  {weeklyData.length === 0 ? (
                    <NoDataState selectedSubject={localSelectedSubject} type={type} subjects={subjects} />
                  ) : (
                    <div data-chart="weekly-trend" className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey={weeklyData.length > 0 ? Object.keys(weeklyData[0]).find(key => key !== 'attendanceRate' && key !== 'label') || 'week' : 'week'}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => {
                          // Use the same tick formatter logic as main widget
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(value);
                            }
                          }
                          return value;
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => {
                          // Use the same label formatter logic as main widget
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                          }
                          return label;
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          if (showComparison && props.payload.previousAttendanceRate !== undefined) {
                            const current = props.payload.attendanceRate;
                            const previous = props.payload.previousAttendanceRate;
                            const change = current - previous;
                            const changePercent = ((change / previous) * 100).toFixed(1);
                            const changeText = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;
                            
                            return [
                              [
                                `${value}% (Current)`,
                                `${previous}% (Previous)`,
                                `${changeText} change`
                              ],
                              [name, 'Previous Period', 'Change']
                            ];
                          }
                          return [`${value}%`, name];
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendanceRate" 
                        stroke="#1e40af" 
                        strokeWidth={3}
                        dot={{ fill: '#1e40af', strokeWidth: 2, r: 5, stroke: 'white' }}
                        activeDot={{ r: 7, stroke: '#1e40af', strokeWidth: 3, fill: '#1e40af' }}
                        name="Current Period"
                      />
                      {showComparison && (
                        <Line 
                          type="monotone" 
                          dataKey="previousAttendanceRate" 
                          stroke="#6b7280" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: '#6b7280', strokeWidth: 2, r: 4, stroke: 'white' }}
                          activeDot={{ r: 6, stroke: '#6b7280', strokeWidth: 2, fill: '#6b7280' }}
                          name="Previous Period"
                        />
                      )}
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        iconType="line"
                        wrapperStyle={{ paddingBottom: '10px' }}
                      />
                    </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Detailed Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                  <h3 className="text-lg font-bold text-blue-900">Trend Analysis</h3>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded p-4">
                      <div className="text-2xl font-bold text-blue-700">
                        {weeklyData.length > 0 ? weeklyData[weeklyData.length - 1]?.attendanceRate?.toFixed(1) : '0'}%
                      </div>
                      <div className="text-sm text-blue-600">Current Week</div>
                    </div>
                    <div className="bg-green-50 rounded p-4">
                      <div className="text-2xl font-bold text-green-700">
                        {weeklyData.length > 0 ? (weeklyData.reduce((sum, week) => sum + week.attendanceRate, 0) / weeklyData.length).toFixed(1) : '0'}%
                      </div>
                      <div className="text-sm text-green-600">Average</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Detailed Breakdown
                      {showComparison && <span className="text-sm font-normal text-gray-500 ml-2">(with comparison)</span>}
                    </h4>
                    {weeklyData.map((item, index) => {
                      const label = item.label || item.week || item.day || item.hour || item.month || item.date || `Item ${index + 1}`;
                      // Add null checks and default values
                      const attendanceRate = item.attendanceRate ?? 0;
                      const previousAttendanceRate = item.previousAttendanceRate ?? 0;
                      const hasComparison = showComparison && item.previousAttendanceRate !== undefined && item.previousAttendanceRate !== null;
                      const change = hasComparison ? attendanceRate - previousAttendanceRate : 0;
                      const changePercent = hasComparison && previousAttendanceRate > 0 ? ((change / previousAttendanceRate) * 100).toFixed(1) : null;
                      
                      return (
                        <div key={index} className={`p-3 rounded ${hasComparison ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{label}</span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-gray-900">{attendanceRate.toFixed(1)}%</span>
                              {hasComparison && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">vs {previousAttendanceRate.toFixed(1)}%</span>
                                  <span className={`font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change >= 0 ? '+' : ''}{changePercent}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="weekly-trend"
            chartData={weeklyData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fullscreen Late Arrival Modal


export const FullscreenLateArrivalModal = ({
  lateData,
  type,
  trigger,
  onExport,
  getXAxisConfig,
  showComparison = false,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  lateData: any[];
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  getXAxisConfig?: () => any;
  showComparison?: boolean;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  Late Arrival Trends
                  {showComparison && (
                    <span className="ml-3 inline-flex items-center gap-1 text-sm bg-white/20 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                      <TrendingUp className="w-3 h-3" />
                      Comparison enabled
                    </span>
                  )}
                </div>
                <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                  Late arrival trend analysis for students
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Late Arrival Visualization</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="h-96">
                  {lateData.length === 0 ? (
                    <NoDataState selectedSubject={localSelectedSubject} type={type} subjects={subjects} />
                  ) : (
                    <div data-chart="late-arrival-trend" className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lateData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey={lateData.length > 0 ? Object.keys(lateData[0]).find(key => key !== 'lateRate' && key !== 'label' && key !== 'previousLateRate') || 'week' : 'week'}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => {
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(value);
                            }
                          }
                          return value;
                        }}
                      />
                      <YAxis 
                        domain={[0, 25]}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => {
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                          }
                          return label;
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          if (showComparison && props.payload.previousLateRate !== undefined) {
                            const current = props.payload.lateRate;
                            const previous = props.payload.previousLateRate;
                            const change = current - previous;
                            const changePercent = ((change / previous) * 100).toFixed(1);
                            const changeText = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;
                            
                            return [
                              [
                                `${value}% (Current)`,
                                `${previous}% (Previous)`,
                                `${changeText} change`
                              ],
                              [name, 'Previous Period', 'Change']
                            ];
                          }
                          return [`${value}%`, name];
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lateRate" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 5, stroke: 'white' }}
                        activeDot={{ r: 7, stroke: '#ef4444', strokeWidth: 3, fill: '#ef4444' }}
                        name="Current Period"
                      />
                      {showComparison && (
                        <Line 
                          type="monotone" 
                          dataKey="previousLateRate" 
                          stroke="#94a3b8" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: '#94a3b8', strokeWidth: 2, r: 4, stroke: 'white' }}
                          activeDot={{ r: 6, stroke: '#94a3b8', strokeWidth: 2, fill: '#94a3b8' }}
                          name="Previous Period"
                        />
                      )}
                      <Legend 
                        verticalAlign="top" 
                        height={36}
                        iconType="line"
                        wrapperStyle={{ paddingBottom: '10px' }}
                      />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Detailed Analysis Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                  <h3 className="text-lg font-bold text-blue-900">Late Arrival Analysis</h3>
                </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded p-4">
                      <div className="text-2xl font-bold text-red-700">
                        {lateData.length > 0 ? lateData[lateData.length - 1]?.lateRate?.toFixed(1) : '0'}%
                      </div>
                      <div className="text-sm text-red-600">Current Period</div>
                    </div>
                    <div className="bg-orange-50 rounded p-4">
                      <div className="text-2xl font-bold text-orange-700">
                        {lateData.length > 0 ? (lateData.reduce((sum, item) => sum + item.lateRate, 0) / lateData.length).toFixed(1) : '0'}%
                      </div>
                      <div className="text-sm text-orange-600">Average</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-blue-900">
                      Detailed Breakdown
                      {showComparison && <span className="text-sm font-normal text-gray-500 ml-2">(with comparison)</span>}
                    </h4>
                    {lateData.map((item, index) => {
                      const label = item.label || item.week || item.day || item.hour || item.month || item.date || `Item ${index + 1}`;
                      // Add null checks and default values
                      const lateRate = item.lateRate ?? 0;
                      const previousLateRate = item.previousLateRate ?? 0;
                      const hasComparison = showComparison && item.previousLateRate !== undefined && item.previousLateRate !== null;
                      const change = hasComparison ? lateRate - previousLateRate : 0;
                      const changePercent = hasComparison && previousLateRate > 0 ? ((change / previousLateRate) * 100).toFixed(1) : null;
                      
                      return (
                        <div key={index} className={`p-3 rounded ${hasComparison ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{label}</span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-gray-900">{lateRate.toFixed(1)}%</span>
                              {hasComparison && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">vs {previousLateRate.toFixed(1)}%</span>
                                  <span className={`font-medium ${change <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change <= 0 ? '' : '+'}{changePercent}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="late-arrival-trend"
            chartData={lateData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fullscreen Risk Distribution Modal
export const FullscreenRiskDistributionModal = ({
  riskLevelData,
  type,
  trigger,
  onExport,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  riskLevelData: any[];
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Risk Level Distribution - Full View</div>
                <div className="text-sm text-gray-600">Complete risk analysis for students</div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="py-6">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <SecondaryFilters
              selectedSubject={selectedSubject}
              onSubjectChange={onSubjectChange || (() => {})}
              subjects={subjects}
            />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Risk Visualization</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="h-96">
                  <div data-chart="risk-level-distribution" className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie
                        data={riskLevelData}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="count"
                        label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                      >
                        {riskLevelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '10px' }}
                      />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detailed Analysis Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Risk Analysis</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded p-4">
                      <div className="text-2xl font-bold text-red-700">
                        {riskLevelData.find(r => r.level === 'high')?.count || 0}
                      </div>
                      <div className="text-sm text-red-600">High Risk</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-4">
                      <div className="text-2xl font-bold text-yellow-700">
                        {riskLevelData.find(r => r.level === 'medium')?.count || 0}
                      </div>
                      <div className="text-sm text-yellow-600">Medium Risk</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Risk Level Breakdown</h4>
                    {riskLevelData.map((risk, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: risk.color }}
                          ></div>
                          <span className="font-medium text-gray-700 capitalize">{risk.level} Risk</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{risk.count}</div>
                          <div className="text-sm text-gray-600">
                            {((risk.count / riskLevelData.reduce((sum, r) => sum + r.count, 0)) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="risk-level-distribution"
            chartData={riskLevelData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fullscreen Department Performance Modal
export const FullscreenDepartmentPerformanceModal = ({
  departmentStats,
  type,
  trigger,
  onExport,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  departmentStats: any[];
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  Department Performance
                </div>
                  <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">Complete department analysis for students</div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Performance Visualization</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="h-96">
                  <div data-chart="department-performance" className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="code" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: any) => [
                          `${value.toFixed(1)}%`, 
                          name === 'attendanceRate' ? 'Attendance Rate' : name
                        ]}
                      />
                      <Bar 
                        dataKey="attendanceRate" 
                        fill="#1e40af"
                        radius={[4, 4, 0, 0]}
                        name="Attendance Rate"
                      />
                      <ReferenceLine 
                        y={85} 
                        stroke="#0ea5e9" 
                        strokeDasharray="5 5" 
                        strokeWidth={2}
                        label={{ 
                          value: "Target 85%", 
                          position: "insideTopRight",
                          fill: "#0ea5e9",
                          fontSize: 12,
                          fontWeight: "bold"
                        }}
                      />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Detailed Analysis Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Department Analysis</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded p-4">
                      <div className="text-2xl font-bold text-blue-700">
                        {departmentStats.length}
                      </div>
                      <div className="text-sm text-blue-600">Total Departments</div>
                    </div>
                    <div className="bg-cyan-50 rounded p-4">
                      <div className="text-2xl font-bold text-cyan-700">
                        {departmentStats.length > 0 ? (departmentStats.reduce((sum, dept) => sum + dept.attendanceRate, 0) / departmentStats.length).toFixed(1) : '0'}%
                      </div>
                      <div className="text-sm text-cyan-600">Average Rate</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Department Breakdown</h4>
                    {departmentStats.map((dept, index) => {
                      const attendanceRate = dept.attendanceRate ?? 0;
                      const count = dept.count ?? 0;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="font-medium text-gray-700">{dept.name}</span>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{attendanceRate.toFixed(1)}%</div>
                            <div className="text-sm text-gray-600">{count} students</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="department-performance"
            chartData={departmentStats}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Attendance Distribution Graph (Pie Chart)
export const AttendanceDistributionChart = ({
  totalPresent,
  totalLate,
  totalAbsent
}: {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}) => {
  console.log('📊 AttendanceDistributionChart data:', { totalPresent, totalLate, totalAbsent });
  console.log('📊 AttendanceDistributionChart - Using summary data from API');
  console.log('📊 AttendanceDistributionChart - This data reflects all applied filters (department, course, section, year level, time range)');
  
  const chartData = [
    { name: 'Present', value: totalPresent, color: '#1e40af', icon: '✓' },
    { name: 'Late', value: totalLate, color: '#0ea5e9', icon: '⏰' },
    { name: 'Absent', value: totalAbsent, color: '#9ca3af', icon: '✗' }
  ];

  const total = totalPresent + totalLate + totalAbsent;
  const attendanceRate = total === 0 ? 0 : (totalPresent / total) * 100;
  
  console.log('📈 Chart data:', chartData);
  console.log('📊 Total:', total, 'Attendance rate:', attendanceRate);

  // If no data, show a message instead of blank chart
  if (total === 0) {
    return (
      <div className="w-full h-[280px] flex items-center justify-center bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <div className="text-gray-600 font-medium">No attendance data available</div>
          <div className="text-gray-500 text-sm">Please check your data source</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={70}
              dataKey="value"
              label={({ name, percent, value }) => 
                Number(percent) > 0.05 ? `${name} ${(Number(percent) * 100).toFixed(0)}%` : ''
              }
              labelLine={{ stroke: '#6b7280', strokeWidth: 1.5 }}
              paddingAngle={2}
              aria-label="Attendance distribution pie chart showing present, late, and absent percentages"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`attendance-cell-${index}`} 
                  fill={entry.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                padding: '12px 16px'
              }}
              formatter={(value: any, name: any) => [
                <div key={`tooltip-${name}`} className="flex items-center gap-2">
                  <span className="text-lg">{chartData.find(d => d.name === name)?.icon}</span>
                  <span className="font-semibold">{value}</span>
                </div>, 
                name
              ]}
              labelFormatter={(name) => name}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center metric */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">{attendanceRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600 font-medium">Attendance Rate</div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6">
        <div className="flex items-center justify-center gap-8">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-sm" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {item.name} ({item.value.toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

// Department Trends Chart Component
export const DepartmentTrendsChart = ({ data }: { data: { name: string; avgAttendance: number; count: number }[] }) => (
  <div className="my-6">
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis domain={[0, 100]} fontSize={12} tickFormatter={v => `${v}%`} />
        <RechartsTooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Avg Attendance']} />
        <Bar dataKey="avgAttendance" fill="#3b82f6" name="Avg Attendance" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Enhanced Loading and Error Components
const AnalyticsLoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Analytics</h3>
      <p className="text-sm text-gray-600">Processing student attendance data...</p>
    </div>
  </div>
);

// Individual Chart No Data Component
const ChartNoData = ({ 
  title, 
  description, 
  icon: Icon, 
  iconColor = "text-gray-400",
  bgColor = "bg-gray-50",
  chartType = "general"
}: {
  title: string;
  description: string;
  icon: any;
  iconColor?: string;
  bgColor?: string;
  chartType?: string;
}) => (
  <div className={`${bgColor} rounded border-2 border-dashed border-gray-200 p-8 text-center`}>
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className={`w-6 h-6 ${iconColor}`} />
    </div>
    <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
);


// Enhanced placeholder components for different chart types
const AttendanceTrendNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Attendance Data"
    description={`No attendance records found for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}. Try selecting a different time period.`}
    icon={TrendingUp}
    iconColor="text-blue-400"
    bgColor="bg-blue-50"
    chartType="attendance-trend"
  />
);

const LateArrivalNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Late Arrival Data"
    description={`No late arrival records found for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}. All students arrived on time!`}
    icon={Clock}
    iconColor="text-orange-400"
    bgColor="bg-orange-50"
    chartType="late-arrival"
  />
);

const RiskLevelNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Risk Assessment Data"
    description={`No attendance risk data available for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}.`}
    icon={AlertTriangle}
    iconColor="text-red-400"
    bgColor="bg-red-50"
    chartType="risk-level"
  />
);

const StreakAnalysisNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Streak Data"
    description={`No attendance streak data available for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}.`}
    icon={Target}
    iconColor="text-green-400"
    bgColor="bg-green-50"
    chartType="streak-analysis"
  />
);

const DepartmentPerformanceNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Department Data"
    description={`No department performance data available for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}.`}
    icon={Building}
    iconColor="text-purple-400"
    bgColor="bg-purple-50"
    chartType="department-performance"
  />
);

const PatternAnalysisNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Pattern Data"
    description={`No attendance pattern data available for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}.`}
    icon={BarChart3}
    iconColor="text-indigo-400"
    bgColor="bg-indigo-50"
    chartType="pattern-analysis"
  />
);

const AttendanceDistributionNoData = ({ timeRange }: { timeRange: string }) => (
  <ChartNoData
    title="No Attendance Data"
    description={`No attendance records found for ${timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : 'this year'}. Try selecting a different time period.`}
    icon={Users}
    iconColor="text-blue-400"
    bgColor="bg-blue-50"
    chartType="attendance-distribution"
  />
);

// Secondary Filter Component for Drill-Down
const SecondaryFilters = ({
  selectedSubject,
  onSubjectChange,
  subjects = []
}: {
  selectedSubject: string;
  onSubjectChange: (value: string) => void;
  subjects?: Array<{ id: string; name: string }>;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-wrap gap-3 mb-4 mt-4 justify-end items-center">
      <Select value={selectedSubject} onValueChange={onSubjectChange}>
        <SelectTrigger className="w-48 h-8 text-sm text-gray-500 rounded">
          <SelectValue placeholder="All Subjects">
            {selectedSubject === 'all' ? (
              <div className="truncate">All Subjects</div>
            ) : (
              <div className="truncate" title={subjects.find(s => s.id === selectedSubject)?.name || selectedSubject}>
                {subjects.find(s => s.id === selectedSubject)?.name || selectedSubject}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-48 max-h-60 rounded" position="popper" side="bottom" align="end" sideOffset={4}>
          <div className="p-2 border-b border-gray-200">
                          <input
                type="text"
                placeholder="Search subject codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
          </div>
          <div className="max-h-40 overflow-y-auto">
            <SelectItem value="all" className="text-sm">All Subjects</SelectItem>
            {filteredSubjects.map(subject => (
              <SelectItem key={subject.id} value={subject.id} className="text-sm">
                <div className="truncate" title={subject.name}>
                  {subject.name}
                </div>
              </SelectItem>
            ))}
            {filteredSubjects.length === 0 && searchQuery && (
              <div className="px-2 py-1 text-sm text-gray-500">
                No subjects found
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};

// Reusable Download Dropdown Component with modal-specific export
const DownloadDropdown = ({ 
  onExport, 
  modalType, 
  chartData,
  appliedFilters
}: { 
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  modalType?: string;
  chartData?: any;
  appliedFilters?: {
    department?: string;
    course?: string;
    section?: string;
    yearLevel?: string;
    subject?: string;
    timeRange?: any;
  };
}) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleModalExport = async (format: 'pdf' | 'csv' | 'excel' = 'pdf') => {
    setIsExporting(true);
    try {
      console.log(`🎯 Modal export triggered for ${modalType} with format ${format}`);
      
      // Wait for modal to be fully rendered and visible
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture the entire modal content (both Visual Overview and Detailed Breakdown)
      const modalContent = document.querySelector('[role="dialog"] .grid') as HTMLElement;
      let chartImages: Record<string, string> = {};
      
      if (modalContent) {
        try {
          console.log('📸 Capturing modal content with html2canvas...');
          const canvas = await html2canvas(modalContent, {
            background: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: modalContent.offsetWidth,
            height: modalContent.offsetHeight
          });
          
          const imageDataUrl = canvas.toDataURL('image/png', 1.0);
          chartImages['Modal Content'] = imageDataUrl;
          console.log('✅ Modal content captured successfully');
          console.log(`📸 Captured dimensions: ${canvas.width}x${canvas.height}`);
          console.log(`📸 Modal element dimensions: ${modalContent.offsetWidth}x${modalContent.offsetHeight}`);
        } catch (captureError) {
          console.warn('Failed to capture modal content:', captureError);
        }
      }
      
      // Special handling for streak-analysis modal: capture chart and breakdown separately
      if (modalType === 'streak-analysis') {
        console.log('📸 Capturing Streak Analysis chart and breakdown...');
        
        // Capture the chart
        const chartElement = document.querySelector('[data-chart="streak-analysis"]') as HTMLElement;
        if (chartElement) {
          try {
            // Find the parent container that includes the title
            const chartContainer = chartElement.closest('.bg-white.border') as HTMLElement;
            if (chartContainer) {
              const canvas = await html2canvas(chartContainer, {
                background: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: chartContainer.offsetWidth,
                height: chartContainer.offsetHeight
              });
              chartImages['Streak Timeline Chart'] = canvas.toDataURL('image/png', 1.0);
              console.log('✅ Captured Streak Timeline Chart');
            }
          } catch (error) {
            console.warn('Failed to capture streak chart:', error);
          }
        }
        
        // Capture the period breakdown
        const breakdownElement = document.querySelector('[data-breakdown="streak-analysis"]') as HTMLElement;
        if (breakdownElement) {
          try {
            // Find the scrollable content area - look for div with overflow-y-auto
            let scrollableContent: HTMLElement | null = null;
            const children = breakdownElement.children;
            for (let i = 0; i < children.length; i++) {
              const child = children[i] as HTMLElement;
              const computedStyle = window.getComputedStyle(child);
              if (computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
                scrollableContent = child;
                break;
              }
            }
            
            if (scrollableContent) {
              // Temporarily remove height restrictions to capture full content
              const originalMaxHeight = scrollableContent.style.maxHeight;
              const originalOverflow = scrollableContent.style.overflow;
              const originalOverflowY = scrollableContent.style.overflowY;
              const originalHeight = scrollableContent.style.height;
              
              // Get computed max-height to restore later
              const computedMaxHeight = window.getComputedStyle(scrollableContent).maxHeight;
              
              // Set to auto to capture full content
              scrollableContent.style.maxHeight = 'none';
              scrollableContent.style.overflow = 'visible';
              scrollableContent.style.overflowY = 'visible';
              scrollableContent.style.height = 'auto';
              
              // Wait for layout to update
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Capture the full breakdown element (now expanded to full height)
              const canvas = await html2canvas(breakdownElement, {
                background: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
              });
              
              // Restore original styles
              scrollableContent.style.maxHeight = originalMaxHeight || computedMaxHeight;
              scrollableContent.style.overflow = originalOverflow;
              scrollableContent.style.overflowY = originalOverflowY;
              scrollableContent.style.height = originalHeight;
              
              chartImages['Period Breakdown'] = canvas.toDataURL('image/png', 1.0);
              console.log('✅ Captured Period Breakdown (full content)', {
                width: canvas.width,
                height: canvas.height,
                scrollWidth: breakdownElement.scrollWidth,
                scrollHeight: breakdownElement.scrollHeight
              });
            } else {
              // Fallback: capture without finding scrollable content
              const canvas = await html2canvas(breakdownElement, {
                background: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
              });
              chartImages['Period Breakdown'] = canvas.toDataURL('image/png', 1.0);
              console.log('✅ Captured Period Breakdown (fallback)', {
                width: canvas.width,
                height: canvas.height
              });
            }
          } catch (error) {
            console.warn('Failed to capture period breakdown:', error);
          }
        }
      }

      // Also capture individual chart elements as fallback
      const modalChartElements = {
        attendanceDistribution: document.querySelector('[data-chart="attendance-distribution"]') as HTMLElement,
        weeklyTrend: document.querySelector('[data-chart="weekly-trend"]') as HTMLElement,
        lateArrivalTrend: document.querySelector('[data-chart="late-arrival-trend"]') as HTMLElement,
        riskLevelDistribution: document.querySelector('[data-chart="risk-level-distribution"]') as HTMLElement,
        departmentPerformance: document.querySelector('[data-chart="department-performance"]') as HTMLElement,
        patternAnalysis: document.querySelector('[data-chart="pattern-analysis"]') as HTMLElement,
        streakAnalysis: document.querySelector('[data-chart="streak-analysis"]') as HTMLElement
      };

      // Capture individual charts if modal content capture failed and not streak-analysis
      if (Object.keys(chartImages).length === 0 && modalType !== 'streak-analysis') {
        console.log('📸 Capturing individual chart elements...');
        for (const [chartName, element] of Object.entries(modalChartElements)) {
          if (element) {
            try {
              const canvas = await html2canvas(element, {
                background: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false
              });
              chartImages[chartName] = canvas.toDataURL('image/png', 1.0);
              console.log(`✅ Captured ${chartName}`);
            } catch (error) {
              console.warn(`Failed to capture ${chartName}:`, error);
            }
          }
        }
      }

      // Debug: Log which modal charts are found with detailed info
      console.log('🔍 Modal chart elements found:', Object.entries(modalChartElements)
        .map(([key, element]) => ({
          key,
          found: !!element,
          tagName: element?.tagName,
          hasContent: element ? element.innerHTML.length > 0 : false,
          dimensions: element ? `${element.offsetWidth}x${element.offsetHeight}` : 'N/A',
          hasRecharts: element ? !!element.querySelector('.recharts-wrapper') : false
        }))
      );

      console.log('📸 Captured images:', Object.keys(chartImages));

      // Fetch table records from the Student Attendance Records with current filters
      let tableRecords = [];
      try {
        // Build query parameters with current analytics filters
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('pageSize', '10000');
        
        // Add current analytics filters if available
        if (appliedFilters?.department && appliedFilters.department !== 'all') {
          params.append('departmentId', appliedFilters.department);
        }
        if (appliedFilters?.course && appliedFilters.course !== 'all') {
          params.append('courseId', appliedFilters.course);
        }
        if (appliedFilters?.section && appliedFilters.section !== 'all') {
          params.append('sectionId', appliedFilters.section);
        }
        if (appliedFilters?.yearLevel && appliedFilters.yearLevel !== 'all') {
          params.append('yearLevel', appliedFilters.yearLevel);
        }
        if (appliedFilters?.subject && appliedFilters.subject !== 'all') {
          params.append('subjectId', appliedFilters.subject);
        }
        if (appliedFilters?.timeRange?.start) {
          params.append('startDate', appliedFilters.timeRange.start.toISOString());
        }
        if (appliedFilters?.timeRange?.end) {
          params.append('endDate', appliedFilters.timeRange.end.toISOString());
        }
        
        const response = await fetch(`/api/attendance/students?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          tableRecords = Array.isArray(data) ? data : (data.items || []);
          console.log(`📊 Fetched ${tableRecords.length} table records for export with filters:`, params.toString());
        }
      } catch (error) {
        console.warn('Failed to fetch table records for export:', error);
      }

      // Create simplified table records for cleaner PDF export
      const simplifiedTableRecords = (tableRecords || []).map((record: any) => ({
        'Student Name': record.studentName || 'N/A',
        'Student ID': record.studentIdNum || record.studentId || 'N/A',
        'Department': record.department || 'N/A',
        'Course': record.course || 'N/A',
        'Year Level': record.yearLevel || 'N/A',
        'Status': record.status || 'N/A',
        'Attendance Rate': `${record.attendanceRate || 0}%`,
        'Total Classes': record.totalScheduledClasses || 0,
        'Present': record.attendedClasses || 0,
        'Late': record.lateClasses || 0,
        'Absent': record.absentClasses || 0
      }));

      // Create export data with proper structure for ExportService
      const exportData = {
        type: 'student' as const,
        data: simplifiedTableRecords, // Use simplified table records as the main data
        analytics: {
          modalType: modalType || 'unknown',
          chartData: chartData || [],
          exportSource: 'modal'
        },
        tableView: simplifiedTableRecords, // Include simplified table records for PDF export
        filtersSnapshot: {
          modalType: modalType || 'unknown',
          exportSource: 'modal',
          appliedFilters: appliedFilters,
          generatedAt: new Date().toISOString()
        },
        timeRange: appliedFilters?.timeRange || {
          start: new Date('2025-04-01'),
          end: new Date('2025-06-30'),
          preset: 'semester' as const
        }
      };

      const options = {
        format,
        filename: `${modalType}-${format}-${new Date().toISOString().split('T')[0]}`,
        includeCharts: true,
        includeFilters: true,
        includeTable: true,
        includeSummary: true,
        chartElements: modalChartElements,
        chartImages: chartImages // Pass the captured images
      };

      // Debug: Log export data structure
      console.log('📊 Export data structure:', {
        type: exportData.type,
        dataLength: exportData.data?.length || 0,
        tableViewLength: exportData.tableView?.length || 0,
        hasAnalytics: !!exportData.analytics,
        hasFilters: !!exportData.filtersSnapshot,
        options: options
      });

      try {
      await ExportService.exportAnalytics(exportData, options);
        console.log(`✅ Modal export completed for ${modalType} with ${tableRecords.length} table records`);
        
        // Show success toast notification
        if (typeof window !== 'undefined') {
          const { toast } = await import('sonner');
          toast.success('Export Successful', {
            description: `${modalType} report has been downloaded successfully.`,
            duration: 3000
          });
        }
      } catch (exportError) {
        console.error('ExportService failed:', exportError);
        // Fallback: Try to export just the table records as CSV
        if (tableRecords.length > 0) {
          console.log('🔄 Attempting fallback CSV export...');
          const csvData = (tableRecords || []).map((record: any) => ({
            'Student Name': record.studentName || 'N/A',
            'Student ID': record.studentIdNum || record.studentId || 'N/A',
            'Department': record.department || 'N/A',
            'Course': record.course || 'N/A',
            'Year Level': record.yearLevel || 'N/A',
            'Status': record.status || 'N/A',
            'Attendance Rate': `${record.attendanceRate || 0}%`,
            'Total Classes': record.totalScheduledClasses || 0,
            'Present': record.attendedClasses || 0,
            'Late': record.lateClasses || 0,
            'Absent': record.absentClasses || 0
          }));
          
          const csvContent = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map((row: any) => Object.values(row).map((val: any) => `"${val}"`).join(','))
          ].join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${modalType}-fallback-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('✅ Fallback CSV export completed');
          
          // Show success toast notification for fallback export
          if (typeof window !== 'undefined') {
            const { toast } = await import('sonner');
            toast.success('Export Successful', {
              description: `${modalType} report has been downloaded successfully (CSV format).`,
              duration: 3000
            });
          }
        } else {
          throw exportError;
        }
      }
    } catch (error) {
      console.error('Modal export failed:', error);
      
      // Show error toast notification
      if (typeof window !== 'undefined') {
        const { toast } = await import('sonner');
        toast.error('Export Failed', {
          description: `Failed to export ${modalType} report. Please try again.`,
          duration: 5000
        });
      }
      
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Primary PDF Export Button */}
      <Button 
        variant="outline" 
        size="lg" 
        className="h-8 px-3 text-sm rounded bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white hover:border-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => handleModalExport('pdf')}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-3 h-3 mr-1" />
            Export PDF
          </>
        )}
      </Button>
      
      {/* Additional Format Options Dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-sm rounded border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isExporting}
          >
            <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 text-sm">
        <DropdownMenuItem 
          onClick={() => handleModalExport('csv')}
          disabled={isExporting}
          className={isExporting ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <FileSpreadsheet className="w-3 h-3 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleModalExport('excel')}
          disabled={isExporting}
          className={isExporting ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <FileSpreadsheet className="w-3 h-3 mr-2" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};

const ErrorBoundary = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-blue-900 mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4">{error}</p>
    <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700 rounded">
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </div>
);

const NoDataState = ({ 
  selectedSubject, 
  type,
  subjects = []
}: { 
  selectedSubject: string; 
  type: 'student';
  subjects?: Array<{ id: string; name: string }>;
}) => {
  const selectedSubjectName = selectedSubject === 'all' ? 'All Subjects' : 
    subjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
  
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
      <p className="text-gray-600 mb-4 max-w-md">
        No attendance data found for <span className="font-medium text-blue-600">{selectedSubjectName}</span> 
        in the selected time period.
      </p>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Info className="w-4 h-4" />
        <span>Try selecting a different subject or time range</span>
      </div>
    </div>
  );
};

export const FullscreenPatternAnalysisModal = ({
  patternData,
  type,
  trigger,
  onExport,
  getXAxisConfig,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  patternData: any[];
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  getXAxisConfig?: () => any;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  Attendance Pattern Analysis
                </div>
                <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                  Pattern analysis with moving averages and peak detection for students
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Pattern Visualization</h3>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="h-96">
                  {patternData.length === 0 ? (
                    <NoDataState selectedSubject={localSelectedSubject} type={type} subjects={subjects} />
                  ) : (
                    <div data-chart="pattern-analysis" className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={patternData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey={patternData.length > 0 ? Object.keys(patternData[0]).find(key => key !== 'attendanceRate' && key !== 'movingAverage' && key !== 'label') || 'period' : 'period'}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => {
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(value);
                            }
                          }
                          return value;
                        }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelFormatter={(label) => {
                          if (getXAxisConfig) {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                          }
                          return label;
                        }}
                        formatter={(value: any, name: any, props: any) => {
                          const isPeak = props?.payload?.isPeak;
                          const isValley = props?.payload?.isValley;
                          const markers = isPeak ? ' (peak)' : isValley ? ' (low)' : '';
                          if (name === 'movingAverage') return [`${value.toFixed?.(1) ?? value}%`, 'Moving Average'];
                          return [`${value}%${markers}`, 'Attendance Rate'];
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendanceRate" 
                        stroke="#1e40af" 
                        strokeWidth={2}
                        dot={false}
                        name="Attendance Rate"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="movingAverage" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={false}
                        name="Moving Average"
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={50}
                        iconType="line"
                        wrapperStyle={{ paddingBottom: '10px' }}
                        formatter={(value, entry) => {
                          if (value === 'Attendance Rate') {
                            return 'Daily Attendance Rate';
                          } else if (value === 'Moving Average') {
                            return '7-Day Moving Average';
                          }
                          return value;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h3 className="text-lg font-bold text-blue-900">Pattern Insights</h3>
              </div>
              
              {/* Pattern Statistics */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <h4 className="text-md font-semibold text-blue-900 mb-4">Pattern Statistics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peaks Detected:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {patternData.filter((item: any) => item.isPeak).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Valleys Detected:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {patternData.filter((item: any) => item.isValley).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Attendance:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(patternData.reduce((sum: number, item: any) => sum + item.attendanceRate, 0) / patternData.length).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Moving Average Range:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.min(...patternData.map((item: any) => item.movingAverage)).toFixed(1)}% - {Math.max(...patternData.map((item: any) => item.movingAverage)).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Pattern Interpretation */}
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <h4 className="text-md font-semibold text-blue-900 mb-4">Pattern Interpretation</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-blue-500">Attendance Rate:</span> Shows the actual attendance percentage over time
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-green-600">Moving Average:</span> Smoothed trend line that helps identify overall patterns
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-yellow-500">Peaks:</span> High attendance periods that may indicate effective engagement strategies
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-red-500">Valleys:</span> Low attendance periods that may require intervention or investigation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="pattern-analysis"
            chartData={patternData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FullscreenStreakAnalysisModal = ({
  streakData,
  type,
  trigger,
  onExport,
  getXAxisConfig,
  selectedCourse = 'all',
  selectedSection = 'all',
  selectedSubject = 'all',
  selectedYearLevel = 'all',
  onCourseChange,
  onSectionChange,
  onSubjectChange,
  onYearLevelChange,
  courses = [],
  sections = [],
  subjects = [],
  yearLevels = [],
  showSecondaryFilters = true
}: {
  streakData: { data: any[]; stats: any };
  type: 'student';
  trigger: React.ReactNode;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  getXAxisConfig?: () => any;
  selectedCourse?: string;
  selectedSection?: string;
  selectedSubject?: string;
  selectedYearLevel?: string;
  onCourseChange?: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onSubjectChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  courses?: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>;
  yearLevels?: Array<{ id: string; name: string }>;
  showSecondaryFilters?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedSubject, setLocalSelectedSubject] = useState(selectedSubject);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 -m-6 p-6 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <DialogTitle className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">
                  Streak Analysis
                </div>
                <div className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                  Student attendance streak patterns and insights
                </div>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 w-10 p-0 hover:bg-white/20 rounded-full transition-all duration-200"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Secondary Filters */}
          {showSecondaryFilters && (
            <div className="mb-6">
              <SecondaryFilters
                selectedSubject={localSelectedSubject}
                onSubjectChange={setLocalSelectedSubject}
                subjects={subjects}
              />
            </div>
          )}

          {/* Streak Statistics Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="text-3xl font-bold text-green-600">
                {streakData?.data?.reduce((sum: number, entry: any) => sum + (entry.goodStreaks || 0), 0).toLocaleString() || 0}
              </div>
              <div className="text-sm text-green-600 font-medium">Total Good Streaks</div>
              <div className="text-xs text-green-500 mt-1">Periods with ≥85% attendance</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="text-3xl font-bold text-red-600">
                {streakData?.data?.reduce((sum: number, entry: any) => sum + (entry.poorStreaks || 0), 0).toLocaleString() || 0}
              </div>
              <div className="text-sm text-red-600 font-medium">Total Poor Streaks</div>
              <div className="text-xs text-red-500 mt-1">Periods with &lt;85% attendance</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="text-3xl font-bold text-blue-600">
                {streakData?.data?.length || 0}
              </div>
              <div className="text-sm text-blue-600 font-medium">Total Periods</div>
              <div className="text-xs text-blue-500 mt-1">Data points analyzed</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="text-3xl font-bold text-gray-600">
                {streakData?.stats?.totalGoodDays || streakData?.data?.reduce((sum: number, entry: any) => sum + (entry.goodStreaks || 0), 0) || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Good Periods</div>
              <div className="text-xs text-gray-500 mt-1">Out of {streakData?.data?.length || 0} total</div>
            </div>
          </div>

          {/* Enhanced Streak Chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
              <h3 className="text-lg font-bold text-blue-900">Streak Timeline</h3>
            </div>
            <div className="h-96" data-chart="streak-analysis">
              {(!streakData?.data || streakData?.data.length === 0) ? (
                <NoDataState selectedSubject={localSelectedSubject} type={type} subjects={subjects} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={streakData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey={getXAxisConfig?.().dataKey || 'date'}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={getXAxisConfig?.().tickFormatter}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => `${Math.abs(value)}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelFormatter={(label) => {
                        const xAxisConfig = getXAxisConfig?.();
                        if (xAxisConfig?.tickFormatter) {
                          return xAxisConfig.tickFormatter(label);
                        }
                        return label;
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        const month = props?.payload?.month;
                        const totalStudents = props?.payload?.totalStudents;
                        const averageStreak = props?.payload?.averageStreak;
                        const monthName = month === 8 ? 'August' : month === 9 ? 'September' : month === 10 ? 'October' : month === 11 ? 'November' : month === 12 ? 'December' : `Month ${month}`;
                        return [
                          `${value.toLocaleString()} ${name}`,
                          `${monthName} - ${totalStudents?.toLocaleString()} students`,
                          `Average: ${averageStreak?.toFixed(1)}%`
                        ];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="goodStreaks" 
                      fill="#10b981"
                      radius={[2, 2, 0, 0]}
                      name="Good Streaks"
                    />
                    <Bar 
                      dataKey="poorStreaks" 
                      fill="#ef4444"
                      radius={[2, 2, 0, 0]}
                      name="Poor Streaks"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group" data-breakdown="streak-analysis">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
              <h3 className="text-lg font-bold text-blue-900">Period Breakdown</h3>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(!streakData?.data || streakData.data.length === 0) ? (
                <div className="text-gray-500 text-sm">No streak data available</div>
              ) : (
                streakData.data.map((entry: any, index: number) => {
                  const dateLabel = entry.date || entry.month || entry.week || entry.hour || `Period ${index + 1}`;
                  const goodCount = entry.goodStreaks || 0;
                  const poorCount = entry.poorStreaks || 0;
                  const totalStudents = entry.totalStudents || 0;
                  const averageStreak = entry.averageStreak || 0;
                  
                  return (
                    <div 
                      key={index}
                      className="p-4 rounded border bg-gray-50 border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-700">
                          {getXAxisConfig?.().tickFormatter ? getXAxisConfig().tickFormatter(dateLabel) : dateLabel}
                        </div>
                        <div className="text-sm text-gray-500">
                          {totalStudents.toLocaleString()} students
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="text-lg font-bold text-green-600">
                            {goodCount.toLocaleString()}
                          </div>
                          <div className="text-xs text-green-600 font-medium">Good Streaks</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="text-lg font-bold text-red-600">
                            {poorCount.toLocaleString()}
                          </div>
                          <div className="text-xs text-red-600 font-medium">Poor Streaks</div>
                        </div>
                      </div>
                      {averageStreak > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Average attendance: {averageStreak.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer with Export Button */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <DownloadDropdown 
            onExport={onExport} 
            modalType="streak-analysis"
            chartData={streakData}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function AttendanceAnalytics({
  data,
  loading = false,
  type,
  onDrillDown,
  onExport,
  onRefresh,
  enableAdvancedFeatures = true,
  enableRealTime = false,

  enableDrillDown = true,
  enableTimeRange = true,
  showHeader = true,
  showSecondaryFilters = true,
  selectedSubject = 'all',
  onSubjectChange,
  subjects = [],
  
  // New filter props
  onFiltersChange,
  onClearAnalytics,
  onApplyFilters
}: AttendanceAnalyticsProps) {
  console.log('🎯 AttendanceAnalytics received data:', {
    dataLength: data?.length,
    data: data,
    loading: loading,
    type: type,
    hasData: data && data.length > 0
  });
  // Enhanced state management for advanced interactivity
  const [showDetails, setShowDetails] = useState(false);
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showOverviewCards, setShowOverviewCards] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: '',
    stage: 'fetching'
  });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Advanced interactivity states
  const [drillDownState, setDrillDownState] = useState<DrillDownState>({
    isActive: false,
    level: 'department',
    data: null,
    breadcrumbs: [],
    filters: {}
  });



  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
    end: new Date(new Date().getFullYear(), 11, 31), // December 31st of current year
    preset: 'year'
  });

  // Comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [showLateComparison, setShowLateComparison] = useState(false);

  // Enhanced filter state for cascading filters
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedYearLevel, setSelectedYearLevel] = useState('all');
  const [internalSelectedSubject, setInternalSelectedSubject] = useState(selectedSubject || 'all');

  // Applied states used to actually fetch and render charts
  const [appliedSelectedDepartment, setAppliedSelectedDepartment] = useState('all');
  const [appliedSelectedRiskLevel, setAppliedSelectedRiskLevel] = useState('all');
  const [appliedSelectedCourse, setAppliedSelectedCourse] = useState('all');
  const [appliedSelectedSection, setAppliedSelectedSection] = useState('all');
  const [appliedSelectedYearLevel, setAppliedSelectedYearLevel] = useState('all');
  const [appliedInternalSelectedSubject, setAppliedInternalSelectedSubject] = useState(selectedSubject || 'all');
  const [appliedTimeRange, setAppliedTimeRange] = useState<TimeRange>({ ...timeRange });

  // Remove auto-sync - filters should only apply when user clicks Apply button
  // useEffect(() => {
  //   setAppliedTimeRange({ ...timeRange });
  // }, [timeRange]);

  const hasPendingChanges = useMemo(() => {
    return (
      selectedDepartment !== appliedSelectedDepartment ||
      selectedRiskLevel !== appliedSelectedRiskLevel ||
      selectedCourse !== appliedSelectedCourse ||
      selectedSection !== appliedSelectedSection ||
      selectedYearLevel !== appliedSelectedYearLevel ||
      internalSelectedSubject !== appliedInternalSelectedSubject ||
      timeRange.preset !== appliedTimeRange.preset ||
      timeRange.start?.getTime() !== appliedTimeRange.start?.getTime() ||
      timeRange.end?.getTime() !== appliedTimeRange.end?.getTime()
    );
  }, [
    selectedDepartment,
    selectedRiskLevel,
    selectedCourse,
    selectedSection,
    selectedYearLevel,
    internalSelectedSubject,
    timeRange,
    appliedSelectedDepartment,
    appliedSelectedRiskLevel,
    appliedSelectedCourse,
    appliedSelectedSection,
    appliedSelectedYearLevel,
    appliedInternalSelectedSubject,
    appliedTimeRange
  ]);

  const handleApplyFilters = useCallback(() => {
    setAppliedSelectedDepartment(selectedDepartment);
    setAppliedSelectedRiskLevel(selectedRiskLevel);
    setAppliedSelectedCourse(selectedCourse);
    setAppliedSelectedSection(selectedSection);
    setAppliedSelectedYearLevel(selectedYearLevel);
    setAppliedInternalSelectedSubject(internalSelectedSubject);
    setAppliedTimeRange({ ...timeRange });
    // Emit snapshot upward when applying
    const snapshot = {
      departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      courseId: selectedCourse !== 'all' ? selectedCourse : undefined,
      sectionId: selectedSection !== 'all' ? selectedSection : undefined,
      yearLevel: selectedYearLevel !== 'all' ? selectedYearLevel : undefined,
      subjectId: internalSelectedSubject !== 'all' ? internalSelectedSubject : undefined,
      timeRange: timeRange?.preset || 'year',
      startDate: timeRange?.start?.toISOString(),
      endDate: timeRange?.end?.toISOString()
    };
    // @ts-ignore optional
    if (typeof onFiltersChange === 'function') onFiltersChange(snapshot);
    // Call the apply filters callback to trigger data fetch
    if (typeof onApplyFilters === 'function') onApplyFilters();
    try { setToast({ message: 'Filters applied', type: 'success' }); } catch {}
  }, [
    selectedDepartment,
    selectedRiskLevel,
    selectedCourse,
    selectedSection,
    selectedYearLevel,
    internalSelectedSubject,
    timeRange,
    onFiltersChange,
    onApplyFilters
  ]);

  const clearAnalyticsFilters = useCallback(() => {
    // Use external clear function if provided, otherwise use internal logic
    if (typeof onClearAnalytics === 'function') {
      onClearAnalytics();
      return;
    }
    
    // Fallback to internal clear logic
    setSelectedDepartment('all');
    setSelectedRiskLevel('all');
    setSelectedCourse('all');
    setSelectedSection('all');
    setSelectedYearLevel('all');
    setInternalSelectedSubject('all');
    if (typeof onSubjectChange === 'function') onSubjectChange('all');
    if (typeof onFiltersChange === 'function') onFiltersChange({});
    try { setToast({ message: 'Analytics filters cleared', type: 'info' }); } catch {}
  }, [onClearAnalytics, onSubjectChange, onFiltersChange]);

  
  // Filter options for cascading dropdowns
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    courses: [],
    subjects: [],
    sections: [],
    yearLevels: [] as Array<{ id: string; name: string }>
  });

  // Performance optimizations
  const analyticsDataRef = useRef<AnalyticsData | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced data processing with real-time capabilities
  const analyticsData = useMemo(() => {
    try {
      // Validate input data
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format: data must be an array');
      }

      setLoadingState({
        isLoading: true,
        progress: 0,
        message: 'Processing data...',
        stage: 'processing'
      });

      // Apply analytics filters to the data using APPLIED filter states
      let filteredData = data;
      
      if (appliedSelectedDepartment !== 'all') {
        filteredData = filteredData.filter(item => item.department === appliedSelectedDepartment);
      }
      
      if (appliedSelectedRiskLevel !== 'all') {
        filteredData = filteredData.filter(item => item.riskLevel === appliedSelectedRiskLevel);
      }

      // Apply time range filter (inclusive)
      if (appliedTimeRange && appliedTimeRange.preset !== 'custom') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (appliedTimeRange.preset) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0); // Beginning of time
        }

        // Normalize to full-day inclusive range
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter(item => {
          // If no lastAttendance, include the item (don't filter out)
          if (!item.lastAttendance) return true;
          
          try {
            const attendanceDate = new Date(item.lastAttendance);
            return attendanceDate >= startDate && attendanceDate <= endDate;
          } catch (error) {
            // If date parsing fails, include the item
            return true;
          }
        });
      } else if (timeRange && timeRange.preset === 'custom') {
        // Custom date range filtering (inclusive)
        if (timeRange.start && timeRange.end) {
          const startDate = new Date(timeRange.start);
          const endDate = new Date(timeRange.end);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          filteredData = filteredData.filter(item => {
            if (!item.lastAttendance) return true;
            try {
              const attendanceDate = new Date(item.lastAttendance);
              return attendanceDate >= startDate && attendanceDate <= endDate;
            } catch {
              return true;
            }
          });
        }
      }

      // Check if filtered data is empty
      if (filteredData.length === 0) {
        console.warn('No data after filtering:', {
          originalDataLength: data.length,
          selectedDepartment,
          selectedRiskLevel,
          timeRange: timeRange?.preset,
          customRange: timeRange?.preset === 'custom' ? {
            start: timeRange.start,
            end: timeRange.end
          } : null
        });
        
        // For custom time range, if no data matches, fall back to showing all data
        if (timeRange?.preset === 'custom') {
          console.log('Custom time range returned no data, falling back to all data');
          filteredData = data; // Use all data as fallback
        } else {
          setLoadingState({
            isLoading: false,
            progress: 100,
            message: 'No data matches current filters',
            stage: 'rendering'
          });
          return null;
        }
      }

      const processedData = processRealTimeData(filteredData, type);
      
      // Calculate trend indicators
      const trends = calculateTrends(filteredData, type);
      
      // Add trends to processed data
      const dataWithTrends = {
        ...processedData,
        trends
      };
      
      // Simulate processing delay for large datasets
      if (filteredData.length > 100) {
        processingTimeoutRef.current = setTimeout(() => {
          setLoadingState(prev => ({
            ...prev,
            progress: 100,
            message: 'Data processed successfully',
            stage: 'rendering'
          }));
        }, 1000);
      } else {
        setLoadingState({
          isLoading: false,
          progress: 100,
          message: 'Data processed successfully',
          stage: 'rendering'
        });
      }

      analyticsDataRef.current = dataWithTrends;
      return dataWithTrends;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process data');
      setLoadingState({
        isLoading: false,
        progress: 0,
        message: 'Error processing data',
        stage: 'fetching'
      });
      return null;
    }
  }, [data, type, appliedSelectedDepartment, appliedSelectedRiskLevel, appliedSelectedCourse, appliedSelectedSection, appliedSelectedYearLevel, appliedInternalSelectedSubject, appliedTimeRange]);

  // Dynamic X-axis configuration based on time filter
  const getXAxisConfig = () => {
    if (!appliedTimeRange) return { dataKey: 'date', label: 'Date' };

    switch (appliedTimeRange.preset) {
      case 'today':
        return { 
          dataKey: 'hour', 
          label: 'Hour',
          tickFormatter: (value: any) => {
            const hour = parseInt(value);
            if (hour < 12) return `${hour}AM`;
            if (hour === 12) return '12PM';
            return `${hour - 12}PM`;
          }
        };
      case 'week':
        return { 
          dataKey: 'date', 
          label: 'Date',
          tickFormatter: (value: any) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        };
      case 'month':
        return { 
          dataKey: 'date', 
          label: 'Date',
          tickFormatter: (value: any) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        };
      case 'quarter':
        return { 
          dataKey: 'week', 
          label: 'Week',
          tickFormatter: (value: any) => `Week ${value}`
        };
      case 'year':
        return { 
          dataKey: 'month', 
          label: 'Month',
          tickFormatter: (value: any) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[value - 1] || value;
          }
        };
      case 'custom':
        return { 
          dataKey: 'date', 
          label: 'Date',
          tickFormatter: (value: any) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        };
      default:
        return { dataKey: 'date', label: 'Date' };
    }
  };

  // Fetch real database data for charts
  const [chartData, setChartData] = useState<any>({
    timeBasedData: [],
    departmentStats: [],
    riskLevelData: [],
    lateArrivalData: [],
    patternData: [],
    streakData: { data: [], stats: {} },
    summary: undefined
  });

  // Determine if server-side analytics has any data to render
  const hasServerData = useMemo(() => {
    return (
      (chartData?.timeBasedData?.length || 0) > 0 ||
      (chartData?.departmentStats?.length || 0) > 0 ||
      (chartData?.riskLevelData?.length || 0) > 0 ||
      (chartData?.lateArrivalData?.length || 0) > 0 ||
      (chartData?.patternData?.length || 0) > 0 ||
      ((chartData?.streakData?.data || []).length || 0) > 0
    );
  }, [chartData]);

  // Fetch real analytics data from API
  const abortRef = useRef<AbortController | null>(null);
  const MIN_LOADING_MS = 700;
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const fetchAnalyticsData = useCallback(async () => {
    try {
      // Cancel any in-flight request to avoid race conditions/stale data
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setLoadingState(prev => ({
        ...prev,
        isLoading: true,
        message: 'Fetching analytics data...',
        stage: 'fetching'
      }));
      const startTs = Date.now();

      // Optimistically clear chartData AFTER toggling loading, to prevent no-data flash
      setChartData({
        timeBasedData: [],
        departmentStats: [],
        riskLevelData: [],
        lateArrivalData: [],
        patternData: [],
        streakData: { data: [], stats: {} },
        summary: undefined
      });

      const params = new URLSearchParams({
        type,
        timeRange: appliedTimeRange?.preset || 'week',
        ...(appliedSelectedDepartment !== 'all' && { departmentId: appliedSelectedDepartment }),
        ...(appliedInternalSelectedSubject !== 'all' && { subjectId: appliedInternalSelectedSubject }),
        ...(appliedSelectedCourse !== 'all' && { courseId: appliedSelectedCourse }),
        ...(appliedSelectedSection !== 'all' && { sectionId: appliedSelectedSection }),
        ...(appliedSelectedYearLevel !== 'all' && { yearLevel: appliedSelectedYearLevel }),
        ...(appliedTimeRange?.start && { startDate: appliedTimeRange.start.toISOString() }),
        ...(appliedTimeRange?.end && { endDate: appliedTimeRange.end.toISOString() })
      });

      // Force bypass of HTTP caches and server cache
      const response = await fetch(`/api/attendance/analytics?noCache=1&${params}`, {
        cache: 'no-store',
        signal: abortRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Analytics API response:', result);
      
      if (result.success) {
        console.log('📊 Setting chart data:', result.data);
        setChartData(result.data);
        const elapsed = Date.now() - startTs;
        const waitMs = Math.max(0, MIN_LOADING_MS - elapsed);
        if (waitMs > 0) {
          await new Promise(res => setTimeout(res, waitMs));
        }
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          message: 'Data loaded successfully',
          stage: 'rendering'
        }));
        setHasFetchedOnce(true);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        // Swallow aborts; a newer request is in-flight
        return;
      }
      console.error('Error fetching analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data');
      const elapsed = 0; // ensure we still respect minimum spinner time
      const waitMs = Math.max(0, MIN_LOADING_MS - elapsed);
      if (waitMs > 0) {
        await new Promise(res => setTimeout(res, waitMs));
      }
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        message: 'Error loading data',
        stage: 'fetching'
      }));
      setHasFetchedOnce(true);
    }
  }, [
    type,
    appliedTimeRange,
    appliedSelectedDepartment,
    appliedInternalSelectedSubject,
    appliedSelectedCourse,
    appliedSelectedSection,
    appliedSelectedYearLevel
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    console.log('🔄 AttendanceAnalytics: fetchAnalyticsData triggered', {
      timeRange: appliedTimeRange?.preset,
      selectedDepartment: appliedSelectedDepartment,
      selectedSubject: appliedInternalSelectedSubject,
      selectedCourse: appliedSelectedCourse,
      selectedSection: appliedSelectedSection
    });
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Fetch filter options when component mounts
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/analytics/filter-options');
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Generate dynamic chart data using real database data
  const generateDynamicChartData = () => {
    console.log('📊 generateDynamicChartData - chartData.timeBasedData:', chartData.timeBasedData);
    console.log('📊 generateDynamicChartData - timeRange:', appliedTimeRange?.preset);
    console.log('📊 generateDynamicChartData - selectedCourse:', appliedSelectedCourse);
    console.log('📊 generateDynamicChartData - data length:', chartData.timeBasedData?.length || 0);
    console.log('📊 generateDynamicChartData - This data reflects all applied filters (department, course, section, year level, time range)');
    
    const data = chartData.timeBasedData || [];
    
    // Log sample data points for debugging
    if (data.length > 0) {
      console.log('📊 Sample data points:', data.slice(0, 3));
      console.log('📊 Data keys:', Object.keys(data[0] || {}));
    }
    
    return data;
  };

  // Generate late arrival trend data using real database data
  const generateLateArrivalData = () => {
    console.log('📊 generateLateArrivalData - chartData.lateArrivalData:', chartData.lateArrivalData);
    console.log('📊 generateLateArrivalData - timeRange:', appliedTimeRange?.preset);
    console.log('📊 generateLateArrivalData - data length:', chartData.lateArrivalData?.length || 0);
    console.log('📊 generateLateArrivalData - This data reflects all applied filters (department, course, section, year level, time range)');
    
    const data = chartData.lateArrivalData || [];
    
    // Log sample data points for debugging
    if (data.length > 0) {
      console.log('📊 Late arrival sample data points:', data.slice(0, 3));
      console.log('📊 Late arrival data keys:', Object.keys(data[0] || {}));
    }
    
    return data;
  };

  // Generate pattern analysis data using real database data
  const generatePatternAnalysisData = useMemo(() => {
    console.log('📊 generatePatternAnalysisData - chartData.patternData:', chartData.patternData);
    console.log('📊 generatePatternAnalysisData - timeRange:', appliedTimeRange?.preset);
    console.log('📊 generatePatternAnalysisData - data length:', chartData.patternData?.length || 0);
    console.log('📊 generatePatternAnalysisData - This data reflects all applied filters (department, course, section, year level, time range)');
    
    const data = chartData.patternData || [];
    
    // Log sample data points for debugging
    if (data.length > 0) {
      console.log('📊 Pattern analysis sample data points:', data.slice(0, 3));
      console.log('📊 Pattern analysis data keys:', Object.keys(data[0] || {}));
    }
    
    return data;
  }, [chartData.patternData, appliedTimeRange]);

  // Generate streak analysis data using real database data
  const generateStreakAnalysisData = useMemo(() => {
    console.log('📊 generateStreakAnalysisData - chartData.streakData:', chartData.streakData);
    console.log('📊 generateStreakAnalysisData - timeRange:', appliedTimeRange?.preset);
    console.log('📊 generateStreakAnalysisData - data length:', chartData.streakData?.data?.length || 0);
    console.log('📊 generateStreakAnalysisData - This data reflects all applied filters (department, course, section, year level, time range)');
    
    const data = chartData.streakData || { data: [], stats: { maxGoodStreak: 0, maxPoorStreak: 0, currentStreak: 0, currentStreakType: 'none', totalGoodDays: 0, totalPoorDays: 0 } };
    
    // Log sample data points for debugging
    if (data.data && data.data.length > 0) {
      console.log('📊 Streak analysis sample data points:', data.data.slice(0, 3));
      console.log('📊 Streak analysis data keys:', Object.keys(data.data[0] || {}));
    }
    
    return data;
  }, [chartData.streakData, appliedTimeRange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced callback functions with performance optimizations
  const handleDepartmentChange = useCallback((value: string) => {
    setSelectedDepartment(value);
  }, []);

  const handleRiskLevelChange = useCallback((value: string) => {
    setSelectedRiskLevel(value);
  }, []);

  const handleSubjectChange = useCallback((value: string) => {
    setInternalSelectedSubject(value);
    if (onSubjectChange) {
      onSubjectChange(value);
    }
  }, [onSubjectChange]);

  const handleCourseChange = useCallback((value: string) => {
    setSelectedCourse(value);
  }, []);

  const handleSectionChange = useCallback((value: string) => {
    setSelectedSection(value);
  }, []);

  const handleYearLevelChange = useCallback((value: string) => {
    setSelectedYearLevel(value);
  }, []);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // Emit unified filter snapshot to parent when analytics filters change
  useEffect(() => {
    const snapshot = {
      departmentId: appliedSelectedDepartment !== 'all' ? appliedSelectedDepartment : undefined,
      courseId: appliedSelectedCourse !== 'all' ? appliedSelectedCourse : undefined,
      sectionId: appliedSelectedSection !== 'all' ? appliedSelectedSection : undefined,
      yearLevel: appliedSelectedYearLevel !== 'all' ? appliedSelectedYearLevel : undefined,
      subjectId: appliedInternalSelectedSubject !== 'all' ? appliedInternalSelectedSubject : undefined,
      timeRange: appliedTimeRange?.preset || 'year',
      startDate: appliedTimeRange?.start?.toISOString(),
      endDate: appliedTimeRange?.end?.toISOString()
    };
    // Only call if parent provided a handler
    // @ts-ignore - optional prop
    if (typeof onFiltersChange === 'function') {
      // @ts-ignore
      onFiltersChange(snapshot);
    }
  }, [
    appliedSelectedDepartment,
    appliedSelectedCourse,
    appliedSelectedSection,
    appliedSelectedYearLevel,
    appliedInternalSelectedSubject,
    appliedTimeRange
  ]);


  const clearTimeRange = useCallback(() => {
    const now = new Date();
    setTimeRange({
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      preset: 'year'
    });
  }, []);





  const toggleChartExpansion = useCallback((chartId: string) => {
    setExpandedCharts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  }, []);

  const handleChartClick = useCallback((data: any, chartType: string) => {
    if (enableDrillDown && onDrillDown) {
      onDrillDown({ type: chartType, value: data.name || data.id });
      
      // Update drill-down state
      setDrillDownState(prev => ({
        isActive: true,
        level: chartType as any,
        data: data,
        breadcrumbs: [...prev.breadcrumbs, data.name || data.id],
        filters: { ...prev.filters, [chartType]: data.name || data.id }
      }));
    }
  }, [enableDrillDown, onDrillDown]);

  const handleExport = useCallback(async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      if (!analyticsData) {
        throw new Error('No data available for export');
      }

      const exportData = {
        type,
        data: data || [],
        filters: {
          department: selectedDepartment,
          riskLevel: selectedRiskLevel,
          subject: selectedSubject,
          course: selectedCourse,
          section: selectedSection,
          yearLevel: selectedYearLevel
        },
        timeRange
      };

      // Capture chart elements for export with enhanced detection
      const chartElements = {
        // Main dashboard charts
        attendanceTrend: document.querySelector('[data-chart="attendance-trend"]') as HTMLElement,
        departmentStats: document.querySelector('[data-chart="department-stats"]') as HTMLElement,
        riskLevelChart: document.querySelector('[data-chart="risk-level"]') as HTMLElement,
        lateArrivalChart: document.querySelector('[data-chart="late-arrival"]') as HTMLElement,
        // Expanded modal charts
        attendanceDistribution: document.querySelector('[data-chart="attendance-distribution"]') as HTMLElement,
        weeklyTrend: document.querySelector('[data-chart="weekly-trend"]') as HTMLElement,
        lateArrivalTrend: document.querySelector('[data-chart="late-arrival-trend"]') as HTMLElement,
        riskLevelDistribution: document.querySelector('[data-chart="risk-level-distribution"]') as HTMLElement,
        departmentPerformance: document.querySelector('[data-chart="department-performance"]') as HTMLElement,
        patternAnalysis: document.querySelector('[data-chart="pattern-analysis"]') as HTMLElement,
        streakAnalysis: document.querySelector('[data-chart="streak-analysis"]') as HTMLElement
      };

      // Debug: Log which charts are found
      console.log('🔍 Chart elements found:', Object.entries(chartElements)
        .filter(([key, element]) => element !== null)
        .map(([key, element]) => `${key}: ${element?.tagName}`)
      );

      const options = {
        format,
        filename: `${type}-attendance-analytics-${new Date().toISOString().split('T')[0]}`,
        includeCharts: true,
        includeFilters: true,
        chartElements
      };

      await ExportService.exportAnalytics(exportData, options);
      
      // Also call the parent export handler if provided
      if (onExport) {
        onExport(format);
      }
      
      // Show success toast
      setToast({ message: `${format.toUpperCase()} export completed successfully!`, type: 'success' });
    } catch (error) {
      console.error('Export failed:', error);
      // Show error toast
      setToast({ 
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    }
  }, [analyticsData, type, data, selectedDepartment, selectedRiskLevel, selectedSubject, selectedCourse, selectedSection, selectedYearLevel, timeRange, onExport]);

  const toggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoadingState({
      isLoading: true,
      progress: 0,
      message: 'Retrying...',
      stage: 'fetching'
    });
  }, []);

  // Advanced interactivity handlers
  const handleDrillDownNavigation = useCallback((index: number) => {
    if (index === -1) {
      // Go back
      setDrillDownState(prev => ({
        ...prev,
        breadcrumbs: prev.breadcrumbs.slice(0, -1),
        level: prev.breadcrumbs.length > 1 ? 'department' : 'department'
      }));
    } else {
      // Navigate to specific level
      setDrillDownState(prev => ({
        ...prev,
        breadcrumbs: prev.breadcrumbs.slice(0, index + 1),
        level: 'department'
      }));
    }
  }, []);


  const handleResetFilters = useCallback(() => {
    setDrillDownState({
      isActive: false,
      level: 'department',
      data: null,
      breadcrumbs: [],
      filters: {}
    });
  }, []);

  // Early returns for different states
  if (loading || loadingState.isLoading) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <AnalyticsHeader
            type={type}
            showDetails={showDetails}
            onToggleDetails={toggleDetails}
            onExport={handleExport}
            onRefresh={onRefresh}
            loading={loading}
          />
        )}
        <AnalyticsLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <AnalyticsHeader
            type={type}
            showDetails={showDetails}
            onToggleDetails={toggleDetails}
            onExport={handleExport}
            onRefresh={onRefresh}
            loading={loading}
          />
        )}
        <ErrorBoundary error={error} onRetry={handleRetry} />
      </div>
    );
  }

  // Debug: Check what analyticsData looks like
  console.log('Analytics data check:', analyticsData);
  console.log('Has totalCount?', analyticsData?.totalCount);
  console.log('Data array length:', data?.length);

  // If neither client-provided data nor server-fetched data exist, show empty state
  // Only show when NOT loading
  if (!loadingState.isLoading && hasFetchedOnce && !hasServerData && (!data || data.length === 0)) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <AnalyticsHeader
            type={type}
            showDetails={showDetails}
            onToggleDetails={toggleDetails}
            onExport={handleExport}
            onRefresh={onRefresh}
            loading={loading}
          />
        )}
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No Analytics Data Available</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            There&apos;s no attendance data to display. Check if data exists for the selected time period or contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const isBusy = loading || loadingState.isLoading || !hasFetchedOnce;

  return (
    <div className="p-0">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {showHeader && (
        <AnalyticsHeader
          type={type}
          showDetails={showDetails}
          onToggleDetails={toggleDetails}
          onExport={handleExport}
          onRefresh={onRefresh}
          loading={loading}
        />
      )}

      <div className="px-6 py-6">
        {/* Show loading or empty state only when neither analyticsData nor server data exist */}
        {!isBusy && !analyticsData && !hasServerData && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-blue-500 text-center max-w-md">
              {loading ? 'Loading analytics data...' : 'No attendance data found. Please check your data source.'}
            </p>
          </div>
        )}

        {/* Advanced Interactivity Features */}
        {enableAdvancedFeatures && (isBusy || analyticsData || hasServerData) && (
          <div className="space-y-4">
            {/* Drill-down Breadcrumbs */}
            {drillDownState.isActive && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <DrillDownBreadcrumbs
                  breadcrumbs={drillDownState.breadcrumbs}
                  onNavigate={handleDrillDownNavigation}
                />
              </div>
            )}
          </div>
        )}

        {/* Tabbed Analytics Interface */}
        {(isBusy || analyticsData || hasServerData) && (
        <div className="space-y-6 pt-4">

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Combined Header with Tabs and Filters */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Left: Tab Navigation */}
              <TabsList className="inline-flex h-auto w-auto items-center justify-start bg-transparent border-b border-gray-200 p-0 gap-0">
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center gap-2 px-4 py-3 bg-transparent border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium transition-all duration-200"
                >
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="charts" 
                  className="flex items-center gap-2 px-4 py-3 bg-transparent border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium transition-all duration-200"
                >
                  <BarChartIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Trends</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced" 
                  className="flex items-center gap-2 px-4 py-3 bg-transparent border-b-2 border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none font-medium transition-all duration-200"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Patterns</span>
                </TabsTrigger>

              </TabsList>
              
              {/* Filters moved to next line below tabs */}
              <div className="flex w-full justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant={hasPendingChanges ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-3 text-xs rounded"
                    onClick={handleApplyFilters}
                    disabled={!hasPendingChanges}
                    title={hasPendingChanges ? 'Apply current filters' : 'No changes to apply'}
                  >
                    Apply filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs rounded"
                    onClick={clearAnalyticsFilters}
                    title="Clear analytics filters"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs rounded"
                    onClick={() => setShowOverviewCards(prev => !prev)}
                    aria-expanded={showOverviewCards}
                    aria-controls="overview-summary-cards"
                  >
                    {showOverviewCards ? (
                      <div className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /><span>Hide</span></div>
                    ) : (
                      <div className="flex items-center gap-1"><ChevronDown className="w-3 h-3" /><span>Show</span></div>
                    )}
                  </Button>
                </div>
                <AnalyticsFilters
                  selectedDepartment={selectedDepartment}
                  selectedRiskLevel={selectedRiskLevel}
                  selectedCourse={selectedCourse}
                  selectedSubject={internalSelectedSubject}
                  selectedSection={selectedSection}
                  selectedYearLevel={selectedYearLevel}
                  departmentStats={chartData.departmentStats.reduce((acc: Record<string, any>, dept: any) => {
                    acc[dept.name] = dept.attendanceRate || 0;
                    return acc;
                  }, {} as Record<string, any>)}
                  filterOptions={filterOptions}
                  onDepartmentChange={handleDepartmentChange}
                  onRiskLevelChange={handleRiskLevelChange}
                  onCourseChange={handleCourseChange}
                  onSubjectChange={handleSubjectChange}
                  onSectionChange={handleSectionChange}
                  onYearLevelChange={handleYearLevelChange}
                  enableTimeRange={enableTimeRange}
                  timeRange={timeRange}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              </div>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="overview" className="space-y-8 mt-6">
              {/* Summary header with collapse toggle */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Summary</h4>
            </div>

              {/* Compact Stats Cards */}
              {showOverviewCards && (
              <div id="overview-summary-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Count Card */}
                {((chartData.summary?.totalStudents ?? 0) > 0) ? (
                <div className="bg-white border border-gray-200 rounded p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-gray-600">Total Students</h3>
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <Users className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">{(chartData.summary?.totalStudents ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">students</div>
                  </div>
                  <div className="flex items-center text-xs text-green-600">
                    {analyticsData?.trends?.totalCount.direction === 'up' ? (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+{analyticsData?.trends?.totalCount.change.toFixed(1)}%</span>
                      </>
                    ) : analyticsData?.trends?.totalCount.direction === 'down' ? (
                      <>
                        <TrendingDown className="w-3 h-3 mr-1" />
                        <span>-{analyticsData?.trends?.totalCount.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3 mr-1" />
                        <span>No change</span>
                      </>
                    )}
                  </div>
                </div>
                ) : (
                  <ChartNoData
                    title="No Data Available"
                    description="No attendance records found"
                    icon={Users}
                    iconColor="text-gray-400"
                    bgColor="bg-white"
                  />
                )}

                {/* Attendance Rate Card */}
                {((chartData.summary?.totalAttendance ?? 0) > 0) ? (
                <div className="bg-white border border-gray-200 rounded p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-gray-600">Attendance Rate</h3>
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">
                      {(chartData.summary?.attendanceRate ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">overall rate</div>
                  </div>
                  <div className="flex items-center text-xs text-green-600">
                    {analyticsData?.trends?.attendanceRate.direction === 'up' ? (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+{analyticsData?.trends?.attendanceRate.change.toFixed(1)}%</span>
                      </>
                    ) : analyticsData?.trends?.attendanceRate.direction === 'down' ? (
                      <>
                        <TrendingDown className="w-3 h-3 mr-1" />
                        <span>-{analyticsData?.trends?.attendanceRate.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3 mr-1" />
                        <span>No change</span>
                      </>
                    )}
                  </div>
                </div>
                ) : (
                  <ChartNoData
                    title="No Attendance Data"
                    description="No attendance records available"
                    icon={CheckCircle}
                    iconColor="text-gray-400"
                    bgColor="bg-white"
                  />
                )}

                {/* Departments Card */}
                {chartData.departmentStats.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-gray-600">Departments</h3>
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <Building className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">{chartData.departmentStats.length}</div>
                    <div className="text-xs text-gray-500">active departments</div>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    {analyticsData?.trends?.departments?.direction === 'up' ? (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+{analyticsData?.trends?.departments.change.toFixed(1)}%</span>
                      </>
                    ) : analyticsData?.trends?.departments?.direction === 'down' ? (
                      <>
                        <TrendingDown className="w-3 h-3 mr-1" />
                        <span>-{analyticsData?.trends?.departments.change.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3 mr-1" />
                        <span>No change</span>
                      </>
                    )}
                  </div>
                </div>
                ) : (
                  <ChartNoData
                    title="No Departments"
                    description="No department data available"
                    icon={Building}
                    iconColor="text-gray-400"
                    bgColor="bg-white"
                  />
                )}

                {/* High Risk Card */}
                {(chartData.riskLevelData?.find((r: any) => r.level === 'high')?.count || 0) > 0 ? (
                <div className="bg-white border border-gray-200 rounded p-4 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-gray-600">High Risk</h3>
                    <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                  <div className="mb-1">
                      <div className="text-xl font-bold text-gray-900">{chartData.riskLevelData?.find((r: any) => r.level === 'high')?.count || 0}</div>
                    <div className="text-xs text-gray-500">high risk cases</div>
                  </div>
                  <div className="flex items-center text-xs text-red-600">
                      {analyticsData?.trends?.highRisk?.direction === 'up' ? (
                      <>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        <span>+{analyticsData?.trends?.highRisk?.change?.toFixed(1) || '0'}%</span>
                      </>
                      ) : analyticsData?.trends?.highRisk?.direction === 'down' ? (
                      <>
                        <TrendingDown className="w-3 h-3 mr-1" />
                        <span>-{analyticsData?.trends?.highRisk?.change?.toFixed(1) || '0'}%</span>
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3 mr-1" />
                        <span>No change</span>
                      </>
                    )}
                  </div>
                </div>
                ) : (
                  <ChartNoData
                    title="No High Risk Cases"
                    description="No high risk individuals found"
                    icon={AlertTriangle}
                    iconColor="text-green-500"
                    bgColor="bg-white"
                  />
                )}
              </div>
              )}

              {/* Combined Row: Attendance Distribution and Department Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compact Attendance Distribution Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-blue-900 mb-1">Attendance Distribution</h4>
                      <p className="text-sm text-gray-600">Quick overview of attendance status</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FullscreenAttendanceDistributionModal
                            totalPresent={chartData.summary?.presentCount || 0}
                            totalLate={chartData.summary?.lateCount || 0}
                            totalAbsent={chartData.summary?.absentCount || 0}
                            type={type}
                            onExport={handleExport}
                            showSecondaryFilters={false}
                            loading={loading}
                            appliedFilters={{
                              department: appliedSelectedDepartment,
                              course: appliedSelectedCourse,
                              section: appliedSelectedSection,
                              yearLevel: appliedSelectedYearLevel,
                              subject: appliedInternalSelectedSubject,
                              timeRange: appliedTimeRange
                            }}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                <Maximize2 className="w-4 h-4 text-gray-400" />
                              </Button>
                            }
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View fullscreen with detailed breakdown</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Donut Chart */}
                  {isBusy ? (
                    <div className="flex items-center justify-center mb-6"><AnalyticsLoadingSpinner /></div>
                  ) : (chartData.summary ? (
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-56 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { 
                                name: 'Present', 
                                value: chartData.summary.presentCount || 0, 
                                color: '#1e40af' // Dark blue
                              },
                              { 
                                name: 'Late', 
                                value: chartData.summary.lateCount || 0, 
                                color: '#0ea5e9' // Light blue/cyan
                              },
                              { 
                                name: 'Absent', 
                                value: chartData.summary.absentCount || 0, 
                                color: '#9ca3af' // Light gray
                              }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {[
                              { name: 'Present', value: chartData.timeBasedData.reduce((sum: number, item: any) => sum + (item.presentCount || 0), 0), color: '#1e40af' },
                              { name: 'Late', value: chartData.timeBasedData.reduce((sum: number, item: any) => sum + (item.lateCount || 0), 0), color: '#0ea5e9' },
                              { name: 'Absent', value: chartData.timeBasedData.reduce((sum: number, item: any) => sum + (item.absentCount || 0), 0), color: '#9ca3af' }
                            ].map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke="#ffffff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                            formatter={(value: any, name: any) => {
                              const total = chartData.timeBasedData.reduce((sum: number, item: any) => sum + (item.presentCount || 0) + (item.lateCount || 0) + (item.absentCount || 0), 0);
                              return [
                                `${value.toLocaleString()} (${total > 0 ? ((value / total) * 100).toFixed(1) : '0'}%)`, 
                                name
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  ) : (
                    <div className="flex items-center justify-center mb-6">
                      <AttendanceDistributionNoData timeRange={timeRange?.preset || 'week'} />
                    </div>
                  ))}
                  
                  {/* Horizontal Legend */}
                  <div className="flex items-center justify-center mb-4 mt-8">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-700 rounded-sm"></div>
                        <span className="text-sm text-gray-700">Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-500 rounded-sm"></div>
                        <span className="text-sm text-gray-700">Late</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
                        <span className="text-sm text-gray-700">Absent</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simplified Department Performance Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-xl font-bold text-blue-900 mb-1">Department Performance</h4>
                      <p className="text-sm text-gray-600">Attendance rates by department</p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <FullscreenDepartmentPerformanceModal
                            departmentStats={chartData.departmentStats}
                            type={type}
                            onExport={handleExport}
                            showSecondaryFilters={false}
                            trigger={
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                <Maximize2 className="w-4 h-4 text-gray-400" />
                              </Button>
                            }
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View fullscreen with detailed breakdown</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  {/* Simple Bar Chart */}
                  <div className={`transition-all duration-300 ${expandedCharts.has("department-performance-overview") ? 'h-96' : 'h-80'}`}>
                    {isBusy ? (
                      <div className="py-12"><AnalyticsLoadingSpinner /></div>
                    ) : (chartData.departmentStats.length === 0 ? (
                      <div>
                        <DepartmentPerformanceNoData timeRange={timeRange?.preset || 'week'} />
                      </div>
                    ) : (
                      <div data-chart="department-stats" className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.departmentStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="code" 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any) => [`${value.toFixed(1)}%`, 'Attendance Rate']}
                        />
                        <Bar 
                          dataKey="attendanceRate" 
                          fill="#1e40af"
                          radius={[4, 4, 0, 0]}
                        />
                        <ReferenceLine 
                          y={85} 
                          stroke="#0ea5e9" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label={{ 
                            value: "Target 85%", 
                            position: "insideTopRight",
                            fill: "#0ea5e9",
                            fontSize: 11,
                            fontWeight: "bold"
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                    ))}
                  </div>

                </div>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="charts" className="space-y-8 mt-6">
              {/* Primary Charts Grid - Essential for Classroom Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overall Attendance Performance */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Attendance Trend Analysis</h4>
                        <p className="text-sm text-gray-600">
                          Complete trend analysis for students
                          {showComparison && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              Comparison enabled
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Comparison Toggle */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={showComparison ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowComparison(!showComparison)}
                              className="h-8 px-3 text-xs rounded"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {showComparison ? "Hide" : "Compare"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showComparison ? "Hide previous period comparison" : "Show comparison with previous period"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <FullscreenWeeklyTrendModal
                              weeklyData={generateDynamicChartData()}
                              type={type}
                              onExport={handleExport}
                              getXAxisConfig={getXAxisConfig}
                              showComparison={showComparison}
                              showSecondaryFilters={false}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                  <Maximize2 className="w-4 h-4 text-gray-400" />
                                </Button>
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View fullscreen with detailed breakdown</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className={`transition-all duration-300 ${expandedCharts.has("weekly-trend") ? 'h-96' : 'h-80'}`}>
                    {isBusy ? (
                      <div className="py-12"><AnalyticsLoadingSpinner /></div>
                    ) : (generateDynamicChartData().length === 0 ? (
                      <div>
                        <AttendanceTrendNoData timeRange={timeRange?.preset || 'week'} />
                      </div>
                    ) : (
                      <div data-chart="attendance-trend" className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generateDynamicChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey={getXAxisConfig().dataKey}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={getXAxisConfig().tickFormatter}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                            return label;
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            if (showComparison && props.payload.previousAttendanceRate !== undefined) {
                              const current = props.payload.attendanceRate;
                              const previous = props.payload.previousAttendanceRate;
                              const change = current - previous;
                              const changePercent = ((change / previous) * 100).toFixed(1);
                              const changeText = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;
                              const changeColor = change >= 0 ? '#10b981' : '#ef4444';
                              
                              return [
                                [
                                  `${value}% (Current)`,
                                  `${previous}% (Previous)`,
                                  `${changeText} change`
                                ],
                                [name, 'Previous Period', 'Change']
                              ];
                            }
                            return [`${value}%`, name];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="attendanceRate" 
                          stroke="#1e40af" 
                          strokeWidth={3}
                          dot={{ fill: '#1e40af', strokeWidth: 2, r: 5, stroke: 'white' }}
                          activeDot={{ r: 7, stroke: '#1e40af', strokeWidth: 3, fill: '#1e40af' }}
                          name="Current Period"
                        />
                        {showComparison && (
                          <Line 
                            type="monotone" 
                            dataKey="previousAttendanceRate" 
                            stroke="#6b7280" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#6b7280', strokeWidth: 2, r: 4, stroke: 'white' }}
                            activeDot={{ r: 6, stroke: '#6b7280', strokeWidth: 2, fill: '#6b7280' }}
                            name="Previous Period"
                          />
                        )}
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          iconType="line"
                          wrapperStyle={{ paddingBottom: '10px' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                    ))}
                  </div>
                </div>

                {/* Late Arrival Trends */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Late Arrival Trends</h4>
                        <p className="text-sm text-gray-600">
                          Late arrival trend analysis for students
                          {showLateComparison && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3" />
                              Comparison enabled
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Comparison Toggle */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={showLateComparison ? "default" : "outline"}
                              size="sm"
                              onClick={() => setShowLateComparison(!showLateComparison)}
                              className="h-8 px-3 text-xs rounded"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {showLateComparison ? "Hide" : "Compare"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showLateComparison ? "Hide previous period comparison" : "Show comparison with previous period"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <FullscreenLateArrivalModal
                              lateData={generateLateArrivalData()}
                              type={type}
                              onExport={handleExport}
                              getXAxisConfig={getXAxisConfig}
                              showComparison={showLateComparison}
                              showSecondaryFilters={false}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                  <Maximize2 className="w-4 h-4 text-gray-400" />
                                </Button>
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View fullscreen with detailed breakdown</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className={`transition-all duration-300 ${expandedCharts.has("late-arrival-trends") ? 'h-96' : 'h-80'}`}>
                    {isBusy ? (
                      <div className="py-12"><AnalyticsLoadingSpinner /></div>
                    ) : (generateLateArrivalData().length === 0 ? (
                      <div>
                        <LateArrivalNoData timeRange={timeRange?.preset || 'week'} />
                      </div>
                    ) : (
                      <div data-chart="late-arrival" className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generateLateArrivalData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey={getXAxisConfig().dataKey}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={getXAxisConfig().tickFormatter}
                        />
                        <YAxis 
                          domain={[0, 25]} 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                            return label;
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            if (showLateComparison && props.payload.previousLateRate !== undefined) {
                              const current = props.payload.lateRate;
                              const previous = props.payload.previousLateRate;
                              const change = current - previous;
                              const changePercent = ((change / previous) * 100).toFixed(1);
                              const changeText = change >= 0 ? `+${changePercent}%` : `${changePercent}%`;
                              
                              return [
                                [
                                  `${value}% (Current)`,
                                  `${previous}% (Previous)`,
                                  `${changeText} change`
                                ],
                                [name, 'Previous Period', 'Change']
                              ];
                            }
                            return [`${value}%`, name];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="lateRate" 
                          stroke="#ef4444" 
                          strokeWidth={3}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 5, stroke: 'white' }}
                          activeDot={{ r: 7, stroke: '#ef4444', strokeWidth: 3, fill: '#ef4444' }}
                          name="Current Period"
                        />
                        {showLateComparison && (
                          <Line 
                            type="monotone" 
                            dataKey="previousLateRate" 
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#94a3b8', strokeWidth: 2, r: 4, stroke: 'white' }}
                            activeDot={{ r: 6, stroke: '#94a3b8', strokeWidth: 2, fill: '#94a3b8' }}
                            name="Previous Period"
                          />
                        )}
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          iconType="line"
                          wrapperStyle={{ paddingBottom: '10px' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                    ))}
                  </div>
                </div>

              </div>
            </TabsContent>

            {/* Patterns Tab */}
            <TabsContent value="advanced" className="space-y-8 mt-6">
              {/* Additional Charts for Advanced Features */}
              {enableAdvancedFeatures && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Pattern Analysis */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Attendance Pattern Analysis</h4>
                        <p className="text-sm text-gray-600">Moving average and peak/low pattern detection</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <FullscreenPatternAnalysisModal
                              patternData={generatePatternAnalysisData}
                              type={type}
                              onExport={handleExport}
                              getXAxisConfig={getXAxisConfig}
                              showSecondaryFilters={false}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                  <Maximize2 className="w-4 h-4 text-gray-400" />
                                </Button>
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View fullscreen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className={`transition-all duration-300 ${expandedCharts.has("pattern-analysis") ? 'h-96' : 'h-80'}`}>
                    {isBusy ? (
                      <div className="py-12"><AnalyticsLoadingSpinner /></div>
                    ) : (generatePatternAnalysisData.length === 0 ? (
                      <div>
                        <PatternAnalysisNoData timeRange={timeRange?.preset || 'week'} />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={generatePatternAnalysisData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey={getXAxisConfig().dataKey}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={getXAxisConfig().tickFormatter}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 100]}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                            return label;
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            const isPeak = props?.payload?.isPeak;
                            const isValley = props?.payload?.isValley;
                            const markers = isPeak ? ' (peak)' : isValley ? ' (low)' : '';
                            if (name === 'movingAverage') return [`${value.toFixed?.(1) ?? value}%`, 'Moving Avg'];
                            return [`${value}%${markers}`, 'Attendance Rate'];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="attendanceRate" 
                          stroke="#1e40af" 
                          strokeWidth={2}
                          dot={false}
                          name="Attendance Rate"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="movingAverage" 
                          stroke="#22c55e" 
                          strokeWidth={3}
                          dot={false}
                          name="Moving Average"
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={50}
                          iconType="line"
                          wrapperStyle={{ paddingBottom: '10px' }}
                          formatter={(value, entry) => {
                            if (value === 'Attendance Rate') {
                              return 'Daily Attendance Rate';
                            } else if (value === 'Moving Average') {
                              return '7-Day Moving Average';
                            }
                            return value;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    ))}
                  </div>
                </div>

                {/* Streak Analysis */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-blue-900">Streak Analysis</h4>
                        <p className="text-sm text-gray-600">Consecutive days of good/poor attendance patterns</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <FullscreenStreakAnalysisModal
                              streakData={generateStreakAnalysisData}
                              type={type}
                              onExport={handleExport}
                              getXAxisConfig={getXAxisConfig}
                              showSecondaryFilters={false}
                              trigger={
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-xl">
                                  <Maximize2 className="w-4 h-4 text-gray-400" />
                                </Button>
                              }
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View fullscreen</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  


                  <div className={`transition-all duration-300 ${expandedCharts.has("streak-analysis") ? 'h-96' : 'h-80'}`}>
                    {isBusy ? (
                      <div className="py-12"><AnalyticsLoadingSpinner /></div>
                    ) : (generateStreakAnalysisData.data.length === 0 ? (
                      <div>
                        <StreakAnalysisNoData timeRange={timeRange?.preset || 'week'} />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={generateStreakAnalysisData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey={getXAxisConfig().dataKey}
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={getXAxisConfig().tickFormatter}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => `${Math.abs(value)}`}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelFormatter={(label) => {
                            const xAxisConfig = getXAxisConfig();
                            if (xAxisConfig.tickFormatter) {
                              return xAxisConfig.tickFormatter(label);
                            }
                            return label;
                          }}
                          formatter={(value: any, name: any, props: any) => {
                            const month = props?.payload?.month;
                            const totalStudents = props?.payload?.totalStudents;
                            const averageStreak = props?.payload?.averageStreak;
                            const monthName = month === 8 ? 'August' : month === 9 ? 'September' : `Month ${month}`;
                            return [
                              `${value.toLocaleString()} ${name}`,
                              `${monthName} - ${totalStudents?.toLocaleString()} students`,
                              `Average: ${averageStreak?.toFixed(1)}%`
                            ];
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="goodStreaks" 
                          fill="#10b981"
                          radius={[2, 2, 0, 0]}
                          name="Good Streaks"
                        />
                        <Bar 
                          dataKey="poorStreaks" 
                          fill="#ef4444"
                          radius={[2, 2, 0, 0]}
                          name="Poor Streaks"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        )}
      </div>
    </div>
  );
}