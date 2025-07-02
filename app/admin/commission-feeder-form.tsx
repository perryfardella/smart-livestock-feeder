"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  createCommissionedFeeder,
  bulkCreateCommissionedFeeders,
} from "@/lib/actions/commissioned-feeders";
import { Plus, Upload } from "lucide-react";

export function CommissionFeederForm() {
  const [isPending, startTransition] = useTransition();

  // Single feeder form state
  const [deviceId, setDeviceId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Bulk form state
  const [bulkDeviceIds, setBulkDeviceIds] = useState("");
  const [bulkBatchNumber, setBulkBatchNumber] = useState("");

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!deviceId.trim()) {
      toast.error("Please enter a device ID");
      return;
    }

    startTransition(async () => {
      try {
        await createCommissionedFeeder({
          device_id: deviceId.trim(),
          batch_number: batchNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        toast.success("Feeder commissioned successfully!");

        // Reset form
        setDeviceId("");
        setBatchNumber("");
        setNotes("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to commission feeder"
        );
        console.error("Error commissioning feeder:", error);
      }
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkDeviceIds.trim()) {
      toast.error("Please enter device IDs");
      return;
    }

    // Parse device IDs from textarea (split by newlines, commas, or spaces)
    const deviceIds = bulkDeviceIds
      .split(/[\n,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (deviceIds.length === 0) {
      toast.error("Please enter valid device IDs");
      return;
    }

    startTransition(async () => {
      try {
        const result = await bulkCreateCommissionedFeeders(
          deviceIds,
          bulkBatchNumber.trim() || undefined
        );

        toast.success(`Successfully commissioned ${result.length} feeder(s)!`);

        // Reset form
        setBulkDeviceIds("");
        setBulkBatchNumber("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to commission feeders"
        );
        console.error("Error bulk commissioning feeders:", error);
      }
    });
  };

  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="single">Single Feeder</TabsTrigger>
        <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Commission Single Feeder
            </CardTitle>
            <CardDescription>
              Add a single feeder device ID to the commissioned list.
              <br />
              <strong>Testing Mode:</strong> Multiple users can connect to the
              same device ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID *</Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Enter device ID (e.g., SF001234)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Enter batch number (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any notes about this device (optional)"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Commissioning..." : "Commission Feeder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bulk">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Bulk Commission Feeders
            </CardTitle>
            <CardDescription>
              Upload multiple device IDs at once. Enter one device ID per line,
              or separate with commas/spaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkDeviceIds">Device IDs *</Label>
                <Textarea
                  id="bulkDeviceIds"
                  value={bulkDeviceIds}
                  onChange={(e) => setBulkDeviceIds(e.target.value)}
                  placeholder={`Enter device IDs (one per line):\nSF001234\nSF001235\nSF001236`}
                  rows={8}
                  required
                />
                <p className="text-sm text-gray-500">
                  Separate device IDs with new lines, commas, or spaces
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkBatchNumber">Batch Number</Label>
                <Input
                  id="bulkBatchNumber"
                  value={bulkBatchNumber}
                  onChange={(e) => setBulkBatchNumber(e.target.value)}
                  placeholder="Enter batch number for all devices (optional)"
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Commissioning..." : "Commission All Feeders"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
