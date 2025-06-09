"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SensorChartProps {
  data: { timestamp: string; value: number }[];
  sensorType: string;
  title?: string;
  unit?: string;
  color?: string;
}

export function SensorChart({
  data,
  sensorType,
  title,
  unit = "",
  color = "#3b82f6",
}: SensorChartProps) {
  // Format data for Recharts
  const chartData = data.map((point) => ({
    timestamp: point.timestamp,
    value: point.value,
    formattedTime: format(parseISO(point.timestamp), "HH:mm"),
    fullTime: format(parseISO(point.timestamp), "dd/MM/yyyy HH:mm:ss"),
  }));

  const formatSensorType = (type: string) => {
    // Convert sensor type to a more readable format
    return (
      type
        .split(".")
        .pop()
        ?.replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim() || type
    );
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: { fullTime: string; value: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{`${value}${
            unit ? ` ${unit}` : ""
          }`}</p>
          <p className="text-xs text-gray-600">{data.fullTime}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {title || formatSensorType(sensorType)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available for this sensor
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestValue = data[data.length - 1]?.value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title || formatSensorType(sensorType)}</span>
          <span className="text-2xl font-bold" style={{ color }}>
            {latestValue?.toLocaleString()}
            {unit ? ` ${unit}` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="formattedTime"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                domain={["dataMin - 5", "dataMax + 5"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
