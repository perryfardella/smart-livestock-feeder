"use client";

import { useEffect, useState } from "react";
import { SensorChart } from "./sensor-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Database } from "lucide-react";
import {
  getSensorDataForChart,
  getSensorDataSummary,
  type SensorDataSummary,
} from "@/lib/actions/sensor-data";

interface SensorDashboardProps {
  deviceId: string;
  feederName: string;
}

interface SensorChartData {
  sensorType: string;
  data: { timestamp: string; value: number }[];
}

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

export function SensorDashboard({
  deviceId,
  feederName,
}: SensorDashboardProps) {
  const [sensorSummary, setSensorSummary] = useState<SensorDataSummary[]>([]);
  const [chartData, setChartData] = useState<SensorChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");

  const getTimeRangeOptions = (range: string) => {
    switch (range) {
      case "1h":
        return { hours: 1, limit: 60 };
      case "6h":
        return { hours: 6, limit: 120 };
      case "24h":
        return { hours: 24, limit: 200 };
      case "7d":
        return { days: 7, limit: 300 };
      default:
        return { hours: 24, limit: 200 };
    }
  };

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

  const loadSensorData = async (showRefreshLoader = false) => {
    if (showRefreshLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Get sensor summary first
      const summary = await getSensorDataSummary(deviceId);
      setSensorSummary(summary);

      // Get chart data for each sensor type
      const timeRangeOptions = getTimeRangeOptions(timeRange);
      const chartPromises = summary.map(async (sensor) => {
        const data = await getSensorDataForChart(
          deviceId,
          sensor.sensor_type,
          timeRangeOptions
        );
        return {
          sensorType: sensor.sensor_type,
          data,
        };
      });

      const charts = await Promise.all(chartPromises);
      setChartData(charts);
    } catch (error) {
      console.error("Error loading sensor data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSensorData();
  }, [deviceId, timeRange]);

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
            <CardTitle className="flex items-center justify-between">
              <span>Sensor Data - {feederName}</span>
              <Button
                onClick={() => loadSensorData(true)}
                size="sm"
                variant="outline"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No sensor data
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No sensor readings found for device ID: {deviceId}
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
          <CardTitle className="flex items-center justify-between">
            <span>Sensor Data - {feederName}</span>
            <div className="flex items-center gap-2">
              {/* Time range selector */}
              <div className="flex border rounded-lg overflow-hidden">
                {(["1h", "6h", "24h", "7d"] as const).map((range) => (
                  <Button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    size="sm"
                    variant={timeRange === range ? "default" : "ghost"}
                    className="rounded-none border-0"
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => loadSensorData(true)}
                size="sm"
                variant="outline"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
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
                  {sensor.latest_value.toLocaleString()}
                  {getSensorUnit(sensor.sensor_type)}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(sensor.latest_timestamp).toLocaleString()}
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
