"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SensorData } from "./types";

interface IoTDataClientProps {
  initialData: SensorData[];
}

export function IoTDataClient({ initialData }: IoTDataClientProps) {
  const [sensorData, setSensorData] = useState<SensorData[]>(initialData);
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel("sensor_data_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_data",
        },
        (payload) => {
          setSensorData((current) => [payload.new as SensorData, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>IoT Sensor Data</CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time sensor readings from connected devices
        </p>
      </CardHeader>
      <CardContent>
        {sensorData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sensor data available yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Sensor Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensorData.map((data) => (
                <TableRow key={data.id}>
                  <TableCell className="font-mono">{data.device_id}</TableCell>
                  <TableCell>{data.sensor_type}</TableCell>
                  <TableCell className="text-right font-mono">
                    {data.sensor_value.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(data.timestamp).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
