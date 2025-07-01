"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays, isBefore, isAfter } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getFeedingSchedules,
  createFeedingSchedule,
  updateFeedingSchedule,
  deleteFeedingSchedule,
} from "@/lib/actions/feeding-schedules";

export type FeedingSession = {
  id?: string;
  time: string; // HH:MM format (consistent across FE/BE)
  feedAmount: number;
};

export type FeedingSchedule = {
  id?: string;
  feederId: string;
  startDate: Date;
  endDate?: Date;
  interval: "daily" | "weekly" | "biweekly" | "four-weekly";
  daysOfWeek: number[]; // 0-6 for Sunday-Saturday
  sessions: FeedingSession[]; // Multiple sessions per day
};

// 🎯 SCHEMA: Validation rules for the form
const feedingScheduleSchema = z.object({
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date().optional(),
  interval: z.enum(["daily", "weekly", "biweekly", "four-weekly"], {
    required_error: "Please select an interval",
  }),
  daysOfWeek: z.array(z.number()),
  sessions: z
    .array(
      z.object({
        id: z.string().optional(),
        time: z.string().min(1, "Time is required"),
        feedAmount: z.number().min(0.1, "Feed amount must be at least 0.1kg"),
      })
    )
    .min(1, "At least one feeding session is required"),
});

type FeedingScheduleFormData = z.infer<typeof feedingScheduleSchema>;

// Custom number input component that allows empty fields
function NumberInput({
  value,
  onChange,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [displayValue, setDisplayValue] = useState(value?.toString() || "");

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(value?.toString() || "");
  }, [value]);

  return (
    <Input
      {...props}
      type="number"
      value={displayValue}
      onChange={(e) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue); // Always update display

        // Only update parent if we have a valid number
        if (inputValue !== "") {
          const numValue = parseFloat(inputValue);
          if (!isNaN(numValue)) {
            onChange(numValue);
          }
        }
      }}
      onBlur={() => {
        // On blur, ensure we have a valid value or restore the last valid one
        if (displayValue === "" || isNaN(parseFloat(displayValue))) {
          const lastValid = value || 1;
          setDisplayValue(lastValid.toString());
          onChange(lastValid);
        } else {
          const numValue = parseFloat(displayValue);
          onChange(numValue);
        }
      }}
    />
  );
}

type FeedingScheduleSectionProps = {
  feederId: string;
};

