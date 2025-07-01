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
  user_id: string;
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

  const { error } = await supabase
    .from("feeders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting feeder:", error);
    throw new Error("Failed to delete feeder");
  }

  revalidatePath("/dashboard");
}
