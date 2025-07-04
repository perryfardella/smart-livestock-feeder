"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import {
  FeederRole,
  PermissionType,
  hasFeederPermission,
  getUserFeederRole,
  isValidFeederRole,
  isValidPermissionType,
  canInviteToRole,
  getInvitableRoles,
} from "@/lib/utils/permissions";

// ============================================================================
// EMAIL HELPERS
// ============================================================================

/**
 * Send invitation email using Resend API
 */
async function sendInvitationEmail(
  inviteeEmail: string,
  invitationToken: string,
  feederName: string,
  inviterName: string,
  role: FeederRole
) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Check if user already exists using the security definer function
    const { data: userExists } = await supabase.rpc("user_exists_by_email", {
      email_param: inviteeEmail,
    });

    if (userExists) {
      // Existing user - send invitation acceptance email
      const acceptUrl = `${baseUrl}/invitations/accept?token=${invitationToken}`;

      const { data, error } = await resend.emails.send({
        from: "Smart Livestock Feeder <noreply@invite.smartfeeder.farm>",
        to: [inviteeEmail],
        subject: `Invitation to join ${feederName} team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">You've been invited to join a feeder team!</h2>
            
            <p>Hi there,</p>
            
            <p><strong>${inviterName}</strong> has invited you to join the <strong>${feederName}</strong> team as a <strong>${role}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">What you can do as a ${role}:</h3>
              <ul>
                ${
                  role === "owner"
                    ? `
                  <li>Full control over the feeder</li>
                  <li>Invite and manage team members</li>
                  <li>Configure all settings</li>
                `
                    : role === "manager"
                      ? `
                  <li>Monitor feeder status and data</li>
                  <li>Invite new team members</li>
                  <li>Manage feeding schedules</li>
                `
                      : `
                  <li>View feeder status and data</li>
                  <li>Monitor feeding schedules</li>
                `
                }
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Since you already have a Smart Livestock Feeder account, simply click the button above to accept this invitation and start collaborating with your team.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This invitation will expire in 7 days. If you don't want to join this team, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Smart Livestock Feeder • Remote monitoring and control for your livestock feeders
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Error sending invitation email via Resend:", error);
        throw error;
      }

      console.log(
        `✅ Invitation email sent to ${inviteeEmail} (existing user) - Email ID: ${data?.id}`
      );
    } else {
      // New user - send signup invitation
      const signupUrl = `${baseUrl}/auth/sign-up?invitation_token=${invitationToken}&email=${encodeURIComponent(inviteeEmail)}`;

      const { data, error } = await resend.emails.send({
        from: "Smart Livestock Feeder <noreply@invite.smartfeeder.farm>",
        to: [inviteeEmail],
        subject: `You're invited to join ${feederName} - Create your account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Smart Livestock Feeder!</h2>
            
            <p>Hi there,</p>
            
            <p><strong>${inviterName}</strong> has invited you to join the <strong>${feederName}</strong> team as a <strong>${role}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Get started in 2 easy steps:</h3>
              <ol>
                <li>Create your free Smart Livestock Feeder account</li>
                <li>Start monitoring and controlling your livestock feeders remotely</li>
              </ol>
            </div>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #059669;">What you'll be able to do as a ${role}:</h3>
              <ul>
                ${
                  role === "owner"
                    ? `
                  <li>Full control over the feeder</li>
                  <li>Invite and manage team members</li>
                  <li>Configure all settings</li>
                `
                    : role === "manager"
                      ? `
                  <li>Monitor feeder status and data</li>
                  <li>Invite new team members</li>
                  <li>Manage feeding schedules</li>
                `
                      : `
                  <li>View feeder status and data</li>
                  <li>Monitor feeding schedules</li>
                `
                }
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupUrl}" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Create Account & Join Team
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Don't have an account yet? No problem! Click the button above to create your free account and automatically join the team.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This invitation will expire in 7 days. If you don't want to join this team, you can safely ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              Smart Livestock Feeder • Remote monitoring and control for your livestock feeders
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Error sending signup invitation via Resend:", error);
        throw error;
      }

      console.log(
        `✅ Signup invitation sent to ${inviteeEmail} - Email ID: ${data?.id}`
      );
    }
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    // Don't throw here - we want the invitation to be created even if email fails
    // This ensures the user can still join if they sign up with the invited email
  }
}

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

    // Get inviter's role to check what roles they can invite
    const inviterRole = await getUserFeederRole(data.feeder_id, user.id);
    if (!inviterRole) {
      return {
        success: false,
        error: "Unable to determine your role for this feeder",
      };
    }

    // Check if inviter can invite to the specified role (PRD restrictions)
    if (!canInviteToRole(inviterRole, data.role)) {
      const allowedRoles = getInvitableRoles(inviterRole);
      return {
        success: false,
        error: `Permission denied: ${inviterRole}s can only invite users as: ${allowedRoles.join(", ")}`,
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

    let invitation;
    let inviteError;

    if (
      existingInvitation &&
      ["revoked", "declined", "expired"].includes(existingInvitation.status)
    ) {
      // Reuse existing invitation by updating it
      const updateResult = await supabase
        .from("feeder_invitations")
        .update({
          inviter_id: user.id,
          role: data.role,
          status: "pending",
          invitation_token: randomUUID(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7 days from now
          responded_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingInvitation.id)
        .select()
        .single();

      invitation = updateResult.data;
      inviteError = updateResult.error;
    } else {
      // Create new invitation
      const insertResult = await supabase
        .from("feeder_invitations")
        .insert({
          feeder_id: data.feeder_id,
          inviter_id: user.id,
          invitee_email: data.invitee_email,
          role: data.role,
        })
        .select()
        .single();

      invitation = insertResult.data;
      inviteError = insertResult.error;
    }

    if (inviteError) {
      console.error("Error creating/updating invitation:", inviteError);
      return { success: false, error: "Failed to create invitation" };
    }

    // Get feeder name and inviter name for email
    const { data: feederData } = await supabase
      .from("feeders")
      .select("name")
      .eq("id", data.feeder_id)
      .single();

    const feederName = feederData?.name || "Smart Livestock Feeder";
    const inviterName = user.email || "Someone";

    // Send invitation email using Resend via Supabase SMTP
    await sendInvitationEmail(
      data.invitee_email,
      invitation.invitation_token,
      feederName,
      inviterName,
      data.role
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

    console.log(`🎫 Accepting invitation with token: ${invitationToken}`);

    // Use the database function to accept invitation
    const { data, error } = await supabase.rpc("accept_invitation", {
      invitation_token_param: invitationToken,
    });

    if (error) {
      console.error("❌ Error accepting invitation:", error);
      return { success: false, error: "Failed to accept invitation" };
    }

    if (!data) {
      console.log("❌ Invitation not found or expired");
      return { success: false, error: "Invitation not found or expired" };
    }

    console.log("✅ Invitation accepted successfully");

    // Get the newly created membership to verify permissions were applied
    const { data: membership } = await supabase
      .from("feeder_memberships")
      .select("id, role, feeder_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (membership) {
      console.log(
        `🔍 Checking permissions for membership ${membership.id} with role ${membership.role}`
      );

      // Check if permissions were properly applied
      const { data: permissions } = await supabase
        .from("feeder_permissions")
        .select("permission_type, granted")
        .eq("membership_id", membership.id)
        .eq("granted", true);

      const grantedPermissions =
        permissions?.map((p) => p.permission_type) || [];
      console.log(`🔒 Currently granted permissions:`, grantedPermissions);

      // Define expected permissions for each role
      const expectedPermissions = {
        viewer: [
          "view_sensor_data",
          "view_feeding_schedules",
          "view_camera_feeds",
        ],
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
        owner: [], // Owners get permissions through feeder ownership, not membership
      };

      const expected =
        expectedPermissions[
          membership.role as keyof typeof expectedPermissions
        ] || [];
      const missing = expected.filter(
        (perm) => !grantedPermissions.includes(perm)
      );

      if (missing.length > 0 && membership.role !== "owner") {
        console.log(`⚠️ Missing permissions detected:`, missing);
        console.log(`🔧 Attempting to fix by re-applying role permissions...`);

        // Try to fix by re-applying role permissions
        const { error: fixError } = await supabase.rpc(
          "apply_role_permissions",
          {
            membership_id_param: membership.id,
            role_param: membership.role,
          }
        );

        if (fixError) {
          console.error("❌ Failed to fix permissions:", fixError);
        } else {
          console.log("✅ Successfully re-applied role permissions");
        }
      } else {
        console.log("✅ All expected permissions are properly applied");
      }
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Invitation accepted successfully" };
  } catch (error) {
    console.error("💥 Error accepting invitation:", error);
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
 * Revoke a pending invitation (for feeder owners/managers)
 */
export async function revokeInvitation(invitationId: string) {
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

    // Get the invitation to check feeder ownership
    const { data: invitation, error: invitationError } = await supabase
      .from("feeder_invitations")
      .select("feeder_id, status")
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return { success: false, error: "Can only revoke pending invitations" };
    }

    // Check if user has permission to revoke invitations for this feeder
    const userRole = await getUserFeederRole(invitation.feeder_id, user.id);
    if (!userRole || !["owner", "manager"].includes(userRole)) {
      return { success: false, error: "Permission denied" };
    }

    // Update invitation status to revoked
    const { error: updateError } = await supabase
      .from("feeder_invitations")
      .update({
        status: "revoked",
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error revoking invitation:", updateError);
      return { success: false, error: "Failed to revoke invitation" };
    }

    revalidatePath(`/dashboard/feeder/${invitation.feeder_id}`);
    return { success: true, message: "Invitation revoked successfully" };
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return { success: false, error: "Failed to revoke invitation" };
  }
}

/**
 * Resend an invitation email (for feeder owners/managers)
 */
export async function resendInvitation(invitationId: string) {
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

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from("feeder_invitations")
      .select("feeder_id, status, invitee_email, role, invitation_token")
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return { success: false, error: "Can only resend pending invitations" };
    }

    // Check if user has permission to resend invitations for this feeder
    const userRole = await getUserFeederRole(invitation.feeder_id, user.id);
    if (!userRole || !["owner", "manager"].includes(userRole)) {
      return { success: false, error: "Permission denied" };
    }

    // Generate new invitation token for security
    const newToken = randomUUID();

    // Update invitation with new token and extended expiry
    const { error: updateError } = await supabase
      .from("feeder_invitations")
      .update({
        invitation_token: newToken,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days from now
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error updating invitation for resend:", updateError);
      return { success: false, error: "Failed to resend invitation" };
    }

    // Get feeder name and inviter name for email
    // Get feeder and inviter names for email
    const { data: feederData } = await supabase
      .from("feeders")
      .select("name")
      .eq("id", invitation.feeder_id)
      .single();

    const feederName = feederData?.name || "Smart Livestock Feeder";
    const inviterName = user.email || "Someone";

    // Send fresh invitation email
    await sendInvitationEmail(
      invitation.invitee_email,
      newToken,
      feederName,
      inviterName,
      invitation.role
    );

    revalidatePath(`/dashboard/feeder/${invitation.feeder_id}`);
    return { success: true, message: "Invitation resent successfully" };
  } catch (error) {
    console.error("Error resending invitation:", error);
    return { success: false, error: "Failed to resend invitation" };
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

    // Get the feeder owner information
    const { data: feederData, error: feederError } = await supabase
      .from("feeders")
      .select("user_id, name")
      .eq("id", feederId)
      .single();

    if (feederError) {
      console.error("Error fetching feeder owner:", feederError);
      return {
        success: false,
        error: "Failed to fetch feeder information",
        memberships: [],
      };
    }

    // Get team members from feeder_memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from("feeder_memberships")
      .select(
        `
        id,
        user_id,
        role,
        status,
        invited_at,
        accepted_at
      `
      )
      .eq("feeder_id", feederId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (membershipsError) {
      console.error("Error fetching feeder memberships:", membershipsError);
      return {
        success: false,
        error: "Failed to fetch memberships",
        memberships: [],
      };
    }

    // Collect all user IDs to fetch emails for
    const userIds = [feederData.user_id];
    if (memberships) {
      userIds.push(...memberships.map((m) => m.user_id));
    }

    // Fetch user emails using auth admin (this requires service role key)
    const userEmails: Record<string, string> = {};

    try {
      // Get emails from auth.users using a security definer function
      const { data: userEmailData, error: emailError } = await supabase.rpc(
        "get_user_emails",
        { user_ids: userIds }
      );

      if (emailError) {
        console.error("Error fetching user emails:", emailError);
        // Continue without emails rather than failing completely
      } else if (userEmailData) {
        userEmailData.forEach((item: { user_id: string; email: string }) => {
          userEmails[item.user_id] = item.email;
        });
      }
    } catch (error) {
      console.error("Error fetching user emails:", error);
      // Continue without emails rather than failing completely
    }

    // Create a combined list with owner first
    const allMembers = [];

    // Add the owner as the first member
    allMembers.push({
      id: `owner-${feederData.user_id}`, // Unique ID for owner
      user_id: feederData.user_id,
      role: "owner" as const,
      status: "accepted" as const,
      invited_at: null, // Owners aren't invited
      accepted_at: null, // Owners don't accept invitations
      email: userEmails[feederData.user_id] || null,
      is_owner: true,
    });

    // Add team members
    if (memberships) {
      memberships.forEach((membership) => {
        allMembers.push({
          ...membership,
          email: userEmails[membership.user_id] || null,
          is_owner: false,
        });
      });
    }

    return { success: true, memberships: allMembers };
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

    // Check role hierarchy restrictions (PRD rules)
    if (data.role) {
      const managerRole = await getUserFeederRole(
        membership.feeder_id,
        user.id
      );
      if (!managerRole) {
        return { success: false, error: "Unable to determine your role" };
      }

      // Check if manager can assign/change to the specified role
      if (!canInviteToRole(managerRole, data.role)) {
        const allowedRoles = getInvitableRoles(managerRole);
        return {
          success: false,
          error: `Permission denied: ${managerRole}s can only manage users as: ${allowedRoles.join(", ")}`,
        };
      }

      // Check if manager can manage the current membership target
      if (!canInviteToRole(managerRole, membership.role)) {
        return {
          success: false,
          error: `Permission denied: ${managerRole}s cannot manage ${membership.role}s`,
        };
      }
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
      console.log(
        `🔄 Updating role to ${data.role} for membership ${data.membership_id}`
      );

      const { error: roleError } = await supabase.rpc(
        "apply_role_permissions",
        {
          membership_id_param: data.membership_id,
          role_param: data.role,
        }
      );

      if (roleError) {
        console.error("❌ Error applying role permissions:", roleError);
        // Don't fail the membership update if permission application fails
        // The user can always fix permissions later
      } else {
        console.log("✅ Successfully applied role permissions");

        // Verify permissions were applied correctly
        const { data: permissions } = await supabase
          .from("feeder_permissions")
          .select("permission_type, granted")
          .eq("membership_id", data.membership_id)
          .eq("granted", true);

        const grantedPermissions =
          permissions?.map((p) => p.permission_type) || [];
        console.log(`🔒 Applied permissions:`, grantedPermissions);
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

// ============================================================================
// PERMISSION HEALTH CHECK AND REPAIR
// ============================================================================

/**
 * Check and fix permissions for all memberships with missing permissions
 * This can be called periodically or when issues are detected
 */
export async function fixMembershipPermissions(feederId?: string) {
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

    console.log("🔧 Starting permission health check...");

    // Build query to get memberships
    let query = supabase
      .from("feeder_memberships")
      .select(
        `
        id,
        feeder_id,
        user_id,
        role,
        status,
        feeder_permissions (
          permission_type,
          granted
        )
      `
      )
      .eq("status", "accepted")
      .neq("role", "owner"); // Owners don't need explicit permissions

    // Filter by feeder if specified
    if (feederId) {
      query = query.eq("feeder_id", feederId);
    }

    const { data: memberships, error: membershipError } = await query;

    if (membershipError) {
      console.error("❌ Error fetching memberships:", membershipError);
      return { success: false, error: "Failed to fetch memberships" };
    }

    console.log(`🔍 Checking ${memberships?.length || 0} memberships...`);

    const expectedPermissions = {
      viewer: [
        "view_sensor_data",
        "view_feeding_schedules",
        "view_camera_feeds",
      ],
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
    };

    const results = [];

    for (const membership of memberships || []) {
      const expected =
        expectedPermissions[
          membership.role as keyof typeof expectedPermissions
        ] || [];
      const current =
        membership.feeder_permissions
          ?.filter(
            (p: { permission_type: string; granted: boolean }) => p.granted
          )
          .map(
            (p: { permission_type: string; granted: boolean }) =>
              p.permission_type
          ) || [];

      const missing = expected.filter((perm) => !current.includes(perm));

      if (missing.length > 0) {
        console.log(
          `⚠️ Membership ${membership.id} (${membership.role}) missing permissions:`,
          missing
        );

        // Try to fix by applying role permissions
        const { error: fixError } = await supabase.rpc(
          "apply_role_permissions",
          {
            membership_id_param: membership.id,
            role_param: membership.role,
          }
        );

        if (fixError) {
          console.error(
            `❌ Failed to fix membership ${membership.id}:`,
            fixError
          );
          results.push({
            membership_id: membership.id,
            role: membership.role,
            missing_permissions: missing,
            fixed: false,
            error: fixError.message,
          });
        } else {
          console.log(`✅ Fixed permissions for membership ${membership.id}`);
          results.push({
            membership_id: membership.id,
            role: membership.role,
            missing_permissions: missing,
            fixed: true,
          });
        }
      } else {
        results.push({
          membership_id: membership.id,
          role: membership.role,
          missing_permissions: [],
          fixed: false, // No fix needed
          status: "healthy",
        });
      }
    }

    const fixedCount = results.filter((r) => r.fixed).length;
    const errorCount = results.filter((r) => r.error).length;
    const healthyCount = results.filter((r) => r.status === "healthy").length;

    console.log(`🎯 Permission health check complete:`);
    console.log(`   - ${healthyCount} memberships healthy`);
    console.log(`   - ${fixedCount} memberships fixed`);
    console.log(`   - ${errorCount} memberships with errors`);

    return {
      success: true,
      results,
      summary: {
        total: results.length,
        healthy: healthyCount,
        fixed: fixedCount,
        errors: errorCount,
      },
    };
  } catch (error) {
    console.error("💥 Error in permission health check:", error);
    return { success: false, error: "Failed to run health check" };
  }
}