export function FeedingScheduleSection({
  feederId,
}: FeedingScheduleSectionProps) {
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] =
    useState<FeedingSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(
    null
  );

  // Memoize feederId to prevent unnecessary re-renders
  const memoizedFeederId = useMemo(() => feederId, [feederId]);

  // Track if we've loaded schedules initially to prevent duplicate requests
  const hasLoadedInitially = useRef(false);

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getFeedingSchedules(memoizedFeederId);
      if (result.success) {
        setSchedules(result.schedules);
      } else {
        toast.error(result.error || "Failed to load feeding schedules");
      }
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Failed to load feeding schedules");
    } finally {
      setIsLoading(false);
    }
  }, [memoizedFeederId]);

  // Load schedules only once on component mount
  useEffect(() => {
    if (!hasLoadedInitially.current) {
      hasLoadedInitially.current = true;
      loadSchedules();
    }
  }, [loadSchedules]);

  const handleAddSchedule = async (
    schedule: Omit<FeedingSchedule, "id" | "feederId">
  ) => {
    setIsCreating(true);
    try {
      const result = await createFeedingSchedule({
        ...schedule,
        feederId: memoizedFeederId,
      });
      if (result.success) {
        await loadSchedules(); // Refresh the list
        setIsDialogOpen(false);
        toast.success("Feeding schedule added successfully");
      } else {
        toast.error(result.error || "Failed to create feeding schedule");
      }
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Failed to create feeding schedule");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSchedule = async (
    schedule: Omit<FeedingSchedule, "id" | "feederId">
  ) => {
    if (!editingSchedule?.id) return;
    setIsUpdating(true);
    try {
      const result = await updateFeedingSchedule(editingSchedule.id, {
        ...schedule,
        feederId: memoizedFeederId,
      });
      if (result.success) {
        await loadSchedules(); // Refresh the list
        setEditingSchedule(null);
        setIsDialogOpen(false);
        toast.success("Feeding schedule updated successfully");
      } else {
        toast.error(result.error || "Failed to update feeding schedule");
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update feeding schedule");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setDeletingScheduleId(id);
    try {
      const result = await deleteFeedingSchedule(id, memoizedFeederId);
      if (result.success) {
        await loadSchedules(); // Refresh the list
        toast.success("Feeding schedule deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete feeding schedule");
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete feeding schedule");
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const getNextFeeding = (
    schedule: FeedingSchedule
  ): { date: Date; session: FeedingSession } | null => {
    const now = new Date();

    // For recurring feeds, return null if we're past the end date
    if (schedule.endDate && isBefore(schedule.endDate, now)) {
      return null;
    }

    // Calculate next feeding based on interval
    let checkDate = new Date(schedule.startDate);

    // If we haven't started yet, check from start date
    if (isBefore(now, schedule.startDate)) {
      checkDate = new Date(schedule.startDate);
    } else {
      // Start checking from today
      checkDate = new Date(now);
      checkDate.setHours(0, 0, 0, 0);
    }

    // Look ahead for the next 365 days to find the next feeding
    for (let i = 0; i < 365; i++) {
      const dayOfWeek = checkDate.getDay();

      // Check if this day matches our schedule
      const matchesSchedule =
        schedule.interval === "daily" ||
        (schedule.daysOfWeek.includes(dayOfWeek) &&
          (schedule.interval === "weekly" ||
            (schedule.interval === "biweekly" &&
              Math.floor(
                (checkDate.getTime() - schedule.startDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 7)
              ) %
                2 ===
                0) ||
            (schedule.interval === "four-weekly" &&
              Math.floor(
                (checkDate.getTime() - schedule.startDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 7)
              ) %
                4 ===
                0)));

      if (matchesSchedule && !isBefore(checkDate, schedule.startDate)) {
        // Find the next session for this day
        const nextSession = schedule.sessions
          .map((session) => {
            const sessionDate = new Date(checkDate);
            const [hours, minutes] = session.time.split(":");
            sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return { date: sessionDate, session };
          })
          .filter(({ date }) => isAfter(date, now))
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

        if (nextSession) {
          return nextSession;
        }
      }

      checkDate = addDays(checkDate, 1);
    }

    return null;
  };

  const isScheduleActive = (schedule: FeedingSchedule) => {
    const now = new Date();
    if (isBefore(schedule.startDate, now)) {
      if (schedule.endDate && isAfter(schedule.endDate, now)) {
        return true;
      }
      return !schedule.endDate;
    }
    return false;
  };

  const getTotalDailyAmount = (schedule: FeedingSchedule) => {
    return schedule.sessions.reduce(
      (total, session) => total + session.feedAmount,
      0
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Feeding Schedule</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
                </DialogTitle>
              </DialogHeader>
              <FeedingScheduleForm
                schedule={editingSchedule}
                onSubmit={
                  editingSchedule ? handleEditSchedule : handleAddSchedule
                }
                onCancel={() => {
                  setEditingSchedule(null);
                  setIsDialogOpen(false);
                }}
                isSubmitting={editingSchedule ? isUpdating : isCreating}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">
              Loading schedules...
            </span>
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-gray-500">
            No feeding schedules configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Next Feeding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const isActive = isScheduleActive(schedule);
                return (
                  <TableRow
                    key={schedule.id}
                    className={cn(
                      !isActive && "bg-red-50/50",
                      isActive && "bg-green-50/50"
                    )}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {schedule.interval === "daily" ? (
                            "Every Day"
                          ) : (
                            <>
                              Every{" "}
                              {schedule.interval === "weekly"
                                ? "week"
                                : schedule.interval === "biweekly"
                                ? "2 weeks"
                                : "4 weeks"}{" "}
                              on{" "}
                              {schedule.daysOfWeek
                                .map((day) =>
                                  format(new Date(2024, 0, day + 1), "EEE")
                                )
                                .join(", ")}
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.sessions.length} session
                          {schedule.sessions.length !== 1 ? "s" : ""} •{" "}
                          {isBefore(schedule.startDate, new Date())
                            ? "Started"
                            : "Starting"}{" "}
                          {format(schedule.startDate, "MMM d, yyyy")}
                          {schedule.endDate && (
                            <>
                              {" "}
                              until {format(schedule.endDate, "MMM d, yyyy")}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Sessions:{" "}
                          {schedule.sessions
                            .map((s) => `${s.time} (${s.feedAmount}kg)`)
                            .join(", ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTotalDailyAmount(schedule)}kg/day</TableCell>
                    <TableCell>
                      {(() => {
                        const nextFeeding = getNextFeeding(schedule);
                        return nextFeeding ? (
                          <div>
                            <div>
                              {format(nextFeeding.date, "MMM d, yyyy h:mm a")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {nextFeeding.session.feedAmount}kg
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            No upcoming feedings
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? "default" : "destructive"}
                        className={cn(isActive ? "bg-green-500" : "bg-red-500")}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            deletingScheduleId === schedule.id ||
                            isCreating ||
                            isUpdating
                          }
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            deletingScheduleId !== null ||
                            isCreating ||
                            isUpdating
                          }
                          onClick={() =>
                            schedule.id && handleDeleteSchedule(schedule.id)
                          }
                        >
                          {deletingScheduleId === schedule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// 🎯 FORM COMPONENT: React Hook Form implementation
type FeedingScheduleFormProps = {
  schedule?: FeedingSchedule | null;
  onSubmit: (schedule: Omit<FeedingSchedule, "id" | "feederId">) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

function FeedingScheduleForm({
  schedule,
  onSubmit,
  onCancel,
  isSubmitting,
}: FeedingScheduleFormProps) {
  // 🎯 FORM SETUP
  const form = useForm<FeedingScheduleFormData>({
    resolver: zodResolver(feedingScheduleSchema),
    defaultValues: {
      startDate: schedule?.startDate || new Date(),
      endDate: schedule?.endDate,
      interval: schedule?.interval || "daily",
      daysOfWeek: schedule?.daysOfWeek || [],
      sessions: schedule?.sessions || [
        { id: "1", time: "08:00", feedAmount: 1 },
      ],
    },
  });

  // 🎯 DYNAMIC SESSIONS ARRAY
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sessions",
  });

  // 🎯 SUBMIT HANDLER
  const handleSubmit = (data: FeedingScheduleFormData) => {
    // Custom validation for days of week
    if (data.interval !== "daily" && data.daysOfWeek.length === 0) {
      toast.error("Please select at least one day of the week");
      return;
    }

    onSubmit({
      startDate: data.startDate,
      endDate: data.endDate,
      interval: data.interval,
      daysOfWeek: data.daysOfWeek,
      sessions: data.sessions,
    });
  };

  // 🎯 HELPER FUNCTIONS
  const toggleDay = (day: number) => {
    const currentDays = form.getValues("daysOfWeek");
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    form.setValue("daysOfWeek", newDays);
  };

  const addSession = () => {
    append({
      id: Math.random().toString(36).substr(2, 9),
      time: "08:00",
      feedAmount: 1,
    });
  };

  const removeSession = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-1"
      >
        {/* START DATE & TIME */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date & Time</FormLabel>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full sm:w-[240px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={field.value ? format(field.value, "HH:mm") : "08:00"}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(":");
                    const newDate = new Date(field.value || new Date());
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    field.onChange(newDate);
                  }}
                  className="w-full sm:w-[120px]"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* END DATE & TIME */}
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date & Time (Optional)</FormLabel>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full sm:w-[240px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={field.value ? format(field.value, "HH:mm") : ""}
                  onChange={(e) => {
                    if (field.value) {
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(field.value);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      field.onChange(newDate);
                    }
                  }}
                  className="w-full sm:w-[120px]"
                  placeholder="--:--"
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* INTERVAL */}
        <FormField
          control={form.control}
          name="interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interval</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Every Day</SelectItem>
                  <SelectItem value="weekly">Every Week</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="four-weekly">Every 4 Weeks</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* DAYS OF WEEK */}
        {form.watch("interval") !== "daily" && (
          <FormField
            control={form.control}
            name="daysOfWeek"
            render={() => (
              <FormItem>
                <FormLabel>Days of Week</FormLabel>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={
                        form.getValues("daysOfWeek").includes(day)
                          ? "default"
                          : "outline"
                      }
                      className="w-full text-xs sm:text-sm"
                      onClick={() => toggleDay(day)}
                    >
                      {format(new Date(2024, 0, day + 1), "EEE")}
                    </Button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* FEEDING SESSIONS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Feeding Sessions</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSession}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Session
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2 w-full sm:flex-1">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    {/* SESSION TIME */}
                    <FormField
                      control={form.control}
                      name={`sessions.${index}.time`}
                      render={({ field }) => (
                        <FormItem className="space-y-1 flex-1">
                          <FormLabel className="text-xs">Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              className="w-full sm:w-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* SESSION AMOUNT */}
                    <FormField
                      control={form.control}
                      name={`sessions.${index}.feedAmount`}
                      render={({ field }) => (
                        <FormItem className="space-y-1 flex-1">
                          <FormLabel className="text-xs">Amount (kg)</FormLabel>
                          <FormControl>
                            <NumberInput
                              step="0.1"
                              min="0.1"
                              value={field.value}
                              onChange={field.onChange}
                              className="w-full sm:w-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSession(index)}
                    className="self-end sm:self-center"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            Total daily amount:{" "}
            {form
              .watch("sessions")
              .reduce((total, session) => total + (session.feedAmount || 0), 0)
              .toFixed(1)}
            kg
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="order-2 sm:order-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="order-1 sm:order-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {schedule ? "Updating..." : "Adding..."}
              </>
            ) : schedule ? (
              "Update Schedule"
            ) : (
              "Add Schedule"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
