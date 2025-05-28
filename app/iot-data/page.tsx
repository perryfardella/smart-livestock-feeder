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

type SensorData = {
  id: number;
  topic: string;
  sensor: string;
  value: number;
  timestamp: string;
};

export default function IoTDataPage() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("sensor_data")
          .select("*")
          .order("timestamp", { ascending: false });

        if (error) throw error;
        setSensorData(data || []);
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

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
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>IoT Sensor Data</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Sensor</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sensorData.map((data) => (
                  <TableRow key={data.id}>
                    <TableCell>{data.topic}</TableCell>
                    <TableCell>{data.sensor}</TableCell>
                    <TableCell>{data.value}</TableCell>
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
    </div>
  );
}
