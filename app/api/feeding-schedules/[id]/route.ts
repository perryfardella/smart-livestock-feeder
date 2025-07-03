import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireFeederPermission } from "@/lib/utils/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the feeding schedule with sessions
    // Note: RLS now handles permission checking via updated policies
    const { data: schedule, error } = await supabase
      .from("feeding_schedules")
      .select(
        `
        *,
        feeding_sessions (
          id,
          time,
          feed_amount
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !schedule) {
      return NextResponse.json(
        { error: "Feeding schedule not found" },
        { status: 404 }
      );
    }

    // Additional permission check for viewing this specific schedule
    const permissionCheck = await requireFeederPermission(
      schedule.feeder_id,
      "view_feeding_schedules",
      user.id
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    // Transform the data
    const transformedSchedule = {
      id: schedule.id,
      feederId: schedule.feeder_id,
      startDate: new Date(schedule.start_date),
      endDate: schedule.end_date ? new Date(schedule.end_date) : undefined,
      interval: schedule.interval,
      daysOfWeek: schedule.days_of_week || [],
      sessions:
        schedule.feeding_sessions?.map(
          (session: { id: string; time: string; feed_amount: string }) => ({
            id: session.id,
            time: session.time,
            feedAmount: parseFloat(session.feed_amount),
          })
        ) || [],
      createdAt: new Date(schedule.created_at),
      updatedAt: new Date(schedule.updated_at),
    };

    return NextResponse.json({ schedule: transformedSchedule });
  } catch (error) {
    console.error("Error in GET /api/feeding-schedules/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    const { startDate, interval, daysOfWeek, sessions } = body;

    if (!startDate || !interval || !sessions || !Array.isArray(sessions)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate sessions
    for (const session of sessions) {
      if (
        !session.time ||
        typeof session.feedAmount !== "number" ||
        session.feedAmount <= 0
      ) {
        return NextResponse.json(
          { error: "Invalid session data" },
          { status: 400 }
        );
      }
    }

    // Get the schedule to check feeder_id, then verify permissions
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .select("id, feeder_id")
      .eq("id", id)
      .single();

    if (scheduleError || !existingSchedule) {
      return NextResponse.json(
        { error: "Feeding schedule not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to edit feeding schedules
    const permissionCheck = await requireFeederPermission(
      existingSchedule.feeder_id,
      "edit_feeding_schedules",
      user.id
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    // Update the feeding schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from("feeding_schedules")
      .update({
        start_date: startDate,
        end_date: body.endDate || null,
        interval,
        days_of_week: daysOfWeek || [],
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating feeding schedule:", updateError);
      return NextResponse.json(
        { error: "Failed to update feeding schedule" },
        { status: 500 }
      );
    }

    // Delete existing sessions and create new ones
    await supabase
      .from("feeding_sessions")
      .delete()
      .eq("feeding_schedule_id", id);

    // Create new sessions
    const sessionsToInsert = sessions.map(
      (session: { time: string; feedAmount: number }) => ({
        feeding_schedule_id: id,
        time: session.time,
        feed_amount: session.feedAmount,
      })
    );

    const { data: createdSessions, error: sessionsError } = await supabase
      .from("feeding_sessions")
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) {
      console.error("Error creating feeding sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to update feeding sessions" },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedSchedule = {
      id: updatedSchedule.id,
      feederId: updatedSchedule.feeder_id,
      startDate: new Date(updatedSchedule.start_date),
      endDate: updatedSchedule.end_date
        ? new Date(updatedSchedule.end_date)
        : undefined,
      interval: updatedSchedule.interval,
      daysOfWeek: updatedSchedule.days_of_week || [],
      sessions:
        createdSessions?.map((session) => ({
          id: session.id,
          time: session.time,
          feedAmount: parseFloat(session.feed_amount),
        })) || [],
      createdAt: new Date(updatedSchedule.created_at),
      updatedAt: new Date(updatedSchedule.updated_at),
    };

    return NextResponse.json({ schedule: transformedSchedule });
  } catch (error) {
    console.error("Error in PUT /api/feeding-schedules/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the schedule to check feeder_id, then verify permissions
    const { data: scheduleToDelete, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .select("id, feeder_id")
      .eq("id", id)
      .single();

    if (scheduleError || !scheduleToDelete) {
      return NextResponse.json(
        { error: "Feeding schedule not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to delete feeding schedules
    const permissionCheck = await requireFeederPermission(
      scheduleToDelete.feeder_id,
      "delete_feeding_schedules",
      user.id
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    // Delete the schedule (RLS will handle the permission check)
    const { error: deleteError } = await supabase
      .from("feeding_schedules")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting feeding schedule:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete feeding schedule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/feeding-schedules/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
