import { createClient } from "@/lib/supabase/server";
import { IoTDataClient } from "./iot-data-client";

export default async function IoTDataPage() {
  const supabase = await createClient();

  // Fetch initial data on the server
  const { data: initialData, error } = await supabase
    .from("sensor_data")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching sensor data:", error);
  }

  return (
    <div className="container mx-auto py-6">
      <IoTDataClient initialData={initialData || []} />
    </div>
  );
}
