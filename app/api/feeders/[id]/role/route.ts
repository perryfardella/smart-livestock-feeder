import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserFeederRole } from "@/lib/utils/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const feederId = (await params).id;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's role for this feeder
    const role = await getUserFeederRole(feederId, user.id);

    if (!role) {
      return NextResponse.json(
        { error: "No access to this feeder" },
        { status: 403 }
      );
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error getting user feeder role:", error);
    return NextResponse.json(
      { error: "Failed to get user role" },
      { status: 500 }
    );
  }
}
