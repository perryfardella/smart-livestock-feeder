import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Droplet,
  Thermometer,
  Battery,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// Sample data - In real implementation, this would come from your database
const feedingStations = {
  "feeder-1": {
    id: "feeder-1",
    name: "Main Barn Feeder",
    location: "North Barn",
    status: "active",
    lastFeeding: "2 hours ago",
    nextFeeding: "In 4 hours",
    waterLevel: 75,
    temperature: 24,
    batteryLevel: 85,
    alerts: [
      { id: 1, message: "Water level below 80%", severity: "warning" },
      {
        id: 2,
        message: "Scheduled maintenance due in 2 days",
        severity: "info",
      },
    ],
    feedingSchedule: [
      { time: "06:00", amount: "2.5kg" },
      { time: "12:00", amount: "2.5kg" },
      { time: "18:00", amount: "2.5kg" },
    ],
    dailyStats: {
      totalFeed: "7.5kg",
      waterConsumption: "15L",
      activeTime: "12 hours",
    },
  },
  "feeder-2": {
    id: "feeder-2",
    name: "South Pasture Feeder",
    location: "South Field",
    status: "active",
    lastFeeding: "1 hour ago",
    nextFeeding: "In 5 hours",
    waterLevel: 90,
    temperature: 22,
    batteryLevel: 95,
    alerts: [],
    feedingSchedule: [
      { time: "07:00", amount: "2.0kg" },
      { time: "13:00", amount: "2.0kg" },
      { time: "19:00", amount: "2.0kg" },
    ],
    dailyStats: {
      totalFeed: "6.0kg",
      waterConsumption: "12L",
      activeTime: "10 hours",
    },
  },
  "feeder-3": {
    id: "feeder-3",
    name: "East Wing Feeder",
    location: "East Barn",
    status: "maintenance",
    lastFeeding: "3 hours ago",
    nextFeeding: "In 3 hours",
    waterLevel: 60,
    temperature: 25,
    batteryLevel: 45,
    alerts: [{ id: 1, message: "Battery level critical", severity: "error" }],
    feedingSchedule: [
      { time: "05:00", amount: "3.0kg" },
      { time: "11:00", amount: "3.0kg" },
      { time: "17:00", amount: "3.0kg" },
    ],
    dailyStats: {
      totalFeed: "9.0kg",
      waterConsumption: "18L",
      activeTime: "14 hours",
    },
  },
};

export default async function FeederPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  const feeder =
    feedingStations[resolvedParams.id as keyof typeof feedingStations];
  if (!feeder) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {feeder.name}
              </h1>
              <p className="text-sm text-gray-600">{feeder.location}</p>
            </div>
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
