"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MailIcon, X, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { type FeederRole } from "@/lib/utils/permissions-client";

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
  invitations: FeederInvitation[];
  isLoading: boolean;
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
  invitations,
  isLoading,
  onInvitationChanged,
}: InvitationStatusProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

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
    setResendingId(invitationId);

    try {
      const response = await fetch(`/api/feeders/${feederId}/invitations`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          action: "resend",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Invitation resent to ${email}`);
        onInvitationChanged?.();
      } else {
        toast.error(data.error || "Failed to resend invitation");
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
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
          Pending Invitations ({pendingInvitations.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingInvitations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MailIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No pending invitations</p>
            <p className="text-sm">
              All sent invitations have been accepted or expired
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => {
              const StatusIcon =
                STATUS_ICONS[invitation.status as keyof typeof STATUS_ICONS] ||
                Clock;
              const expired = isExpired(invitation.expires_at);

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        expired ? "bg-red-100" : "bg-yellow-100"
                      }`}
                    >
                      <StatusIcon
                        className={`h-5 w-5 ${
                          expired ? "text-red-600" : "text-yellow-600"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invitation.invitee_email}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {invitation.role}
                        </Badge>
                        <span
                          className={`text-sm ${
                            expired ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {getTimeUntilExpiry(invitation.expires_at)}
                        </span>
                        <span className="text-sm text-gray-500">
                          Sent{" "}
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!expired && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleResendInvitation(
                            invitation.id,
                            invitation.invitee_email
                          )
                        }
                        disabled={resendingId === invitation.id}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {resendingId === invitation.id
                          ? "Sending..."
                          : "Resend"}
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={revokingId === invitation.id}
                        >
                          <X className="h-4 w-4 mr-2" />
                          {revokingId === invitation.id
                            ? "Revoking..."
                            : "Revoke"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Revoke invitation to {invitation.invitee_email}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke this invitation? The
                            recipient will no longer be able to accept it.
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
                            Revoke Invitation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
