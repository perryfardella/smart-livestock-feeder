import { createClient } from "@/lib/supabase/server";

// ============================================================================
// PERMISSION TYPES (matching database enums)
// ============================================================================

export type FeederRole = "viewer" | "scheduler" | "manager" | "owner";

export type MembershipStatus = "pending" | "accepted" | "declined" | "revoked";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "revoked";

export type PermissionType =
  | "view_sensor_data"
  | "view_feeding_schedules"
  | "create_feeding_schedules"
  | "edit_feeding_schedules"
  | "delete_feeding_schedules"
  | "manual_feed_release"
  | "view_camera_feeds"
  | "edit_feeder_settings"
  | "invite_other_users"
  | "manage_permissions";

// ============================================================================
// PERMISSION INTERFACES
// ============================================================================

export interface FeederMembership {
  id: string;
  feeder_id: string;
  user_id: string;
  invited_by: string;
  role: FeederRole;
  status: MembershipStatus;
  invited_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FeederPermission {
  id: string;
  membership_id: string;
  permission_type: PermissionType;
  granted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeederInvitation {
  id: string;
  feeder_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id?: string;
  role: FeederRole;
  invitation_token: string;
  expires_at: string;
  status: InvitationStatus;
  created_at: string;
}

export interface UserPermissions {
  [key: string]: boolean; // permission_type -> granted
}

export interface FeederAccess {
  feeder_id: string;
  user_role: FeederRole;
  is_owner: boolean;
  permissions: UserPermissions;
}

// ============================================================================
// PERMISSION TEMPLATES (matching database function)
// ============================================================================

export const ROLE_PERMISSIONS: Record<FeederRole, PermissionType[]> = {
  viewer: ["view_sensor_data", "view_feeding_schedules", "view_camera_feeds"],
  scheduler: [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
  ],
  manager: [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
    "edit_feeder_settings",
  ],
  owner: [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
    "edit_feeder_settings",
    "invite_other_users",
    "manage_permissions",
  ],
};

// ============================================================================
// CORE PERMISSION CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if a user has access to a specific feeder
 */
export async function hasFeederAccess(
  feederId: string,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get current user if not provided
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await supabase.rpc("has_feeder_access", {
    feeder_id_param: feederId,
    user_id_param: userId,
  });

  if (error) {
    console.error("Error checking feeder access:", error);
    return false;
  }

  return data || false;
}

/**
 * Check if a user has a specific permission for a feeder
 */
export async function hasFeederPermission(
  feederId: string,
  permission: PermissionType,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get current user if not provided
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    userId = user.id;
  }

  const { data, error } = await supabase.rpc("has_feeder_permission", {
    feeder_id_param: feederId,
    permission_type_param: permission,
    user_id_param: userId,
  });

  if (error) {
    console.error("Error checking feeder permission:", error);
    return false;
  }

  return data || false;
}

/**
 * Get user's role for a specific feeder
 */
export async function getUserFeederRole(
  feederId: string,
  userId?: string
): Promise<FeederRole | null> {
  const supabase = await createClient();

  // Get current user if not provided
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data, error } = await supabase.rpc("get_user_feeder_role", {
    feeder_id_param: feederId,
    user_id_param: userId,
  });

  if (error) {
    console.error("Error getting user feeder role:", error);
    return null;
  }

  return data as FeederRole | null;
}

/**
 * Get all permissions for a user on a specific feeder
 */
export async function getUserFeederPermissions(
  feederId: string,
  userId?: string
): Promise<UserPermissions> {
  const supabase = await createClient();

  // Get current user if not provided
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};
    userId = user.id;
  }

  const { data, error } = await supabase.rpc("get_user_feeder_permissions", {
    feeder_id_param: feederId,
    user_id_param: userId,
  });

  if (error) {
    console.error("Error getting user feeder permissions:", error);
    return {};
  }

  // Convert array of permission objects to UserPermissions object
  const permissions: UserPermissions = {};
  if (data && Array.isArray(data)) {
    data.forEach((perm: { permission_type: string; granted: boolean }) => {
      permissions[perm.permission_type] = perm.granted;
    });
  }

  return permissions;
}

/**
 * Get comprehensive feeder access information for a user
 */
