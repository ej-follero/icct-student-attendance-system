'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Info, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { format, parseISO, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type SemesterValue = 'FIRST_SEMESTER' | 'SECOND_SEMESTER' | 'THIRD_SEMESTER';

interface SemesterData {
  id?: number;
  semesterType: SemesterValue;
  startDate: Date | null;
  endDate: Date | null;
  registrationStart: Date | null;
  registrationEnd: Date | null;
  enrollmentStart: Date | null;
  enrollmentEnd: Date | null;
  notes: string;
  isActive: boolean;
}

interface ExistingSemester {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  enrollmentStart?: string | null;
  enrollmentEnd?: string | null;
  notes?: string | null;
  type?: string | null;
  isActive?: boolean | null;
}

interface ExistingAcademicYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  semesters: ExistingSemester[];
}

interface AcademicYearFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (mode: 'create' | 'edit') => void;
  initialData?: ExistingAcademicYear | null;
}

const SEMESTER_TYPES = [
  { value: 'FIRST_SEMESTER', label: '1st Semester' },
  { value: 'SECOND_SEMESTER', label: '2nd Semester' },
  { value: 'THIRD_SEMESTER', label: 'Summer Term' }
] as const;

const assignActiveSemesterByDate = (semesters: SemesterData[]): SemesterData[] => {
  const today = startOfDay(new Date());
  let activeIndex = -1;

  const normalized = semesters.map((semester, index) => {
    const start = semester.startDate ? startOfDay(semester.startDate) : null;
    const end = semester.endDate ? startOfDay(semester.endDate) : null;
    const isCurrent =
      start !== null &&
      end !== null &&
      start.getTime() <= today.getTime() &&
      end.getTime() >= today.getTime();

    if (isCurrent && activeIndex === -1) {
      activeIndex = index;
    }

    return {
      ...semester,
      startDate: semester.startDate ? new Date(semester.startDate) : null,
      endDate: semester.endDate ? new Date(semester.endDate) : null,
      isActive: false
    };
  });

  if (activeIndex >= 0) {
    normalized[activeIndex] = { ...normalized[activeIndex], isActive: true };
  }

  return normalized;
};

const createEmptySemester = (semesterType: SemesterValue = 'FIRST_SEMESTER'): SemesterData => ({
  semesterType,
  startDate: null,
  endDate: null,
  registrationStart: null,
  registrationEnd: null,
  enrollmentStart: null,
  enrollmentEnd: null,
  notes: '',
  isActive: false
});

