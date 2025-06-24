import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Clock, ArrowRight, Settings } from "lucide-react";
import Link from "next/link";
import { FeederForm } from "./feeder/[id]/feeder-form";
import { getUserFeedersWithStatus } from "@/lib/actions/feeders";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { format } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  // Fetch user's feeders with status from the database
  const feeders = await getUserFeedersWithStatus();

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Smart Livestock Dashboard
        </h1>
        <FeederForm mode="create" />
      </div>

      {/* Show empty state if no feeders */}
      {feeders.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              No feeders
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first feeder to the system.
            </p>
            <div className="mt-6">
              <FeederForm mode="create" />
            </div>
          </div>
        </div>
      ) : (
        /* Feeding Stations Grid */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {feeders.map((feeder) => (
            <Link
              href={`/dashboard/feeder/${feeder.device_id}`}
              key={feeder.id}
            >
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{feeder.name}</h2>
                      <p className="text-sm text-gray-600">
                        {feeder.location || "No location set"}
                      </p>
                    </div>
                    <ConnectionStatus status={feeder.status.status} size="sm" />
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

                    {feeder.status.lastCommunication && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-500" />
                          <span className="text-sm text-gray-600">
                            Last Comm
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {format(
                            new Date(feeder.status.lastCommunication),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                    )}

                    {feeder.description && (
                      <div className="text-sm text-gray-600">
                        {feeder.description}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-end text-blue-600">
                      <span className="text-sm font-medium">View Details</span>
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
