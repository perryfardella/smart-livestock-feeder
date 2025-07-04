import { NextRequest, NextResponse } from "next/server";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { createClient } from "@/lib/supabase/server";
import { requireFeederPermission } from "@/lib/utils/permissions";

// Server-side environment variables (no NEXT_PUBLIC_ prefix)
const AWS_CONFIG = {
  region: process.env.AWS_REGION,
  identityPoolId: process.env.AWS_IDENTITY_POOL_ID,
  iotEndpoint: process.env.AWS_IOT_ENDPOINT,
};

// Validate environment variables
function validateConfig() {
  const missing = Object.entries(AWS_CONFIG)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

// Initialize IoT client
function getIoTClient() {
  validateConfig();

  return new IoTDataPlaneClient({
    region: AWS_CONFIG.region!,
    endpoint: `https://${AWS_CONFIG.iotEndpoint}`,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: AWS_CONFIG.region! },
      identityPoolId: AWS_CONFIG.identityPoolId!,
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, message } = body;

    // Validate input
    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Topic is required and must be a string" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Basic topic validation (ensure it's not empty and contains valid characters)
    if (topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic cannot be empty" },
        { status: 400 }
      );
    }

    // Ensure topic doesn't contain invalid characters for MQTT
    const invalidChars = /[#+\s]/;
    if (invalidChars.test(topic)) {
      return NextResponse.json(
        { error: "Topic contains invalid characters. Avoid +, #, and spaces." },
        { status: 400 }
      );
    }

    // Validate JSON if message looks like JSON
    let parsedMessage;
    if (message.trim().startsWith("{") || message.trim().startsWith("[")) {
      try {
        parsedMessage = JSON.parse(message);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON format in message" },
          { status: 400 }
        );
      }
    }

    // Check for manual feed commands and validate permissions
    if (
      parsedMessage &&
      typeof parsedMessage === "object" &&
      parsedMessage.manualFeedQuantity !== undefined
    ) {
      // Extract device ID from topic (format: "deviceId/writeDataRequest")
      const deviceId = topic.split("/")[0];

      if (!deviceId) {
        return NextResponse.json(
          { error: "Invalid topic format for manual feed" },
          { status: 400 }
        );
      }

      // Find the feeder by device ID
      const { data: feeder, error: feederError } = await supabase
        .from("feeders")
        .select("id")
        .eq("device_id", deviceId)
        .single();

      if (feederError || !feeder) {
        return NextResponse.json(
          { error: "Feeder not found or access denied" },
          { status: 404 }
        );
      }

      // Check if user has manual feed permission
      const permissionCheck = await requireFeederPermission(
        feeder.id,
        "manual_feed_release",
        user.id
      );

      if (!permissionCheck.authorized) {
        return NextResponse.json(
          {
            error: permissionCheck.error || "Permission denied for manual feed",
          },
          { status: 403 }
        );
      }

      // Validate feed amount
      const feedAmount = parseFloat(parsedMessage.manualFeedQuantity);
      if (isNaN(feedAmount) || feedAmount <= 0 || feedAmount > 10) {
        return NextResponse.json(
          { error: "Invalid feed amount. Must be between 0.1 and 10 kg" },
          { status: 400 }
        );
      }
    }

    // Publish message
    const client = getIoTClient();
    await client.send(
      new PublishCommand({
        topic: topic.trim(),
        payload: message,
      })
    );

    return NextResponse.json({
      success: true,
      message: `Message published to topic: ${topic}`,
    });
  } catch (error) {
    console.error("MQTT publish error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Missing environment variables")
    ) {
      return NextResponse.json(
        {
          error:
            "Server configuration error. Please check environment variables.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Test connection endpoint
export async function GET() {
  try {
    const client = getIoTClient();

    // Test with a simple ping message
    await client.send(
      new PublishCommand({
        topic: "test/connection",
        payload: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    return NextResponse.json({
      success: true,
      message: "Connection test successful",
      config: {
        region: AWS_CONFIG.region,
        endpoint: AWS_CONFIG.iotEndpoint,
      },
    });
  } catch (error) {
    console.error("Connection test error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Connection test failed",
      },
      { status: 500 }
    );
  }
}