const computeYearActive = (semesters: SemesterData[]): boolean => {
  const today = startOfDay(new Date()).getTime();
  let earliestTime: number | null = null;
  let latestTime: number | null = null;

  semesters.forEach((semester) => {
    if (!semester.startDate || !semester.endDate) {
      return;
    }

    const startTime = startOfDay(new Date(semester.startDate)).getTime();
    const endTime = startOfDay(new Date(semester.endDate)).getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      return;
    }

    if (earliestTime === null || startTime < earliestTime) {
      earliestTime = startTime;
    }
    if (latestTime === null || endTime > latestTime) {
      latestTime = endTime;
    }
  });

  if (earliestTime === null || latestTime === null) {
    return false;
  }

  return earliestTime <= today && latestTime >= today;
};

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formattedValue = value ? format(value, 'yyyy-MM-dd') : '';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (!nextValue) {
      onChange(null);
      return;
    }

    try {
      const parsed = parseISO(nextValue);
      if (!Number.isNaN(parsed.getTime())) {
        onChange(parsed);
      } else {
        onChange(null);
      }
    } catch (error) {
      onChange(null);
    }
  };

  const openPicker = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.();
      inputRef.current.focus();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-blue-900">{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="date"
          value={formattedValue}
          onChange={handleChange}
          placeholder="mm/dd/yyyy"
          className={cn(
            'pr-11 text-sm text-blue-900 border-blue-200 bg-white hover:border-blue-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 appearance-none',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none',
            '[&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden'
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-blue-400 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-hidden="true"
          tabIndex={-1}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AcademicYearFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData
}: AcademicYearFormDialogProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [semesters, setSemesters] = useState<SemesterData[]>(() =>
    assignActiveSemesterByDate([createEmptySemester()])
  );
  const [expandedSemesters, setExpandedSemesters] = useState<boolean[]>([true]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(initialData);
  const isYearActive = computeYearActive(semesters);

  useEffect(() => {
    if (initialData) {
      try {
        const parsedYear = Number(initialData.name?.split('-')[0]) || new Date(initialData.startDate).getFullYear();
        setYear(parsedYear);

        const normalizeType = (value: string | null | undefined, index: number): SemesterValue => {
          if (!value) {
            return SEMESTER_TYPES[index]?.value || 'FIRST_SEMESTER';
          }
          const upper = value.replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase();
          const mapping: Record<string, SemesterValue> = {
            FIRST_SEMESTER: 'FIRST_SEMESTER',
            SECOND_SEMESTER: 'SECOND_SEMESTER',
            THIRD_SEMESTER: 'THIRD_SEMESTER',
            '1ST_SEMESTER': 'FIRST_SEMESTER',
            '2ND_SEMESTER': 'SECOND_SEMESTER',
            '3RD_SEMESTER': 'THIRD_SEMESTER',
            'FIRST_TRIMESTER': 'FIRST_SEMESTER',
            'SECOND_TRIMESTER': 'SECOND_SEMESTER',
            'THIRD_TRIMESTER': 'THIRD_SEMESTER',
            '1ST': 'FIRST_SEMESTER',
            '2ND': 'SECOND_SEMESTER',
            '3RD': 'THIRD_SEMESTER',
            'SUMMER': 'THIRD_SEMESTER'
          };
          return mapping[upper] || SEMESTER_TYPES[index]?.value || 'FIRST_SEMESTER';
        };

        const mappedSemesters = initialData.semesters.map((sem, index) => ({
          id: sem.id,
          semesterType: normalizeType(sem.type, index),
          startDate: sem.startDate ? new Date(sem.startDate) : null,
          endDate: sem.endDate ? new Date(sem.endDate) : null,
          registrationStart: sem.registrationStart ? new Date(sem.registrationStart) : null,
          registrationEnd: sem.registrationEnd ? new Date(sem.registrationEnd) : null,
          enrollmentStart: sem.enrollmentStart ? new Date(sem.enrollmentStart) : null,
          enrollmentEnd: sem.enrollmentEnd ? new Date(sem.enrollmentEnd) : null,
          notes: sem.notes || '',
          isActive: Boolean(sem.isActive)
        }));

        const preparedSemesters = assignActiveSemesterByDate(mappedSemesters);
        setSemesters(preparedSemesters);
        setExpandedSemesters(new Array(preparedSemesters.length).fill(true));
      } catch (err) {
        console.error('Failed to prepare initial data for edit:', err);
      }
    } else {
      setYear(new Date().getFullYear());
      const preparedSemesters = assignActiveSemesterByDate([createEmptySemester()]);
      setSemesters(preparedSemesters);
      setExpandedSemesters(new Array(preparedSemesters.length).fill(true));
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialData, open]);

  useEffect(() => {
    setExpandedSemesters((prev) => {
      if (semesters.length === prev.length) {
        return prev;
      }
      if (semesters.length > prev.length) {
        return [...prev, ...new Array(semesters.length - prev.length).fill(true)];
      }
      return prev.slice(0, semesters.length);
    });
  }, [semesters.length]);

  const addSemester = () => {
    setSemesters((prevSemesters) => {
      const usedTypes = prevSemesters.map((s) => s.semesterType);
      const availableType = SEMESTER_TYPES.find((type) => !usedTypes.includes(type.value));

      if (!availableType) {
        return prevSemesters;
      }

      const nextSemesters = [
        ...prevSemesters,
        createEmptySemester(availableType.value)
      ];

      return assignActiveSemesterByDate(nextSemesters);
    });
  };

  const removeSemester = (index: number) => {
    setSemesters((prevSemesters) => {
      if (prevSemesters.length <= 1) {
        return prevSemesters;
      }

      const nextSemesters = prevSemesters.filter((_, i) => i !== index);
      return assignActiveSemesterByDate(nextSemesters);
    });
  };

  const updateSemester = (index: number, field: keyof SemesterData, value: any) => {
    setSemesters((prevSemesters) => {
      const nextSemesters = prevSemesters.map((semester, i) =>
        i === index ? { ...semester, [field]: value } : semester
      );

      return assignActiveSemesterByDate(nextSemesters);
    });
  };

  const toggleSemesterExpanded = (index: number) => {
    setExpandedSemesters((prev) =>
      prev.map((value, i) => (i === index ? !value : value))
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate all semesters have required fields
      for (let i = 0; i < semesters.length; i++) {
        const semester = semesters[i];
        if (!semester.startDate || !semester.endDate) {
          throw new Error(`Semester ${i + 1}: Start date and end date are required`);
        }
        if (semester.startDate >= semester.endDate) {
          throw new Error(`Semester ${i + 1}: Start date must be before end date`);
        }
      }

      // Check for overlapping semesters
      for (let i = 0; i < semesters.length; i++) {
        for (let j = i + 1; j < semesters.length; j++) {
          const sem1 = semesters[i];
          const sem2 = semesters[j];
          
          if (sem1.startDate && sem1.endDate && sem2.startDate && sem2.endDate) {
            if (
              (sem1.startDate <= sem2.endDate && sem1.endDate >= sem2.startDate)
            ) {
              throw new Error(`Semester ${i + 1} and Semester ${j + 1} have overlapping dates`);
            }
          }
        }
      }

      const normalizedSemesters = assignActiveSemesterByDate(semesters);
      const yearActive = computeYearActive(normalizedSemesters);
      setSemesters(normalizedSemesters);

      const payload = {
        year,
        isActive: yearActive,
        semesters: normalizedSemesters.map(sem => ({
          id: sem.id,
          ...sem,
          startDate: sem.startDate?.toISOString(),
          endDate: sem.endDate?.toISOString(),
          registrationStart: sem.registrationStart?.toISOString(),
          registrationEnd: sem.registrationEnd?.toISOString(),
          enrollmentStart: sem.enrollmentStart?.toISOString(),
          enrollmentEnd: sem.enrollmentEnd?.toISOString(),
        }))
      };

      const url = isEditMode && initialData ? `/api/academic-years/${initialData.id}` : '/api/academic-years';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create academic year');
      }

      onSuccess?.(isEditMode ? 'edit' : 'create');
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 sm:max-w-[600px] sm:mx-4 sm:my-1 md:max-w-[750px] md:mx-6 md:my-1 lg:max-w-[900px] lg:mx-8 lg:my-1 flex flex-col">
        <DialogTitle className="sr-only">Create Academic Year</DialogTitle>

        <div className={`bg-gradient-to-r from-[#1c4ed8] via-[#2755e0] to-[#3b82f6] p-6 relative flex-shrink-0`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex items-start gap-4 pr-24">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-semibold">AY</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {isEditMode ? 'Edit Academic Year' : 'Create New Academic Year'}
              </h2>
              <p className="text-blue-100 text-sm">
                {isEditMode
                  ? 'Update trimester schedules and details for this academic cycle'
                  : 'Set up a new academic year with its trimesters and date ranges'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-6 pb-10">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="rounded border border-blue-100 bg-blue-50/40 px-4 py-3 text-blue-700 flex items-center gap-3">
                  <Info className="h-4 w-4" />
                  <p className="text-sm">All fields marked with <span className="font-semibold text-red-500">*</span> are required to complete each trimester.</p>
                </div>

                {/* Academic Year */}
                <div className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border-b border-blue-100 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/90 text-white font-semibold">
                        AY
                      </div>
                      <div>
                        <Label htmlFor="year" className="text-base font-semibold text-blue-900">
                          Academic Year <span className="text-xs font-semibold text-red-500">*</span>
                        </Label>
                        <p className="text-xs text-blue-500">
                          Provide the school year span for this academic cycle
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input
                        id="year"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        min="2000"
                        max="2100"
                        className="w-32"
                        required
                        disabled={isEditMode}
                      />
                      <span className="text-sm text-gray-500">
                        ({year}-{year + 1})
                      </span>
                    </div>
                    <div className="pt-2 border-t border-blue-100">
                      <div className="flex items-center gap-3">
                        <Badge variant={isYearActive ? 'default' : 'secondary'}>
                          {isYearActive ? 'Active (auto)' : 'Inactive (auto)'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Status updates automatically based on today&apos;s date.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Semesters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSemester}
                      disabled={semesters.length >= 3}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Semester
                    </Button>
                  </div>

                  {semesters.map((semester, index) => {
                    const isExpanded = expandedSemesters[index] ?? true;
                    return (
                      <div key={index} className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border-b border-blue-100 px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/90 text-white font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-blue-900">Semester {index + 1}</h4>
                              <p className="text-xs text-blue-500">Define key dates and notes for this semester</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleSemesterExpanded(index)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 transition"
                              aria-label={`Toggle details for semester ${index + 1}`}
                            >
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  isExpanded ? 'rotate-0' : '-rotate-90'
                                )}
                              />
                            </button>
                            {semesters.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSemester(index)}
                                className="text-red-500 hover:bg-red-50 rounded-full"
                                aria-label={`Remove trimester ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Semester Type */}
                              <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-blue-900">
                                  Semester Type
                                  <span className="text-xs font-semibold text-red-500">*</span>
                                </Label>
                                <Select
                                  value={semester.semesterType}
                                  onValueChange={(value) => updateSemester(index, 'semesterType', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SEMESTER_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label className="flex items-center gap-1 text-blue-900">
                                  Active Status
                                </Label>
                                <div className="flex items-center gap-3">
                                  <Badge variant={semester.isActive ? 'default' : 'secondary'}>
                                    {semester.isActive ? 'Active (auto)' : 'Inactive (auto)'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    Determined automatically by the semester dates.
                                  </span>
                                </div>
                              </div>

                              {/* Start Date */}
                              <DateField
                                label="Start Date *"
                                value={semester.startDate}
                                onChange={(date) => updateSemester(index, 'startDate', date)}
                              />

                              {/* End Date */}
                              <DateField
                                label="End Date *"
                                value={semester.endDate}
                                onChange={(date) => updateSemester(index, 'endDate', date)}
                              />

                              {/* Registration Start */}
                              <DateField
                                label="Registration Start (Optional)"
                                value={semester.registrationStart}
                                onChange={(date) => updateSemester(index, 'registrationStart', date)}
                              />

                              {/* Registration End */}
                              <DateField
                                label="Registration End (Optional)"
                                value={semester.registrationEnd}
                                onChange={(date) => updateSemester(index, 'registrationEnd', date)}
                              />

                              {/* Enrollment Start */}
                              <DateField
                                label="Enrollment Start (Optional)"
                                value={semester.enrollmentStart}
                                onChange={(date) => updateSemester(index, 'enrollmentStart', date)}
                              />

                              {/* Enrollment End */}
                              <DateField
                                label="Enrollment End (Optional)"
                                value={semester.enrollmentEnd}
                                onChange={(date) => updateSemester(index, 'enrollmentEnd', date)}
                              />

                              {/* Notes */}
                              <div className="space-y-2 md:col-span-2">
                                <Label className="text-blue-900">Notes <span className="text-xs text-gray-400">(Optional)</span></Label>
                                <Input
                                  value={semester.notes}
                                  onChange={(e) => updateSemester(index, 'notes', e.target.value)}
                                  placeholder="Additional notes for this semester"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </div>
          <div className="flex-shrink-0 border-t border-blue-100 bg-white/95 px-6 py-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Academic Year')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
