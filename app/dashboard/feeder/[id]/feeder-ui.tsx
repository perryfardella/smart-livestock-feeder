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
  alerts: Array<{
    id: number;
    message: string;
    severity: string;
  }>;
  feedingSchedule: Array<{
    time: string;
    amount: string;
  }>;
  dailyStats: {
    totalFeed: string;
    waterConsumption: string;
    activeTime: string;
  };
};

export function FeederUI({ feeder }: { feeder: Feeder }) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
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
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Feeding Schedule */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Feeding Schedule</h2>
            <div className="space-y-4">
              {feeder.feedingSchedule.map((schedule, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{schedule.time}</span>
                  </div>
                  <span className="text-gray-600">{schedule.amount}</span>
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
