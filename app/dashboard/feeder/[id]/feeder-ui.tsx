"use client";

import { Card } from "@/components/ui/card";
import { ArrowLeft, Camera, Utensils, RefreshCw, Globe } from "lucide-react";
import Link from "next/link";
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
import { toast } from "sonner";
import { FeederForm } from "./feeder-form";
import { DeleteFeeder } from "./delete-feeder";
import { type Feeder } from "@/lib/actions/feeders";
import { SensorDashboard } from "@/components/sensor-dashboard";
import { useState, useEffect } from "react";
import {
  getFeederConnectionStatus,
  getAllSensorDataUnfiltered,
} from "@/lib/actions/sensor-data";
import {
  type FeederConnectionStatus,
  getFeederStatus,
} from "@/lib/utils/feeder-status";
import { format } from "date-fns";
import { FeedingScheduleSection } from "./feeding-schedule";
import { PermissionsManagement } from "@/components/permissions/permissions-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  getFeedingSchedules,
  type FeedingSchedule,
} from "@/lib/actions/feeding-schedules";
import { getFeederMemberships } from "@/lib/actions/permissions";
import {
  type FeederRole,
  checkBatchPermissions,
} from "@/lib/utils/permissions-client";

// Types for cached data
interface FeederMember {
  id: string;
  user_id: string;
  role: FeederRole;
  status: string;
  invited_at: string | null;
  accepted_at?: string | null;
  email?: string | null;
  is_owner?: boolean;
}

interface FeederInvitation {
  id: string;
  invitee_email: string;
  role: FeederRole;
  status: string;
  expires_at: string;
  created_at: string;
}

interface RawSensorData {
  sensor_type: string;
  sensor_value: number;
  timestamp: string;
}

interface UserPermissions {
  canManualFeed: boolean;
  canCreateSchedules: boolean;
  canEditSchedules: boolean;
  canDeleteSchedules: boolean;
}

