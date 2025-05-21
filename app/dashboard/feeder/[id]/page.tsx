import { redirect } from "next/navigation";
import { FeederUI } from "./feeder-ui";

// Sample data - In real implementation, this would come from your database
const feedingStations = {
  "feeder-1": {
    id: "feeder-1",
    name: "Main Barn Feeder",
    location: "North Barn",
    status: "active",
    lastFeeding: "2 hours ago",
    nextFeeding: "In 4 hours",
    waterLevel: 75,
    temperature: 24,
    batteryLevel: 85,
    connectivityStrength: 90,
    alerts: [
      { id: 1, message: "Water level below 80%", severity: "warning" },
      {
        id: 2,
        message: "Scheduled maintenance due in 2 days",
        severity: "info",
      },
    ],
    feedingSchedule: [
      {
        id: "schedule-1",
        time: "06:00",
        amount: "2.5kg",
        days: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      {
        id: "schedule-2",
        time: "12:00",
        amount: "2.5kg",
        days: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      {
        id: "schedule-3",
        time: "18:00",
        amount: "2.5kg",
        days: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],
    dailyStats: {
      totalFeed: "7.5kg",
      waterConsumption: "15L",
      activeTime: "12 hours",
    },
  },
  "feeder-2": {
    id: "feeder-2",
    name: "South Pasture Feeder",
    location: "South Field",
    status: "active",
    lastFeeding: "1 hour ago",
    nextFeeding: "In 5 hours",
    waterLevel: 90,
    temperature: 22,
    batteryLevel: 95,
    connectivityStrength: 75,
    alerts: [],
    feedingSchedule: [
      {
        id: "schedule-4",
        time: "07:00",
        amount: "2.0kg",
        days: ["Monday", "Wednesday", "Friday"],
      },
      {
        id: "schedule-5",
        time: "13:00",
        amount: "2.0kg",
        days: ["Monday", "Wednesday", "Friday"],
      },
      {
        id: "schedule-6",
        time: "19:00",
        amount: "2.0kg",
        days: ["Monday", "Wednesday", "Friday"],
      },
    ],
    dailyStats: {
      totalFeed: "6.0kg",
      waterConsumption: "12L",
      activeTime: "10 hours",
    },
  },
  "feeder-3": {
    id: "feeder-3",
    name: "East Wing Feeder",
    location: "East Barn",
    status: "maintenance",
    lastFeeding: "3 hours ago",
    nextFeeding: "In 3 hours",
    waterLevel: 60,
    temperature: 25,
    batteryLevel: 45,
    connectivityStrength: 45,
    alerts: [{ id: 1, message: "Battery level critical", severity: "error" }],
    feedingSchedule: [
      {
        id: "schedule-7",
        time: "05:00",
        amount: "3.0kg",
        days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      },
      {
        id: "schedule-8",
        time: "11:00",
        amount: "3.0kg",
        days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      },
      {
        id: "schedule-9",
        time: "17:00",
        amount: "3.0kg",
        days: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      },
    ],
    dailyStats: {
      totalFeed: "9.0kg",
      waterConsumption: "18L",
      activeTime: "14 hours",
    },
  },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FeederPage({ params }: PageProps) {
  const resolvedParams = await params;
  const feeder =
    feedingStations[resolvedParams.id as keyof typeof feedingStations];
  if (!feeder) {
    redirect("/dashboard");
  }

  return <FeederUI feeder={feeder} />;
}
