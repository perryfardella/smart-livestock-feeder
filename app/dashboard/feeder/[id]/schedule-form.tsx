"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type Schedule = {
  id: string;
  time: string;
  amount: string;
  days: string[];
};

interface ScheduleFormProps {
  mode: "create" | "edit";
  schedule?: Schedule;
  onSubmit: (data: Omit<Schedule, "id">) => void;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function ScheduleForm({ mode, schedule, onSubmit }: ScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(schedule?.time || "06:00");
  const [amount, setAmount] = useState(schedule?.amount || "2.5");
  const [days, setDays] = useState<string[]>(schedule?.days || DAYS_OF_WEEK);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !amount || days.length === 0) {
      toast.error("Please fill in all fields");
      return;
    }
    onSubmit({ time, amount: `${amount}kg`, days });
    setOpen(false);
    setTime("06:00");
    setAmount("2.5");
    setDays(DAYS_OF_WEEK);
  };

  const toggleDay = (day: string) => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        ) : (
          <Button variant="outline" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Feeding Schedule" : "Edit Schedule"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">Feeding Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Feed Amount (kg)</Label>
            <Input
              id="amount"
              type="number"
              step="0.1"
              min="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={days.includes(day) ? "default" : "outline"}
                  className="w-full"
                  onClick={() => toggleDay(day)}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Add Schedule" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
