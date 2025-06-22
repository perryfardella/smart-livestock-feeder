"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FeedingSession = {
  id?: string;
  time: string; // HH:mm format
  feedAmount: number;
};

export type FeedingSchedule = {
  id?: string;
  feederId: string;
  startDate: Date;
  endDate?: Date;
  interval: "daily" | "weekly" | "biweekly" | "four-weekly";
  daysOfWeek: number[]; // 0-6 for Sunday-Saturday
  sessions: FeedingSession[];
};

export async function getFeedingSchedules(feederId?: string) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized",
        schedules: [],
      };
    }

    // Build query for feeding schedules with sessions
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
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Filter by feeder if specified
    if (feederId) {
      query = query.eq("feeder_id", feederId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error("Error fetching feeding schedules:", error);
      return {
        success: false,
        error: "Failed to fetch feeding schedules",
        schedules: [],
      };
    }

    // Transform the data to match the frontend types
    const transformedSchedules =
      schedules?.map((schedule) => ({
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
      })) || [];

    return { success: true, schedules: transformedSchedules };
  } catch (error) {
    console.error("Error fetching feeding schedules:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch feeding schedules",
      schedules: [],
    };
  }
}

export async function createFeedingSchedule(
  schedule: Omit<FeedingSchedule, "id">
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Verify user owns the feeder
    const { data: feeder, error: feederError } = await supabase
      .from("feeders")
      .select("id")
      .eq("id", schedule.feederId)
      .eq("user_id", user.id)
      .single();

    if (feederError || !feeder) {
      return {
        success: false,
        error: "Feeder not found or access denied",
      };
    }

    // Create the feeding schedule
    const { data: createdSchedule, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .insert({
        feeder_id: schedule.feederId,
        user_id: user.id,
        start_date: schedule.startDate.toISOString(),
        end_date: schedule.endDate?.toISOString() || null,
        interval: schedule.interval,
        days_of_week: schedule.daysOfWeek || [],
      })
      .select()
      .single();

    if (scheduleError) {
      console.error("Error creating feeding schedule:", scheduleError);
      return {
        success: false,
        error: "Failed to create feeding schedule",
      };
    }

    // Create the feeding sessions
    const sessionsToInsert = schedule.sessions.map((session) => ({
      feeding_schedule_id: createdSchedule.id,
      time: session.time,
      feed_amount: session.feedAmount,
    }));

    const { data: createdSessions, error: sessionsError } = await supabase
      .from("feeding_sessions")
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) {
      console.error("Error creating feeding sessions:", sessionsError);
      // Clean up the schedule if sessions failed
      await supabase
        .from("feeding_schedules")
        .delete()
        .eq("id", createdSchedule.id);

      return {
        success: false,
        error: "Failed to create feeding sessions",
      };
    }

    // Transform the response
    const transformedSchedule = {
      id: createdSchedule.id,
      feederId: createdSchedule.feeder_id,
      startDate: new Date(createdSchedule.start_date),
      endDate: createdSchedule.end_date
        ? new Date(createdSchedule.end_date)
        : undefined,
      interval: createdSchedule.interval,
      daysOfWeek: createdSchedule.days_of_week || [],
      sessions:
        createdSessions?.map((session) => ({
          id: session.id,
          time: session.time,
          feedAmount: parseFloat(session.feed_amount),
        })) || [],
    };

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${schedule.feederId}`);

    return { success: true, schedule: transformedSchedule };
  } catch (error) {
    console.error("Error creating feeding schedule:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create feeding schedule",
    };
  }
}

export async function updateFeedingSchedule(
  scheduleId: string,
  schedule: Omit<FeedingSchedule, "id">
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Verify user owns the schedule
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .select("id, feeder_id")
      .eq("id", scheduleId)
      .eq("user_id", user.id)
      .single();

    if (scheduleError || !existingSchedule) {
      return {
        success: false,
        error: "Feeding schedule not found or access denied",
      };
    }

    // Update the feeding schedule
    const { data: updatedSchedule, error: updateError } = await supabase
      .from("feeding_schedules")
      .update({
        start_date: schedule.startDate.toISOString(),
        end_date: schedule.endDate?.toISOString() || null,
        interval: schedule.interval,
        days_of_week: schedule.daysOfWeek || [],
      })
      .eq("id", scheduleId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating feeding schedule:", updateError);
      return {
        success: false,
        error: "Failed to update feeding schedule",
      };
    }

    // Delete existing sessions and create new ones
    await supabase
      .from("feeding_sessions")
      .delete()
      .eq("feeding_schedule_id", scheduleId);

    // Create new sessions
    const sessionsToInsert = schedule.sessions.map((session) => ({
      feeding_schedule_id: scheduleId,
      time: session.time,
      feed_amount: session.feedAmount,
    }));

    const { data: createdSessions, error: sessionsError } = await supabase
      .from("feeding_sessions")
      .insert(sessionsToInsert)
      .select();

    if (sessionsError) {
      console.error("Error creating feeding sessions:", sessionsError);
      return {
        success: false,
        error: "Failed to update feeding sessions",
      };
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
    };

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${schedule.feederId}`);

    return { success: true, schedule: transformedSchedule };
  } catch (error) {
    console.error("Error updating feeding schedule:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update feeding schedule",
    };
  }
}

export async function deleteFeedingSchedule(
  scheduleId: string,
  feederId: string
) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Verify user owns the schedule and delete it
    const { error: deleteError } = await supabase
      .from("feeding_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting feeding schedule:", deleteError);
      return {
        success: false,
        error: "Failed to delete feeding schedule",
      };
    }

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${feederId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting feeding schedule:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete feeding schedule",
    };
  }
}
