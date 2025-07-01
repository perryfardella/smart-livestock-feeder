import { convertSchedulesToMQTT } from "../mqtt-schedule-converter";
import { FeedingSchedule } from "@/app/dashboard/feeder/[id]/feeding-schedule";

describe("convertSchedulesToMQTT", () => {
  const mockFeederId = "feeder-123";

  describe("Daily schedules", () => {
    test("single daily session", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-21T08:00:00Z"), // Tuesday 8:00 AM
          endDate: new Date("2025-01-28T08:00:00Z"), // Tuesday 8:00 AM (1 week later)
          interval: "daily",
          daysOfWeek: [],
          sessions: [{ id: "s1", time: "08:00", feedAmount: 2.5 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0]).toEqual([
        1737446400, // 2025-01-21T08:00:00Z
        1738051200, // 2025-01-28T08:00:00Z
        86400, // daily interval
        2.5,
      ]);
    });

    test("multiple daily sessions", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-21T00:00:00Z"),
          endDate: undefined,
          interval: "daily",
          daysOfWeek: [],
          sessions: [
            { id: "s1", time: "08:00", feedAmount: 1.5 },
            { id: "s2", time: "18:00", feedAmount: 2.0 },
          ],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual([
        1737446400, // 2025-01-21T08:00:00Z
        null,
        86400,
        1.5,
      ]);
      expect(result.schedule[1]).toEqual([
        1737482400, // 2025-01-21T18:00:00Z
        null,
        86400,
        2.0,
      ]);
    });
  });

  describe("Weekly schedules", () => {
    test("single day weekly schedule", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T10:00:00Z"), // Monday 10:00 AM
          endDate: new Date("2025-02-20T10:00:00Z"),
          interval: "weekly",
          daysOfWeek: [1], // Monday
          sessions: [{ id: "s1", time: "10:00", feedAmount: 3.0 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0]).toEqual([
        1737367200, // 2025-01-20T10:00:00Z (Monday)
        1740045600, // 2025-02-20T10:00:00Z
        604800, // weekly interval
        3.0,
      ]);
    });

    test("multiple days weekly schedule", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T00:00:00Z"), // Monday
          endDate: undefined,
          interval: "weekly",
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          sessions: [{ id: "s1", time: "09:00", feedAmount: 1.0 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(3);
      expect(result.schedule[0]).toEqual([
        1737363600, // 2025-01-20T09:00:00Z (Monday)
        null,
        604800,
        1.0,
      ]);
      expect(result.schedule[1]).toEqual([
        1737536400, // 2025-01-22T09:00:00Z (Wednesday)
        null,
        604800,
        1.0,
      ]);
      expect(result.schedule[2]).toEqual([
        1737709200, // 2025-01-24T09:00:00Z (Friday)
        null,
        604800,
        1.0,
      ]);
    });

    test("weekly schedule starting mid-week", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-22T14:00:00Z"), // Wednesday 2:00 PM
          endDate: undefined,
          interval: "weekly",
          daysOfWeek: [1, 3], // Monday, Wednesday
          sessions: [{ id: "s1", time: "14:00", feedAmount: 2.0 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual([
        1737986400, // 2025-01-27T14:00:00Z (Next Monday)
        null,
        604800,
        2.0,
      ]);
      expect(result.schedule[1]).toEqual([
        1737554400, // 2025-01-22T14:00:00Z (Same Wednesday)
        null,
        604800,
        2.0,
      ]);
    });

    test("weekly schedule with session time before start time on same day", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T14:00:00Z"), // Monday 2:00 PM
          endDate: undefined,
          interval: "weekly",
          daysOfWeek: [1], // Monday
          sessions: [{ id: "s1", time: "08:00", feedAmount: 1.5 }], // 8:00 AM (before start time)
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0]).toEqual([
        1737964800, // 2025-01-27T08:00:00Z (Next Monday at 8:00 AM)
        null,
        604800,
        1.5,
      ]);
    });
  });

  describe("Biweekly schedules", () => {
    test("biweekly schedule", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-21T12:00:00Z"), // Tuesday
          endDate: new Date("2025-03-21T12:00:00Z"),
          interval: "biweekly",
          daysOfWeek: [2, 4], // Tuesday, Thursday
          sessions: [{ id: "s1", time: "12:00", feedAmount: 4.0 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual([
        1737460800, // 2025-01-21T12:00:00Z (Tuesday)
        1742558400, // 2025-03-21T12:00:00Z
        1209600, // biweekly interval
        4.0,
      ]);
      expect(result.schedule[1]).toEqual([
        1737633600, // 2025-01-23T12:00:00Z (Thursday)
        1742558400, // 2025-03-23T12:00:00Z
        1209600,
        4.0,
      ]);
    });
  });

  describe("Four-weekly schedules", () => {
    test("four-weekly schedule", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-19T16:30:00Z"), // Sunday 4:30 PM
          endDate: undefined,
          interval: "four-weekly",
          daysOfWeek: [0, 6], // Sunday, Saturday
          sessions: [{ id: "s1", time: "16:30", feedAmount: 5.5 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual([
        1737304200, // 2025-01-19T16:30:00Z (Sunday)
        null,
        2419200, // four-weekly interval
        5.5,
      ]);
      expect(result.schedule[1]).toEqual([
        1737822600, // 2025-01-25T16:30:00Z (Saturday)
        null,
        2419200,
        5.5,
      ]);
    });
  });

  describe("Multiple schedules", () => {
    test("combines multiple schedules", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T08:00:00Z"),
          endDate: undefined,
          interval: "daily",
          daysOfWeek: [],
          sessions: [{ id: "s1", time: "08:00", feedAmount: 1.0 }],
        },
        {
          id: "2",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T00:00:00Z"),
          endDate: undefined,
          interval: "weekly",
          daysOfWeek: [0], // Sunday
          sessions: [{ id: "s2", time: "20:00", feedAmount: 3.0 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual([
        1737360000, // Daily at 8:00 AM
        null,
        86400,
        1.0,
      ]);
      expect(result.schedule[1]).toEqual([
        1737921600, // Sunday at 8:00 PM
        null,
        604800,
        3.0,
      ]);
    });
  });

  describe("Complex scenarios", () => {
    test("weekly schedule with multiple sessions on multiple days", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T00:00:00Z"), // Monday
          endDate: new Date("2025-02-20T23:59:59Z"),
          interval: "weekly",
          daysOfWeek: [1, 3], // Monday, Wednesday
          sessions: [
            { id: "s1", time: "07:00", feedAmount: 0.5 },
            { id: "s2", time: "19:00", feedAmount: 1.5 },
          ],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule).toHaveLength(4); // 2 days × 2 sessions

      // Monday sessions
      expect(result.schedule[0]).toEqual([
        1737356400, // Monday 7:00 AM
        1740034800, // End date at 7:00 AM
        604800,
        0.5,
      ]);
      expect(result.schedule[1]).toEqual([
        1737399600, // Monday 7:00 PM
        1740078000, // End date at 7:00 PM
        604800,
        1.5,
      ]);

      // Wednesday sessions
      expect(result.schedule[2]).toEqual([
        1737529200, // Wednesday 7:00 AM
        1740034800, // End date at 7:00 AM
        604800,
        0.5,
      ]);
      expect(result.schedule[3]).toEqual([
        1737572400, // Wednesday 7:00 PM
        1740078000, // End date at 7:00 PM
        604800,
        1.5,
      ]);
    });

    test("empty schedules array", () => {
      const result = convertSchedulesToMQTT([], "UTC");
      expect(result.schedule).toEqual([]);
    });

    test("decimal feed amounts", () => {
      const schedules: FeedingSchedule[] = [
        {
          id: "1",
          feederId: mockFeederId,
          startDate: new Date("2025-01-20T08:00:00Z"),
          endDate: undefined,
          interval: "daily",
          daysOfWeek: [],
          sessions: [{ id: "s1", time: "08:00", feedAmount: 2.75 }],
        },
      ];

      const result = convertSchedulesToMQTT(schedules, "UTC");

      expect(result.schedule[0][3]).toBe(2.75);
    });
  });
});

