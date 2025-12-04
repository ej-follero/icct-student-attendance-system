"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchableSelect, { MultiSearchableSelectSearch as MultiSearchableSelect } from "@/components/reusable/Search/SearchableSelect";
import { CheckCircle, X, Info, Upload, FileText, Download, AlertCircle } from "lucide-react";

type ManualAttendancePayload = {
  entityType: "student" | "instructor";
  entityId: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  subjectSchedId?: number | null; // Subject schedule ID
  eventId?: number | null; // Event ID
  timestamp?: string;
  notes?: string;
  attendanceType?: "MANUAL_ENTRY";
  userRole?: "STUDENT" | "INSTRUCTOR";
};

interface ManualAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntityType?: "student" | "instructor";
  defaultEntityId?: number;
  defaultSubjectSchedId?: number | null;
  autoDetectEntity?: boolean; // New prop to enable auto-detection
  onSuccess?: () => void;
}

export function ManualAttendanceDialog({
  open,
  onOpenChange,
  defaultEntityType = "instructor",
  defaultEntityId,
  defaultSubjectSchedId = null,
  autoDetectEntity = false,
  onSuccess,
}: ManualAttendanceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"manual" | "upload">("manual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect entity type based on current page
  const detectedEntityType = useMemo(() => {
    if (autoDetectEntity && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/students')) return "student";
      if (path.includes('/instructors')) return "instructor";
    }
    return defaultEntityType;
  }, [autoDetectEntity, defaultEntityType]);

  const [entityType, setEntityType] = useState<"student" | "instructor">(detectedEntityType);
  const [entityId, setEntityId] = useState<string>(defaultEntityId ? String(defaultEntityId) : "");
  const [status, setStatus] = useState<ManualAttendancePayload["status"]>("PRESENT");
  const [subjectSchedId, setSubjectSchedId] = useState<string>(defaultSubjectSchedId ? String(defaultSubjectSchedId) : "");
  const [enrolledOptions, setEnrolledOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [timestamp, setTimestamp] = useState<string>(() => new Date().toISOString().slice(0, 16)); // yyyy-MM-ddTHH:mm
  const [notes, setNotes] = useState<string>("");

  // Restrict to students only when defaultEntityType is explicitly set to 'student'
  const restrictToStudents = useMemo(() => defaultEntityType === 'student', [defaultEntityType]);

  // Reset all fields to defaults
  const resetForm = useMemo(() => (
    () => {
      setEntityType(detectedEntityType);
      setEntityId(defaultEntityId ? String(defaultEntityId) : "");
      setStatus("PRESENT");
      setSubjectSchedId(defaultSubjectSchedId ? String(defaultSubjectSchedId) : "");
      setEnrolledOptions([]);
      setTimestamp(new Date().toISOString().slice(0, 16));
      setNotes("");
      setUploadFile(null);
      setUploadProgress(0);
      setUploadResults(null);
      setError(null);
      setActiveTab("manual");
    }
  ), [detectedEntityType, defaultEntityId, defaultSubjectSchedId]);

  // Clear subject schedule when entity changes
  useEffect(() => {
    setSubjectSchedId("");
  }, [entityType, entityId]);

  // When a student is selected, fetch enrolled schedules for convenient picking
  useEffect(() => {
    let cancelled = false;
    async function loadEnrolled() {
      try {
        if (entityType !== 'student') { setEnrolledOptions([]); return; }
        const numericId = Number(entityId);
        if (!numericId || !Number.isFinite(numericId)) { setEnrolledOptions([]); return; }
        const res = await fetch(`/api/students/${numericId}/enrolled-schedules`, { cache: 'no-store' });
        if (!res.ok) { setEnrolledOptions([]); return; }
        const data = await res.json();
        if (cancelled) return;
        setEnrolledOptions(Array.isArray(data.items) ? data.items : []);
        // If exactly one schedule, preselect it for convenience
        if (Array.isArray(data.items) && data.items.length === 1) {
          setSubjectSchedId(data.items[0].value);
        }
      } catch {
        if (!cancelled) setEnrolledOptions([]);
      }
    }
    loadEnrolled();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  // File upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const isValid = useMemo(() => {
    return entityId.trim().length > 0 && status !== undefined;
  }, [entityId, status]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Parse the selected value to determine if it's a schedule or event
      let parsedSubjectSchedId: number | undefined = undefined;
      let parsedEventId: number | undefined = undefined;
      
      if (subjectSchedId) {
        if (subjectSchedId.startsWith('schedule:')) {
          parsedSubjectSchedId = Number(subjectSchedId.replace('schedule:', ''));
        } else if (subjectSchedId.startsWith('event:')) {
          parsedEventId = Number(subjectSchedId.replace('event:', ''));
        } else {
          // Legacy format - assume it's a schedule ID
          parsedSubjectSchedId = Number(subjectSchedId);
        }
      }
      
      const payload: ManualAttendancePayload = {
        entityType,
        entityId: Number(entityId),
        status,
        subjectSchedId: parsedSubjectSchedId,
        eventId: parsedEventId,
        timestamp: timestamp ? new Date(timestamp).toISOString() : undefined,
        notes: notes || undefined,
        attendanceType: "MANUAL_ENTRY",
        userRole: entityType === "student" ? "STUDENT" : "INSTRUCTOR",
      };

      console.log('Sending payload:', payload);

      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('API Error response:', err);
        throw new Error(err?.error || err?.details || `Failed to save manual attendance (HTTP ${res.status})`);
      }

      const result = await res.json();

      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save manual attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    try {
      setSubmitting(true);
      setError(null);
      setUploadProgress(0);
      setUploadResults(null);

      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(uploadFile.type) && 
          !uploadFile.name.match(/\.(csv|xlsx|xls)$/i)) {
        throw new Error('Invalid file type. Please upload CSV or Excel files only.');
      }

      // Validate file size (10MB limit)
      if (uploadFile.size > 10 * 1024 * 1024) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('entityType', entityType);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch("/api/attendance/bulk-upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to upload attendance data (HTTP ${res.status})`);
      }

      const result = await res.json();
      setUploadResults(result);
      
      // Clear file after successful upload
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload attendance data");
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type) && 
          !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError('Invalid file type. Please upload CSV or Excel files only.');
        return;
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Maximum size is 10MB.');
        return;
      }

      setUploadFile(file);
      setUploadResults(null);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!allowedTypes.includes(file.type) && 
          !file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError('Invalid file type. Please upload CSV or Excel files only.');
        return;
      }

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Maximum size is 10MB.');
        return;
      }

      setUploadFile(file);
      setUploadResults(null);
      setError(null);
    }
  };

  const downloadTemplate = (format: 'csv' | 'xlsx' = 'csv') => {
    if (format === 'csv') {
      const csvContent = `Entity ID,Status,Subject Schedule ID,Timestamp,Notes
12345,PRESENT,67890,2024-01-15T09:00:00,On time
12346,ABSENT,67891,2024-01-15T09:00:00,No show
12347,LATE,67892,2024-01-15T09:15:00,Late arrival
12348,EXCUSED,67893,2024-01-15T09:00:00,Medical excuse`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manual_attendance_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // For Excel, we'll provide a CSV that can be opened in Excel
      const csvContent = `Entity ID,Status,Subject Schedule ID,Timestamp,Notes
12345,PRESENT,67890,2024-01-15T09:00:00,On time
12346,ABSENT,67891,2024-01-15T09:00:00,No show
12347,LATE,67892,2024-01-15T09:15:00,Late arrival
12348,EXCUSED,67893,2024-01-15T09:00:00,Medical excuse`;
      
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'manual_attendance_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (submitting) return;
    if (!v) {
      resetForm();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-full w-full max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 sm:max-w-[700px] sm:mx-4 sm:my-1 md:max-w-[800px] md:mx-6 md:my-1 flex flex-col h-full">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-2xl p-6 relative flex-shrink-0">
          <div className="flex items-start gap-4 pr-12">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white text-2xl font-bold">Manual Attendance</DialogTitle>
              <p className="text-white/80 text-sm">Record a manual attendance entry for a student</p>
            </div>
          </div>
          <div className="absolute top-6 right-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-white/20 text-white"
              onClick={() => onOpenChange(false)}
              aria-label="Close dialog"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "upload")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid gap-2">
                <Label>Entity Type</Label>
                <Select 
                  value={entityType} 
                  onValueChange={(v) => setEntityType(v as "student" | "instructor")}
                  disabled={autoDetectEntity || restrictToStudents}
                > 
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    {!restrictToStudents && (
                      <SelectItem value="instructor">Instructor</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {autoDetectEntity && (
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Auto-detected from current page
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>{entityType === "student" ? "Student" : "Instructor"}</Label>
                <div className="relative">
                  <SearchableSelect
                    options={[]}
                    value={entityId}
                    onChange={(v) => setEntityId(v)}
                    placeholder={`Search ${entityType} by name or ID...`}
                    className="[&_input]:text-gray-900 [&_input]:placeholder:text-gray-500"
                    asyncSearch={async (query) => {
                      try {
                        const res = await fetch(`/api/search/entities?type=${entityType}&q=${encodeURIComponent(query)}&limit=10`);
                        if (!res.ok) return [];
                        const data = await res.json();
                        return Array.isArray(data.items) ? data.items : [];
                      } catch {
                        return [];
                      }
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">Tip: Start typing to search. You can still paste a numeric ID.</div>
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ManualAttendancePayload["status"]) }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="EXCUSED">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Event/Schedule (optional)</Label>
                <div className="relative">
                  <SearchableSelect
                    options={enrolledOptions}
                    value={subjectSchedId}
                    onChange={(v) => setSubjectSchedId(v)}
                    placeholder="Search by subject code, subject name, or section..."
                    className="[&_input]:text-gray-900 [&_input]:placeholder:text-gray-500"
                    asyncSearch={async (query) => {
                      try {
                        if (!query || query.trim().length < 2) return [];
                        
                        // Build API URL with entity information
                        const params = new URLSearchParams({
                          q: query.trim(),
                          limit: '10',
                          entityType: entityType,
                          entityId: entityId || ''
                        });
                        
                        // Try the main API first
                        const res = await fetch(`/api/search/schedules?${params.toString()}`);
                        if (res.ok) {
                          const data = await res.json();
                          return Array.isArray(data.items) ? data.items : [];
                        }
                        
                        // Fallback to test data if main API fails
                        const testRes = await fetch('/api/search/schedules/test');
                        if (testRes.ok) {
                          const testData = await testRes.json();
                          return Array.isArray(testData.items) ? testData.items : [];
                        }
                        
                        return [];
                      } catch (error) {
                        // Return some fallback data for development
                        return enrolledOptions.length > 0 ? enrolledOptions : [];
                      }
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  Tip: Links attendance to a specific class schedule or event. Search by subject code, event title, or location. Schedules show a book icon and events show a calendar icon.
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Timestamp</Label>
                <Input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">Bulk Upload Instructions</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Upload a CSV or Excel file with manual attendance data. The template includes all required fields according to the database schema.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadTemplate('csv')}
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        CSV Template
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => downloadTemplate('xlsx')}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel Template
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Entity Type</Label>
                <Select 
                  value={entityType} 
                  onValueChange={(v) => setEntityType(v as "student" | "instructor")}
                  disabled={autoDetectEntity}
                > 
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
                {autoDetectEntity && (
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Auto-detected from current page
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label>File Upload</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <div className="space-y-3">
                      <FileText className="w-8 h-8 text-green-600 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      
                      {/* Progress Bar */}
                      {submitting && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          disabled={submitting}
                        >
                          Remove File
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileUpload();
                          }}
                          disabled={submitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {submitting ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Drop your file here or click to browse
                        </p>
                        <Button 
                          variant="outline" 
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        CSV or Excel files (.csv, .xlsx, .xls), max 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploadResults && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-1">Upload Complete</h4>
                      <p className="text-sm text-green-700 mb-2">
                        Successfully processed {uploadResults.success} records
                      </p>
                      {uploadResults.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
                          <ul className="text-xs text-red-600 space-y-1">
                            {uploadResults.errors.slice(0, 5).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {uploadResults.errors.length > 5 && (
                              <li>• ... and {uploadResults.errors.length - 5} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="border-blue-300 text-blue-700 hover:bg-blue-50 rounded">Cancel</Button>
          {activeTab === "manual" ? (
            <Button 
              onClick={handleSubmit} 
              disabled={!isValid || submitting} 
              className="bg-blue-600 hover:bg-blue-700 rounded"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {uploadFile && (
                <Button 
                  onClick={handleFileUpload} 
                  disabled={submitting} 
                  className="bg-blue-600 hover:bg-blue-700 rounded"
                >
                  {submitting ? "Uploading..." : "Upload File"}
                </Button>
              )}
              {uploadResults && (
                <Button 
                  onClick={() => {
                    setUploadResults(null);
                    setUploadFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50 rounded"
                >
                  Upload Another
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManualAttendanceDialog;


