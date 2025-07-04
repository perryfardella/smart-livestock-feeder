"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { convertSchedulesToMQTT } from "@/lib/utils/mqtt-schedule-converter";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { hasFeederPermission } from "@/lib/utils/permissions";

export type FeedingSession = {
  id?: string;
  time: string; // HH:MM format (consistent across FE/BE)
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

/**
 * Helper function to convert and log MQTT messages for a feeder's schedules
 */
async function convertAndLogMQTTSchedules(
  feederId: string,
  operation: "CREATE" | "UPDATE" | "DELETE"
) {
  try {
    // Create a new supabase client to fetch fresh data without triggering recursion
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log(`❌ Unauthorized for MQTT conversion`);
      return;
    }

    // First, get the feeder's device_id and timezone
    const { data: feeder, error: feederError } = await supabase
      .from("feeders")
      .select("device_id, timezone")
      .eq("id", feederId)
      .eq("user_id", user.id)
      .single();

    if (feederError || !feeder) {
      console.log(
        `❌ Failed to fetch feeder device_id: ${
          feederError?.message || "Feeder not found"
        }`
      );
      return;
    }

    // Fetch fresh schedules directly from database
    const { data: schedules, error } = await supabase
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
      .eq("feeder_id", feederId)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(
        `❌ Failed to fetch schedules for MQTT conversion: ${error.message}`
      );
      return;
    }

    // Transform the data to match the frontend types
    const transformedSchedules =
      schedules
        ?.filter((schedule) => {
          // Validate start_date
          if (!schedule.start_date) {
            console.warn(
              `❌ Schedule ${schedule.id} has null/undefined start_date`
            );
            return false;
          }
          const startDate = new Date(schedule.start_date);
          if (isNaN(startDate.getTime())) {
            console.warn(
              `❌ Schedule ${schedule.id} has invalid start_date: ${schedule.start_date}`
            );
            return false;
          }
          return true;
        })
        .map((schedule) => {
          const startDate = new Date(schedule.start_date);
          const endDate = schedule.end_date
            ? (() => {
                const endDate = new Date(schedule.end_date);
                return isNaN(endDate.getTime()) ? undefined : endDate;
              })()
            : undefined;

          return {
            id: schedule.id,
            feederId: schedule.feeder_id,
            startDate,
            endDate,
            interval: schedule.interval,
            daysOfWeek: schedule.days_of_week || [],
            sessions:
              schedule.feeding_sessions?.map(
                (session: {
                  id: string;
                  time: string;
                  feed_amount: string;
                }) => ({
                  id: session.id,
                  time: session.time,
                  feedAmount: parseFloat(session.feed_amount),
                })
              ) || [],
          };
        }) || [];

    const mqttMessage = convertSchedulesToMQTT(
      transformedSchedules,
      feeder.timezone || "UTC"
    );
    const topic = `${feeder.device_id}/writeDataRequest`;

    console.log(
      `🔄 MQTT Conversion - ${operation} operation for feeder ${feederId} (device: ${feeder.device_id}):`
    );
    console.log(`📊 Found ${transformedSchedules.length} schedule(s)`);
    console.log(`📡 MQTT Topic: ${topic}`);
    console.log(`📡 MQTT Payload:`, JSON.stringify(mqttMessage, null, 2));

    // Log individual schedule details for debugging
    if (transformedSchedules.length > 0) {
      console.log(`📋 Schedule Details:`);
      transformedSchedules.forEach((schedule, index) => {
        console.log(`  Schedule ${index + 1}:`, {
          id: schedule.id,
          interval: schedule.interval,
          daysOfWeek: schedule.daysOfWeek,
          sessions: schedule.sessions.length,
          startDate: schedule.startDate.toISOString(),
          endDate: schedule.endDate?.toISOString() || "none",
        });
      });
    }

    // Send MQTT message to IoT device
    await sendMQTTMessage(topic, mqttMessage);
  } catch (error) {
    console.error(`❌ Error in MQTT conversion for feeder ${feederId}:`, error);
  }
}

/**
 * Helper function to send MQTT messages directly using AWS SDK
 */
