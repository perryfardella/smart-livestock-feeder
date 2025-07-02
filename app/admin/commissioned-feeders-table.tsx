"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  type CommissionedFeeder,
  updateCommissionedFeeder,
  deleteCommissionedFeeder,
} from "@/lib/actions/commissioned-feeders";

interface CommissionedFeedersTableProps {
  feeders: CommissionedFeeder[];
}

export function CommissionedFeedersTable({
  feeders,
}: CommissionedFeedersTableProps) {
  const [editingFeeder, setEditingFeeder] = useState<CommissionedFeeder | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Edit form state
  const [editDeviceId, setEditDeviceId] = useState("");
  const [editBatchNumber, setEditBatchNumber] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editIsAvailable, setEditIsAvailable] = useState(true);

  const handleEditClick = (feeder: CommissionedFeeder) => {
    setEditingFeeder(feeder);
    setEditDeviceId(feeder.device_id);
    setEditBatchNumber(feeder.batch_number || "");
    setEditNotes(feeder.notes || "");
    setEditIsAvailable(feeder.is_available);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingFeeder) return;

    if (!editDeviceId.trim()) {
      toast.error("Device ID is required");
      return;
    }

    try {
      await updateCommissionedFeeder(editingFeeder.id, {
        device_id: editDeviceId.trim(),
        batch_number: editBatchNumber.trim() || undefined,
        notes: editNotes.trim() || undefined,
        is_available: editIsAvailable,
      });

      toast.success("Feeder updated successfully!");
      setIsEditDialogOpen(false);
      setEditingFeeder(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update feeder"
      );
      console.error("Error updating feeder:", error);
    }
  };

  const handleDelete = async (feeder: CommissionedFeeder) => {
    try {
      await deleteCommissionedFeeder(feeder.id);
      toast.success("Feeder deleted successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete feeder"
      );
      console.error("Error deleting feeder:", error);
    }
  };

  if (feeders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No commissioned feeders found. Commission your first feeder above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device ID</TableHead>
              <TableHead>Batch Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Commissioned Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeders.map((feeder) => (
              <TableRow key={feeder.id}>
                <TableCell className="font-mono font-medium">
                  {feeder.device_id}
                </TableCell>
                <TableCell>{feeder.batch_number || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={feeder.is_available ? "default" : "secondary"}
                  >
                    {feeder.is_available ? "Available" : "Assigned"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(feeder.commissioned_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {feeder.notes || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(feeder)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Commissioned Feeder
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete device ID &quot;
                            {feeder.device_id}&quot;? This action cannot be
                            undone and will prevent users from creating feeders
                            with this device ID.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(feeder)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commissioned Feeder</DialogTitle>
            <DialogDescription>
              Update the details for this commissioned feeder device.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDeviceId">Device ID *</Label>
              <Input
                id="editDeviceId"
                value={editDeviceId}
                onChange={(e) => setEditDeviceId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editBatchNumber">Batch Number</Label>
              <Input
                id="editBatchNumber"
                value={editBatchNumber}
                onChange={(e) => setEditBatchNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsAvailable"
                checked={editIsAvailable}
                onChange={(e) => setEditIsAvailable(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="editIsAvailable">Available for assignment</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Feeder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
