"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  FeederRole,
  PermissionType,
  hasFeederPermission,
  getUserFeederRole,
  isValidFeederRole,
  isValidPermissionType,
} from "@/lib/utils/permissions";

// ============================================================================
// MEMBERSHIP MANAGEMENT
// ============================================================================

export interface InviteUserToFeederData {
  feeder_id: string;
  invitee_email: string;
  role: FeederRole;
}

export interface UpdateMembershipData {
  membership_id: string;
  role?: FeederRole;
  status?: "accepted" | "declined" | "revoked";
}

/**
 * Invite a user to access a feeder
 */
export async function inviteUserToFeeder(data: InviteUserToFeederData) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Validate role
    if (!isValidFeederRole(data.role)) {
      return { success: false, error: "Invalid role specified" };
    }

    // Check if user has permission to invite others
    const canInvite = await hasFeederPermission(
      data.feeder_id,
      "invite_other_users",
      user.id
    );

    if (!canInvite) {
      return {
        success: false,
        error: "Permission denied: Cannot invite users to this feeder",
      };
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from("feeder_invitations")
      .select("id, status")
      .eq("feeder_id", data.feeder_id)
      .eq("invitee_email", data.invitee_email)
      .single();

    if (existingInvitation && existingInvitation.status === "pending") {
      return { success: false, error: "Invitation already sent to this email" };
    }

    // Check if user already has membership
    const { data: existingMembership } = await supabase
      .from("feeder_memberships")
      .select("id, status")
      .eq("feeder_id", data.feeder_id)
      .eq("user_id", user.id)
      .single();

    if (existingMembership && existingMembership.status === "accepted") {
      return {
        success: false,
        error: "User already has access to this feeder",
      };
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("feeder_invitations")
      .insert({
        feeder_id: data.feeder_id,
        inviter_id: user.id,
        invitee_email: data.invitee_email,
        role: data.role,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return { success: false, error: "Failed to create invitation" };
    }

    // TODO: Send email notification (implement in Phase 2)
    console.log(
      `📧 TODO: Send invitation email to ${data.invitee_email} for feeder ${data.feeder_id}`
    );

    revalidatePath(`/dashboard/feeder/${data.feeder_id}`);
    return { success: true, data: invitation };
  } catch (error) {
    console.error("Error inviting user to feeder:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}

/**
 * Get all invitations for a feeder (for feeder owners)
 */
export async function getFeederInvitations(feederId: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: "Authentication required",
        invitations: [],
      };
    }

    // Check if user has permission to view invitations
    const userRole = await getUserFeederRole(feederId, user.id);
    if (!userRole || !["owner", "manager"].includes(userRole)) {
      return { success: false, error: "Permission denied", invitations: [] };
    }

    const { data: invitations, error } = await supabase
      .from("feeder_invitations")
      .select("*")
      .eq("feeder_id", feederId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feeder invitations:", error);
      return {
        success: false,
        error: "Failed to fetch invitations",
        invitations: [],
      };
    }

    return { success: true, invitations };
  } catch (error) {
    console.error("Error getting feeder invitations:", error);
    return {
      success: false,
      error: "Failed to fetch invitations",
      invitations: [],
    };
  }
}

/**
 * Accept an invitation by token
 */
export async function acceptInvitation(invitationToken: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Use the database function to accept invitation
    const { data, error } = await supabase.rpc("accept_invitation", {
      invitation_token_param: invitationToken,
    });

    if (error) {
      console.error("Error accepting invitation:", error);
      return { success: false, error: "Failed to accept invitation" };
    }

    if (!data) {
      return { success: false, error: "Invitation not found or expired" };
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Invitation accepted successfully" };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return { success: false, error: "Failed to accept invitation" };
  }
}

/**
 * Decline an invitation by token
 */
export async function declineInvitation(invitationToken: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Use the database function to decline invitation
    const { data, error } = await supabase.rpc("decline_invitation", {
      invitation_token_param: invitationToken,
    });

    if (error) {
      console.error("Error declining invitation:", error);
      return { success: false, error: "Failed to decline invitation" };
    }

    if (!data) {
      return { success: false, error: "Invitation not found or expired" };
    }

    return { success: true, message: "Invitation declined" };
  } catch (error) {
    console.error("Error declining invitation:", error);
    return { success: false, error: "Failed to decline invitation" };
  }
}

/**
 * Get all memberships for a feeder
 */
export async function getFeederMemberships(feederId: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: "Authentication required",
        memberships: [],
      };
    }

    // Check if user has access to this feeder
    const userRole = await getUserFeederRole(feederId, user.id);
    if (!userRole) {
      return { success: false, error: "Access denied", memberships: [] };
    }

    const { data: memberships, error } = await supabase
      .from("feeder_memberships")
      .select(
        `
        *,
        profiles:user_id (
          email
        )
      `
      )
      .eq("feeder_id", feederId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching feeder memberships:", error);
      return {
        success: false,
        error: "Failed to fetch memberships",
        memberships: [],
      };
    }

    return { success: true, memberships };
  } catch (error) {
    console.error("Error getting feeder memberships:", error);
    return {
      success: false,
      error: "Failed to fetch memberships",
      memberships: [],
    };
  }
}

/**
 * Update a membership (change role or revoke access)
 */