async function sendMQTTMessage(topic: string, payload: object) {
  try {
    // Server-side environment variables (no NEXT_PUBLIC_ prefix)
    const AWS_CONFIG = {
      region: process.env.AWS_REGION,
      identityPoolId: process.env.AWS_IDENTITY_POOL_ID,
      iotEndpoint: process.env.AWS_IOT_ENDPOINT,
    };

    // Validate environment variables
    const missing = Object.entries(AWS_CONFIG)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}`);
    }

    // Initialize IoT client
    const client = new IoTDataPlaneClient({
      region: AWS_CONFIG.region!,
      endpoint: `https://${AWS_CONFIG.iotEndpoint}`,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: AWS_CONFIG.region! },
        identityPoolId: AWS_CONFIG.identityPoolId!,
      }),
    });

    // Publish message
    await client.send(
      new PublishCommand({
        topic: topic.trim(),
        payload: JSON.stringify(payload),
      })
    );

    console.log(`✅ MQTT message sent to topic: ${topic}`);
  } catch (error) {
    console.error(`❌ Failed to send MQTT message:`, error);
  }
}

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
    // Note: RLS policies will automatically filter to only show schedules
    // the user has permission to view (owned schedules + shared schedules)
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

    // Transform the data to match the expected format
    const transformedSchedules: FeedingSchedule[] = (schedules || []).map(
      (schedule: {
        id: string;
        feeder_id: string;
        user_id: string;
        start_date: string;
        end_date: string | null;
        interval: string;
        days_of_week: number[];
        created_at: string;
        updated_at: string;
        feeding_sessions: Array<{
          id: string;
          time: string;
          feed_amount: string;
        }>;
      }) => ({
        id: schedule.id,
        feederId: schedule.feeder_id,
        startDate: new Date(schedule.start_date),
        endDate: schedule.end_date ? new Date(schedule.end_date) : undefined,
        interval: schedule.interval as
          | "daily"
          | "weekly"
          | "biweekly"
          | "four-weekly",
        daysOfWeek: schedule.days_of_week || [],
        sessions: schedule.feeding_sessions.map((session) => ({
          id: session.id,
          time: session.time,
          feedAmount: parseFloat(session.feed_amount),
        })),
      })
    );

    return {
      success: true,
      schedules: transformedSchedules,
    };
  } catch (error) {
    console.error("Error in getFeedingSchedules:", error);
    return {
      success: false,
      error: "Failed to fetch feeding schedules",
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

    // Check if user has permission to create feeding schedules for this feeder
    const canCreateSchedules = await hasFeederPermission(
      schedule.feederId,
      "create_feeding_schedules",
      user.id
    );

    if (!canCreateSchedules) {
      return {
        success: false,
        error:
          "Access denied: You don't have permission to create feeding schedules for this feeder",
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

    // Convert and log MQTT message for the updated feeder
    setTimeout(() => {
      convertAndLogMQTTSchedules(schedule.feederId, "CREATE");
    }, 0);

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

    // Get the existing schedule to check permissions
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from("feeding_schedules")
      .select("id, feeder_id")
      .eq("id", scheduleId)
      .single();

    if (scheduleError || !existingSchedule) {
      return {
        success: false,
        error: "Feeding schedule not found",
      };
    }

    // Check if user has permission to edit feeding schedules for this feeder
    const canEditSchedules = await hasFeederPermission(
      existingSchedule.feeder_id,
      "edit_feeding_schedules",
      user.id
    );

    if (!canEditSchedules) {
      return {
        success: false,
        error:
          "Access denied: You don't have permission to edit feeding schedules for this feeder",
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

    // Convert and log MQTT message for the updated feeder
    setTimeout(() => {
      convertAndLogMQTTSchedules(schedule.feederId, "UPDATE");
    }, 0);

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

    // Get the schedule to check permissions
    const { data: scheduleToDelete, error: fetchError } = await supabase
      .from("feeding_schedules")
      .select("id, feeder_id")
      .eq("id", scheduleId)
      .single();

    if (fetchError || !scheduleToDelete) {
      return {
        success: false,
        error: "Feeding schedule not found",
      };
    }

    // Check if user has permission to delete feeding schedules for this feeder
    const canDeleteSchedules = await hasFeederPermission(
      scheduleToDelete.feeder_id,
      "delete_feeding_schedules",
      user.id
    );

    if (!canDeleteSchedules) {
      return {
        success: false,
        error:
          "Access denied: You don't have permission to delete feeding schedules for this feeder",
      };
    }

    // Delete the schedule (RLS will provide additional safety)
    const { error: deleteError } = await supabase
      .from("feeding_schedules")
      .delete()
      .eq("id", scheduleId);

    if (deleteError) {
      console.error("Error deleting feeding schedule:", deleteError);
      return {
        success: false,
        error: "Failed to delete feeding schedule",
      };
    }

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${feederId}`);

    // Convert and log MQTT message for the updated feeder (after deletion)
    setTimeout(() => {
      convertAndLogMQTTSchedules(feederId, "DELETE");
    }, 0);

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
