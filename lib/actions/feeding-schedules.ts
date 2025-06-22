"use server";

import { revalidatePath } from "next/cache";

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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const url = new URL("/api/feeding-schedules", baseUrl);

    if (feederId) {
      url.searchParams.set("feederId", feederId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch feeding schedules");
    }

    const data = await response.json();
    return { success: true, schedules: data.schedules };
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/feeding-schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feederId: schedule.feederId,
        startDate: schedule.startDate.toISOString(),
        endDate: schedule.endDate?.toISOString() || null,
        interval: schedule.interval,
        daysOfWeek: schedule.daysOfWeek,
        sessions: schedule.sessions.map((session) => ({
          time: session.time,
          feedAmount: session.feedAmount,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create feeding schedule");
    }

    const data = await response.json();

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${schedule.feederId}`);

    return { success: true, schedule: data.schedule };
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/feeding-schedules/${scheduleId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: schedule.startDate.toISOString(),
          endDate: schedule.endDate?.toISOString() || null,
          interval: schedule.interval,
          daysOfWeek: schedule.daysOfWeek,
          sessions: schedule.sessions.map((session) => ({
            time: session.time,
            feedAmount: session.feedAmount,
          })),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update feeding schedule");
    }

    const data = await response.json();

    // Revalidate the feeder page to show updated schedules
    revalidatePath(`/dashboard/feeder/${schedule.feederId}`);

    return { success: true, schedule: data.schedule };
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
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/feeding-schedules/${scheduleId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete feeding schedule");
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
