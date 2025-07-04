"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Mail } from "lucide-react";
import {
  type FeederRole,
  getInvitableRoles,
} from "@/lib/utils/permissions-client";

interface InviteUserFormProps {
  feederId: string;
  currentUserRole: FeederRole;
  onInviteSent?: () => void;
}

const ROLE_DESCRIPTIONS = {
  viewer: "Can view sensor data, schedules, and camera feeds",
  scheduler: "Can create and manage feeding schedules + viewer permissions",
  manager: "Can edit feeder settings + scheduler permissions",
  owner: "Full access including team management",
} as const;

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "scheduler", label: "Scheduler" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
] as const;

export function InviteUserForm({
  feederId,
  currentUserRole,
  onInviteSent,
}: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FeederRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);

  // Get the roles this user can invite based on their current role
  const invitableRoles = getInvitableRoles(currentUserRole);
  const availableRoles = ROLES.filter((roleOption) =>
    invitableRoles.includes(roleOption.value)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/feeders/${feederId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitee_email: email,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(`Invitation sent to ${email} as ${role}`);
      setEmail("");
      setRole("viewer");
      onInviteSent?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Team Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="team-member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: FeederRole) => setRole(value)}
            >
              <SelectTrigger size="auto">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{roleOption.label}</span>
                      <span className="text-sm text-gray-500">
                        {ROLE_DESCRIPTIONS[roleOption.value]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
