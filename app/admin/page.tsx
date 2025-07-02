import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isCurrentUserAdmin,
  getCommissionedFeeders,
} from "@/lib/actions/commissioned-feeders";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommissionFeederForm } from "./commission-feeder-form";
import { CommissionedFeedersTable } from "./commissioned-feeders-table";

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

  // Get commissioned feeders
  const commissionedFeeders = await getCommissionedFeeders();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage commissioned feeder devices and system administration
        </p>
      </div>

      <div className="grid gap-6">
        {/* Commission New Feeders Card */}
        <Card>
          <CardHeader>
            <CardTitle>Commission New Feeders</CardTitle>
            <CardDescription>
              Add new device IDs to the system once feeders have been
              manufactured and commissioned. Only commissioned device IDs can be
              used by users to create feeders.
              <br />
              <strong>Testing Mode:</strong> Multiple users can currently
              connect to the same device ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionFeederForm />
          </CardContent>
        </Card>

        {/* Commissioned Feeders List */}
        <Card>
          <CardHeader>
            <CardTitle>Commissioned Feeders</CardTitle>
            <CardDescription>
              View and manage all commissioned feeder devices in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionedFeedersTable feeders={commissionedFeeders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
