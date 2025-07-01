"use client";

import { Card } from "@/components/ui/card";
import { Clock, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { type Feeder } from "@/lib/actions/feeders";
import { getFeederConnectionStatus } from "@/lib/actions/sensor-data";
import { getFeederStatus, type FeederStatus } from "@/lib/utils/feeder-status";

interface FeederCardWithStatusProps {
  feeder: Feeder;
}

export function FeederCardWithStatus({ feeder }: FeederCardWithStatusProps) {
  const [status, setStatus] = useState<FeederStatus>({
    status: "offline",
    isOnline: false,
    lastCommunication: null,
    displayText: "Loading...",
    colorClass: "bg-gray-100 text-gray-800",
    iconType: "offline",
  });

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const connectionStatus = await getFeederConnectionStatus(
          feeder.device_id
        );
        const feederStatus = getFeederStatus(
          connectionStatus.lastCommunication
        );

        if (mounted) {
          setStatus(feederStatus);
        }
      } catch (error) {
        console.error(`Error loading status for feeder ${feeder.id}:`, error);
        if (mounted) {
          setStatus(getFeederStatus(null));
        }
      }
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, [feeder.device_id, feeder.id]);

  return (
    <Link href={`/dashboard/feeder/${feeder.device_id}`}>
      <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{feeder.name}</h2>
              <p className="text-sm text-gray-600">
                {feeder.location || "No location set"}
              </p>
            </div>
            <ConnectionStatus status={status.status} size="sm" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-600">Device ID</span>
              </div>
              <span className="text-sm font-medium font-mono">
                {feeder.device_id}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-gray-600">Added</span>
              </div>
              <span className="text-sm font-medium">
                {format(new Date(feeder.created_at), "MMM d, yyyy")}
              </span>
            </div>

            {status.lastCommunication && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-gray-600">Last Comm</span>
                </div>
                <span className="text-sm font-medium">
                  {format(new Date(status.lastCommunication), "MMM d, yyyy")}
                </span>
              </div>
            )}

            {feeder.description && (
              <div className="text-sm text-gray-600">{feeder.description}</div>
            )}

            <div className="mt-4 flex items-center justify-end text-blue-600">
              <span className="text-sm font-medium">View Details</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
