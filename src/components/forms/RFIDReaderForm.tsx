import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Building } from "lucide-react";

const rfidReaderFormSchema = z.object({
  deviceId: z.string()
    .min(1, "Device ID is required")
    .max(50, "Device ID must be less than 50 characters")
    .regex(/^[A-Za-z0-9\-_]+$/, "Device ID can only contain letters, numbers, hyphens, and underscores"),
  deviceName: z.string()
    .max(100, "Device name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  ipAddress: z.string()
    .ip({ version: "v4", message: "Please enter a valid IPv4 address (e.g., 192.168.1.100)" })
    .optional()
    .or(z.literal("")),
  status: z.enum(["ACTIVE","INACTIVE","TESTING","CALIBRATION","REPAIR","OFFLINE","ERROR"], {
    required_error: "Please select a status"
  }),
  roomId: z.number({ 
    required_error: "Please select a room" 
  }).int().min(1, "Please select a valid room"),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  components: z.object({
    power: z.string().max(50, "Power source must be less than 50 characters").optional(),
    antenna: z.string().max(50, "Antenna type must be less than 50 characters").optional(),
    firmware: z.string().max(50, "Firmware version must be less than 50 characters").optional(),
  }).optional(),
});

type RFIDReaderFormData = z.infer<typeof rfidReaderFormSchema>;

interface Room {
  roomId: number;
  roomNo: string;
  roomType: string;
  roomBuildingLoc: string;
  roomFloorLoc: string;
  status: string;
}

type RFIDReaderFormInput = Partial<RFIDReaderFormData> & {
  deviceId?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
  status?: RFIDReaderFormData["status"] | null;
  roomId?: number | string | null;
  notes?: string | null;
  components?: {
    power?: string | null;
    antenna?: string | null;
    firmware?: string | null;
  } | null;
};

interface RFIDReaderFormProps {
  type: "create" | "update";
  data?: RFIDReaderFormInput | null;
  id?: number;
  onSuccess: (data: RFIDReaderFormData) => void;
  showFooter?: boolean;
}

const normalizeFormValues = (raw?: RFIDReaderFormInput | null): RFIDReaderFormData => {
  const parseRoomId = (roomId: RFIDReaderFormInput["roomId"]) => {
    if (typeof roomId === "number" && !Number.isNaN(roomId)) return roomId;
    if (typeof roomId === "string") {
      const parsed = parseInt(roomId, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  return {
    deviceId: raw?.deviceId ?? "",
    deviceName: raw?.deviceName ?? "",
    ipAddress: raw?.ipAddress ?? "",
    status: raw?.status ?? "ACTIVE",
    roomId: parseRoomId(raw?.roomId),
    notes: raw?.notes ?? "",
    components: {
      power: raw?.components?.power ?? "",
      antenna: raw?.components?.antenna ?? "",
      firmware: raw?.components?.firmware ?? "",
    },
  };
};

const RFIDReaderForm: React.FC<RFIDReaderFormProps> = ({ type, data, id, onSuccess, showFooter = true }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [roomSearchValue, setRoomSearchValue] = useState("");

  const form = useForm<RFIDReaderFormData>({
    resolver: zodResolver(rfidReaderFormSchema),
    defaultValues: normalizeFormValues(data),
  });

  const watchedRoomId = form.watch('roomId');

  useEffect(() => {
    if (data) {
      form.reset(normalizeFormValues(data));
    }
  }, [data, form]);

  // Keep the search textbox in sync with the selected room without updating state during render
  useEffect(() => {
    if (!rooms || rooms.length === 0) return;
    const match = rooms.find(r => r.roomId === watchedRoomId);
    const label = match ? `${match.roomNo} (${match.roomBuildingLoc})` : '';
    setRoomSearchValue(label);
  }, [rooms, watchedRoomId]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setRoomsLoading(true);
        setRoomsError(null);
        
        // Always try to fetch all rooms first for better reliability
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          // Handle both array and object responses
          const roomsData = Array.isArray(data) ? data : (data.rooms || data.data || []);
          setRooms(roomsData);
          console.log('Rooms loaded successfully:', roomsData.length);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch rooms:', errorText);
          setRoomsError('Failed to load rooms. Please refresh the page.');
          setRooms([]);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setRoomsError('Network error loading rooms. Please check your connection.');
        setRooms([]);
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchRooms();
  }, [type]);

  const onSubmit = async (formData: RFIDReaderFormData) => {
    try {
      const url = type === 'update' ? `/api/rfid/readers/${id}` : '/api/rfid/readers';
      const method = type === 'update' ? 'PATCH' : 'POST';
      
      // Show loading toast
      const loadingToast = toast.loading(`${type === 'create' ? 'Creating' : 'Updating'} RFID reader...`);
      
      // Clean up the data before sending
      const cleanData = {
        deviceId: formData.deviceId.trim(),
        deviceName: formData.deviceName?.trim() || null,
        ipAddress: formData.ipAddress?.trim() || null,
        status: formData.status,
        roomId: formData.roomId,
        notes: formData.notes?.trim() || null,
        components: formData.components || {
          power: "AC",
          antenna: "Omni-directional",
          firmware: "v1.0.0"
        },
      };
      
      console.log(`📤 ${type === 'create' ? 'Creating' : 'Updating'} RFID reader:`, cleanData);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.message || `Failed to ${type} RFID reader`);
      }

      const result = await response.json();
      console.log('RFID Reader operation successful:', result);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`RFID Reader ${type === 'create' ? 'created' : 'updated'} successfully!`, {
        description: `Device ID: ${cleanData.deviceId}`
      });
      
      onSuccess(result);
    } catch (error: any) {
      console.error(`Error ${type}ing reader:`, error);
      toast.error(error.message || `Failed to ${type} RFID reader.`, {
        description: 'Please check your input and try again.'
      });
    }
  };

  // Autofill via local bridge (reads temp/discovered-reader.json through API)
  const handleAutofillFromBridge = async () => {
    try {
      const res = await fetch('/api/rfid/readers/discovered', { cache: 'no-store' });
      const json = await res.json();
      if (!json?.data) {
        toast.error('No discovered reader data found. Make sure the serial bridge is running.');
        return;
      }
      const d = json.data;
      // Normalize common field name variants (be forgiving)
      const deviceIdVal = d.deviceId ?? d.deviceID ?? d.id ?? d.readerId;
      const deviceNameVal = d.deviceName ?? d.name ?? d.readerName;
      const ipVal = d.ip ?? d.ipAddress ?? d.ip_addr;
      const statusVal = d.status ?? d.state;
      const roomIdVal = d.roomId ?? d.room ?? d.roomID;
      const notesVal = d.notes ?? d.note;

      // Coerce and set with RHF options to force UI update
      if (deviceIdVal) form.setValue('deviceId', String(deviceIdVal).trim(), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      if (deviceNameVal) form.setValue('deviceName', String(deviceNameVal).trim(), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      if (ipVal) form.setValue('ipAddress', String(ipVal).trim(), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      if (statusVal) {
        const statusUpper = String(d.status).toUpperCase();
        const allowed = ["ACTIVE","INACTIVE","TESTING","CALIBRATION","REPAIR","OFFLINE","ERROR"] as const;
        const isValid = (allowed as readonly string[]).includes(statusUpper);
        const finalStatus = (isValid ? statusUpper : "ACTIVE") as typeof allowed[number];
        form.setValue('status', finalStatus, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }
      if (roomIdVal !== undefined && roomIdVal !== null) {
        const roomVal = typeof roomIdVal === 'string' ? parseInt(roomIdVal, 10) : Number(roomIdVal);
        if (!Number.isNaN(roomVal)) form.setValue('roomId', roomVal, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }
      if (notesVal) form.setValue('notes', String(notesVal), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      if (d.components) {
        if (d.components.power) form.setValue('components.power', String(d.components.power), { shouldDirty: true });
        if (d.components.antenna) form.setValue('components.antenna', String(d.components.antenna), { shouldDirty: true });
        if (d.components.firmware) form.setValue('components.firmware', String(d.components.firmware), { shouldDirty: true });
      }
      // As a fallback, force a reset with merged values to update UI in all cases
      const merged = {
        ...form.getValues(),
        ...(deviceIdVal ? { deviceId: String(deviceIdVal).trim() } : {}),
        ...(deviceNameVal ? { deviceName: String(deviceNameVal).trim() } : {}),
        ...(ipVal ? { ipAddress: String(ipVal).trim() } : {}),
      } as any;
      form.reset(merged, { keepDirty: true, keepTouched: true });

      toast.success('Form auto-filled from serial bridge');
      // Optional: focus first field
      const first = document.querySelector('input[name="deviceId"]') as HTMLInputElement | null;
      if (first) first.focus();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to fetch discovered reader');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handleAutofillFromBridge}>
            Autofill from USB Bridge
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="deviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device ID</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., RD-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deviceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Main Entrance Reader" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ipAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IP Address</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 192.168.1.100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="TESTING">Testing</SelectItem>
                    <SelectItem value="CALIBRATION">Calibration</SelectItem>
                    <SelectItem value="REPAIR">Repair</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Assigned Room *</FormLabel>
                {roomsLoading ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="animate-spin w-4 h-4" /> 
                    Loading rooms...
                  </div>
                ) : roomsError ? (
                  <div className="text-red-600 text-sm">{roomsError}</div>
                ) : rooms.length > 0 ? (
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="text"
                        value={roomSearchValue}
                        onChange={(e) => setRoomSearchValue(e.target.value)}
                        placeholder="Search rooms..."
                        className={`w-full text-sm px-2 py-1 border ${form.formState.errors.roomId ? 'border-red-500' : 'border-blue-200'} rounded mb-1`}
                        autoComplete="off"
                        onFocus={() => setShowRoomDropdown(true)}
                        onBlur={() => setTimeout(() => setShowRoomDropdown(false), 150)}
                        aria-invalid={!!form.formState.errors.roomId}
                        aria-describedby={form.formState.errors.roomId ? "roomId-error" : undefined}
                      />
                    </FormControl>
                    {/* Hidden input for form value */}
                    <input
                      {...field}
                      type="hidden"
                    />
                    {/* The input value is synced via useEffect (see above) */}
                    {showRoomDropdown && (
                      <div className="absolute z-50 w-full bg-white border border-blue-200 rounded shadow max-h-60 overflow-y-auto">
                        {rooms
                          .filter(room =>
                            room.roomNo.toLowerCase().includes(roomSearchValue.toLowerCase()) ||
                            room.roomBuildingLoc.toLowerCase().includes(roomSearchValue.toLowerCase()) ||
                            room.roomFloorLoc.toLowerCase().includes(roomSearchValue.toLowerCase())
                          )
                          .map(room => (
                            <div
                              key={room.roomId}
                              className={`px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm ${field.value === room.roomId ? "bg-blue-100" : ""}`}
                              onMouseDown={e => {
                                e.preventDefault();
                                field.onChange(room.roomId);
                                setRoomSearchValue(`${room.roomNo} (${room.roomBuildingLoc})`);
                                setShowRoomDropdown(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-blue-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium">{room.roomNo}</span>
                                  <span className="text-xs text-gray-500">
                                    {room.roomBuildingLoc} - Floor {room.roomFloorLoc}
                                  </span>
                                  <span className="text-xs text-gray-400">{room.roomType}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        {rooms.filter(room =>
                          room.roomNo.toLowerCase().includes(roomSearchValue.toLowerCase()) ||
                          room.roomBuildingLoc.toLowerCase().includes(roomSearchValue.toLowerCase()) ||
                          room.roomFloorLoc.toLowerCase().includes(roomSearchValue.toLowerCase())
                        ).length === 0 && (
                          <div className="px-4 py-2 text-gray-500 text-sm">No rooms found</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Input
                    {...field}
                    className={`mt-1 border-blue-200 focus:border-blue-400 focus:ring-blue-400 ${form.formState.errors.roomId ? "border-red-500" : ""}`}
                    aria-invalid={!!form.formState.errors.roomId}
                    aria-describedby={form.formState.errors.roomId ? "roomId-error" : undefined}
                    placeholder="Enter room ID"
                  />
                )}
                <FormMessage />
                {roomsError ? (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <span>{roomsError}</span>
                    <button 
                      onClick={() => {
                        setRoomsError(null);
                        // Re-trigger the fetch
                        const fetchRooms = async () => {
                          try {
                            setRoomsLoading(true);
                            const response = await fetch('/api/rooms');
                            if (response.ok) {
                              const data = await response.json();
                              setRooms(data.rooms || data.data || []);
                              setRoomsError(null);
                            } else {
                              setRoomsError('Failed to load rooms. Please refresh the page.');
                            }
                          } catch (error) {
                            setRoomsError('Network error loading rooms.');
                          } finally {
                            setRoomsLoading(false);
                          }
                        };
                        fetchRooms();
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {type === 'create' 
                      ? "Only rooms without assigned readers are shown" 
                      : "Room ID must reference an existing room in the database"
                    }
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>
        
        {/* Notes Section */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <textarea
                  placeholder="Additional notes about this RFID reader..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Components Section */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-blue-900 border-b border-gray-200 pb-2">Device Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="components.power"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Power Source</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AC, DC, Battery" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="components.antenna"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Antenna Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Omni-directional, Directional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="components.firmware"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Firmware Version</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., v1.0.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {showFooter && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === "create" ? "Create Reader" : "Save Changes"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};

export default RFIDReaderForm; 