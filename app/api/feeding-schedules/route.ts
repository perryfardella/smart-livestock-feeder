import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireFeederPermission } from "@/lib/utils/permissions";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const feederId = searchParams.get("feederId");

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query for feeding schedules with sessions
    // Note: RLS now handles permission checking via updated policies
    let query = supabase
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
      .order("created_at", { ascending: false });

    // Filter by feeder if specified
    if (feederId) {
      // Additional permission check for specific feeder
      const permissionCheck = await requireFeederPermission(
        feederId,
        "view_feeding_schedules",
        user.id
      );

      if (!permissionCheck.authorized) {
        return NextResponse.json(
          { error: permissionCheck.error },
          { status: 403 }
        );
      }

      query = query.eq("feeder_id", feederId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error("Error fetching feeding schedules:", error);
      return NextResponse.json(
        { error: "Failed to fetch feeding schedules" },
        { status: 500 }
      );
    }

    // Transform the data to match the frontend types
    const transformedSchedules = schedules?.map((schedule) => ({
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
    }));

    return NextResponse.json({ schedules: transformedSchedules });
  } catch (error) {
    console.error("Error in GET /api/feeding-schedules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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
    const { feederId, startDate, interval, daysOfWeek, sessions } = body;

    if (
      !feederId ||
      !startDate ||
      !interval ||
      !sessions ||
      !Array.isArray(sessions)
    ) {
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

    // Check if user has permission to create feeding schedules
    const permissionCheck = await requireFeederPermission(
      feederId,
      "create_feeding_schedules",
      user.id
    );

    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    // Create the feeding schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .insert({
        feeder_id: feederId,
        user_id: user.id,
        start_date: startDate,
        end_date: body.endDate || null,
        interval,
        days_of_week: daysOfWeek || [],
      })
      .select()
      .single();

    if (scheduleError) {
      console.error("Error creating feeding schedule:", scheduleError);
      return NextResponse.json(
        { error: "Failed to create feeding schedule" },
        { status: 500 }
      );
    }

    // Create the feeding sessions
    const sessionsToInsert = sessions.map(
      (session: { time: string; feedAmount: number }) => ({
        feeding_schedule_id: schedule.id,
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
      // Clean up the schedule if sessions failed
      await supabase.from("feeding_schedules").delete().eq("id", schedule.id);

      return NextResponse.json(
        { error: "Failed to create feeding sessions" },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedSchedule = {
      id: schedule.id,
      feederId: schedule.feeder_id,
      startDate: new Date(schedule.start_date),
      endDate: schedule.end_date ? new Date(schedule.end_date) : undefined,
      interval: schedule.interval,
      daysOfWeek: schedule.days_of_week || [],
      sessions:
        createdSessions?.map((session) => ({
          id: session.id,
          time: session.time,
          feedAmount: parseFloat(session.feed_amount),
        })) || [],
      createdAt: new Date(schedule.created_at),
      updatedAt: new Date(schedule.updated_at),
    };

    return NextResponse.json(
      { schedule: transformedSchedule },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/feeding-schedules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
