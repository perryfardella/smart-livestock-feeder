import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
  Clock,
  Droplet,
  Battery,
  AlertCircle,
  ArrowRight,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { FeederForm } from "./feeder/[id]/feeder-form";

// Sample data - In real implementation, this would come from your database
const feedingStations = [
  {
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
  },
  {
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
  },
  {
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
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Smart Livestock Dashboard
        </h1>
        <FeederForm
          mode="create"
          onSubmit={async (data) => {
            "use server";
            // In a real implementation, this would save to your database
            console.log("New feeder:", data);
          }}
        />
      </div>

      {/* Feeding Stations Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {feedingStations.map((station) => (
          <Link href={`/dashboard/feeder/${station.id}`} key={station.id}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{station.name}</h2>
                    <p className="text-sm text-gray-600">{station.location}</p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-sm ${
                      station.status === "active"
                        ? "bg-green-100 text-green-800"
                        : station.status === "maintenance"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {station.status.charAt(0).toUpperCase() +
                      station.status.slice(1)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        Next Feeding
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {station.nextFeeding}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-600">Water Level</span>
                    </div>
                    <span className="text-sm font-medium">
                      {station.waterLevel}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Battery className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-600">Battery</span>
                    </div>
                    <span className="text-sm font-medium">
                      {station.batteryLevel}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-5 w-5 text-purple-500" />
                      <span className="text-sm text-gray-600">
                        Connectivity
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {station.connectivityStrength}%
                    </span>
                  </div>

                  <div className="min-h-[2.5rem]">
                    {station.alerts.length > 0 && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          {station.alerts.length} alert
                          {station.alerts.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end text-blue-600">
                    <span className="text-sm font-medium">View Details</span>
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
