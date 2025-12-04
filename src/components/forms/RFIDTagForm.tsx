"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SearchableSelect from "@/components/reusable/Search/SearchableSelect";
import { useUser } from "@/hooks/useUser";
import { useMQTTRFIDScan } from "@/hooks/useMQTTRFIDScan";

// RFID Tag form schema
const rfidTagFormSchema = z.object({
  tagNumber: z.string()
    .min(1, "Tag number is required")
    .max(50, "Tag number must be less than 50 characters")
    .regex(/^[A-Z0-9\-_]+$/, "Tag number can only contain uppercase letters, numbers, hyphens, and underscores"),
  tagType: z.enum(["STUDENT_CARD", "TEMPORARY_PASS", "VISITOR_PASS", "MAINTENANCE", "TEST"]),
  status: z.enum(["ACTIVE", "INACTIVE", "LOST", "DAMAGED", "EXPIRED", "REPLACED", "RESERVED"]),
  notes: z.string().optional(),
  studentId: z.number().optional(),
  // Instructor assignment removed
  assignedBy: z.number().optional(),
  assignmentReason: z.string().optional(),
  expiresAt: z.string().optional(),
  assignedAt: z.string().optional(),
});

type RFIDTagFormValues = z.infer<typeof rfidTagFormSchema>;

interface RFIDTagFormProps {
  initialData?: {
    tagId: number;
    tagNumber: string;
    tagType: 'STUDENT_CARD' | 'TEMPORARY_PASS' | 'VISITOR_PASS' | 'MAINTENANCE' | 'TEST';
    status: 'ACTIVE' | 'INACTIVE' | 'LOST' | 'DAMAGED' | 'EXPIRED' | 'REPLACED' | 'RESERVED';
    notes?: string;
    studentId?: number;
    
  assignedBy?: number;
  assignmentReason?: string;
  expiresAt?: string;
  assignedAt?: string;
  };
  onSubmit: (data: RFIDTagFormValues) => Promise<void>;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
  showFooter?: boolean;
  onReset?: () => void;
  formRef?: React.RefObject<HTMLFormElement> | null;
}

