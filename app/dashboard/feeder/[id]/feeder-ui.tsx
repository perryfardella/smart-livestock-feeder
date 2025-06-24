"use client";

import { Card } from "@/components/ui/card";
import {
  Activity,
  Clock,
  Settings,
  ArrowLeft,
  Camera,
  Utensils,
  Wifi,
  WifiOff,
  RefreshCw,
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
import { DeleteFeeder } from "./delete-feeder";
import { type Feeder } from "@/lib/actions/feeders";
import { SensorDashboard } from "@/components/sensor-dashboard";
import { useState, useEffect } from "react";
import { getFeederConnectionStatus } from "@/lib/actions/sensor-data";
import {
  type FeederConnectionStatus,
  getFeederStatus,
} from "@/lib/utils/feeder-status";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { format } from "date-fns";
import { FeedingScheduleSection } from "./feeding-schedule";

export function FeederUI({ feeder }: { feeder: Feeder }) {
  const [connectionStatus, setConnectionStatus] =
    useState<FeederConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check connection status on component mount and periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await getFeederConnectionStatus(feeder.device_id);
        setConnectionStatus(status);
      } catch (error) {
        console.error("Error checking connection status:", error);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();

    // Check connection status every 2 minutes instead of 30 seconds to reduce server load
    const interval = setInterval(() => {
      // Only check if the page is visible to avoid unnecessary requests
      if (!document.hidden) {
        checkConnection();
      }
    }, 120000); // 2 minutes = 120,000ms

    // Also check when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnection();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [feeder.device_id]);

  // Get feeder status
  const feederStatus = connectionStatus
    ? getFeederStatus(connectionStatus.lastCommunication)
    : null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Implement MQTT publish to request data from feeder
      // This will involve sending a command to the device to force it to send sensor data
      // For now, we'll just show a success message and check the connection status

      toast.success("Manual sync initiated! Waiting for device response...");

      // Wait a moment then check connection status
      setTimeout(async () => {
        try {
          const status = await getFeederConnectionStatus(feeder.device_id);
          setConnectionStatus(status);
        } catch (error) {
          console.error("Error checking connection after sync:", error);
        }
      }, 2000);
    } catch (error) {
      toast.error("Failed to initiate manual sync");
      console.error("Error during manual sync:", error);
    } finally {
      setIsSyncing(false);
    }
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
              <p className="text-sm text-gray-600">
                {feeder.location || "No location set"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <FeederForm mode="edit" feeder={feeder} />

            <DeleteFeeder feeder={feeder} />

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isSyncing ? "Syncing..." : "Manual Sync"}
              </span>
              <span className="sm:hidden">Sync</span>
            </Button>

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
              <Settings className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Device ID</p>
                <p className="text-lg font-semibold font-mono">
                  {feeder.device_id}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              {isCheckingConnection ? (
                <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              ) : feederStatus?.status === "online" ? (
                <Wifi className="h-8 w-8 text-green-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p
                  className={`text-lg font-semibold ${
                    isCheckingConnection
                      ? "text-gray-600"
                      : feederStatus?.status === "online"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {isCheckingConnection
                    ? "Checking..."
                    : feederStatus?.displayText || "Offline"}
                </p>
                {feederStatus?.lastCommunication && (
                  <p className="text-xs text-gray-500">
                    Last communication:{" "}
                    {format(
                      new Date(feederStatus.lastCommunication),
                      "MMM d, yyyy h:mm a"
                    )}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-lg font-semibold">
                  {format(new Date(feeder.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-lg font-semibold">
                  {format(new Date(feeder.updated_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Feeder Details */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Feeder Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="font-medium">{feeder.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Device ID:</span>
                <span className="font-mono text-sm">{feeder.device_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Location:</span>
                <span className="font-medium">
                  {feeder.location || "Not set"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                {feederStatus ? (
                  <ConnectionStatus status={feederStatus.status} size="sm" />
                ) : (
                  <span className="text-sm text-gray-600">Checking...</span>
                )}
              </div>
              {feeder.description && (
                <div>
                  <span className="text-sm text-gray-600">Description:</span>
                  <p className="mt-1 text-sm">{feeder.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Settings */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Settings</h2>
            <div className="space-y-4">
              {Object.keys(feeder.settings).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(feeder.settings).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="font-medium text-sm">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No custom settings configured
                </p>
              )}
            </div>
          </Card>

          {/* Feeding Schedule */}
          <div className="lg:col-span-2">
            <FeedingScheduleSection feederId={feeder.id} />
          </div>

          {/* Activity Log */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Feeder created</p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(feeder.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
              {feeder.updated_at !== feeder.created_at && (
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                  <Settings className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Feeder updated</p>
                    <p className="text-xs text-gray-600">
                      {format(
                        new Date(feeder.updated_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sensor Data Section */}
        <div className="mt-8">
          <SensorDashboard
            deviceId={feeder.device_id}
            feederName={feeder.name}
          />
        </div>
      </div>
    </div>
  );
}
