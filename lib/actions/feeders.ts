"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFeederConnectionStatus } from "./sensor-data";
import {
  type FeederConnectionStatus,
  getFeederStatus,
  type FeederStatus,
} from "@/lib/utils/feeder-status";

export interface Feeder {
  id: string;
  user_id: string | null; // Nullable to support orphaned feeders
  device_id: string;
  name: string;
  description?: string;
  location?: string;
  timezone: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateFeederData {
  device_id: string;
  name: string;
  description?: string;
  location?: string;
  timezone?: string;
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

export interface UpdateFeederData {
  name?: string;
  description?: string;
  location?: string;
  timezone?: string;
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

export async function getUserFeeders(): Promise<Feeder[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("feeders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching feeders:", error);
    throw new Error("Failed to fetch feeders");
  }

  return data || [];
}

export interface FeederWithConnection extends Feeder {
  connectionStatus: FeederConnectionStatus;
}

export interface FeederWithStatus extends Feeder {
  status: FeederStatus;
}

export async function getUserFeedersWithConnectionStatus(): Promise<
  FeederWithConnection[]
> {
  const feeders = await getUserFeeders();

  // Get connection status for each feeder
  const feedersWithConnection = await Promise.all(
    feeders.map(async (feeder) => {
      try {
        const connectionStatus = await getFeederConnectionStatus(
          feeder.device_id
        );
        return {
          ...feeder,
          connectionStatus,
        };
      } catch (error) {
        console.error(
          `Error getting connection status for feeder ${feeder.id}:`,
          error
        );
        return {
          ...feeder,
          connectionStatus: {
            isOnline: false,
            lastCommunication: null,
          },
        };
      }
    })
  );

  return feedersWithConnection;
}

export async function getUserFeedersWithStatus(): Promise<FeederWithStatus[]> {
  const feeders = await getUserFeeders();

  // Get status for each feeder based on communication
  const feedersWithStatus = await Promise.all(
    feeders.map(async (feeder) => {
      try {
        const connectionStatus = await getFeederConnectionStatus(
          feeder.device_id
        );
        const status = getFeederStatus(connectionStatus.lastCommunication);
        return {
          ...feeder,
          status,
        };
      } catch (error) {
        console.error(`Error getting status for feeder ${feeder.id}:`, error);
        return {
          ...feeder,
          status: getFeederStatus(null),
        };
      }
    })
  );

  return feedersWithStatus;
}

// Optimized version that gets all feeder statuses with a single query
export async function getUserFeedersWithStatusOptimized(): Promise<
  FeederWithStatus[]
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // Get feeders with their latest sensor data in a single query
  const { data, error } = await supabase
    .from("feeders")
    .select(
      `
      *,
      latest_sensor:sensor_data(timestamp)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching feeders with status:", error);
    throw new Error("Failed to fetch feeders");
  }

  // Transform the data to include status
  const feedersWithStatus: FeederWithStatus[] = (data || []).map((feeder) => {
    // Find the latest timestamp from sensor data
    const sensorData = feeder.latest_sensor as { timestamp: string }[];
    const lastCommunication =
      sensorData && sensorData.length > 0
        ? sensorData.reduce((latest, current) => {
            return new Date(current.timestamp) > new Date(latest.timestamp)
              ? current
              : latest;
          }).timestamp
        : null;

    const status = getFeederStatus(lastCommunication);

    // Remove the sensor data from the returned object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { latest_sensor, ...feederData } = feeder;

    return {
      ...feederData,
      status,
    };
  });

  return feedersWithStatus;
}

interface DBFeederWithStatus {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  description: string;
  location: string;
  timezone: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_communication: string | null;
  is_online: boolean;
  status: string;
}

// Ultra-optimized version using database function (best performance)
export async function getUserFeedersWithStatusDB(): Promise<
  FeederWithStatus[]
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // Use the database function to get everything in one optimized query
  const { data, error } = await supabase.rpc("get_user_feeders_with_status");

  if (error) {
    console.error(
      "Error fetching feeders with status from DB function:",
      error
    );
    throw new Error("Failed to fetch feeders");
  }

  // Transform the data to match our interface
  const feedersWithStatus: FeederWithStatus[] = (data || []).map(
    (row: DBFeederWithStatus) => ({
      id: row.id,
      user_id: row.user_id,
      device_id: row.device_id,
      name: row.name,
      description: row.description,
      location: row.location,
      timezone: row.timezone,
      is_active: row.is_active,
      settings: row.settings,
      created_at: row.created_at,
      updated_at: row.updated_at,
      status: {
        status: row.status as "online" | "offline",
        isOnline: row.is_online,
        lastCommunication: row.last_communication,
        displayText: row.is_online ? "Online" : "Offline",
        colorClass: row.is_online
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800",
        iconType: row.is_online ? "online" : "offline",
      },
    })
  );

  return feedersWithStatus;
}

export async function getFeederById(id: string): Promise<Feeder | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("feeders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Feeder not found
    }
    console.error("Error fetching feeder:", error);
    throw new Error("Failed to fetch feeder");
  }

  return data;
}

export async function getFeederByDeviceId(
  deviceId: string
): Promise<Feeder | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("feeders")
    .select("*")
    .eq("device_id", deviceId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Feeder not found
    }
    console.error("Error fetching feeder by device ID:", error);
    throw new Error("Failed to fetch feeder");
  }

  return data;
}

export async function createFeeder(data: CreateFeederData): Promise<Feeder> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // First, check if there's an orphaned feeder with this device_id that we can reclaim
  const { data: orphanedFeeders, error: orphanedError } = await supabase.rpc(
    "find_orphaned_feeder",
    { device_id_param: data.device_id }
  );

  if (orphanedError) {
    console.error("Error checking for orphaned feeder:", orphanedError);
    throw new Error("Failed to check for existing feeder");
  }

  // If we found an orphaned feeder, reclaim it
  if (orphanedFeeders && orphanedFeeders.length > 0) {
    const existingOrphanedFeeder = orphanedFeeders[0];

    const { data: reclaimedFeeders, error: reclaimError } = await supabase.rpc(
      "reclaim_orphaned_feeder",
      {
        feeder_id: existingOrphanedFeeder.id,
        new_user_id: user.id,
        new_name: data.name,
        new_description: data.description,
        new_location: data.location,
        new_timezone:
          data.timezone ??
          existingOrphanedFeeder.timezone ??
          "Australia/Sydney",
        new_is_active: data.is_active ?? true,
        new_settings: data.settings ?? existingOrphanedFeeder.settings ?? {},
      }
    );

    if (reclaimError || !reclaimedFeeders || reclaimedFeeders.length === 0) {
      console.error("Error reclaiming orphaned feeder:", reclaimError);
      throw new Error("Failed to reclaim existing feeder");
    }

    revalidatePath("/dashboard");
    return reclaimedFeeders[0];
  }

  // Check if user already owns a feeder with this device_id
  const { data: existingUserFeeder, error: userFeederError } = await supabase
    .from("feeders")
    .select("*")
    .eq("device_id", data.device_id)
    .eq("user_id", user.id)
    .single();

  if (userFeederError && userFeederError.code !== "PGRST116") {
    console.error("Error checking for existing user feeder:", userFeederError);
    throw new Error("Failed to check for existing feeder");
  }

  if (existingUserFeeder) {
    throw new Error("You already have a feeder with this device ID");
  }

  // No existing feeder found, create a new one
  const feederData = {
    user_id: user.id,
    device_id: data.device_id,
    name: data.name,
    description: data.description,
    location: data.location,
    timezone: data.timezone ?? "Australia/Sydney",
    is_active: data.is_active ?? true,
    settings: data.settings ?? {},
  };

  const { data: feeder, error } = await supabase
    .from("feeders")
    .insert(feederData)
    .select()
    .single();

  if (error) {
    console.error("Error creating feeder:", error);
    throw new Error("Failed to create feeder");
  }

  revalidatePath("/dashboard");
  return feeder;
}

export async function updateFeeder(
  id: string,
  data: UpdateFeederData
): Promise<Feeder> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: feeder, error } = await supabase
    .from("feeders")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating feeder:", error);
    throw new Error("Failed to update feeder");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/feeder/${id}`);
  return feeder;
}

export async function deleteFeeder(id: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // First get the feeder details before deleting
  const { data: feeder, error: feederError } = await supabase
    .from("feeders")
    .select("device_id, timezone")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (feederError || !feeder) {
    console.error("Error fetching feeder for deletion:", feederError);
    throw new Error("Feeder not found or access denied");
  }

  // Delete all feeding schedules for this feeder
  const { error: schedulesError } = await supabase
    .from("feeding_schedules")
    .delete()
    .eq("feeder_id", id)
    .eq("user_id", user.id);

  if (schedulesError) {
    console.error("Error deleting feeding schedules:", schedulesError);
    throw new Error("Failed to delete feeding schedules");
  }

  // Send empty MQTT schedule to the device
  try {
    await sendEmptyScheduleToDevice(feeder.device_id);
  } catch (mqttError) {
    console.error("Error sending empty MQTT schedule:", mqttError);
    // Don't throw here - we want to continue with the feeder removal even if MQTT fails
  }

  // Use the database function to orphan the feeder (bypasses RLS)
  const { error } = await supabase.rpc("orphan_feeder", {
    feeder_id: id,
    requesting_user_id: user.id,
  });

  if (error) {
    console.error("Error orphaning feeder:", error);
    throw new Error("Failed to remove feeder from your account");
  }

  revalidatePath("/dashboard");
}

/**
 * Helper function to send an empty feeding schedule to the device via MQTT
 */
async function sendEmptyScheduleToDevice(deviceId: string): Promise<void> {
  try {
    const topic = `${deviceId}/writeDataRequest`;
    const emptySchedule = { schedule: [] }; // Empty schedule array

    console.log(`📡 Sending empty schedule to device ${deviceId}`);
    console.log(`📡 MQTT Topic: ${topic}`);
    console.log(`📡 MQTT Payload:`, JSON.stringify(emptySchedule, null, 2));

    await sendMQTTMessage(topic, emptySchedule);
  } catch (error) {
    console.error(
      `❌ Failed to send empty schedule to device ${deviceId}:`,
      error
    );
    throw error;
  }
}

/**
 * Helper function to send MQTT messages directly using AWS SDK
 * (Duplicated from feeding-schedules.ts for independence)
 */
async function sendMQTTMessage(topic: string, payload: object): Promise<void> {
  // Import AWS SDK dynamically to avoid issues if not available
  const { IoTDataPlaneClient, PublishCommand } = await import(
    "@aws-sdk/client-iot-data-plane"
  );
  const { fromCognitoIdentityPool } = await import(
    "@aws-sdk/credential-providers"
  );

  try {
    // Server-side environment variables (no NEXT_PUBLIC_ prefix)
    const AWS_CONFIG = {
      region: process.env.AWS_REGION,
      identityPoolId: process.env.AWS_IDENTITY_POOL_ID,
      iotEndpoint: process.env.AWS_IOT_ENDPOINT,
    };

    // Validate environment variables
    const missing = Object.entries(AWS_CONFIG)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }

    // Initialize IoT client
    const client = new IoTDataPlaneClient({
      region: AWS_CONFIG.region!,
      endpoint: `https://${AWS_CONFIG.iotEndpoint}`,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: AWS_CONFIG.region! },
        identityPoolId: AWS_CONFIG.identityPoolId!,
      }),
    });

    // Publish message
    await client.send(
      new PublishCommand({
        topic: topic.trim(),
        payload: JSON.stringify(payload),
      })
    );

    console.log(`✅ MQTT message sent to topic: ${topic}`);
  } catch (error) {
    console.error(`❌ Failed to send MQTT message:`, error);
    throw error;
  }
}
