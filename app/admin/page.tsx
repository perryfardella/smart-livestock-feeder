import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isCurrentUserAdmin,
  getCommissionedFeeders,
} from "@/lib/actions/commissioned-feeders";
import { getAdminUsers } from "@/lib/actions/admin-users";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommissionFeederForm } from "./commission-feeder-form";
import { CommissionedFeedersTable } from "./commissioned-feeders-table";
import { AddAdminForm } from "./add-admin-form";
import { AdminUsersTable } from "./admin-users-table";

export default async function AdminPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Get commissioned feeders and admin users
  const commissionedFeeders = await getCommissionedFeeders();
  const adminUsers = await getAdminUsers();

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Manage commissioned feeder devices and system administration
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Admin User Management Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">
                Admin User Management
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Add or remove admin privileges for users. Admin users can access
                this dashboard, commission feeders, and manage other admin
                users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
                <div className="order-2 lg:order-1">
                  <AddAdminForm />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="lg:pl-4">
                    <h3 className="text-base sm:text-lg font-semibold mb-4">
                      Current Admin Users
                    </h3>
                    <AdminUsersTable
                      users={adminUsers}
                      currentUserEmail={user.email}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission New Feeders Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">
                Commission New Feeders
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Add new device IDs to the system once feeders have been
                manufactured and commissioned. Only commissioned device IDs can
                be used by users to create feeders. Each device ID can only be
                owned by one user at a time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionFeederForm />
            </CardContent>
          </Card>

          {/* Commissioned Feeders List */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">
                Commissioned Feeders
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                View and manage all commissioned feeder devices in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommissionedFeedersTable feeders={commissionedFeeders} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
