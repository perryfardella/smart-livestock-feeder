import { NextRequest, NextResponse } from "next/server";
import { fixMembershipPermissions } from "@/lib/actions/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const feederId = (await params).id;

    console.log(`🏥 Running permission health check for feeder: ${feederId}`);

    const result = await fixMembershipPermissions(feederId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Permission health check completed",
      results: result.results,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Health check API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
