import { NextRequest, NextResponse } from "next/server";
import {
  inviteUserToFeeder,
  getFeederInvitations,
  revokeInvitation,
  type InviteUserToFeederData,
} from "@/lib/actions/permissions";
import { isValidFeederRole } from "@/lib/utils/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feederId } = await params;

    // Get invitations using the action function (includes permission checks)
    const result = await getFeederInvitations(feederId);

    if (!result.success) {
      const errorMessage = result.error || "Failed to get invitations";
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === "Permission denied" ? 403 : 500 }
      );
    }

    return NextResponse.json({ invitations: result.invitations });
  } catch (error) {
    console.error("Error in GET /api/feeders/[id]/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feederId } = await params;
    const body = await request.json();

    const { invitee_email, role } = body;

    if (!invitee_email || !role) {
      return NextResponse.json(
        { error: "Missing required fields: invitee_email, role" },
        { status: 400 }
      );
    }

    if (!isValidFeederRole(role)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    const inviteData: InviteUserToFeederData = {
      feeder_id: feederId,
      invitee_email,
      role,
    };

    const result = await inviteUserToFeeder(inviteData);

    if (!result.success) {
      const errorMessage = result.error || "Failed to send invitation";
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage.includes("Permission denied") ? 403 : 400 }
      );
    }

    return NextResponse.json(
      { message: "Invitation sent successfully", invitation: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/feeders/[id]/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // params required for function signature but feederId not needed for revoke
    const body = await request.json();

    const { invitation_id, action } = body;

    if (!invitation_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: invitation_id, action" },
        { status: 400 }
      );
    }

    if (action === "revoke") {
      const result = await revokeInvitation(invitation_id);

      if (!result.success) {
        const errorMessage = result.error || "Failed to revoke invitation";
        return NextResponse.json(
          { error: errorMessage },
          { status: errorMessage.includes("Permission denied") ? 403 : 400 }
        );
      }

      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: revoke" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in PATCH /api/feeders/[id]/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
