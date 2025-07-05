"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AddAdminData {
  email: string;
}

// Helper function to check if user is admin (reused from commissioned-feeders.ts pattern)
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

/**
 * Get all admin users
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const { supabase } = await checkAdminAccess();

  const { data, error } = await supabase.rpc("get_admin_users");

  if (error) {
    console.error("Error fetching admin users:", error);
    throw new Error("Failed to fetch admin users");
  }

  return data || [];
}

/**
 * Add admin privileges to a user by email
 */
export async function addAdminByEmail(data: AddAdminData): Promise<boolean> {
  const { supabase } = await checkAdminAccess();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error("Invalid email format");
  }

  // Check if user exists first
  const { data: userExists, error: userExistsError } = await supabase.rpc(
    "user_exists_by_email",
    {
      email_param: data.email,
    }
  );

  if (userExistsError) {
    console.error("Error checking if user exists:", userExistsError);
    throw new Error("Failed to verify user existence");
  }

  if (!userExists) {
    throw new Error("User not found with the provided email address");
  }

  // Check if user is already an admin
  const { data: isAlreadyAdmin, error: adminCheckError } = await supabase.rpc(
    "is_user_admin_by_email",
    {
      email_param: data.email,
    }
  );

  if (adminCheckError) {
    console.error("Error checking admin status:", adminCheckError);
    throw new Error("Failed to check admin status");
  }

  if (isAlreadyAdmin) {
    throw new Error("User is already an admin");
  }

  // Add admin privileges
  const { data: success, error } = await supabase.rpc("add_admin_by_email", {
    email_param: data.email,
  });

  if (error) {
    console.error("Error adding admin privileges:", error);
    throw new Error("Failed to add admin privileges");
  }

  if (!success) {
    throw new Error("Failed to add admin privileges - user may not exist");
  }

  revalidatePath("/admin");
  return true;
}

/**
 * Remove admin privileges from a user by email
 */
export async function removeAdminByEmail(email: string): Promise<boolean> {
  const { supabase } = await checkAdminAccess();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  // Check if user is an admin
  const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
    "is_user_admin_by_email",
    {
      email_param: email,
    }
  );

  if (adminCheckError) {
    console.error("Error checking admin status:", adminCheckError);
    throw new Error("Failed to check admin status");
  }

  if (!isAdmin) {
    throw new Error("User is not an admin");
  }

  // Remove admin privileges
  const { data: success, error } = await supabase.rpc("remove_admin_by_email", {
    email_param: email,
  });

  if (error) {
    console.error("Error removing admin privileges:", error);

    // Check if it's the self-demotion error
    if (
      error.message?.includes("Cannot remove admin privileges from yourself")
    ) {
      throw new Error("Cannot remove admin privileges from yourself");
    }

    throw new Error("Failed to remove admin privileges");
  }

  if (!success) {
    throw new Error("Failed to remove admin privileges - user may not exist");
  }

  revalidatePath("/admin");
  return true;
}

/**
 * Check if a user is admin by email
 */
export async function isUserAdminByEmail(email: string): Promise<boolean> {
  const { supabase } = await checkAdminAccess();

  const { data, error } = await supabase.rpc("is_user_admin_by_email", {
    email_param: email,
  });

  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }

  return data || false;
}
