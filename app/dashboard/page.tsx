import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Settings,
  Crown,
  Users,
  Eye,
  Calendar,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { FeederForm } from "./feeder/[id]/feeder-form";
import {
  getUserFeeders,
  getUserFeedersWithStatusDB,
} from "@/lib/actions/feeders";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { format } from "date-fns";
import { Suspense } from "react";

// Helper function to get role styling and icon
function getRoleDisplay(userRole?: string, isOwner?: boolean) {
  if (isOwner || userRole === "owner") {
    return {
      icon: Crown,
      label: "Owner",
      className:
        "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border border-purple-200 shadow-sm",
    };
  }

  switch (userRole) {
    case "manager":
      return {
        icon: UserCog,
        label: "Manager",
        className:
          "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200 shadow-sm",
      };
    case "scheduler":
      return {
        icon: Calendar,
        label: "Scheduler",
        className:
          "bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200 shadow-sm",
      };
    case "viewer":
      return {
        icon: Eye,
        label: "Viewer",
        className:
          "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 border border-slate-200 shadow-sm",
      };
    default:
      return {
        icon: Users,
        label: "Member",
        className:
          "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border border-gray-200 shadow-sm",
      };
  }
}

// Performance comparison component
async function OptimizedFeedersList() {
  // This uses the ultra-fast database function approach
  const feedersWithStatus = await getUserFeedersWithStatusDB();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {feedersWithStatus.map((feeder) => {
        const roleDisplay = getRoleDisplay(feeder.user_role, feeder.is_owner);
        const RoleIcon = roleDisplay.icon;

        return (
          <Link href={`/dashboard/feeder/${feeder.device_id}`} key={feeder.id}>
            <Card className="h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 shadow-md">
              <div className="p-6">
                {/* Header with title and status badges */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-semibold leading-tight">
                      {feeder.name}
                    </h2>
                    <ConnectionStatus status={feeder.status.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {feeder.location || "No location set"}
                    </p>
                    <Badge
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${roleDisplay.className}`}
                    >
                      <RoleIcon className="h-3.5 w-3.5" />
                      {roleDisplay.label}
                    </Badge>
                  </div>
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
                        <span className="text-sm text-gray-600">Last Comm</span>
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
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  // Fetch user's feeders immediately (fast query)
  const feeders = await getUserFeeders();

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
        /* Use the ultra-optimized approach - loads everything server-side with single query */
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {feeders.map((feeder) => (
                <Card key={feeder.id} className="h-full border-0 shadow-md">
                  <div className="p-6">
                    {/* Header with title and status badges */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-xl font-semibold leading-tight">
                          {feeder.name}
                        </h2>
                        <ConnectionStatus status="offline" size="sm" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {feeder.location || "No location set"}
                        </p>
                        <Badge className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border border-gray-200 shadow-sm animate-pulse">
                          <Users className="h-3.5 w-3.5" />
                          Loading...
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-blue-500" />
                          <span className="text-sm text-gray-600">
                            Device ID
                          </span>
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
                      {feeder.description && (
                        <div className="text-sm text-gray-600">
                          {feeder.description}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          }
        >
          <OptimizedFeedersList />
        </Suspense>
      )}
    </>
  );
}
