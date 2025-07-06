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
import { Card, CardContent } from "@/components/ui/card";
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
import { Pencil, Trash2, Package, Calendar, FileText } from "lucide-react";
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
      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-4">
        {feeders.map((feeder) => (
          <Card key={feeder.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Package className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-medium text-sm truncate">
                      {feeder.device_id}
                    </p>
                    <Badge
                      variant={feeder.is_available ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {feeder.is_available ? "Available" : "Assigned"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(feeder)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
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
                          {feeder.device_id}&quot;? This action cannot be undone
                          and will prevent users from creating feeders with this
                          device ID.
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
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-500 text-xs">Commissioned</p>
                    <p className="font-medium">
                      {format(
                        new Date(feeder.commissioned_date),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                </div>

                {feeder.batch_number && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500 text-xs">Batch Number</p>
                      <p className="font-medium">{feeder.batch_number}</p>
                    </div>
                  </div>
                )}

                {feeder.notes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-500 text-xs">Notes</p>
                      <p className="font-medium text-sm break-words">
                        {feeder.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
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
                              undone and will prevent users from creating
                              feeders with this device ID.
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Commissioned Feeder</DialogTitle>
            <DialogDescription>
              Make changes to the feeder details. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-device-id">Device ID *</Label>
              <Input
                id="edit-device-id"
                value={editDeviceId}
                onChange={(e) => setEditDeviceId(e.target.value)}
                placeholder="Enter device ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-batch-number">Batch Number</Label>
              <Input
                id="edit-batch-number"
                value={editBatchNumber}
                onChange={(e) => setEditBatchNumber(e.target.value)}
                placeholder="Enter batch number (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter any notes (optional)"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is-available"
                checked={editIsAvailable}
                onChange={(e) => setEditIsAvailable(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Label htmlFor="edit-is-available">
                Available for assignment
              </Label>
            </div>

            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
