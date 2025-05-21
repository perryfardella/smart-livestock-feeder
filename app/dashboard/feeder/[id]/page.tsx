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
      { time: "06:00", amount: "2.5kg" },
      { time: "12:00", amount: "2.5kg" },
      { time: "18:00", amount: "2.5kg" },
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
      { time: "07:00", amount: "2.0kg" },
      { time: "13:00", amount: "2.0kg" },
      { time: "19:00", amount: "2.0kg" },
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
      { time: "05:00", amount: "3.0kg" },
      { time: "11:00", amount: "3.0kg" },
      { time: "17:00", amount: "3.0kg" },
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
