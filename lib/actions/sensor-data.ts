"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isFeederOnline,
  type FeederConnectionStatus,
} from "@/lib/utils/feeder-status";

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

export async function getLastCommunicationTime(
  deviceId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sensor_data")
    .select("timestamp")
    .eq("device_id", deviceId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.timestamp;
}

export async function getFeederConnectionStatus(
  deviceId: string
): Promise<FeederConnectionStatus> {
  const lastCommunication = await getLastCommunicationTime(deviceId);
  const isOnline = isFeederOnline(lastCommunication);

  return {
    isOnline,
    lastCommunication,
  };
}

// Optimized function to get connection status for multiple feeders at once
export async function getBatchFeederConnectionStatus(
  deviceIds: string[]
): Promise<Map<string, FeederConnectionStatus>> {
  if (deviceIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  // Get the latest sensor data for all devices in a single query
  const { data, error } = await supabase
    .from("sensor_data")
    .select("device_id, timestamp")
    .in("device_id", deviceIds)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching batch connection status:", error);
    // Return default offline status for all devices
    const result = new Map<string, FeederConnectionStatus>();
    deviceIds.forEach((deviceId) => {
      result.set(deviceId, { isOnline: false, lastCommunication: null });
    });
    return result;
  }

  // Group by device_id and find the latest timestamp for each
  const deviceLastComm = new Map<string, string>();

  data?.forEach((reading) => {
    const current = deviceLastComm.get(reading.device_id);
    if (!current || new Date(reading.timestamp) > new Date(current)) {
      deviceLastComm.set(reading.device_id, reading.timestamp);
    }
  });

  // Create the result map with connection status for each device
  const result = new Map<string, FeederConnectionStatus>();
  deviceIds.forEach((deviceId) => {
    const lastCommunication = deviceLastComm.get(deviceId) || null;
    const isOnline = isFeederOnline(lastCommunication);
    result.set(deviceId, { isOnline, lastCommunication });
  });

  return result;
}

export async function getAllSensorDataOptimized(
  deviceId: string,
  timeRange: TimeRangeOptions = { hours: 24, limit: 200 }
): Promise<{
  summary: SensorDataSummary[];
  chartData: {
    sensorType: string;
    data: { timestamp: string; value: number }[];
  }[];
}> {
  const supabase = await createClient();

  // Get all sensor data in one query with time filtering
  let query = supabase
    .from("sensor_data")
    .select("sensor_type, sensor_value, timestamp")
    .eq("device_id", deviceId)
    .order("timestamp", { ascending: false });

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
    query = query.limit(timeRange.limit * 10); // Get more data for multiple sensor types
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching optimized sensor data:", error);
    throw new Error("Failed to fetch sensor data");
  }

  if (!data || data.length === 0) {
    return { summary: [], chartData: [] };
  }

  // Group by sensor type
  const sensorGroups = data.reduce((acc, reading) => {
    if (!acc[reading.sensor_type]) {
      acc[reading.sensor_type] = [];
    }
    acc[reading.sensor_type].push(reading);
    return acc;
  }, {} as Record<string, typeof data>);

  // Create summary
  const summary: SensorDataSummary[] = Object.entries(sensorGroups).map(
    ([sensorType, readings]) => {
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

  // Create chart data (limit per sensor type)
  const chartData = Object.entries(sensorGroups).map(
    ([sensorType, readings]) => {
      const sortedReadings = readings
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .slice(0, timeRange.limit || 200);

      return {
        sensorType,
        data: sortedReadings.map((item) => ({
          timestamp: item.timestamp,
          value: item.sensor_value,
        })),
      };
    }
  );

  return { summary, chartData };
}

export async function getAllSensorDataUnfiltered(
  deviceId: string,
  limit: number = 2000
): Promise<
  {
    sensor_type: string;
    sensor_value: number;
    timestamp: string;
  }[]
> {
  const supabase = await createClient();

  // Get all sensor data without time filtering - we'll filter client-side
  const { data, error } = await supabase
    .from("sensor_data")
    .select("sensor_type, sensor_value, timestamp")
    .eq("device_id", deviceId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching all sensor data:", error);
    throw new Error("Failed to fetch sensor data");
  }

  return data || [];
}
