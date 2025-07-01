import { FeedingSchedule } from "@/app/dashboard/feeder/[id]/feeding-schedule";

export type MQTTScheduleEntry = [
  number, // startDate unix timestamp
  number | null, // endDate unix timestamp or null
  number, // interval in seconds
  number // feedAmount
];

export type MQTTScheduleMessage = {
  schedule: MQTTScheduleEntry[];
};

const INTERVAL_SECONDS = {
  daily: 86400, // 24 hours
  weekly: 604800, // 7 days
  biweekly: 1209600, // 14 days
  "four-weekly": 2419200, // 28 days
} as const;

/**
 * Converts feeding schedules to MQTT format expected by Node-RED
 * Each session becomes a separate MQTT entry with calculated start/end dates
 * @param schedules Array of feeding schedules to convert
 * @param timezone IANA timezone identifier (e.g., 'Australia/Sydney')
 */
export function convertSchedulesToMQTT(
  schedules: FeedingSchedule[],
  timezone: string = "UTC"
): MQTTScheduleMessage {
  const mqttEntries: MQTTScheduleEntry[] = [];

  for (const schedule of schedules) {
    const intervalSeconds = INTERVAL_SECONDS[schedule.interval];

    if (schedule.interval === "daily") {
      // For daily schedules, each session starts at the schedule start date/time
      for (const session of schedule.sessions) {
        const startDate = createTimezoneAwareDate(
          schedule.startDate,
          session.time,
          timezone
        );

        const endDate = schedule.endDate
          ? createTimezoneAwareDate(schedule.endDate, session.time, timezone)
          : null;

        mqttEntries.push([
          Math.floor(startDate.getTime() / 1000), // start timestamp
          endDate ? Math.floor(endDate.getTime() / 1000) : null, // end timestamp
          intervalSeconds,
          session.feedAmount,
        ]);
      }
    } else {
      // For weekly/biweekly/four-weekly schedules, calculate start date for each day
      for (const dayOfWeek of schedule.daysOfWeek) {
        for (const session of schedule.sessions) {
          // Find the first occurrence of this day of week >= schedule start date
          const startDate = findNextDayOfWeek(
            schedule.startDate,
            dayOfWeek,
            session.time,
            timezone
          );

          const endDate = schedule.endDate
            ? createTimezoneAwareDate(schedule.endDate, session.time, timezone)
            : null;

          mqttEntries.push([
            Math.floor(startDate.getTime() / 1000), // start timestamp
            endDate ? Math.floor(endDate.getTime() / 1000) : null, // end timestamp
            intervalSeconds,
            session.feedAmount,
          ]);
        }
      }
    }
  }

  return { schedule: mqttEntries };
}

/**
 * Creates a timezone-aware date from a base date and time string
 */
function createTimezoneAwareDate(
  baseDate: Date,
  timeString: string,
  timezone: string
): Date {
  // Check if baseDate is valid
  if (!baseDate || !(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    return new Date(NaN); // Return invalid date
  }

  const [hours, minutes] = timeString.split(":");

  // For UTC timezone, use simple approach
  if (timezone === "UTC") {
    const result = new Date(baseDate);
    result.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
    return result;
  }

  // For other timezones, create a date in the target timezone
  // Get just the date part (YYYY-MM-DD) from the base date
  const dateStr = baseDate.toISOString().split("T")[0];

  // Time is now consistently in HH:MM format
  const timeStr = `${dateStr}T${timeString}:00`;

  // Parse this as a local time, then convert to UTC considering the timezone
  const localDate = new Date(timeStr);

  if (isNaN(localDate.getTime())) {
    return new Date(NaN);
  }

  // Get what this time would be in the target timezone
  const targetTime = new Date(
    localDate.toLocaleString("en-US", { timeZone: timezone })
  );
  const utcTime = new Date(
    localDate.toLocaleString("en-US", { timeZone: "UTC" })
  );

  // Calculate the offset and apply it
  const offset = utcTime.getTime() - targetTime.getTime();
  return new Date(localDate.getTime() + offset);
}

/**
 * Finds the next occurrence of a specific day of week >= the given start date
 */
function findNextDayOfWeek(
  startDate: Date,
  targetDayOfWeek: number,
  sessionTime: string,
  timezone: string
): Date {
  const result = createTimezoneAwareDate(startDate, sessionTime, timezone);

  // Get the day of week in the target timezone
  const tempDate = new Date(
    result.toLocaleString("en-US", { timeZone: timezone })
  );
  const currentDayOfWeek = tempDate.getDay();
  const daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  // If it's the same day of week, check if we're past the session time
  if (daysToAdd === 0) {
    const startDateTime = createTimezoneAwareDate(
      startDate,
      sessionTime,
      timezone
    );

    // If the session time is before the start time on the same day, move to next week
    if (startDateTime.getTime() < startDate.getTime()) {
      result.setDate(result.getDate() + 7);
    }
  } else {
    result.setDate(result.getDate() + daysToAdd);
  }

  return result;
}
