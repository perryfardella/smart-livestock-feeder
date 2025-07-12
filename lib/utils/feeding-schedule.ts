import { format, addDays, isBefore, isAfter } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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
  sessions: FeedingSession[]; // Multiple sessions per day
};

export type NextFeeding = {
  date: Date;
  session: FeedingSession;
};

/**
 * Calculate the next feeding time for a given schedule
 * @param schedule The feeding schedule to calculate next feeding for
 * @returns The next feeding date and session, or null if no upcoming feedings
 */
export function getNextFeeding(schedule: FeedingSchedule): NextFeeding | null {
  const now = new Date();

  // For recurring feeds, return null if we're past the end date
  if (schedule.endDate && isBefore(schedule.endDate, now)) {
    return null;
  }

  // Calculate next feeding based on interval
  let checkDate = new Date(schedule.startDate);

  // If we haven't started yet, check from start date
  if (isBefore(now, schedule.startDate)) {
    checkDate = new Date(schedule.startDate);
  } else {
    // Start checking from today
    checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
  }

  // Look ahead for the next 365 days to find the next feeding
  for (let i = 0; i < 365; i++) {
    const dayOfWeek = checkDate.getDay();

    // Check if this day matches our schedule
    const matchesSchedule =
      schedule.interval === "daily" ||
      (schedule.daysOfWeek.includes(dayOfWeek) &&
        (schedule.interval === "weekly" ||
          (schedule.interval === "biweekly" &&
            Math.floor(
              (checkDate.getTime() - schedule.startDate.getTime()) /
                (1000 * 60 * 60 * 24 * 7)
            ) %
              2 ===
              0) ||
          (schedule.interval === "four-weekly" &&
            Math.floor(
              (checkDate.getTime() - schedule.startDate.getTime()) /
                (1000 * 60 * 60 * 24 * 7)
            ) %
              4 ===
              0)));

    if (matchesSchedule && !isBefore(checkDate, schedule.startDate)) {
      // Find the next session for this day
      const nextSession = schedule.sessions
        .map((session) => {
          const sessionDate = new Date(checkDate);
          const [hours, minutes] = session.time.split(":");
          sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          return { date: sessionDate, session };
        })
        .filter(({ date }) => isAfter(date, now))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      if (nextSession) {
        return nextSession;
      }
    }

    checkDate = addDays(checkDate, 1);
  }

  return null;
}

/**
 * Get the next feeding time for multiple schedules and return the earliest one
 * @param schedules Array of feeding schedules
 * @returns The earliest next feeding time across all schedules, or null if none
 */
export function getNextFeedingFromSchedules(
  schedules: FeedingSchedule[]
): NextFeeding | null {
  if (!schedules || schedules.length === 0) {
    return null;
  }

  const nextFeedings = schedules
    .map((schedule) => getNextFeeding(schedule))
    .filter((feeding): feeding is NextFeeding => feeding !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return nextFeedings.length > 0 ? nextFeedings[0] : null;
}

/**
 * Format next feeding time for display with timezone
 * @param nextFeeding The next feeding object
 * @param timezone The timezone to format in (e.g., 'Australia/Sydney')
 * @returns Formatted string like "Dec 25, 2024 8:00 AM AEDT"
 */
export function formatNextFeeding(
  nextFeeding: NextFeeding,
  timezone: string
): string {
  try {
    const formattedDate = formatInTimeZone(
      nextFeeding.date,
      timezone,
      "MMM d, yyyy h:mm a"
    );
    const shortTz = formatInTimeZone(nextFeeding.date, timezone, "zzz");
    return `${formattedDate} ${shortTz}`;
  } catch (error) {
    // Fallback to local time if timezone formatting fails
    console.warn(
      `Failed to format time in timezone ${timezone}, using local time:`,
      error
    );
    return format(nextFeeding.date, "MMM d, yyyy h:mm a");
  }
}
