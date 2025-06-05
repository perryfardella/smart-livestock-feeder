import { createClient } from "@/lib/supabase/server";
import { IoTDataClient } from "./iot-data-client";

export const metadata = {
  title: "IoT Data Dashboard",
  description: "Real-time sensor data from connected IoT devices",
};

export default async function IoTDataPage() {
  const supabase = await createClient();

  // Fetch initial data on the server with specific columns
  const { data: initialData, error } = await supabase
    .from("sensor_data")
    .select("id, device_id, sensor_type, sensor_value, timestamp, created_at")
    .order("timestamp", { ascending: false })
    .limit(50); // Limit initial load for better performance

  if (error) {
    console.error("Error fetching sensor data:", error);
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Error Loading Data
          </h1>
          <p className="text-muted-foreground mt-2">
            Unable to fetch sensor data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">IoT Data Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor real-time sensor data from your connected devices
        </p>
      </div>
      <IoTDataClient initialData={initialData || []} />
    </div>
  );
}