export function FeederUI({ feeder }: { feeder: Feeder }) {
  const [connectionStatus, setConnectionStatus] =
    useState<FeederConnectionStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [feedAmount, setFeedAmount] = useState("");
  const [isReleasingFeed, setIsReleasingFeed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Cached data states
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    canManualFeed: false,
    canCreateSchedules: false,
    canEditSchedules: false,
    canDeleteSchedules: false,
  });
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>(
    []
  );
  const [rawSensorData, setRawSensorData] = useState<RawSensorData[]>([]);
  const [members, setMembers] = useState<FeederMember[]>([]);
  const [invitations, setInvitations] = useState<FeederInvitation[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get current user ID and check permissions
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadUserPermissions();
      }
    };

    getCurrentUser();
  }, [feeder.id]);

  // Load cached data when user is authenticated
  useEffect(() => {
    if (currentUserId) {
      loadAllCachedData();
    }
  }, [currentUserId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine current user's role and ownership status from cached data
  const getCurrentUserPermissionInfo = () => {
    if (!currentUserId) {
      return { currentUserRole: null, isOwner: false };
    }

    // Check if user is the feeder owner
    if (feeder.user_id === currentUserId) {
      return { currentUserRole: "owner" as FeederRole, isOwner: true };
    }

    // Check membership in cached data
    const userMembership = members.find(
      (member) =>
        member.user_id === currentUserId && member.status === "accepted"
    );

    if (userMembership) {
      return { currentUserRole: userMembership.role, isOwner: false };
    }

    return { currentUserRole: null, isOwner: false };
  };

  const { currentUserRole, isOwner } = getCurrentUserPermissionInfo();

  const loadUserPermissions = async () => {
    try {
      const permissions = await checkBatchPermissions(feeder.id, [
        "manual_feed_release",
        "create_feeding_schedules",
        "edit_feeding_schedules",
        "delete_feeding_schedules",
      ]);

      setUserPermissions({
        canManualFeed: permissions.manual_feed_release || false,
        canCreateSchedules: permissions.create_feeding_schedules || false,
        canEditSchedules: permissions.edit_feeding_schedules || false,
        canDeleteSchedules: permissions.delete_feeding_schedules || false,
      });
    } catch (error) {
      console.error("Error loading user permissions:", error);
      setUserPermissions({
        canManualFeed: false,
        canCreateSchedules: false,
        canEditSchedules: false,
        canDeleteSchedules: false,
      });
    }
  };

  const loadAllCachedData = async () => {
    setDataLoading(true);

    try {
      // Load all data in parallel
      const [schedulesResult, sensorData, membersResult, invitationsResponse] =
        await Promise.all([
          getFeedingSchedules(feeder.id),
          getAllSensorDataUnfiltered(feeder.device_id, 2000),
          getFeederMemberships(feeder.id),
          fetch(`/api/feeders/${feeder.id}/invitations`),
        ]);

      // Handle feeding schedules
      if (schedulesResult.success) {
        setFeedingSchedules(schedulesResult.schedules);
      } else {
        console.error("Failed to load schedules:", schedulesResult.error);
        setFeedingSchedules([]);
      }

      // Handle sensor data
      setRawSensorData(sensorData);

      // Handle members
      if (membersResult.success) {
        setMembers(membersResult.memberships || []);
      } else {
        console.error("Failed to load members:", membersResult.error);
        setMembers([]);
      }

      // Handle invitations
      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.invitations || []);
      } else {
        console.error("Failed to load invitations");
        setInvitations([]);
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
      // Reset all data on error
      setFeedingSchedules([]);
      setRawSensorData([]);
      setMembers([]);
      setInvitations([]);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDataRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Check connection status on component mount and periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await getFeederConnectionStatus(feeder.device_id);
        setConnectionStatus(status);
      } catch (error) {
        console.error("Error checking connection status:", error);
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

  const handleReleaseFeed = async () => {
    const amount = parseFloat(feedAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid feed amount greater than 0");
      return;
    }

    setIsReleasingFeed(true);
    try {
      const topic = `${feeder.device_id}/writeDataRequest`;
      const message = JSON.stringify({ manualFeedQuantity: amount });

      const response = await fetch("/api/mqtt/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, message }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish MQTT message");
      }

      toast.success(`Successfully released ${amount}kg of feed!`);
      setFeedDialogOpen(false);
      setFeedAmount("");
    } catch (error) {
      toast.error("Failed to release feed. Please try again.");
      console.error("Error releasing feed:", error);
    } finally {
      setIsReleasingFeed(false);
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

            {userPermissions.canManualFeed && (
              <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    <span className="hidden sm:inline">Release Feed</span>
                    <span className="sm:hidden">Feed</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Release Feed - {feeder.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="feed-amount">Feed Amount (kg)</Label>
                      <Input
                        id="feed-amount"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={feedAmount}
                        onChange={(e) => setFeedAmount(e.target.value)}
                        placeholder="Enter amount in kg"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setFeedDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleReleaseFeed}
                        disabled={isReleasingFeed || !feedAmount}
                      >
                        {isReleasingFeed ? "Releasing..." : "Release Feed"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

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
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 min-h-[120px]">
            <div className="h-full flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                {feederStatus?.status === "online" ? (
                  <RefreshCw className="h-8 w-8 text-green-500" />
                ) : (
                  <RefreshCw className="h-8 w-8 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Status</p>
                <div>
                  {feederStatus ? (
                    <>
                      <p
                        className={`text-lg font-semibold ${
                          feederStatus.status === "online"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {feederStatus.displayText || "Offline"}
                      </p>
                      {feederStatus.lastCommunication && (
                        <p className="text-xs text-gray-500">
                          Last seen:{" "}
                          {format(
                            new Date(feederStatus.lastCommunication),
                            "MMM d, h:mm a"
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-lg font-semibold text-gray-600">
                      Checking...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 min-h-[120px]">
            <div className="h-full flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                <RefreshCw className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Device ID</p>
                <p className="text-lg font-semibold font-mono">
                  {feeder.device_id}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 min-h-[120px]">
            <div className="h-full flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                <Globe className="h-8 w-8 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Timezone</p>
                <p className="text-lg font-semibold">
                  {feeder.timezone.replace("_", " ")}
                </p>
                <p className="text-xs text-gray-500">
                  Current time:{" "}
                  {new Date().toLocaleTimeString("en-AU", {
                    timeZone: feeder.timezone,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Feeding Schedule */}
            <FeedingScheduleSection
              feederId={feeder.id}
              schedules={feedingSchedules}
              userPermissions={userPermissions}
              isLoading={dataLoading}
              onSchedulesChanged={handleDataRefresh}
            />

            {/* Sensor Data Section */}
            <div className="mt-8">
              <SensorDashboard
                feederName={feeder.name}
                rawSensorData={rawSensorData}
                isLoading={dataLoading}
                onDataRefresh={handleDataRefresh}
              />
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {currentUserId && (
              <PermissionsManagement
                feederId={feeder.id}
                feederName={feeder.name}
                currentUserRole={currentUserRole}
                isOwner={isOwner}
                members={members}
                invitations={invitations}
                isLoading={dataLoading}
                onDataChanged={handleDataRefresh}
              />
            )}
            {!currentUserId && (
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500">Loading user information...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
