// ============================================================================
// CLIENT-SAFE PERMISSION UTILITIES
// ============================================================================
// This file contains permission utilities that can be safely used in client components
// without pulling in server-side dependencies like next/headers

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

/**
 * Check multiple permissions for a feeder in a single API call
 * @param feederId - The feeder ID
 * @param permissions - Array of permission strings to check
 * @returns Promise<Record<string, boolean>> - Object with permission results
 */
export async function checkBatchPermissions(
  feederId: string,
  permissions: string[]
): Promise<Record<string, boolean>> {
  try {
    const response = await fetch(`/api/feeders/${feederId}/permissions/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.permissions;
    } else {
      // Return all false if request fails
      return permissions.reduce(
        (acc, permission) => {
          acc[permission] = false;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }
  } catch (error) {
    console.error("Error checking batch permissions:", error);
    // Return all false if request fails
    return permissions.reduce(
      (acc, permission) => {
        acc[permission] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
  }
}

/**
 * Check a single permission for a feeder
 * @param feederId - The feeder ID
 * @param permission - The permission to check
 * @returns Promise<boolean> - Whether the user has the permission
 */
export async function checkSinglePermission(
  feederId: string,
  permission: string
): Promise<boolean> {
  const result = await checkBatchPermissions(feederId, [permission]);
  return result[permission] || false;
}