export function RFIDTagForm({ 
  initialData, 
  onSubmit, 
  isSubmitting = false, 
  mode = 'create',
  showFooter = true,
  onReset,
  formRef = null,
}: RFIDTagFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastProcessedScan, setLastProcessedScan] = useState<string | null>(null);
  const [componentMountTime] = useState(Date.now());
  const [studentInfo, setStudentInfo] = useState<{firstName: string, lastName: string, studentIdNum: string} | null>(null);
  const { user } = useUser();

  // RFID scan monitoring via MQTT
  const { setMode, isConnected, recentScans, sendFeedback } = useMQTTRFIDScan({
    enabled: true,
    mode: 'registration',
    onNewScan: (scan) => {
      console.log('🔍 RFID Tag Form - Scan detected:', scan);
      console.log('🔍 MQTT Connected:', isConnected);
      console.log('🔍 Recent scans count:', recentScans.length);
      
      // Validate scan data - must have valid RFID data and timestamp
      if (!scan || !scan.rfid || !scan.timestamp) {
        console.log('❌ Invalid scan data, ignoring');
        return;
      }
      
      // Check if this is a recent scan (within last 5 seconds) to avoid duplicates
      const scanTime = new Date(scan.timestamp).getTime();
      const now = Date.now();
      const timeDiff = now - scanTime;
      
      if (timeDiff > 5000) { // 5 seconds
        console.log('⏰ Scan too old, ignoring');
        return;
      }
      
      // Only process scans that occurred after this component was mounted
      if (scanTime < componentMountTime) {
        console.log('⏰ Scan occurred before component mount, ignoring');
        return;
      }
      
      const tag = String(scan.rfid).trim();
      if (!tag) {
        console.log('❌ Empty tag number, ignoring');
        return;
      }
      
      // Check if we've already processed this scan
      const scanId = `${tag}-${scan.timestamp}`;
      if (lastProcessedScan === scanId) {
        console.log('🔄 Scan already processed, ignoring');
        return;
      }
      
      console.log('✅ Processing new RFID scan:', tag);
      
      // Auto-populate tag number field when RFID card is tapped (both create and edit modes)
      setLastProcessedScan(scanId);
      form.setValue('tagNumber', tag);
      toast.success(`Card detected: ${tag}`, {
        description: 'Tag number auto-filled'
      });
      
      // Send feedback to MQTT
      if (sendFeedback) {
        sendFeedback('Card detected', tag);
      }
      
      // Show visual feedback in the form
      const tagNumberInput = document.querySelector('input[name="tagNumber"]') as HTMLInputElement;
      if (tagNumberInput) {
        tagNumberInput.style.backgroundColor = '#d4edda';
        tagNumberInput.style.borderColor = '#28a745';
        setTimeout(() => {
          tagNumberInput.style.backgroundColor = '';
          tagNumberInput.style.borderColor = '';
        }, 2000);
      }
    }
  });

  // Debug MQTT connection status
  useEffect(() => {
    console.log('MQTT Connection Status:', isConnected);
    console.log('Recent Scans:', recentScans.length);
  }, [isConnected, recentScans]);

  // Set MQTT mode to registration when component mounts
  useEffect(() => {
    if (setMode) {
      setMode('registration');
    }
  }, [setMode]);

  const form = useForm<RFIDTagFormValues>({
    resolver: zodResolver(rfidTagFormSchema),
    defaultValues: {
      tagNumber: initialData?.tagNumber || '',
      tagType: initialData?.tagType || 'STUDENT_CARD',
      status: initialData?.status || 'ACTIVE',
      notes: initialData?.notes || '',
      studentId: initialData?.studentId || undefined,
      
      assignedBy: initialData?.assignedBy || (user?.id ? Number(user.id) : undefined),
      assignmentReason: initialData?.assignmentReason || '',
      expiresAt: initialData?.expiresAt || '',
      assignedAt: initialData?.assignedAt || '',
    },
  });

  // Auto-populate assignedBy with current user when user data is available
  useEffect(() => {
    if (user?.id && mode === 'create') {
      form.setValue('assignedBy', Number(user.id));
    }
  }, [user, form, mode]);

  // Fetch student information when in edit mode
  useEffect(() => {
    const fetchStudentInfo = async () => {
      if (mode === 'edit' && initialData?.studentId) {
        try {
          const response = await fetch(`/api/students/${initialData.studentId}`);
          if (response.ok) {
            const result = await response.json();
            const student = result.data; // API returns data wrapped in { data: student }
            if (student) {
              setStudentInfo({
                firstName: student.firstName,
                lastName: student.lastName,
                studentIdNum: student.studentIdNum
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch student info:', error);
        }
      }
    };

    fetchStudentInfo();
  }, [mode, initialData?.studentId]);

  // Fetch assigned by user information when in edit mode
  const [assignedByUser, setAssignedByUser] = useState<{userName: string, email: string} | null>(null);
  
  useEffect(() => {
    console.log('Initial data in edit mode:', initialData); // Debug log
    console.log('AssignedAt from initialData:', initialData?.assignedAt); // Debug log
    console.log('Form values:', form.getValues()); // Debug log
    const fetchAssignedByUser = async () => {
      if (mode === 'edit' && initialData?.assignedBy) {
        try {
          const response = await fetch(`/api/users/${initialData.assignedBy}`);
          if (response.ok) {
            const result = await response.json();
            const user = result.data || result; // Handle different response formats
            console.log('Fetched assigned by user:', user); // Debug log
            if (user) {
              setAssignedByUser({
                userName: user.userName || user.fullName || user.name || 'Unknown User',
                email: user.email || 'Unknown Email'
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch assigned by user info:', error);
        }
      }
    };

    fetchAssignedByUser();
  }, [mode, initialData?.assignedBy]);

  // Reset form when initialData changes in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset({
        tagNumber: initialData.tagNumber || '',
        tagType: initialData.tagType || 'STUDENT_CARD',
        status: initialData.status || 'ACTIVE',
        notes: initialData.notes || '',
        studentId: initialData.studentId || undefined,
        assignedBy: initialData.assignedBy || undefined,
        assignmentReason: initialData.assignmentReason || '',
        expiresAt: initialData.expiresAt || '',
        assignedAt: initialData.assignedAt || '',
      });
    }
  }, [mode, initialData, form]);

  // Reset form when mode changes or when initialData changes
  useEffect(() => {
    if (mode === 'create') {
      form.reset({
        tagNumber: '',
        tagType: 'STUDENT_CARD',
        status: 'ACTIVE',
        notes: '',
        studentId: undefined,
        assignedBy: user?.id ? Number(user.id) : undefined,
        assignmentReason: '',
        expiresAt: '',
        assignedAt: '',
      });
      // Clear processed scan history when form resets
      setLastProcessedScan(null);
    }
  }, [mode, form, user]);

  // Clear form function
  const clearForm = () => {
    form.reset({
      tagNumber: '',
      tagType: 'STUDENT_CARD',
      status: 'ACTIVE',
      notes: '',
      studentId: undefined,
      assignedBy: user?.id ? Number(user.id) : undefined,
      assignmentReason: '',
      expiresAt: '',
      assignedAt: '',
    });
    setLastProcessedScan(null); // Clear processed scan history
  };

  // Expose clear function to parent
  useEffect(() => {
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  // Cleanup when component unmounts (form is closed)
  useEffect(() => {
    return () => {
      // Clear processed scan history when form is closed
      setLastProcessedScan(null);
      // Clear any pending timeouts
      const tagNumberInput = document.querySelector('input[name="tagNumber"]') as HTMLInputElement;
      if (tagNumberInput) {
        tagNumberInput.style.backgroundColor = '';
        tagNumberInput.style.borderColor = '';
      }
    };
  }, []);

  const handleSubmit = async (data: RFIDTagFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save tag');
    } finally {
      setIsLoading(false);
    }
  };

  const tagTypeOptions = [
    { value: 'STUDENT_CARD', label: 'Student Card' },
    
    { value: 'TEMPORARY_PASS', label: 'Temporary Pass' },
    { value: 'VISITOR_PASS', label: 'Visitor Pass' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'TEST', label: 'Test' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'LOST', label: 'Lost' },
    { value: 'DAMAGED', label: 'Damaged' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'REPLACED', label: 'Replaced' },
    { value: 'RESERVED', label: 'Reserved' },
  ];

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tag Number */}
          <FormField
            control={form.control}
            name="tagNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Tag Number *
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      placeholder={isConnected ? "Tap RFID card to auto-fill..." : "e.g., TAG001, STUDENT123"}
                      className={`w-full ${isConnected ? 'border-green-300 bg-green-50' : ''}`}
                      disabled={isSubmitting || isLoading}
                    />
                    {isConnected && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="RFID Scanner Ready"></div>
                        <span className="text-xs text-green-600 font-medium">Ready</span>
                      </div>
                    )}
                    {!isConnected && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" title="RFID Scanner Not Connected"></div>
                        <span className="text-xs text-red-600 font-medium">Offline</span>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                {isConnected && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse inline-block"></span>
                    RFID scanner is connected. Tap a card to auto-fill the tag number.
                  </p>
                )}
                {!isConnected && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full inline-block"></span>
                    RFID scanner is offline. Please enter the tag number manually.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Tag Type */}
          <FormField
            control={form.control}
            name="tagType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Tag Type *
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tagTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Status *
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting || isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expires At */}
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Expires At
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    className="w-full"
                    disabled={isSubmitting || isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assigned At - Read-only display */}
          {mode === 'edit' && (
            <FormField
              control={form.control}
              name="assignedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Assigned At
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Auto-generated when assigned"
                      className="w-full bg-gray-50"
                      disabled={true}
                      value={field.value ? new Date(field.value).toLocaleString() : 'Not assigned'}
                      onChange={() => {}} // Prevent form control from interfering
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                Notes
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Additional notes about this tag..."
                  className="w-full min-h-[80px]"
                  disabled={isSubmitting || isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Assignment Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
            Assignment Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student ID - Searchable in create mode, display current assignment in edit mode */}
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Student ID
                  </FormLabel>
                  <FormControl>
                    {mode === 'create' ? (
                      <SearchableSelect
                        value={field.value ? String(field.value) : ''}
                        onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        options={[]}
                        placeholder="Search student by name or ID..."
                        className="w-full"
                        asyncSearch={async (query) => {
                          try {
                            const res = await fetch(`/api/search/entities?type=student&q=${encodeURIComponent(query)}&limit=10`);
                            if (!res.ok) return [];
                            const data = await res.json();
                            return Array.isArray(data.items) ? data.items : [];
                          } catch {
                            return [];
                          }
                        }}
                      />
                    ) : (
                      <Input
                        {...field}
                        type="text"
                        placeholder="No student assigned"
                        className="w-full bg-gray-50"
                        disabled={true}
                        value={
                          field.value && studentInfo 
                            ? `${studentInfo.firstName} ${studentInfo.lastName} (ID: ${studentInfo.studentIdNum})`
                            : field.value 
                              ? `Student ID: ${field.value}` 
                              : 'No student assigned'
                        }
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            

            {/* Assigned By - Auto-detected */}
            <FormField
              control={form.control}
              name="assignedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Assigned By
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Auto-detected from current user"
                      className="w-full bg-gray-50"
                      disabled={true}
                      value={
                        mode === 'edit' && assignedByUser 
                          ? `${assignedByUser.userName} (${assignedByUser.email})`
                          : user 
                            ? `${user.email} (ID: ${user.id})`
                            : 'Loading user...'
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignment Reason */}
            <FormField
              control={form.control}
              name="assignmentReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Assignment Reason
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Reason for assignment"
                      className="w-full"
                      disabled={isSubmitting || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Button - Only show if showFooter is true */}
        {showFooter && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Create Tag' : 'Update Tag'}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
