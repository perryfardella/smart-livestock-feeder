import { NextRequest, NextResponse } from "next/server";
import {
  inviteUserToFeeder,
  getFeederInvitations,
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

    // Validate request body
    const { invitee_email, role } = body;

    if (!invitee_email || typeof invitee_email !== "string") {
      return NextResponse.json(
        { error: "invitee_email is required and must be a string" },
        { status: 400 }
      );
    }

    if (!role || !isValidFeederRole(role)) {
      return NextResponse.json(
        { error: "Valid role is required (viewer, scheduler, manager, owner)" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitee_email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create invitation using the action function
    const invitationData: InviteUserToFeederData = {
      feeder_id: feederId,
      invitee_email,
      role,
    };

    const result = await inviteUserToFeeder(invitationData);

    if (!result.success) {
      const errorMessage = result.error || "Failed to create invitation";
      const statusCode = errorMessage.includes("Permission denied") ? 403 : 400;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        invitation: result.data,
      },
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
