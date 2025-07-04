import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasFeederPermission,
  type PermissionType,
} from "@/lib/utils/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const permission = searchParams.get("permission") as PermissionType;
    const feederId = (await params).id;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!permission) {
      return NextResponse.json(
        { error: "Permission type is required" },
        { status: 400 }
      );
    }

    // Check if user has the specified permission
    const hasPermission = await hasFeederPermission(
      feederId,
      permission,
      user.id
    );

    return NextResponse.json({ hasPermission });
  } catch (error) {
    console.error("Error checking feeder permission:", error);
    return NextResponse.json(
      { error: "Failed to check permission" },
      { status: 500 }
    );
  }
}