export async function updateMembership(data: UpdateMembershipData) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Get the membership to check feeder_id
    const { data: membership, error: membershipError } = await supabase
      .from("feeder_memberships")
      .select("feeder_id, user_id, role")
      .eq("id", data.membership_id)
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Membership not found" };
    }

    // Check if user has permission to manage permissions
    const canManage = await hasFeederPermission(
      membership.feeder_id,
      "manage_permissions",
      user.id
    );

    if (!canManage) {
      return {
        success: false,
        error: "Permission denied: Cannot manage this membership",
      };
    }

    // Validate role if provided
    if (data.role && !isValidFeederRole(data.role)) {
      return { success: false, error: "Invalid role specified" };
    }

    // Build update data
    const updateData: {
      updated_at: string;
      role?: FeederRole;
      status?: "accepted" | "declined" | "revoked";
    } = { updated_at: new Date().toISOString() };
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;

    // Update the membership
    const { data: updatedMembership, error: updateError } = await supabase
      .from("feeder_memberships")
      .update(updateData)
      .eq("id", data.membership_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating membership:", updateError);
      return { success: false, error: "Failed to update membership" };
    }

    // If role was updated, apply role permissions
    if (data.role) {
      const { error: roleError } = await supabase.rpc(
        "apply_role_permissions",
        {
          membership_id_param: data.membership_id,
          role_param: data.role,
        }
      );

      if (roleError) {
        console.error("Error applying role permissions:", roleError);
      }
    }

    revalidatePath(`/dashboard/feeder/${membership.feeder_id}`);
    return { success: true, data: updatedMembership };
  } catch (error) {
    console.error("Error updating membership:", error);
    return { success: false, error: "Failed to update membership" };
  }
}

/**
 * Remove a user from feeder access (revoke membership)
 */
export async function removeMembership(membershipId: string) {
  return updateMembership({
    membership_id: membershipId,
    status: "revoked",
  });
}

/**
 * Leave a feeder (user removing themselves)
 */
export async function leaveFeeeder(feederId: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Find user's membership
    const { data: membership, error: membershipError } = await supabase
      .from("feeder_memberships")
      .select("id, role")
      .eq("feeder_id", feederId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Membership not found" };
    }

    // Prevent owner from leaving their own feeder
    if (membership.role === "owner") {
      return {
        success: false,
        error: "Cannot leave feeder you own. Transfer ownership first.",
      };
    }

    // Delete the membership
    const { error: deleteError } = await supabase
      .from("feeder_memberships")
      .delete()
      .eq("id", membership.id);

    if (deleteError) {
      console.error("Error leaving feeder:", deleteError);
      return { success: false, error: "Failed to leave feeder" };
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Successfully left feeder" };
  } catch (error) {
    console.error("Error leaving feeder:", error);
    return { success: false, error: "Failed to leave feeder" };
  }
}

// ============================================================================
// FINE-GRAINED PERMISSION MANAGEMENT
// ============================================================================

export interface UpdatePermissionData {
  membership_id: string;
  permission_type: PermissionType;
  granted: boolean;
}

/**
 * Update a specific permission for a membership
 */
export async function updateMembershipPermission(data: UpdatePermissionData) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Authentication required" };
    }

    // Validate permission type
    if (!isValidPermissionType(data.permission_type)) {
      return { success: false, error: "Invalid permission type" };
    }

    // Get the membership to check feeder_id
    const { data: membership, error: membershipError } = await supabase
      .from("feeder_memberships")
      .select("feeder_id")
      .eq("id", data.membership_id)
      .single();

    if (membershipError || !membership) {
      return { success: false, error: "Membership not found" };
    }

    // Check if user has permission to manage permissions
    const canManage = await hasFeederPermission(
      membership.feeder_id,
      "manage_permissions",
      user.id
    );

    if (!canManage) {
      return {
        success: false,
        error: "Permission denied: Cannot manage permissions",
      };
    }

    // Upsert the permission
    const { data: permission, error: permissionError } = await supabase
      .from("feeder_permissions")
      .upsert({
        membership_id: data.membership_id,
        permission_type: data.permission_type,
        granted: data.granted,
      })
      .select()
      .single();

    if (permissionError) {
      console.error("Error updating permission:", permissionError);
      return { success: false, error: "Failed to update permission" };
    }

    revalidatePath(`/dashboard/feeder/${membership.feeder_id}`);
    return { success: true, data: permission };
  } catch (error) {
    console.error("Error updating membership permission:", error);
    return { success: false, error: "Failed to update permission" };
  }
}

/**
 * Get detailed permissions for a membership
 */
export async function getMembershipPermissions(membershipId: string) {
  try {
    const supabase = await createClient();

    const { data: permissions, error } = await supabase
      .from("feeder_permissions")
      .select("*")
      .eq("membership_id", membershipId)
      .order("permission_type");

    if (error) {
      console.error("Error fetching membership permissions:", error);
      return {
        success: false,
        error: "Failed to fetch permissions",
        permissions: [],
      };
    }

    return { success: true, permissions };
  } catch (error) {
    console.error("Error getting membership permissions:", error);
    return {
      success: false,
      error: "Failed to fetch permissions",
      permissions: [],
    };
  }
}
