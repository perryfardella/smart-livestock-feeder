"use server";

import { createClient } from "@/lib/supabase/server";

export interface SensorReading {
  id: number;
  device_id: string;
  sensor_type: string;
  sensor_value: number;
  timestamp: string;
  created_at: string;
}

export interface SensorDataSummary {
  sensor_type: string;
  latest_value: number;
  latest_timestamp: string;
  readings_count: number;
}

export interface TimeRangeOptions {
  hours?: number;
  days?: number;
  limit?: number;
}

export async function getSensorDataForDevice(
  deviceId: string,
  timeRange: TimeRangeOptions = { hours: 24, limit: 1000 }
): Promise<SensorReading[]> {
  const supabase = await createClient();

  let timeFilter = "";
  if (timeRange.hours) {
    timeFilter = `timestamp >= now() - interval '${timeRange.hours} hours'`;
  } else if (timeRange.days) {
    timeFilter = `timestamp >= now() - interval '${timeRange.days} days'`;
  }

  let query = supabase
    .from("sensor_data")
    .select("*")
    .eq("device_id", deviceId)
    .order("timestamp", { ascending: false });

  if (timeFilter) {
    query = query.gte(
      "timestamp",
      new Date(
        Date.now() - (timeRange.hours || 0) * 60 * 60 * 1000
      ).toISOString()
    );
  }

  if (timeRange.limit) {
    query = query.limit(timeRange.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching sensor data:", error);
    throw new Error("Failed to fetch sensor data");
  }

  return data || [];
}

export async function getSensorTypesForDevice(
  deviceId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sensor_data")
    .select("sensor_type")
    .eq("device_id", deviceId)
    .order("sensor_type")
    .limit(1000);

  if (error) {
    console.error("Error fetching sensor types:", error);
    throw new Error("Failed to fetch sensor types");
  }

  // Get unique sensor types
  const uniqueTypes = [...new Set(data?.map((item) => item.sensor_type) || [])];
  return uniqueTypes;
}

export async function getSensorDataSummary(
  deviceId: string
): Promise<SensorDataSummary[]> {
  const supabase = await createClient();

  // Get the latest reading for each sensor type
  const { data, error } = await supabase
    .from("sensor_data")
    .select("sensor_type, sensor_value, timestamp")
    .eq("device_id", deviceId)
    .order("timestamp", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching sensor summary:", error);
    throw new Error("Failed to fetch sensor summary");
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by sensor type and get latest for each
  const sensorGroups = data.reduce((acc, reading) => {
    if (!acc[reading.sensor_type]) {
      acc[reading.sensor_type] = [];
    }
    acc[reading.sensor_type].push(reading);
    return acc;
  }, {} as Record<string, typeof data>);

  const summary: SensorDataSummary[] = Object.entries(sensorGroups).map(
    ([sensorType, readings]) => {
      // Sort by timestamp descending to get latest
      const sortedReadings = readings.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const latest = sortedReadings[0];

      return {
        sensor_type: sensorType,
        latest_value: latest.sensor_value,
        latest_timestamp: latest.timestamp,
        readings_count: readings.length,
      };
    }
  );

  return summary;
}

export async function getSensorDataForChart(
  deviceId: string,
  sensorType: string,
  timeRange: TimeRangeOptions = { hours: 24, limit: 100 }
): Promise<{ timestamp: string; value: number }[]> {
  const supabase = await createClient();

  let query = supabase
    .from("sensor_data")
    .select("sensor_value, timestamp")
    .eq("device_id", deviceId)
    .eq("sensor_type", sensorType)
    .order("timestamp", { ascending: true });

  if (timeRange.hours) {
    const startTime = new Date(
      Date.now() - timeRange.hours * 60 * 60 * 1000
    ).toISOString();
    query = query.gte("timestamp", startTime);
  } else if (timeRange.days) {
    const startTime = new Date(
      Date.now() - timeRange.days * 24 * 60 * 60 * 1000
    ).toISOString();
    query = query.gte("timestamp", startTime);
  }

  if (timeRange.limit) {
    query = query.limit(timeRange.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching chart data:", error);
    throw new Error("Failed to fetch chart data");
  }

  return (data || []).map((item) => ({
    timestamp: item.timestamp,
    value: item.sensor_value,
  }));
}
