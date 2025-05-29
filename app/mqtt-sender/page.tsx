"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Wifi, WifiOff, AlertTriangle } from "lucide-react";

export default function MqttSenderPage() {
  const [topic, setTopic] = useState("livestock/feeder/command");
  const [message, setMessage] = useState('{"action": "feed", "amount": 100}');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [awsConfig, setAwsConfig] = useState<{
    region: string;
    endpoint: string;
  } | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  // Test server configuration on component mount
  useEffect(() => {
    testServerConfig();
  }, []);

  const testServerConfig = async () => {
    try {
      const response = await fetch("/api/mqtt/publish", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();
        setAwsConfig({
          region: data.config.region,
          endpoint: data.config.endpoint,
        });
        setConfigError(null);
      } else {
        const errorData = await response.json();
        setConfigError(errorData.error || "Server configuration error");
      }
    } catch (error) {
      console.error("Server config test failed:", error);
      setConfigError(
        "Failed to connect to server. Please check if the development server is running."
      );
    }
  };

  const testConnection = async () => {
    if (configError) {
      setStatus({
        type: "error",
        message: "Cannot test connection: Server configuration is incomplete",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "info", message: "Testing connection..." });

    try {
      const response = await fetch("/api/mqtt/publish", {
        method: "GET",
      });

      if (response.ok) {
        setIsConnected(true);
        setStatus({
          type: "success",
          message: "Successfully connected to AWS IoT Core!",
        });
      } else {
        const errorData = await response.json();
        setIsConnected(false);
        setStatus({
          type: "error",
          message: `Connection failed: ${errorData.error}`,
        });
      }
    } catch (error) {
      setIsConnected(false);
      setStatus({
        type: "error",
        message: `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const publishMessage = async () => {
    if (configError) {
      setStatus({
        type: "error",
        message: "Cannot publish message: Server configuration is incomplete",
      });
      return;
    }

    if (!topic.trim()) {
      setStatus({ type: "error", message: "Please enter a topic" });
      return;
    }

    if (!message.trim()) {
      setStatus({ type: "error", message: "Please enter a message" });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "info", message: "Publishing message..." });

    try {
      const response = await fetch("/api/mqtt/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          message: message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: data.message,
        });
      } else {
        setStatus({
          type: "error",
          message: data.error || "Failed to publish message",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Failed to publish message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = () => {
    try {
      if (message.trim().startsWith("{") || message.trim().startsWith("[")) {
        const parsed = JSON.parse(message);
        setMessage(JSON.stringify(parsed, null, 2));
      }
    } catch {
      // Ignore formatting errors
    }
  };

  // Show configuration error if server configuration is missing
  if (configError) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MQTT Message Publisher</h1>
          <p className="text-muted-foreground">
            Send MQTT messages to your AWS IoT Core broker for livestock feeder
            control
          </p>
        </div>

        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Configuration Error:</strong> {configError}
          </AlertDescription>
        </Alert>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Required Environment Variables</CardTitle>
            <CardDescription>
              Add these variables to your .env.local file (server-side, no
              NEXT_PUBLIC_ prefix):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm bg-gray-100 p-4 rounded-md">
              <div>AWS_REGION=your-aws-region</div>
              <div>AWS_IDENTITY_POOL_ID=your-identity-pool-id</div>
              <div>AWS_IOT_ENDPOINT=your-iot-endpoint</div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              After adding these variables, restart your development server.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔒 Security Improvement</CardTitle>
            <CardDescription>
              This application now uses server-side API routes for better
              security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                ✅ <strong>AWS credentials stay on server</strong> - Not exposed
                to client
              </p>
              <p>
                ✅ <strong>Topic validation</strong> - Only allowed topics can
                be published to
              </p>
              <p>
                ✅ <strong>Input validation</strong> - Server validates all
                inputs
              </p>
              <p>
                ✅ <strong>Error handling</strong> - Proper error responses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MQTT Message Publisher</h1>
        <p className="text-muted-foreground">
          Send MQTT messages to your AWS IoT Core broker for livestock feeder
          control
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>
              Test your connection to AWS IoT Core
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <p>
                  <strong>Region:</strong> {awsConfig?.region}
                </p>
                <p>
                  <strong>Endpoint:</strong> {awsConfig?.endpoint}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className={`ml-2 ${
                      isConnected ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </p>
              </div>
              <Button
                onClick={testConnection}
                disabled={isLoading || !!configError}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Publisher Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Publish Message
            </CardTitle>
            <CardDescription>
              Send commands to your livestock feeder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTopic(e.target.value)
                  }
                  placeholder="livestock/feeder/command"
                  disabled={!!configError}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Message</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={formatMessage}
                    disabled={!!configError}
                  >
                    Format JSON
                  </Button>
                </div>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMessage(e.target.value)
                  }
                  placeholder='{"action": "feed", "amount": 100}'
                  rows={6}
                  disabled={!!configError}
                />
              </div>

              <Button
                onClick={publishMessage}
                disabled={isLoading || !!configError}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Publish Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {status.type && (
        <Alert
          className={`mt-6 ${
            status.type === "success"
              ? "border-green-500 bg-green-50"
              : status.type === "error"
              ? "border-red-500 bg-red-50"
              : "border-blue-500 bg-blue-50"
          }`}
        >
          <AlertDescription
            className={
              status.type === "success"
                ? "text-green-700"
                : status.type === "error"
                ? "text-red-700"
                : "text-blue-700"
            }
          >
            {status.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Pre-configured commands for common livestock feeder operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              disabled={!!configError}
              onClick={() => {
                setTopic("livestock/feeder/command");
                setMessage('{"action": "feed", "amount": 100}');
              }}
            >
              Feed 100g
            </Button>
            <Button
              variant="outline"
              disabled={!!configError}
              onClick={() => {
                setTopic("livestock/feeder/command");
                setMessage('{"action": "feed", "amount": 250}');
              }}
            >
              Feed 250g
            </Button>
            <Button
              variant="outline"
              disabled={!!configError}
              onClick={() => {
                setTopic("livestock/feeder/status");
                setMessage('{"action": "get_status"}');
              }}
            >
              Get Status
            </Button>
            <Button
              variant="outline"
              disabled={!!configError}
              onClick={() => {
                setTopic("livestock/feeder/config");
                setMessage(
                  '{"action": "set_schedule", "times": ["08:00", "18:00"]}'
                );
              }}
            >
              Set Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
