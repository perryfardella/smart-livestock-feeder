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
 */
export function convertSchedulesToMQTT(
  schedules: FeedingSchedule[]
): MQTTScheduleMessage {
  const mqttEntries: MQTTScheduleEntry[] = [];

  for (const schedule of schedules) {
    const intervalSeconds = INTERVAL_SECONDS[schedule.interval];

    if (schedule.interval === "daily") {
      // For daily schedules, each session starts at the schedule start date/time
      for (const session of schedule.sessions) {
        const startDate = new Date(schedule.startDate);
        const [hours, minutes] = session.time.split(":");
        startDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

        const endDate = schedule.endDate
          ? (() => {
              const endDateTime = new Date(schedule.endDate);
              endDateTime.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
              return endDateTime;
            })()
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
            session.time
          );

          const endDate = schedule.endDate
            ? (() => {
                const [hours, minutes] = session.time.split(":");
                const endDateTime = new Date(schedule.endDate);
                endDateTime.setUTCHours(
                  parseInt(hours),
                  parseInt(minutes),
                  0,
                  0
                );
                return endDateTime;
              })()
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
 * Finds the next occurrence of a specific day of week >= the given start date
 */
function findNextDayOfWeek(
  startDate: Date,
  targetDayOfWeek: number,
  sessionTime: string
): Date {
  const [hours, minutes] = sessionTime.split(":");
  const result = new Date(startDate);
  result.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

  const currentDayOfWeek = result.getUTCDay();
  const daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;

  // If it's the same day of week, check if we're past the session time
  if (daysToAdd === 0) {
    const startDateTime = new Date(startDate);
    startDateTime.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If the session time is before the start time on the same day, move to next week
    if (startDateTime.getTime() < startDate.getTime()) {
      result.setUTCDate(result.getUTCDate() + 7);
    }
  } else {
    result.setUTCDate(result.getUTCDate() + daysToAdd);
  }

  return result;
}
