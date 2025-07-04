"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Crown, LogOut } from "lucide-react";
import { type FeederRole } from "@/lib/utils/permissions-client";
import { leaveFeeeder } from "@/lib/actions/permissions";
import { InviteUserForm } from "./invite-user-form";
import { FeederMembersList } from "./feeder-members-list";
import { InvitationStatus } from "./invitation-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PermissionsManagementProps {
  feederId: string;
  feederName: string;
  currentUserRole: FeederRole | null;
  isOwner: boolean;
  members: FeederMember[];
  invitations: FeederInvitation[];
  isLoading: boolean;
  onDataChanged?: () => void;
}

interface FeederMember {
  id: string;
  user_id: string;
  role: FeederRole;
  status: string;
  invited_at: string | null;
  accepted_at?: string | null;
  email?: string | null;
  is_owner?: boolean;
}

interface FeederInvitation {
  id: string;
  invitee_email: string;
  role: FeederRole;
  status: string;
  expires_at: string;
  created_at: string;
}

export function PermissionsManagement({
  feederId,
  feederName,
  currentUserRole,
  isOwner,
  members,
  invitations,
  isLoading: dataLoading,
  onDataChanged,
}: PermissionsManagementProps) {
  const [leavingFeeder, setLeavingFeeder] = useState(false);

  const handleDataRefresh = () => {
    onDataChanged?.();
  };

  const handleLeaveFeeder = async () => {
    if (!currentUserRole || isOwner) return;

    setLeavingFeeder(true);

    try {
      const result = await leaveFeeeder(feederId);

      if (result.success) {
        toast.success(`Left ${feederName} team`);
        // Redirect to dashboard since user no longer has access
        window.location.href = "/dashboard";
      } else {
        toast.error(result.error || "Failed to leave feeder");
      }
    } catch (error) {
      console.error("Error leaving feeder:", error);
      toast.error("Failed to leave feeder");
    } finally {
      setLeavingFeeder(false);
    }
  };

  const canManageTeam =
    currentUserRole === "owner" || currentUserRole === "manager";

  if (!currentUserRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <p>Access Denied</p>
            <p className="text-sm">
              You don&apos;t have permission to view this feeder&apos;s team
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Access Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Access Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                {isOwner ? (
                  <Crown className="h-5 w-5 text-purple-600" />
                ) : (
                  <Users className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {isOwner ? "Feeder Owner" : "Team Member"}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      isOwner
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {currentUserRole === "owner" ? "Owner" : currentUserRole}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Leave Team Button (only for non-owners) */}
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={leavingFeeder}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave {feederName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave this feeder team? You will
                      lose all access and need to be re-invited to join again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeaveFeeder}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Leave Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Management Tabs */}
      {canManageTeam && (
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Members
            </TabsTrigger>
            <TabsTrigger
              value="invitations"
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Pending Invites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <FeederMembersList
              currentUserRole={currentUserRole}
              members={members}
              isLoading={dataLoading}
              onMembershipChanged={handleDataRefresh}
            />
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <InviteUserForm
              feederId={feederId}
              currentUserRole={currentUserRole!}
              onInviteSent={handleDataRefresh}
            />
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <InvitationStatus
              feederId={feederId}
              invitations={invitations}
              isLoading={dataLoading}
              onInvitationChanged={handleDataRefresh}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Read-only view for non-managers */}
      {!canManageTeam && (
        <div className="space-y-6">
          <FeederMembersList
            currentUserRole={currentUserRole}
            members={members}
            isLoading={dataLoading}
            onMembershipChanged={handleDataRefresh}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  Contact the feeder owner or manager to invite new team members
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
