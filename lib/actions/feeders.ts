"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface Feeder {
  id: string;
  user_id: string;
  device_id: string;
  name: string;
  description?: string;
  location?: string;
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
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

export interface UpdateFeederData {
  name?: string;
  description?: string;
  location?: string;
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

export async function toggleFeederActive(id: string): Promise<Feeder> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // First get the current feeder to toggle its active state
  const { data: currentFeeder, error: fetchError } = await supabase
    .from("feeders")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    console.error("Error fetching feeder for toggle:", fetchError);
    throw new Error("Failed to fetch feeder");
  }

  const { data: feeder, error } = await supabase
    .from("feeders")
    .update({ is_active: !currentFeeder.is_active })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error toggling feeder active state:", error);
    throw new Error("Failed to toggle feeder state");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/feeder/${id}`);
  return feeder;
}
