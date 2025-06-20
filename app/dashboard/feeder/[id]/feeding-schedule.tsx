"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addDays, addWeeks, isBefore, isAfter } from "date-fns";
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export type FeedingSchedule = {
  id: string;
  startDate: Date;
  endDate?: Date;
  interval: "one-off" | "daily" | "weekly" | "biweekly" | "four-weekly";
  feedAmount: number;
  daysOfWeek: number[]; // 0-6 for Sunday-Saturday
};

export function FeedingScheduleSection() {
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] =
    useState<FeedingSchedule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddSchedule = (schedule: Omit<FeedingSchedule, "id">) => {
    const newSchedule = {
      ...schedule,
      id: Math.random().toString(36).substr(2, 9),
    };
    setSchedules([...schedules, newSchedule]);
    setIsDialogOpen(false);
    toast.success("Feeding schedule added successfully");
  };

  const handleEditSchedule = (schedule: Omit<FeedingSchedule, "id">) => {
    if (!editingSchedule) return;
    setSchedules(
      schedules.map((s) =>
        s.id === editingSchedule.id
          ? { ...schedule, id: editingSchedule.id }
          : s
      )
    );
    setIsDialogOpen(false);
    toast.success("Feeding schedule updated successfully");
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
    toast.success("Feeding schedule deleted successfully");
  };

  const getNextFeeding = (schedule: FeedingSchedule): Date | null => {
    const now = new Date();

    // For one-off feeds, return null if the feed has already occurred
    if (schedule.interval === "one-off") {
      return isBefore(schedule.startDate, now) ? null : schedule.startDate;
    }

    // For recurring feeds, return null if we're past the end date
    if (schedule.endDate && isBefore(schedule.endDate, now)) {
      return null;
    }

    // If we haven't started yet, return the start date
    if (isBefore(now, schedule.startDate)) {
      return schedule.startDate;
    }

    // Calculate next feeding based on interval
    let nextDate = new Date(schedule.startDate);
    while (isBefore(nextDate, now)) {
      if (schedule.interval === "daily") {
        nextDate = addDays(nextDate, 1);
      } else if (schedule.interval === "weekly") {
        nextDate = addDays(nextDate, 7);
      } else if (schedule.interval === "biweekly") {
        nextDate = addWeeks(nextDate, 2);
      } else if (schedule.interval === "four-weekly") {
        nextDate = addWeeks(nextDate, 4);
      }
    }
    return nextDate;
  };

  const isScheduleActive = (schedule: FeedingSchedule) => {
    const now = new Date();
    if (schedule.interval === "one-off") {
      return !isBefore(schedule.startDate, now);
    }
    if (isBefore(schedule.startDate, now)) {
      if (schedule.endDate && isAfter(schedule.endDate, now)) {
        return true;
      }
      return !schedule.endDate;
    }
    return false;
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
            <DialogContent>
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
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
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
                const nextFeeding = getNextFeeding(schedule);
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
                          {schedule.interval === "one-off" ? (
                            "One-off Feed"
                          ) : schedule.interval === "daily" ? (
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
                          {isBefore(schedule.startDate, new Date())
                            ? "Started"
                            : "Starting"}{" "}
                          {format(schedule.startDate, "MMM d, yyyy h:mm a")}
                          {schedule.endDate && (
                            <>
                              {" "}
                              until {format(schedule.endDate, "MMM d, yyyy")}
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{schedule.feedAmount}kg</TableCell>
                    <TableCell>
                      {nextFeeding ? (
                        format(nextFeeding, "MMM d, yyyy h:mm a")
                      ) : (
                        <span className="text-gray-500">
                          No upcoming feedings
                        </span>
                      )}
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
                          onClick={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

type FeedingScheduleFormProps = {
  schedule?: FeedingSchedule | null;
  onSubmit: (schedule: Omit<FeedingSchedule, "id">) => void;
  onCancel: () => void;
};

function FeedingScheduleForm({
  schedule,
  onSubmit,
  onCancel,
}: FeedingScheduleFormProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    schedule?.startDate || new Date()
  );
  const [endDate, setEndDate] = useState<Date | undefined>(schedule?.endDate);
  const [interval, setInterval] = useState<
    "one-off" | "daily" | "weekly" | "biweekly" | "four-weekly"
  >(schedule?.interval || "weekly");
  const [feedAmount, setFeedAmount] = useState(
    schedule?.feedAmount?.toString() || "1"
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    schedule?.daysOfWeek || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      toast.error("Please select a start date");
      return;
    }
    if (
      interval !== "one-off" &&
      interval !== "daily" &&
      selectedDays.length === 0
    ) {
      toast.error("Please select at least one day of the week");
      return;
    }
    if (parseFloat(feedAmount) <= 0) {
      toast.error("Feed amount must be greater than 0");
      return;
    }

    onSubmit({
      startDate,
      endDate,
      interval,
      feedAmount: parseFloat(feedAmount),
      daysOfWeek: selectedDays,
    });
  };

  const toggleDay = (day: number) => {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Start Date & Time</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={startDate ? format(startDate, "HH:mm") : ""}
            onChange={(e) => {
              if (startDate) {
                const [hours, minutes] = e.target.value.split(":");
                const newDate = new Date(startDate);
                newDate.setHours(parseInt(hours), parseInt(minutes));
                setStartDate(newDate);
              }
            }}
            className="w-[120px]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>End Date & Time (Optional)</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={endDate ? format(endDate, "HH:mm") : ""}
            onChange={(e) => {
              if (endDate) {
                const [hours, minutes] = e.target.value.split(":");
                const newDate = new Date(endDate);
                newDate.setHours(parseInt(hours), parseInt(minutes));
                setEndDate(newDate);
              }
            }}
            className="w-[120px]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interval">Interval</Label>
        <Select
          value={interval}
          onValueChange={(
            value: "one-off" | "daily" | "weekly" | "biweekly" | "four-weekly"
          ) => setInterval(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one-off">One-off Feed</SelectItem>
            <SelectItem value="daily">Every Day</SelectItem>
            <SelectItem value="weekly">Every Week</SelectItem>
            <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
            <SelectItem value="four-weekly">Every 4 Weeks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedAmount">Feed Amount (kg)</Label>
        <Input
          id="feedAmount"
          type="number"
          step="0.1"
          min="0.1"
          value={feedAmount}
          onChange={(e) => setFeedAmount(e.target.value)}
        />
      </div>

      {interval !== "one-off" && interval !== "daily" && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <Button
                key={day}
                type="button"
                variant={selectedDays.includes(day) ? "default" : "outline"}
                className="w-full"
                onClick={() => toggleDay(day)}
              >
                {format(new Date(2024, 0, day + 1), "EEE")}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {schedule ? "Update Schedule" : "Add Schedule"}
        </Button>
      </div>
    </form>
  );
}
