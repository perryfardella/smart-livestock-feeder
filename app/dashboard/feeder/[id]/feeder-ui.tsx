"use client";

import { Card } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Droplet,
  Thermometer,
  Battery,
  AlertCircle,
  ArrowLeft,
  Camera,
  Utensils,
  Wifi,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FeederForm } from "./feeder-form";
import { ScheduleForm, type Schedule } from "./schedule-form";
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
import { useRouter } from "next/navigation";

type Feeder = {
  id: string;
  name: string;
  location: string;
  status: string;
  lastFeeding: string;
  nextFeeding: string;
  waterLevel: number;
  temperature: number;
  batteryLevel: number;
  connectivityStrength: number;
  alerts: Array<{
    id: number;
    message: string;
    severity: string;
  }>;
  feedingSchedule: Schedule[];
  dailyStats: {
    totalFeed: string;
    waterConsumption: string;
    activeTime: string;
  };
};

export function FeederUI({ feeder }: { feeder: Feeder }) {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      // In a real implementation, this would delete from your database
      console.log("Deleting feeder:", feeder.id);
      toast.success("Feeder deleted successfully");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete feeder");
    }
  };

  const handleScheduleSubmit = async (data: Omit<Schedule, "id">) => {
    // In a real implementation, this would save to your database
    console.log("New schedule:", data);
    toast.success("Schedule added successfully");
  };

  const handleScheduleEdit = async (
    scheduleId: string,
    data: Omit<Schedule, "id">
  ) => {
    // In a real implementation, this would update your database
    console.log("Updated schedule:", { id: scheduleId, ...data });
    toast.success("Schedule updated successfully");
  };

  const handleScheduleDelete = async (scheduleId: string) => {
    // In a real implementation, this would delete from your database
    console.log("Deleting schedule:", scheduleId);
    toast.success("Schedule deleted successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {feeder.name}
              </h1>
              <p className="text-sm text-gray-600">{feeder.location}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <FeederForm
              mode="edit"
              feeder={feeder}
              onSubmit={async (data) => {
                // In a real implementation, this would update your database
                console.log("Updated feeder:", { ...feeder, ...data });
                toast.success("Feeder updated successfully");
              }}
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete Feeder</span>
                  <span className="sm:hidden">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the feeder and all its associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                toast.success("Feed released successfully!");
              }}
            >
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Release Feed</span>
              <span className="sm:hidden">Feed</span>
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">View Camera</span>
                  <span className="sm:hidden">Camera</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Live Camera Feed - {feeder.name}</DialogTitle>
                </DialogHeader>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Camera feed placeholder
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Next Feeding</p>
                <p className="text-2xl font-semibold">{feeder.nextFeeding}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Droplet className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Water Level</p>
                <p className="text-2xl font-semibold">{feeder.waterLevel}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Thermometer className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-2xl font-semibold">{feeder.temperature}°C</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Battery className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Battery Level</p>
                <p className="text-2xl font-semibold">{feeder.batteryLevel}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Wifi className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Connectivity</p>
                <p className="text-2xl font-semibold">
                  {feeder.connectivityStrength}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Feeding Schedule */}
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Feeding Schedule</h2>
              <ScheduleForm mode="create" onSubmit={handleScheduleSubmit} />
            </div>
            <div className="space-y-4">
              {feeder.feedingSchedule.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="font-medium">{schedule.time}</span>
                      <p className="text-sm text-gray-600">
                        {schedule.days.length === 7
                          ? "Daily"
                          : schedule.days.map((d) => d.slice(0, 3)).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">{schedule.amount}</span>
                    <div className="flex gap-2">
                      <ScheduleForm
                        mode="edit"
                        schedule={schedule}
                        onSubmit={(data) =>
                          handleScheduleEdit(schedule.id, data)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleScheduleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Alerts */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Alerts</h2>
            <div className="space-y-4">
              {feeder.alerts.length > 0 ? (
                feeder.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-lg bg-gray-50 p-4"
                  >
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No active alerts</p>
              )}
            </div>
          </Card>

          {/* Daily Stats */}
          <Card className="p-6 lg:col-span-3">
            <h2 className="mb-4 text-xl font-semibold">Daily Statistics</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Total Feed</p>
                <p className="text-2xl font-semibold">
                  {feeder.dailyStats.totalFeed}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Water Consumption</p>
                <p className="text-2xl font-semibold">
                  {feeder.dailyStats.waterConsumption}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Active Time</p>
                <p className="text-2xl font-semibold">
                  {feeder.dailyStats.activeTime}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
