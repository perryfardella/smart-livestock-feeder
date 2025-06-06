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
import { Plus, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createFeeder, updateFeeder, type Feeder } from "@/lib/actions/feeders";

interface FeederFormProps {
  mode: "create" | "edit";
  feeder?: Feeder;
  onSuccess?: () => void;
}

export function FeederForm({ mode, feeder, onSuccess }: FeederFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [deviceId, setDeviceId] = useState(feeder?.device_id || "");
  const [name, setName] = useState(feeder?.name || "");
  const [location, setLocation] = useState(feeder?.location || "");
  const [description, setDescription] = useState(feeder?.description || "");
  const [isActive, setIsActive] = useState(feeder?.is_active ?? true);

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

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createFeeder({
            device_id: deviceId,
            name,
            location,
            description,
            is_active: isActive,
          });
          toast.success("Feeder created successfully!");
        } else if (feeder) {
          await updateFeeder(feeder.id, {
            name,
            location,
            description,
            is_active: isActive,
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
          setIsActive(true);
        }
        onSuccess?.();
      } catch (error) {
        toast.error(
          mode === "create"
            ? "Failed to create feeder"
            : "Failed to update feeder"
        );
        console.error("Error:", error);
      }
    });
  };

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
                placeholder="Enter device ID"
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter feeder description (optional)"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="isActive">Active</Label>
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