export async function getFeederAccess(
  feederId: string,
  userId?: string
): Promise<FeederAccess | null> {
  const supabase = await createClient();

  // Get current user if not provided
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  // Check if user has access first
  const hasAccess = await hasFeederAccess(feederId, userId);
  if (!hasAccess) return null;

  // Get role and permissions in parallel
  const [role, permissions] = await Promise.all([
    getUserFeederRole(feederId, userId),
    getUserFeederPermissions(feederId, userId),
  ]);

  if (!role) return null;

  // Check if user is the owner
  const { data: feeder } = await supabase
    .from("feeders")
    .select("user_id")
    .eq("id", feederId)
    .single();

  const isOwner = feeder?.user_id === userId;

  return {
    feeder_id: feederId,
    user_role: role,
    is_owner: isOwner,
    permissions,
  };
}

// ============================================================================
// PERMISSION VALIDATION UTILITIES
// ============================================================================

/**
 * Validate if a permission type is valid
 */
export function isValidPermissionType(
  permission: string
): permission is PermissionType {
  const validPermissions: PermissionType[] = [
    "view_sensor_data",
    "view_feeding_schedules",
    "create_feeding_schedules",
    "edit_feeding_schedules",
    "delete_feeding_schedules",
    "manual_feed_release",
    "view_camera_feeds",
    "edit_feeder_settings",
    "invite_other_users",
    "manage_permissions",
  ];

  return validPermissions.includes(permission as PermissionType);
}

/**
 * Validate if a role is valid
 */
export function isValidFeederRole(role: string): role is FeederRole {
  const validRoles: FeederRole[] = ["viewer", "scheduler", "manager", "owner"];
  return validRoles.includes(role as FeederRole);
}

/**
 * Get permissions for a role template
 */
export function getRolePermissions(role: FeederRole): PermissionType[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission by template
 */
export function roleHasPermission(
  role: FeederRole,
  permission: PermissionType
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get the hierarchy level of a role (higher number = more permissions)
 */
export function getRoleHierarchyLevel(role: FeederRole): number {
  const hierarchy = {
    viewer: 1,
    scheduler: 2,
    manager: 3,
    owner: 4,
  };
  return hierarchy[role] || 0;
}

/**
 * Check if role A can manage role B (A must be higher in hierarchy)
 */
export function canManageRole(
  managerRole: FeederRole,
  targetRole: FeederRole
): boolean {
  return getRoleHierarchyLevel(managerRole) > getRoleHierarchyLevel(targetRole);
}

/**
 * Get roles that a user can invite based on their role and PRD rules
 * Managers can only invite viewers and schedulers, owners can invite anyone
 */
export function getInvitableRoles(inviterRole: FeederRole): FeederRole[] {
  switch (inviterRole) {
    case "owner":
      return ["viewer", "scheduler", "manager"];
    case "manager":
      return ["viewer", "scheduler"]; // Cannot invite other managers
    default:
      return []; // Viewers and schedulers cannot invite anyone
  }
}

/**
 * Check if an inviter can invite someone to a specific role
 */
export function canInviteToRole(
  inviterRole: FeederRole,
  targetRole: FeederRole
): boolean {
  const invitableRoles = getInvitableRoles(inviterRole);
  return invitableRoles.includes(targetRole);
}

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

/**
 * Middleware function for API routes to check feeder permission
 */
export async function requireFeederPermission(
  feederId: string,
  permission: PermissionType,
  userId?: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    const hasPermission = await hasFeederPermission(
      feederId,
      permission,
      userId
    );

    if (!hasPermission) {
      return {
        authorized: false,
        error: `Permission denied: ${permission} required for feeder ${feederId}`,
      };
    }

    return { authorized: true };
  } catch {
    return {
      authorized: false,
      error: "Error checking permissions",
    };
  }
}

/**
 * Middleware function for API routes to check feeder access
 */
export async function requireFeederAccess(
  feederId: string,
  userId?: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    const hasAccess = await hasFeederAccess(feederId, userId);

    if (!hasAccess) {
      return {
        authorized: false,
        error: `Access denied to feeder ${feederId}`,
      };
    }

    return { authorized: true };
  } catch {
    return {
      authorized: false,
      error: "Error checking access",
    };
  }
}
