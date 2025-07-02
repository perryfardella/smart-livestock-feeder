"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CommissionedFeeder {
  id: string;
  device_id: string;
  batch_number?: string;
  notes?: string;
  commissioned_date: string;
  is_available: boolean;
  commissioned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionedFeederData {
  device_id: string;
  batch_number?: string;
  notes?: string;
}

export interface UpdateCommissionedFeederData {
  device_id?: string;
  batch_number?: string;
  notes?: string;
  is_available?: boolean;
}

// Helper function to check if user is admin
async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  // Check if user has admin role in app_metadata
  const isAdmin = user.app_metadata?.is_admin === true;

  if (!isAdmin) {
    throw new Error("Access denied: Admin privileges required");
  }

  return { user, supabase };
}

export async function getCommissionedFeeders(): Promise<CommissionedFeeder[]> {
  const { supabase } = await checkAdminAccess();

  const { data, error } = await supabase
    .from("commissioned_feeders")
    .select("*")
    .order("commissioned_date", { ascending: false });

  if (error) {
    console.error("Error fetching commissioned feeders:", error);
    throw new Error("Failed to fetch commissioned feeders");
  }

  return data || [];
}

export async function createCommissionedFeeder(
  data: CreateCommissionedFeederData
): Promise<CommissionedFeeder> {
  const { user, supabase } = await checkAdminAccess();

  // Check if device ID already exists
  const { data: existingFeeder, error: checkError } = await supabase
    .from("commissioned_feeders")
    .select("id")
    .eq("device_id", data.device_id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking for existing device ID:", checkError);
    throw new Error("Failed to validate device ID");
  }

  if (existingFeeder) {
    throw new Error("Device ID already exists in commissioned feeders");
  }

  const feederData = {
    device_id: data.device_id,
    batch_number: data.batch_number,
    notes: data.notes,
    commissioned_by: user.id,
    is_available: true,
  };

  const { data: feeder, error } = await supabase
    .from("commissioned_feeders")
    .insert(feederData)
    .select()
    .single();

  if (error) {
    console.error("Error creating commissioned feeder:", error);
    throw new Error("Failed to create commissioned feeder");
  }

  revalidatePath("/admin");
  return feeder;
}

export async function updateCommissionedFeeder(
  id: string,
  data: UpdateCommissionedFeederData
): Promise<CommissionedFeeder> {
  const { supabase } = await checkAdminAccess();

  // If updating device_id, check if it already exists
  if (data.device_id) {
    const { data: existingFeeder, error: checkError } = await supabase
      .from("commissioned_feeders")
      .select("id")
      .eq("device_id", data.device_id)
      .neq("id", id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for existing device ID:", checkError);
      throw new Error("Failed to validate device ID");
    }

    if (existingFeeder) {
      throw new Error("Device ID already exists in commissioned feeders");
    }
  }

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  // Remove undefined fields
  const cleanedData = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => value !== undefined)
  );

  const { data: feeder, error } = await supabase
    .from("commissioned_feeders")
    .update(cleanedData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating commissioned feeder:", error);
    throw new Error("Failed to update commissioned feeder");
  }

  revalidatePath("/admin");
  return feeder;
}

export async function deleteCommissionedFeeder(id: string): Promise<void> {
  const { supabase } = await checkAdminAccess();

  const { error } = await supabase
    .from("commissioned_feeders")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting commissioned feeder:", error);
    throw new Error("Failed to delete commissioned feeder");
  }

  revalidatePath("/admin");
}

export async function bulkCreateCommissionedFeeders(
  deviceIds: string[],
  batchNumber?: string
): Promise<CommissionedFeeder[]> {
  const { user, supabase } = await checkAdminAccess();

  // Check for duplicates in the input array
  const uniqueDeviceIds = [...new Set(deviceIds)];
  if (uniqueDeviceIds.length !== deviceIds.length) {
    throw new Error("Duplicate device IDs found in the list");
  }

  // Check if any device IDs already exist
  const { data: existingFeeders, error: checkError } = await supabase
    .from("commissioned_feeders")
    .select("device_id")
    .in("device_id", uniqueDeviceIds);

  if (checkError) {
    console.error("Error checking for existing device IDs:", checkError);
    throw new Error("Failed to validate device IDs");
  }

  if (existingFeeders && existingFeeders.length > 0) {
    const duplicates = existingFeeders.map((f) => f.device_id).join(", ");
    throw new Error(`Device IDs already exist: ${duplicates}`);
  }

  const feedersData = uniqueDeviceIds.map((deviceId) => ({
    device_id: deviceId,
    batch_number: batchNumber,
    commissioned_by: user.id,
    is_available: true,
  }));

  const { data: feeders, error } = await supabase
    .from("commissioned_feeders")
    .insert(feedersData)
    .select();

  if (error) {
    console.error("Error bulk creating commissioned feeders:", error);
    throw new Error("Failed to create commissioned feeders");
  }

  revalidatePath("/admin");
  return feeders || [];
}

// Helper function to check if a device is commissioned (used in feeder creation)
export async function isDeviceCommissioned(deviceId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("is_device_commissioned", {
    device_id_param: deviceId,
  });

  if (error) {
    console.error("Error checking if device is commissioned:", error);
    return false;
  }

  return data;
}

// Helper function to check if current user is admin (for UI components)
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    return user.app_metadata?.is_admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