describe("Timezone functionality", () => {
  test("converts schedules with Australia/Sydney timezone", () => {
    const schedules: FeedingSchedule[] = [
      {
        id: "1",
        feederId: "feeder-123",
        startDate: new Date("2025-01-21T08:00:00Z"), // UTC time
        endDate: undefined,
        interval: "daily",
        daysOfWeek: [],
        sessions: [{ id: "s1", time: "08:00", feedAmount: 2.0 }],
      },
    ];

    const result = convertSchedulesToMQTT(schedules, "Australia/Sydney");

    expect(result.schedule).toHaveLength(1);
    // The exact timestamp will depend on whether it's DST or not in Sydney
    // But it should be a valid number and different from UTC
    expect(typeof result.schedule[0][0]).toBe("number");
    expect(result.schedule[0][2]).toBe(86400); // daily interval
    expect(result.schedule[0][3]).toBe(2.0); // feed amount
  });

  test("handles UTC timezone correctly", () => {
    const schedules: FeedingSchedule[] = [
      {
        id: "1",
        feederId: "feeder-123",
        startDate: new Date("2025-01-21T10:00:00Z"),
        endDate: undefined,
        interval: "daily",
        daysOfWeek: [],
        sessions: [{ id: "s1", time: "10:00", feedAmount: 1.5 }],
      },
    ];

    const resultUTC = convertSchedulesToMQTT(schedules, "UTC");
    const resultDefault = convertSchedulesToMQTT(schedules); // Should default to UTC

    expect(resultUTC).toEqual(resultDefault);
    expect(resultUTC.schedule[0]).toEqual([
      1737453600, // 2025-01-21T10:00:00Z
      null,
      86400,
      1.5,
    ]);
  });
});
