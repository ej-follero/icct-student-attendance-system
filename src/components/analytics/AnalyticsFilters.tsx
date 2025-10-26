'use client';

import { useEffect, useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRangeSelector } from '../TimeRangeSelector';

interface TimeRange {
  start: Date;
  end: Date;
  preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface AnalyticsFiltersProps {
  selectedDepartment: string;
  selectedRiskLevel: string;
  selectedCourse: string;
  selectedSubject: string;
  selectedSection?: string;
  selectedYearLevel?: string;
  departmentStats: Record<string, any>;
  filterOptions: {
    departments: Array<{ id: string; name: string }>;
    courses: Array<{ id: string; name: string; departmentId: string }>;
    subjects: Array<{ id: string; name: string; courseId: string }>;
    sections?: Array<{ id: string; name: string; courseId?: string; yearLevel?: number }>;
    yearLevels?: Array<{ id: string; name: string }>; // e.g. FIRST_YEAR
  };
  onDepartmentChange: (value: string) => void;
  onRiskLevelChange: (value: string) => void;
  onCourseChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onSectionChange?: (value: string) => void;
  onYearLevelChange?: (value: string) => void;
  enableTimeRange?: boolean;
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onCustomRangeApply?: () => void;
}

export function AnalyticsFilters({
  selectedDepartment,
  selectedRiskLevel,
  selectedCourse,
  selectedSubject,
  selectedSection = 'all',
  selectedYearLevel = 'all',
  departmentStats,
  filterOptions,
  onDepartmentChange,
  onRiskLevelChange,
  onCourseChange,
  onSubjectChange,
  onSectionChange,
  onYearLevelChange,
  enableTimeRange = false,
  timeRange,
  onTimeRangeChange,
  onCustomRangeApply
}: AnalyticsFiltersProps) {
  // Filter courses based on selected department (supports deptId or deptCode)
  const filteredCourses = selectedDepartment !== 'all' 
    ? filterOptions.courses.filter((course: any) => {
        const courseDeptId = course.departmentId != null ? String(course.departmentId) : undefined;
        const courseDeptCode = course.departmentCode != null ? String(course.departmentCode) : undefined;
        const selected = String(selectedDepartment);
        return courseDeptId === selected || courseDeptCode === selected;
      })
    : filterOptions.courses;

  // Filter subjects based on selected course (supports courseId or courseCode)
  const filteredSubjects = selectedCourse !== 'all' 
    ? filterOptions.subjects.filter((subject: any) => {
        const subjCourseId = subject.courseId != null ? String(subject.courseId) : undefined;
        const subjCourseCode = subject.courseCode != null ? String(subject.courseCode) : undefined;
        const selected = String(selectedCourse);
        return subjCourseId === selected || subjCourseCode === selected;
      })
    : filterOptions.subjects;

  // Filter sections based on selected course (if provided) - supports courseId or courseCode
  const allSections = filterOptions.sections || [];
  // Map selected year level string to numeric year level used by Section.yearLevel (1-4)
  const yearLevelMap: Record<string, number> = {
    FIRST_YEAR: 1,
    SECOND_YEAR: 2,
    THIRD_YEAR: 3,
    FOURTH_YEAR: 4
  };
  const selectedYearLevelNumber = yearLevelMap[String(selectedYearLevel)] || undefined;

  const filteredSections = selectedCourse !== 'all'
    ? allSections.filter((section: any) => {
        if (!section.courseId && !section.courseCode) return true;
        const sectionCourseId = section.courseId != null ? String(section.courseId) : undefined;
        const sectionCourseCode = section.courseCode != null ? String(section.courseCode) : undefined;
        const selected = String(selectedCourse);
        const matchesCourse = sectionCourseId === selected || sectionCourseCode === selected;
        const matchesYearLevel = selectedYearLevelNumber ? Number(section.yearLevel) === selectedYearLevelNumber : true;
        return matchesCourse && matchesYearLevel;
      })
    : allSections;

  // Local search states for large lists
  const [courseSearch, setCourseSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [yearLevelSearch, setYearLevelSearch] = useState('');
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const displayCourses = (filteredCourses || []).filter(c =>
    courseSearch.trim().length === 0 || c.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const displaySubjects = (filteredSubjects || []).filter(s =>
    subjectSearch.trim().length === 0 || s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const displaySections = (filteredSections || []).filter(s =>
    sectionSearch.trim().length === 0 || s.name.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  // Ensure year levels are available even if not provided by API
  const defaultYearLevels = [
    { id: 'FIRST_YEAR', name: 'First Year' },
    { id: 'SECOND_YEAR', name: 'Second Year' },
    { id: 'THIRD_YEAR', name: 'Third Year' },
    { id: 'FOURTH_YEAR', name: 'Fourth Year' }
  ];
  const yearLevels = (filterOptions.yearLevels && filterOptions.yearLevels.length > 0)
    ? filterOptions.yearLevels
    : defaultYearLevels;
  const displayYearLevels = yearLevels.filter(y =>
    yearLevelSearch.trim().length === 0 || y.name.toLowerCase().includes(yearLevelSearch.toLowerCase())
  );
  const isDepartmentSelected = selectedDepartment !== 'all';
  const isCourseSelected = selectedCourse !== 'all' && isDepartmentSelected;
  const isYearLevelSelected = selectedYearLevel !== 'all' && isCourseSelected;
  const isSectionSelected = selectedSection !== 'all' && isYearLevelSelected;

  // Debug logging to help identify the sections filter issue
  console.log('🔍 Sections Filter Debug:', {
    selectedCourse,
    selectedYearLevel,
    selectedYearLevelNumber,
    allSectionsCount: allSections.length,
    filteredSectionsCount: filteredSections.length,
    isYearLevelSelected,
    sectionsDisabled: !isYearLevelSelected || (filteredSections || []).length === 0,
    sampleSections: allSections.slice(0, 3).map(s => ({
      id: s.id,
      name: s.name,
      courseId: s.courseId,
      yearLevel: s.yearLevel
    }))
  });
  
  // Auto-open Section dropdown when it becomes enabled and there are sections
  useEffect(() => {
    const hasSections = (filteredSections || []).length > 0;
    if (isYearLevelSelected && hasSections && selectedSection === 'all') {
      setIsSectionOpen(true);
    }
    if (!isYearLevelSelected || !hasSections) {
      setIsSectionOpen(false);
    }
  }, [isYearLevelSelected, filteredSections, selectedSection]);
  
  return (
    <div>
      <div className="flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center justify-end w-full">
        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center justify-end">
          <Select value={selectedDepartment} onValueChange={(value) => {
            onDepartmentChange(value);
            // Reset course and subject when department changes
            if (value !== selectedDepartment) {
              onCourseChange('all');
              onSubjectChange('all');
              onSectionChange && onSectionChange('all');
            }
          }}>
            <SelectTrigger className="w-full xl:w-auto xl:min-w-[200px] xl:max-w-sm rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {filterOptions.departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course - enabled only when Department is selected */}
          <Select 
            value={selectedCourse} 
            onValueChange={(value) => {
              onCourseChange(value);
              // Reset subject when course changes
              if (value !== selectedCourse) {
                onSubjectChange('all');
                onSectionChange && onSectionChange('all');
                onYearLevelChange && onYearLevelChange('all');
              }
            }}
            disabled={!isDepartmentSelected || filteredCourses.length === 0}
          >
            <SelectTrigger className="w-full xl:w-auto xl:min-w-[200px] xl:max-w-sm rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent className={(filteredCourses?.length || 0) >= 10 ? 'max-h-60' : ''}>
              {(filteredCourses?.length || 0) >= 10 && (
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              <SelectItem value="all">All Courses</SelectItem>
              {displayCourses.map(course => (
                <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
              ))}
              {displayCourses.length === 0 && (filteredCourses?.length || 0) >= 10 && courseSearch && (
                <div className="px-2 py-1 text-sm text-gray-500">No courses found</div>
              )}
            </SelectContent>
          </Select>

          {/* Year Level - enabled only when Course is selected */}
          {onYearLevelChange && (
            <Select
              value={selectedYearLevel}
              onValueChange={(value) => {
                onYearLevelChange(value);
                if (value !== selectedYearLevel) {
                  onSectionChange && onSectionChange('all');
                }
              }}
              disabled={!isCourseSelected}
            >
              <SelectTrigger className="w-full sm:w-36 lg:w-40 xl:w-36 rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <SelectValue placeholder="Year Level" />
              </SelectTrigger>
              <SelectContent className={yearLevels.length >= 10 ? 'max-h-60' : ''}>
                {yearLevels.length >= 10 && (
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search year levels..."
                      value={yearLevelSearch}
                      onChange={(e) => setYearLevelSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <SelectItem value="all">All Years</SelectItem>
                {displayYearLevels.map(yl => (
                  <SelectItem key={yl.id} value={yl.id}>{yl.name}</SelectItem>
                ))}
                {displayYearLevels.length === 0 && yearLevels.length >= 10 && yearLevelSearch && (
                  <div className="px-2 py-1 text-sm text-gray-500">No year levels found</div>
                )}
              </SelectContent>
            </Select>
          )}

          {/* Section Selector with search when >= 10 - enabled only when Year Level is selected */}
          {onSectionChange && (
            <Select
              value={selectedSection}
              onValueChange={(value) => {
                onSectionChange(value);
                if (value !== selectedSection) {
                  onSubjectChange('all');
                }
                setIsSectionOpen(false);
              }}
              open={isSectionOpen}
              onOpenChange={setIsSectionOpen}
              disabled={!isYearLevelSelected || (filteredSections || []).length === 0}
            >
              <SelectTrigger className="w-full xl:w-auto xl:min-w-[200px] xl:max-w-sm rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent className={(filteredSections?.length || 0) >= 10 ? 'max-h-60' : ''}>
                {(filteredSections?.length || 0) >= 10 && (
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search sections..."
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <SelectItem value="all">All Sections</SelectItem>
                {displaySections.map(section => (
                  <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                ))}
                {displaySections.length === 0 && (filteredSections?.length || 0) >= 10 && sectionSearch && (
                  <div className="px-2 py-1 text-sm text-gray-500">No sections found</div>
                )}
              </SelectContent>
            </Select>
          )}

          {/* Subject - appears only after a Section is selected */}
          {isSectionSelected && (
            <Select 
              value={selectedSubject} 
              onValueChange={onSubjectChange}
              disabled={!isSectionSelected || filteredSubjects.length === 0}
            >
              <SelectTrigger className="w-full xl:w-auto xl:min-w-[200px] xl:max-w-sm rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent className={(filteredSubjects?.length || 0) >= 10 ? 'max-h-60' : ''}>
                {(filteredSubjects?.length || 0) >= 10 && (
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search subjects..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
                <SelectItem value="all">All Subjects</SelectItem>
                {displaySubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
                {displaySubjects.length === 0 && (filteredSubjects?.length || 0) >= 10 && subjectSearch && (
                  <div className="px-2 py-1 text-sm text-gray-500">No subjects found</div>
                )}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedRiskLevel} onValueChange={onRiskLevelChange}>
            <SelectTrigger className="w-full sm:w-28 lg:w-32 xl:w-28 rounded text-gray-500 border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="none">No Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          {/* Time Range Selector (no custom picker here) */}
          {enableTimeRange && timeRange && onTimeRangeChange && (
            <TimeRangeSelector
              timeRange={timeRange}
              onTimeRangeChange={onTimeRangeChange}
              onCustomRangeApply={onCustomRangeApply}
            />
          )}
        </div>
      </div>
    </div>
  );
} 