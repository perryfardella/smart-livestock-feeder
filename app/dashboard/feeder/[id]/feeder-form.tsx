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

interface FeederFormProps {
  mode: "create" | "edit";
  feeder?: {
    id: string;
    name: string;
    location: string;
  };
  onSubmit: (data: { name: string; location: string }) => void;
}

export function FeederForm({ mode, feeder, onSubmit }: FeederFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(feeder?.name || "");
  const [location, setLocation] = useState(feeder?.location || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    onSubmit({ name, location });
    setOpen(false);
    setName("");
    setLocation("");
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
          <div className="space-y-2">
            <Label htmlFor="name">Feeder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter feeder name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter feeder location"
            />
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
              {mode === "create" ? "Add Feeder" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
