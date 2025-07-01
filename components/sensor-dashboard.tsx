"use client";

import { useEffect, useState, useCallback } from "react";
import { SensorChart } from "./sensor-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Database } from "lucide-react";
import {
  getAllSensorDataUnfiltered,
  type SensorDataSummary,
} from "@/lib/actions/sensor-data";
import { format } from "date-fns";

interface SensorDashboardProps {
  deviceId: string;
  feederName: string;
}

interface SensorChartData {
  sensorType: string;
  data: { timestamp: string; value: number }[];
}

// Raw sensor data interface for caching
interface RawSensorData {
  sensor_type: string;
  sensor_value: number;
  timestamp: string;
}

// Time period types with better naming
type TimePeriod = "daily" | "weekly" | "monthly" | "all-time";

// Predefined colors for different sensor types
const SENSOR_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // yellow
  "#8b5cf6", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ec4899", // pink
  "#6b7280", // gray
];

// Sensor type to unit mapping
const SENSOR_UNITS: Record<string, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "hPa",
  voltage: "V",
  current: "A",
  power: "W",
  battery: "%",
  soc: "%",
  level: "%",
  speed: "rpm",
  flow: "L/min",
  weight: "kg",
  distance: "cm",
  ph: "pH",
  tds: "ppm",
};

// Time period configuration
const TIME_PERIOD_CONFIG: Record<
  TimePeriod,
  { label: string; hours?: number; days?: number; limit: number }
> = {
  daily: { label: "Daily", hours: 24, limit: 200 },
  weekly: { label: "Weekly", days: 7, limit: 300 },
  monthly: { label: "Monthly", days: 30, limit: 500 },
  "all-time": { label: "All Time", limit: 1000 },
};

// Client-side filtering functions
const filterDataByTimeRange = (
  data: RawSensorData[],
  timeRange: TimePeriod
): RawSensorData[] => {
  if (timeRange === "all-time") {
    return data;
  }

  const config = TIME_PERIOD_CONFIG[timeRange];
  const now = Date.now();
  let cutoffTime: number;

  if (config.hours) {
    cutoffTime = now - config.hours * 60 * 60 * 1000;
  } else if (config.days) {
    cutoffTime = now - config.days * 24 * 60 * 60 * 1000;
  } else {
    return data;
  }

  return data.filter(
    (reading) => new Date(reading.timestamp).getTime() >= cutoffTime
  );
};

const processFilteredData = (
  filteredData: RawSensorData[],
  timeRange: TimePeriod
): {
  summary: SensorDataSummary[];
  chartData: SensorChartData[];
} => {
  if (filteredData.length === 0) {
    return { summary: [], chartData: [] };
  }

  // Group by sensor type
  const sensorGroups = filteredData.reduce((acc, reading) => {
    if (!acc[reading.sensor_type]) {
      acc[reading.sensor_type] = [];
    }
    acc[reading.sensor_type].push(reading);
    return acc;
  }, {} as Record<string, RawSensorData[]>);

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
  const limit = TIME_PERIOD_CONFIG[timeRange].limit;
  const chartData = Object.entries(sensorGroups).map(
    ([sensorType, readings]) => {
      const sortedReadings = readings
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .slice(0, limit);

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
};

export function SensorDashboard({
  deviceId,
  feederName,
}: SensorDashboardProps) {
  // Cached raw data from database
  const [rawSensorData, setRawSensorData] = useState<RawSensorData[]>([]);
  const [sensorSummary, setSensorSummary] = useState<SensorDataSummary[]>([]);
  const [chartData, setChartData] = useState<SensorChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimePeriod>("all-time"); // Default to all-time

  const getSensorUnit = (sensorType: string): string => {
    const lowerType = sensorType.toLowerCase();

    // Check for exact matches first
    for (const [key, unit] of Object.entries(SENSOR_UNITS)) {
      if (lowerType.includes(key)) {
        return unit;
      }
    }

    return "";
  };

  // Load all sensor data once from database
  const loadAllSensorData = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getAllSensorDataUnfiltered(deviceId, 2000);
      setRawSensorData(data);
    } catch (error) {
      console.error("Error loading sensor data:", error);
      // Silently handle errors on automatic refresh to avoid spamming users
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Process cached data when timeRange changes (instant, no DB call)
  useEffect(() => {
    if (rawSensorData.length > 0) {
      const filteredData = filterDataByTimeRange(rawSensorData, timeRange);
      const processed = processFilteredData(filteredData, timeRange);
      setSensorSummary(processed.summary);
      setChartData(processed.chartData);
    } else {
      setSensorSummary([]);
      setChartData([]);
    }
  }, [rawSensorData, timeRange]);

  // Load data on mount and set up periodic refresh
  useEffect(() => {
    loadAllSensorData();

    // Set up automatic polling every 2 minutes for fresh sensor data
    const interval = setInterval(() => {
      // Only update if the page is visible to avoid unnecessary requests
      if (!document.hidden) {
        loadAllSensorData();
      }
    }, 120000); // 2 minutes = 120,000ms

    // Also refresh when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAllSensorData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadAllSensorData]);

  const formatSensorType = (type: string) => {
    return (
      type
        .split(".")
        .pop()
        ?.replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim() || type
    );
  };

  // Helper function to get timeframe description for no data message
  const getTimeframeDescription = (range: TimePeriod): string => {
    switch (range) {
      case "daily":
        return "last day";
      case "weekly":
        return "last week";
      case "monthly":
        return "last month";
      case "all-time":
        return "any timeframe";
      default:
        return "selected timeframe";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Database className="mx-auto h-8 w-8 text-gray-400 animate-pulse" />
                <p className="mt-2 text-gray-600">Loading sensor data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sensorSummary.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>Sensor Data - {feederName}</span>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {/* Time range selector - available even when no data */}
                <div className="flex flex-wrap gap-1 border rounded-lg p-1">
                  {(Object.keys(TIME_PERIOD_CONFIG) as TimePeriod[]).map(
                    (range) => (
                      <Button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        size="sm"
                        variant={timeRange === range ? "default" : "ghost"}
                        className="rounded-md text-xs"
                      >
                        {TIME_PERIOD_CONFIG[range].label}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No sensor data found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No sensor readings found for the{" "}
                {getTimeframeDescription(timeRange)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>Sensor Data - {feederName}</span>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {/* Time range selector */}
              <div className="flex flex-wrap gap-1 border rounded-lg p-1">
                {(Object.keys(TIME_PERIOD_CONFIG) as TimePeriod[]).map(
                  (range) => (
                    <Button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      size="sm"
                      variant={timeRange === range ? "default" : "ghost"}
                      className="rounded-md text-xs"
                    >
                      {TIME_PERIOD_CONFIG[range].label}
                    </Button>
                  )
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sensorSummary.map((sensor) => (
              <div
                key={sensor.sensor_type}
                className="bg-gray-50 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {formatSensorType(sensor.sensor_type)}
                  </span>
                </div>
                <p className="text-lg font-bold">
                  {sensor.latest_value.toFixed(2).replace(/\.?0+$/, "")}
                  {getSensorUnit(sensor.sensor_type)}
                </p>
                <p className="text-xs text-gray-600">
                  {format(
                    new Date(sensor.latest_timestamp),
                    "MMM d, yyyy h:mm a"
                  )}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartData.map((chart, index) => (
          <SensorChart
            key={chart.sensorType}
            data={chart.data}
            sensorType={chart.sensorType}
            unit={getSensorUnit(chart.sensorType)}
            color={SENSOR_COLORS[index % SENSOR_COLORS.length]}
          />
        ))}
      </div>
    </div>
  );
}
