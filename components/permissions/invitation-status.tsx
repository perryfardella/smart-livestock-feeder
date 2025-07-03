"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import {
  MailIcon,
  MoreHorizontal,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { type FeederRole } from "@/lib/utils/permissions";

interface FeederInvitation {
  id: string;
  invitee_email: string;
  role: FeederRole;
  status: string;
  expires_at: string;
  created_at: string;
}

interface InvitationStatusProps {
  feederId: string;
  onInvitationChanged?: () => void;
}

const STATUS_ICONS = {
  pending: Clock,
  accepted: CheckCircle,
  declined: XCircle,
  expired: XCircle,
  revoked: X,
} as const;

export function InvitationStatus({
  feederId,
  onInvitationChanged,
}: InvitationStatusProps) {
  const [invitations, setInvitations] = useState<FeederInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [feederId]);

  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/feeders/${feederId}/invitations`);
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        toast.error("Failed to load invitations");
      }
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvitation = async (
    invitationId: string,
    email: string
  ) => {
    setRevokingId(invitationId);

    try {
      const response = await fetch(`/api/feeders/${feederId}/invitations`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          action: "revoke",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Invitation to ${email} revoked`);
        await loadInvitations();
        onInvitationChanged?.();
      } else {
        toast.error(data.error || "Failed to revoke invitation");
      }
    } catch (error) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
    } finally {
      setRevokingId(null);
    }
  };

  const handleResendInvitation = async (
    invitationId: string,
    email: string
  ) => {
    try {
      // TODO: Implement resend invitation API endpoint
      // This would create a new invitation or extend the expiry

      toast.success(`Invitation resent to ${email}`);
      await loadInvitations();
      onInvitationChanged?.();
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    return `Expires in ${diffDays} days`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailIcon className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailIcon className="h-5 w-5" />
          Pending Invitations ({pendingInvitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MailIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No pending invitations</p>
            <p className="text-sm">
              All sent invitations have been responded to
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingInvitations.map((invitation) => {
              const StatusIcon =
                STATUS_ICONS[invitation.status as keyof typeof STATUS_ICONS];
              const isInvitationExpired = isExpired(invitation.expires_at);
              const isRevoking = revokingId === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <StatusIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invitation.invitee_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-800">
                          Invited as {invitation.role}
                        </Badge>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            isInvitationExpired
                              ? "bg-red-100 text-red-600"
                              : "bg-yellow-100 text-yellow-600"
                          }`}
                        >
                          {getTimeUntilExpiry(invitation.expires_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isRevoking}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleResendInvitation(
                            invitation.id,
                            invitation.invitee_email
                          )
                        }
                      >
                        Resend invitation
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onSelect={(e: Event) => e.preventDefault()}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Revoke invitation
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Revoke invitation
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke the invitation for{" "}
                              {invitation.invitee_email}? They will no longer be
                              able to join this feeder.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRevokeInvitation(
                                  invitation.id,
                                  invitation.invitee_email
                                )
                              }
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {isRevoking && (
                    <div className="text-sm text-gray-500">Revoking...</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
