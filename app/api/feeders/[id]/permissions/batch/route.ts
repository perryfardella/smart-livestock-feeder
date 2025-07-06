import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const feederId = (await params).id;
    const body = await request.json();
    const { permissions } = body;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Permissions array is required" },
        { status: 400 }
      );
    }

    // Validate all permissions are valid
    const validPermissions = [
      "view_sensor_data",
      "view_feeding_schedules",
      "create_feeding_schedules",
      "edit_feeding_schedules",
      "delete_feeding_schedules",
      "manual_feed_release",
      "edit_feeder_settings",
      "view_camera_feeds",
      "manage_team_members",
    ];

    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        return NextResponse.json(
          { error: `Invalid permission: ${permission}` },
          { status: 400 }
        );
      }
    }

    // Get user role and ownership status in minimal queries for efficiency
    const { data: feederData, error: feederError } = await supabase
      .from("feeders")
      .select("user_id")
      .eq("id", feederId)
      .single();

    if (feederError || !feederData) {
      return NextResponse.json(
        { error: "Feeder not found or access denied" },
        { status: 404 }
      );
    }

    const isOwner = feederData.user_id === user.id;
    let userRole = null;

    // If not owner, check membership in one query
    if (!isOwner) {
      const { data: membership } = await supabase
        .from("feeder_memberships")
        .select("role")
        .eq("feeder_id", feederId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .single();

      userRole = membership?.role || null;
    } else {
      userRole = "owner";
    }

    // If no access at all, return all false
    if (!isOwner && !userRole) {
      const permissionsResult = permissions.reduce(
        (acc: Record<string, boolean>, permission: string) => {
          acc[permission] = false;
          return acc;
        },
        {}
      );
      return NextResponse.json({ permissions: permissionsResult });
    }

    // Define role-based permissions (more efficient than individual database queries)
    const rolePermissions = {
      owner: [
        "view_sensor_data",
        "view_feeding_schedules",
        "create_feeding_schedules",
        "edit_feeding_schedules",
        "delete_feeding_schedules",
        "manual_feed_release",
        "edit_feeder_settings",
        "view_camera_feeds",
        "manage_team_members",
      ],
      manager: [
        "view_sensor_data",
        "view_feeding_schedules",
        "create_feeding_schedules",
        "edit_feeding_schedules",
        "delete_feeding_schedules",
        "manual_feed_release",
        "edit_feeder_settings",
        "view_camera_feeds",
      ],
      scheduler: [
        "view_sensor_data",
        "view_feeding_schedules",
        "create_feeding_schedules",
        "edit_feeding_schedules",
        "delete_feeding_schedules",
        "manual_feed_release",
      ],
      viewer: [
        "view_sensor_data",
        "view_feeding_schedules",
        "view_camera_feeds",
      ],
    };

    const allowedPermissions =
      rolePermissions[userRole as keyof typeof rolePermissions] || [];

    // Check all requested permissions against user's allowed permissions
    const permissionsResult = permissions.reduce(
      (acc: Record<string, boolean>, permission: string) => {
        acc[permission] = allowedPermissions.includes(permission);
        return acc;
      },
      {}
    );

    return NextResponse.json({ permissions: permissionsResult });
  } catch (error) {
    console.error("Error checking batch permissions:", error);
    return NextResponse.json(
      { error: "Failed to check permissions" },
      { status: 500 }
    );
  }
}
