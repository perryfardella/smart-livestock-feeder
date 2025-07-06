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
      <TabsList className="grid w-full grid-cols-2 h-9">
        <TabsTrigger value="single" className="text-sm">
          Single Feeder
        </TabsTrigger>
        <TabsTrigger value="bulk" className="text-sm">
          Bulk Upload
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              Commission Single Feeder
            </CardTitle>
            <CardDescription className="text-sm">
              Add a single feeder device ID to the commissioned list.
              <br />
              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
                <strong>Testing Mode:</strong> Multiple users can connect to the
                same device ID.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId" className="text-sm font-medium">
                  Device ID *
                </Label>
                <Input
                  id="deviceId"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Enter device ID (e.g., SF001234)"
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchNumber" className="text-sm font-medium">
                  Batch Number
                </Label>
                <Input
                  id="batchNumber"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Enter batch number (optional)"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any notes about this device (optional)"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 text-sm font-medium"
              >
                {isPending ? "Commissioning..." : "Commission Feeder"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bulk" className="mt-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
              Bulk Commission Feeders
            </CardTitle>
            <CardDescription className="text-sm">
              Upload multiple device IDs at once. Enter one device ID per line,
              or separate with commas/spaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkDeviceIds" className="text-sm font-medium">
                  Device IDs *
                </Label>
                <Textarea
                  id="bulkDeviceIds"
                  value={bulkDeviceIds}
                  onChange={(e) => setBulkDeviceIds(e.target.value)}
                  placeholder={`Enter device IDs (one per line):\nSF001234\nSF001235\nSF001236`}
                  rows={6}
                  required
                  className="text-sm resize-none font-mono"
                />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Separate device IDs with new lines, commas, or spaces
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bulkBatchNumber"
                  className="text-sm font-medium"
                >
                  Batch Number
                </Label>
                <Input
                  id="bulkBatchNumber"
                  value={bulkBatchNumber}
                  onChange={(e) => setBulkBatchNumber(e.target.value)}
                  placeholder="Enter batch number for all devices (optional)"
                  className="text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 text-sm font-medium"
              >
                {isPending ? "Commissioning..." : "Commission Feeders"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
