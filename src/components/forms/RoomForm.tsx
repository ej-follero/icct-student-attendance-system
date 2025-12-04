"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Info, RotateCcw, Save, Loader2, DoorOpen, Trash2, Check, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce";
import { DialogClose } from "@/components/ui/dialog";

const roomFormSchema = z.object({
  roomNo: z.string().min(1, "Room number is required"),
  roomType: z.enum(["LECTURE", "LABORATORY", "OFFICE", "CONFERENCE", "OTHER"]),
  roomCapacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  roomBuildingLoc: z.enum(["BuildingA", "BuildingB", "BuildingC", "BuildingD", "BuildingE"]),
  roomFloorLoc: z.enum(["F1", "F2", "F3", "F4", "F5", "F6"]),
  readerId: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomFormSchema>;

interface RoomFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "create" | "update";
  data?: RoomFormData;
  id?: string | number;
  onSuccess?: (room: RoomFormData) => void;
}

export default function RoomForm({ open, onOpenChange, type, data, id, onSuccess }: RoomFormProps) {
  // State for dialogs and draft logic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftExists, setDraftExists] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [showDraftSavedDialog, setShowDraftSavedDialog] = useState(false);
  const [showDraftClearedDialog, setShowDraftClearedDialog] = useState(false);
  const [showDraftRestoredDialog, setShowDraftRestoredDialog] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const [showResetSuccessDialog, setShowResetSuccessDialog] = useState(false);
  const [showSubmitSuccessDialog, setShowSubmitSuccessDialog] = useState(false);
  const [showSubmitErrorDialog, setShowSubmitErrorDialog] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rfidReaders, setRfidReaders] = useState<{ deviceId: string; deviceName?: string }[]>([]);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidError, setRfidError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  // Add state for RFID search
  const [rfidSearch, setRfidSearch] = useState("");
  const [formProgress, setFormProgress] = useState(0);
  // Error boundary and notification dialog state
  const [hasError, setHasError] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, action?: { label: string; onClick: () => void }) => {
    setNotificationConfig({ type, title, message, action });
    setShowNotificationDialog(true);
  };
  // Async validation for unique roomNo
  const [roomNoExists, setRoomNoExists] = useState(false);
  const [checkingRoomNo, setCheckingRoomNo] = useState(false);
  // Add state for combobox dropdown
  const [showRfidDropdown, setShowRfidDropdown] = useState(false);

  const defaultValues: RoomFormData = {
    roomNo: "",
    roomType: "LECTURE",
    roomCapacity: 40,
    roomBuildingLoc: "BuildingA",
    roomFloorLoc: "F1",
    readerId: "",
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
    getValues,
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: data || defaultValues,
  });

  // Ensure form is pre-filled with correct data in edit mode
  useEffect(() => {
    if (open && type === "update" && data) {
      reset(data);
      setRfidSearch(data.readerId || "");
    }
  }, [open, type, data, reset]);

  // Fetch RFID readers
  useEffect(() => {
    const fetchReaders = async () => {
      setRfidLoading(true);
      setRfidError(null);
      try {
        const res = await fetch("/api/rfid/readers?page=1&pageSize=1000");
        if (!res.ok) throw new Error("Failed to fetch RFID readers");
        const json = await res.json();
        setRfidReaders(json.data || []);
      } catch (err: any) {
        setRfidError("Could not load RFID readers");
      } finally {
        setRfidLoading(false);
      }
    };
    fetchReaders();
  }, []);

  // Draft logic
  useEffect(() => {
    if (open && !data) {
      const savedDraft = localStorage.getItem("roomFormDraft");
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          const draftAge = new Date().getTime() - new Date(draftData.savedAt).getTime();
          const draftAgeHours = draftAge / (1000 * 60 * 60);
          if (draftAgeHours < 24) {
            setDraftExists(true);
            setDraftTimestamp(draftData.savedAt);
            setShowRestorePrompt(true);
          } else {
            localStorage.removeItem("roomFormDraft");
            setDraftExists(false);
            setDraftTimestamp(null);
          }
        } catch {
          localStorage.removeItem("roomFormDraft");
        }
      }
    }
  }, [open, data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (!isSubmitting && !isSavingDraft && isDirty) {
          handleSaveDraft();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!isSubmitting && !isSavingDraft) {
          handleSubmitClick();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        if (!isSubmitting && !isSavingDraft) {
          handleReset();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        if (draftExists && !isSubmitting && !isSavingDraft) {
          handleClearDraft();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, isSavingDraft, isDirty, draftExists, onOpenChange]);

  // Auto-save functionality
  const debouncedFormValues = useDebounce(watch(), 1000);

  useEffect(() => {
    if (isDirty) {
      const timeout = setTimeout(() => {
        handleSaveDraft();
      }, 5000); // Auto-save after 5 seconds of inactivity
      return () => clearTimeout(timeout);
    }
  }, [debouncedFormValues, isDirty]);

  // Calculate form progress
  useEffect(() => {
    const values = getValues();
    const requiredFields = 5; // roomNo, roomType, roomCapacity, roomBuildingLoc, roomFloorLoc (readerId is optional)
    const filledRequiredFields = [
      values.roomNo,
      values.roomType,
      values.roomCapacity,
      values.roomBuildingLoc,
      values.roomFloorLoc,
    ].filter((v) => v !== undefined && v !== null && v !== '').length;
    setFormProgress((filledRequiredFields / requiredFields) * 100);
  }, [watch()]);

  // Draft save
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      setError(null);
      const values = getValues();
      const hasContent = Object.values(values).some((v) => (typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null));
      if (hasContent) {
        const draftData = {
          ...values,
          savedAt: new Date().toISOString(),
          isDraft: true,
        };
        localStorage.setItem("roomFormDraft", JSON.stringify(draftData));
        setDraftSaved(true);
        setDraftExists(true);
        setDraftTimestamp(draftData.savedAt);
        setShowDraftSavedDialog(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Draft clear
  const handleClearDraft = () => {
    localStorage.removeItem("roomFormDraft");
    setDraftExists(false);
    setDraftTimestamp(null);
    setDraftSaved(false);
    setShowDraftClearedDialog(true);
  };

  // Draft restore
  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem("roomFormDraft");
      if (!savedDraft) return;
      const draftData = JSON.parse(savedDraft);
      reset({
        roomNo: draftData.roomNo || "",
        roomType: draftData.roomType || "LECTURE",
        roomCapacity: draftData.roomCapacity || 40,
        roomBuildingLoc: draftData.roomBuildingLoc || "BuildingA",
        roomFloorLoc: draftData.roomFloorLoc || "F1",
        readerId: draftData.readerId || "",
      });
      setShowRestorePrompt(false);
      setDraftSaved(true);
      setShowDraftRestoredDialog(true);
    } catch {
      setError("Failed to restore draft");
    }
  };

  // Reset logic
  const handleReset = () => {
    if (isDirty) {
      setShowResetConfirmDialog(true);
    } else {
      performReset();
    }
  };
  const performReset = () => {
    reset(data || defaultValues);
    setResetKey((k) => k + 1);
    setShowResetSuccessDialog(true);
    setRfidSearch(""); // Clear RFID search bar
    setShowRfidDropdown(false); // Optionally close dropdown
  };

  // Submit logic
  const onSubmit = async (formData: RoomFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (type === 'create' && roomNoExists) {
        showNotification('error', 'Duplicate Room Number', 'A room with this number already exists. Please use a unique room number.');
        setIsSubmitting(false);
        return;
      }
      onSuccess?.(formData);
      setSubmitSuccessMessage(type === "create" ? "Room created successfully" : "Room updated successfully");
      showNotification('success', type === 'create' ? 'Room Created' : 'Room Updated', type === 'create' ? 'Room created successfully.' : 'Room updated successfully.');
      localStorage.removeItem("roomFormDraft");
    } catch (err: any) {
      setSubmitErrorMessage(err.message);
      showNotification('error', 'Submission Failed', err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSubmitClick = () => {
    handleSubmit(onSubmit)();
  };

  // UI
  if (hasError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <DialogTitle className="text-red-600">Error Loading Form</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error || "An error occurred while loading the form."}</p>
            <Button
              onClick={() => {
                setHasError(false);
                setError(null);
                onOpenChange(false);
              }}
              variant="outline"
              className="rounded"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-sm border border-blue-200 shadow-2xl rounded-2xl p-0 mx-2 my-1 flex flex-col">
        <DialogTitle className="sr-only">
          {type === "create" ? "Create New Room" : "Edit Room"}
        </DialogTitle>
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 rounded-t-2xl p-6 relative flex-shrink-0">
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-green-400 transition-all duration-300 ease-out"
              style={{ width: `${formProgress}%` }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 h-8 w-8 text-white hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-start gap-4 pr-24">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DoorOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {type === "create" ? "Create New Room" : "Edit Room"}
              </h2>
              <p className="text-blue-100 text-sm">
                {type === "create"
                  ? "Add a new room to the system"
                  : "Update room information and settings"}
              </p>
              {type === 'create' && roomNoExists && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="destructive" className="text-xs">Room number already exists</Badge>
                </div>
              )}
              {draftExists && !data && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">
                    <Save className="w-3 h-3 mr-1" />
                    Draft Available
                  </Badge>
                  {draftTimestamp && (
                    <span className="text-blue-100 text-xs">
                      Saved {new Date(draftTimestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Draft Restoration Dialog */}
        {showRestorePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Save className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Restore Draft?</h3>
                  <p className="text-sm text-gray-600">A saved draft was found</p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  We found a saved draft from your previous session. Would you like to restore it?
                </p>
                {draftTimestamp && (
                  <p className="text-xs text-yellow-700 mt-1">
                    Draft saved: {new Date(draftTimestamp).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowRestorePrompt(false); handleClearDraft(); }} className="flex-1 rounded">
                  Start Fresh
                </Button>
                <Button onClick={handleRestoreDraft} className="flex-1 bg-yellow-600 hover:bg-yellow-700 rounded">
                  Restore Draft
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Form Content and Footer Container */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ScrollArea className="h-full">
              <form id="room-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
              {/* Info: All fields required */}
              <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded border border-blue-100 text-blue-700 text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                <span>All fields marked with <span className="font-bold">*</span> are required</span>
              </div>
              {/* Room Information Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-semibold text-blue-900">Room Information</h3>
                  </div>
                </div>
                <div className="h-px bg-blue-100 w-full mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roomNo" className="text-sm text-blue-900">
                      Room Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="roomNo"
                      {...register("roomNo")}
                      className={`mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400 ${errors.roomNo ? "border-red-500" : ""}`}
                      aria-invalid={!!errors.roomNo}
                      aria-describedby={errors.roomNo ? "roomNo-error" : undefined}
                    />
                    {errors.roomNo && (
                      <p id="roomNo-error" className="text-sm text-red-600 mt-1">{errors.roomNo.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="roomType" className="text-sm text-blue-900">
                      Room Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={watch("roomType")} onValueChange={(v) => setValue("roomType", v as any)} required>
                      <SelectTrigger id="roomType" className="w-full mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LECTURE">Lecture</SelectItem>
                        <SelectItem value="LABORATORY">Laboratory</SelectItem>
                        <SelectItem value="OFFICE">Office</SelectItem>
                        <SelectItem value="CONFERENCE">Conference Room</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.roomType && (
                      <p className="text-sm text-red-600 mt-1">{errors.roomType.message}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Location Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-semibold text-blue-900">Location</h3>
                  </div>
                </div>
                <div className="h-px bg-blue-100 w-full mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roomBuildingLoc" className="text-sm text-blue-900">
                      Building <span className="text-red-500">*</span>
                    </Label>
                    <Select value={watch("roomBuildingLoc")} onValueChange={v => setValue("roomBuildingLoc", v as any)} required>
                      <SelectTrigger id="roomBuildingLoc" className="w-full mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BuildingA">Building A</SelectItem>
                        <SelectItem value="BuildingB">Building B</SelectItem>
                        <SelectItem value="BuildingC">Building C</SelectItem>
                        <SelectItem value="BuildingD">Building D</SelectItem>
                        <SelectItem value="BuildingE">Building E</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.roomBuildingLoc && (
                      <p id="roomBuildingLoc-error" className="text-sm text-red-600 mt-1">{errors.roomBuildingLoc.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="roomFloorLoc" className="text-sm text-blue-900">
                      Floor <span className="text-red-500">*</span>
                    </Label>
                    <Select value={watch("roomFloorLoc")} onValueChange={v => setValue("roomFloorLoc", v as any)} required>
                      <SelectTrigger id="roomFloorLoc" className="w-full mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400">
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F1">1F</SelectItem>
                        <SelectItem value="F2">2F</SelectItem>
                        <SelectItem value="F3">3F</SelectItem>
                        <SelectItem value="F4">4F</SelectItem>
                        <SelectItem value="F5">5F</SelectItem>
                        <SelectItem value="F6">6F</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.roomFloorLoc && (
                      <p id="roomFloorLoc-error" className="text-sm text-red-600 mt-1">{errors.roomFloorLoc.message}</p>
                    )}
                  </div>
                </div>
              </div>
              {/* Capacity & RFID Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-semibold text-blue-900">Capacity & RFID</h3>
                  </div>
                </div>
                <div className="h-px bg-blue-100 w-full mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roomCapacity" className="text-sm text-blue-900">
                      Capacity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="roomCapacity"
                      type="number"
                      {...register("roomCapacity", { valueAsNumber: true })}
                      className={`mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400 ${errors.roomCapacity ? "border-red-500" : ""}`}
                      aria-invalid={!!errors.roomCapacity}
                      aria-describedby={errors.roomCapacity ? "roomCapacity-error" : undefined}
                    />
                    {errors.roomCapacity && (
                      <p id="roomCapacity-error" className="text-sm text-red-600 mt-1">{errors.roomCapacity.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="readerId" className="text-sm text-blue-900">
                      RFID Reader
                    </Label>
                    {rfidLoading ? (
                      <div className="flex items-center gap-2 text-blue-600"><Loader2 className="animate-spin w-4 h-4" /> Loading readers...</div>
                    ) : rfidError ? (
                      <div className="text-red-600 text-sm">{rfidError}</div>
                    ) : rfidReaders.length > 0 ? (
                      <div className="relative mt-1">
                        <Input
                          id="readerId-search"
                          type="text"
                          value={rfidSearch}
                          onChange={e => setRfidSearch(e.target.value)}
                          placeholder="Search RFID readers..."
                          className={`w-full text-sm px-2 py-1 border ${errors.readerId ? 'border-red-500' : 'border-blue-200'} rounded mb-1`}
                          autoComplete="off"
                          onFocus={() => setShowRfidDropdown(true)}
                          onBlur={() => setTimeout(() => setShowRfidDropdown(false), 150)}
                          aria-invalid={!!errors.readerId}
                          aria-describedby={errors.readerId ? "readerId-error" : undefined}
                        />
                        <Input
                          id="readerId"
                          {...register("readerId")}
                          value={watch("readerId") || ""}
                          type="hidden"
                        />
                        {/* Sync search and hidden input */}
                        {(() => {
                          // Effect: sync hidden input with search
                          // (This is a hack to run imperative code in render, but works for this case)
                          const match = rfidReaders.find(
                            reader =>
                              reader.deviceId.toLowerCase() === rfidSearch.toLowerCase() ||
                              (reader.deviceName && `${reader.deviceId} - ${reader.deviceName}`.toLowerCase() === rfidSearch.toLowerCase())
                          );
                          if (match && watch("readerId") !== match.deviceId) {
                            setTimeout(() => setValue("readerId", match.deviceId, { shouldValidate: true }), 0);
                          } else if (!match && watch("readerId") !== "") {
                            setTimeout(() => setValue("readerId", "", { shouldValidate: true }), 0);
                          }
                          return null;
                        })()}
                        {showRfidDropdown && (
                          <div className="absolute z-50 w-full bg-white border border-blue-200 rounded shadow max-h-60 overflow-y-auto">
                            {rfidReaders
                              .filter(reader =>
                                reader.deviceId.toLowerCase().includes(rfidSearch.toLowerCase()) ||
                                (reader.deviceName?.toLowerCase().includes(rfidSearch.toLowerCase()) ?? false)
                              )
                              .map(reader => (
                                <div
                                  key={reader.deviceId}
                                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm ${watch("readerId") === reader.deviceId ? "bg-blue-100" : ""}`}
                                  onMouseDown={e => {
                                    e.preventDefault();
                                    setValue("readerId", reader.deviceId, { shouldValidate: true });
                                    setRfidSearch(reader.deviceId + (reader.deviceName ? ` - ${reader.deviceName}` : ""));
                                    setShowRfidDropdown(false);
                                  }}
                                >
                                  {reader.deviceId}{reader.deviceName ? ` - ${reader.deviceName}` : ""}
                                </div>
                              ))}
                            {rfidReaders.filter(reader =>
                              reader.deviceId.toLowerCase().includes(rfidSearch.toLowerCase()) ||
                              (reader.deviceName?.toLowerCase().includes(rfidSearch.toLowerCase()) ?? false)
                            ).length === 0 && (
                              <div className="px-4 py-2 text-gray-500 text-sm">No RFID readers found</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        id="readerId"
                        {...register("readerId")}
                        className={`mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400 ${errors.readerId ? "border-red-500" : ""}`}
                        aria-invalid={!!errors.readerId}
                        aria-describedby={errors.readerId ? "readerId-error" : undefined}
                        placeholder="Enter RFID reader ID (optional)"
                      />
                    )}
                    {errors.readerId && (
                      <p id="readerId-error" className="text-sm text-red-600 mt-1">{errors.readerId.message}</p>
                    )}
                  </div>
                </div>
              </div>
              {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
            </form>
          </ScrollArea>
          </div>
          {/* Footer Buttons - Sticky */}
          <DialogFooter className="sticky bottom-0 left-0 right-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-4 flex-shrink-0 z-10 shadow-lg">
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleReset}
                    disabled={isSubmitting || isSavingDraft}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset form to {data ? 'original values' : 'empty state'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || isSavingDraft || !isDirty}
                    className={`border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-500 rounded transition-all duration-200 ${draftSaved ? 'bg-green-100 border-green-500 text-green-700 shadow-sm' : ''}`}
                  >
                    {isSavingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : draftSaved ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Draft Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Draft
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{draftSaved ? "Draft has been saved successfully! (Ctrl+S)" : "Save current progress as draft (Ctrl+S)"}</p>
                </TooltipContent>
              </Tooltip>
              {draftExists && !data && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleClearDraft}
                      disabled={isSubmitting || isSavingDraft}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Draft
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove saved draft permanently</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    form="room-form"
                    disabled={isSubmitting || isSavingDraft}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {type === "update" ? "Saving..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        {type === "update" ? "Update Room" : "Create Room"}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{type === "update" ? "Update room" : "Create new room"} (Ctrl+Enter)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogFooter>
        </div>
      </DialogContent>
      {/* Draft Saved Success Dialog */}
      <Dialog open={showDraftSavedDialog} onOpenChange={setShowDraftSavedDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Save className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-green-900">
                  Draft Saved Successfully
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Your progress has been saved as a draft. You can continue editing or close the form and return later to complete it.
            </p>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="w-4 h-4" />
                <span>Draft saved at {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDraftSavedDialog(false)} className="bg-green-600 hover:bg-green-700 text-white rounded">
              Continue Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Draft Cleared Dialog */}
      <Dialog open={showDraftClearedDialog} onOpenChange={setShowDraftClearedDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-blue-900">
                  Draft Cleared
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              The saved draft has been removed successfully.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Info className="w-4 h-4" />
                <span>You can continue editing the current form</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDraftClearedDialog(false)} className="bg-blue-600 hover:bg-blue-700 text-white rounded">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Draft Restored Dialog */}
      <Dialog open={showDraftRestoredDialog} onOpenChange={setShowDraftRestoredDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-green-900">
                  Draft Restored
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Your saved draft has been restored successfully. You can continue editing from where you left off.
            </p>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="w-4 h-4" />
                <span>Draft restored from {draftTimestamp ? new Date(draftTimestamp).toLocaleString() : 'previous session'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDraftRestoredDialog(false)} className="bg-green-600 hover:bg-green-700 text-white rounded">
              Continue Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-orange-900">
                  Confirm Reset
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              You have unsaved changes. Are you sure you want to reset the form? This action cannot be undone.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <Info className="w-4 h-4" />
                <span>All current changes will be lost</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResetConfirmDialog(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded">
              Cancel
            </Button>
            <Button onClick={() => { setShowResetConfirmDialog(false); performReset(); }} className="bg-orange-600 hover:bg-orange-700 text-white rounded">
              Reset Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reset Success Dialog */}
      <Dialog open={showResetSuccessDialog} onOpenChange={setShowResetSuccessDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-green-900">
                  Form Reset Successfully
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              {data ? "All fields have been reset to their original values." : "All fields have been cleared successfully."}
            </p>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Info className="w-4 h-4" />
                <span>You can now start fresh with the form</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResetSuccessDialog(false)} className="bg-green-600 hover:bg-green-700 text-white rounded">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Submit Success Dialog */}
      <Dialog open={showSubmitSuccessDialog} onOpenChange={setShowSubmitSuccessDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DoorOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-green-900">
                  {type === "update" ? "Room Updated" : "Room Created"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              {submitSuccessMessage}
            </p>
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Info className="w-4 h-4" />
                <span>The form will close automatically</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowSubmitSuccessDialog(false); onOpenChange(false); }} className="bg-green-600 hover:bg-green-700 text-white rounded">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Submit Error Dialog */}
      <Dialog open={showSubmitErrorDialog} onOpenChange={setShowSubmitErrorDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-red-900">
                  {type === "update" ? "Update Failed" : "Creation Failed"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              {submitErrorMessage}
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <Info className="w-4 h-4" />
                <span>Please fix the issues and try again</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSubmitErrorDialog(false)} className="bg-red-600 hover:bg-red-700 text-white rounded">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-md rounded">
          <DialogHeader>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              notificationConfig?.type === 'success' ? 'bg-green-100' :
              notificationConfig?.type === 'error' ? 'bg-red-100' :
              notificationConfig?.type === 'warning' ? 'bg-yellow-100' :
              'bg-blue-100'
            }`}>
              {notificationConfig?.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
              {notificationConfig?.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {notificationConfig?.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              {notificationConfig?.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <DialogTitle className={`text-lg font-semibold ${
                notificationConfig?.type === 'success' ? 'text-green-900' :
                notificationConfig?.type === 'error' ? 'text-red-900' :
                notificationConfig?.type === 'warning' ? 'text-yellow-900' :
                'text-blue-900'
              }`}>
                {notificationConfig?.title}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              {notificationConfig?.message}
            </p>
            {notificationConfig?.action && (
              <div className={`border rounded p-3 ${
                notificationConfig?.type === 'success' ? 'bg-green-50 border-green-200' :
                notificationConfig?.type === 'error' ? 'bg-red-50 border-red-200' :
                notificationConfig?.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className={`flex items-center gap-2 text-sm ${
                  notificationConfig?.type === 'success' ? 'text-green-700' :
                  notificationConfig?.type === 'error' ? 'text-red-700' :
                  notificationConfig?.type === 'warning' ? 'text-yellow-700' :
                  'text-blue-700'
                }`}>
                  <Info className="w-4 h-4" />
                  <span>Additional action available</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            {notificationConfig?.action && (
              <Button
                onClick={() => {
                  notificationConfig.action?.onClick();
                  setShowNotificationDialog(false);
                }}
                className={`${
                  notificationConfig?.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  notificationConfig?.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  notificationConfig?.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-blue-600 hover:bg-blue-700'
                } text-white rounded`}
              >
                {notificationConfig.action.label}
              </Button>
            )}
            <Button
              onClick={() => setShowNotificationDialog(false)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded"
            >
              {notificationConfig?.action ? 'Cancel' : 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 