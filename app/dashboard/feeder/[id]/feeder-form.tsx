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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { createFeeder, updateFeeder, type Feeder } from "@/lib/actions/feeders";
import { checkSinglePermission } from "@/lib/utils/permissions-client";

// Popular timezones, with Australian timezones prioritized for the target audience
const TIMEZONES = [
  // Australian timezones (primary target market)
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT/AEST)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEDT/AEST)" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Australia/Adelaide (ACDT/ACST)" },
  { value: "Australia/Darwin", label: "Australia/Darwin (ACST)" },
  { value: "Australia/Hobart", label: "Australia/Hobart (AEDT/AEST)" },

  // Other common timezones
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
];

interface FeederFormProps {
  mode: "create" | "edit";
  feeder?: Feeder;
  onSuccess?: () => void;
}

export function FeederForm({ mode, feeder, onSuccess }: FeederFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [canEditFeeder, setCanEditFeeder] = useState(true); // Default to true for create mode

  // Form state
  const [deviceId, setDeviceId] = useState(feeder?.device_id || "");
  const [name, setName] = useState(feeder?.name || "");
  const [location, setLocation] = useState(feeder?.location || "");
  const [description, setDescription] = useState(feeder?.description || "");
  const [timezone, setTimezone] = useState(
    feeder?.timezone || "Australia/Sydney"
  );

  // Check edit permissions for edit mode
  useEffect(() => {
    const checkEditPermission = async () => {
      if (mode === "edit" && feeder) {
        try {
          const permissions = await checkSinglePermission(
            feeder.id,
            "edit_feeder_settings"
          );
          setCanEditFeeder(permissions);
        } catch (error) {
          console.error("Error checking edit permission:", error);
          setCanEditFeeder(false);
        }
      }
    };

    checkEditPermission();
  }, [mode, feeder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a feeder name");
      return;
    }

    if (mode === "create" && !deviceId.trim()) {
      toast.error("Please enter a device ID");
      return;
    }

    if (!timezone) {
      toast.error("Please select a timezone");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          const result = await createFeeder({
            device_id: deviceId,
            name,
            location,
            description,
            timezone,
          });

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          toast.success("Feeder created successfully!");
        } else if (feeder) {
          await updateFeeder(feeder.id, {
            name,
            location,
            description,
            timezone,
          });
          toast.success("Feeder updated successfully!");
        }

        setOpen(false);
        if (mode === "create") {
          // Reset form for create mode
          setDeviceId("");
          setName("");
          setLocation("");
          setDescription("");
          setTimezone("Australia/Sydney");
        }
        onSuccess?.();
      } catch (error) {
        // This should only catch unexpected errors now
        const errorMessage =
          error instanceof Error
            ? error.message
            : mode === "create"
              ? "Failed to create feeder"
              : "Failed to update feeder";

        toast.error(errorMessage);
        console.error("Unexpected error:", error);
      }
    });
  };

  // Don't render the edit button if user doesn't have permission
  if (mode === "edit" && !canEditFeeder) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Feeder
          </Button>
        ) : (
          <Button variant="outline" className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Feeder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Feeder" : "Edit Feeder"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Enter device ID (e.g., SF001234)"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Feeder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter feeder name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter feeder location (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} required>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter feeder description (optional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === "create"
                  ? "Adding..."
                  : "Saving..."
                : mode === "create"
                  ? "Add Feeder"
                  : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
