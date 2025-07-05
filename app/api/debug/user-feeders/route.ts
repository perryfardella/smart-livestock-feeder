import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log(
      `🔍 Debug: Checking feeders for user ${user.id} (${user.email})`
    );

    // Check owned feeders
    const { data: ownedFeeders, error: ownedError } = await supabase
      .from("feeders")
      .select("*")
      .eq("user_id", user.id);

    console.log(`📊 Owned feeders:`, ownedFeeders?.length || 0);

    // Check memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from("feeder_memberships")
      .select("*, feeders(*)")
      .eq("user_id", user.id);

    console.log(`👥 Memberships:`, memberships?.length || 0);
    memberships?.forEach((m, i) => {
      console.log(
        `  ${i + 1}. Feeder: ${m.feeders?.name || "Unknown"}, Status: ${m.status}, Role: ${m.role}`
      );
    });

    // Check invitations
    const { data: invitations, error: invitationsError } = await supabase
      .from("feeder_invitations")
      .select("*, feeders(*)")
      .eq("invitee_email", user.email);

    console.log(`📩 Invitations:`, invitations?.length || 0);
    invitations?.forEach((inv, i) => {
      console.log(
        `  ${i + 1}. Feeder: ${inv.feeders?.name || "Unknown"}, Status: ${inv.status}, Role: ${inv.role}`
      );
    });

    // Test the RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "get_user_feeders_with_status"
    );

    console.log(`🔧 RPC Result:`, rpcResult?.length || 0);
    console.log(`RPC Error:`, rpcError);

    // Test direct feeder query (should be filtered by RLS)
    const { data: allAccessibleFeeders, error: accessError } = await supabase
      .from("feeders")
      .select("*");

    console.log(`🔐 RLS Filtered feeders:`, allAccessibleFeeders?.length || 0);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      ownedFeeders: ownedFeeders || [],
      memberships: memberships || [],
      invitations: invitations || [],
      rpcResult: rpcResult || [],
      allAccessibleFeeders: allAccessibleFeeders || [],
      errors: {
        ownedError,
        membershipsError,
        invitationsError,
        rpcError,
        accessError,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
