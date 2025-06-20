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
import { format, addDays, isBefore, isAfter } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
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

export type FeedingSession = {
  id: string;
  time: string; // HH:mm format
  feedAmount: number;
};

export type FeedingSchedule = {
  id: string;
  startDate: Date;
  endDate?: Date;
  interval: "one-off" | "daily" | "weekly" | "biweekly" | "four-weekly";
  daysOfWeek: number[]; // 0-6 for Sunday-Saturday
  sessions: FeedingSession[]; // Multiple sessions per day
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

  const getNextFeeding = (
    schedule: FeedingSchedule
  ): { date: Date; session: FeedingSession } | null => {
    const now = new Date();

    // For one-off feeds, return null if the feed has already occurred
    if (schedule.interval === "one-off") {
      if (isBefore(schedule.startDate, now)) return null;

      // Find the next session for the one-off date
      const nextSession = schedule.sessions
        .map((session) => {
          const sessionDate = new Date(schedule.startDate);
          const [hours, minutes] = session.time.split(":");
          sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return { date: sessionDate, session };
        })
        .filter(({ date }) => isAfter(date, now))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      return nextSession || null;
    }

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
  const [selectedDays, setSelectedDays] = useState<number[]>(
    schedule?.daysOfWeek || []
  );
  const [sessions, setSessions] = useState<FeedingSession[]>(
    schedule?.sessions || [{ id: "1", time: "08:00", feedAmount: 1 }]
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
    if (sessions.length === 0) {
      toast.error("Please add at least one feeding session");
      return;
    }
    if (sessions.some((session) => session.feedAmount <= 0)) {
      toast.error("All feed amounts must be greater than 0");
      return;
    }

    onSubmit({
      startDate,
      endDate,
      interval,
      daysOfWeek: selectedDays,
      sessions,
    });
  };

  const toggleDay = (day: number) => {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
    );
  };

  const addSession = () => {
    const newSession: FeedingSession = {
      id: Math.random().toString(36).substr(2, 9),
      time: "08:00",
      feedAmount: 1,
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (sessionId: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter((s) => s.id !== sessionId));
    }
  };

  const updateSession = (
    sessionId: string,
    field: keyof FeedingSession,
    value: string | number
  ) => {
    setSessions(
      sessions.map((session) =>
        session.id === sessionId ? { ...session, [field]: value } : session
      )
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
            value={startDate ? format(startDate, "HH:mm") : "08:00"}
            onChange={(e) => {
              if (startDate) {
                const [hours, minutes] = e.target.value.split(":");
                const newDate = new Date(startDate);
                newDate.setHours(parseInt(hours), parseInt(minutes));
                setStartDate(newDate);
              } else {
                const newDate = new Date();
                const [hours, minutes] = e.target.value.split(":");
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
            placeholder="--:--"
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Feeding Sessions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSession}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Session
          </Button>
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              <div className="flex items-start gap-2 flex-1">
                <Clock className="h-4 w-4 text-gray-500 mt-6" />
                <div className="space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={session.time}
                    onChange={(e) =>
                      updateSession(session.id, "time", e.target.value)
                    }
                    className="w-[120px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={session.feedAmount}
                    onChange={(e) =>
                      updateSession(
                        session.id,
                        "feedAmount",
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-[100px]"
                  />
                </div>
              </div>
              {sessions.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSession(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Total daily amount:{" "}
          {sessions
            .reduce((total, session) => total + session.feedAmount, 0)
            .toFixed(1)}
          kg
        </div>
      </div>

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
