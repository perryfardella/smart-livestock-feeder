"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Users,
} from "lucide-react";
import { acceptInvitation, declineInvitation } from "@/lib/actions/permissions";
import { createClient } from "@/lib/supabase/client";

interface InvitationDetails {
  id: string;
  feeder_id: string;
  invitee_email: string;
  role: string;
  status: string;
  expires_at: string;
  feeder_name?: string;
  inviter_name?: string;
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token");

  const loadInvitationDetails = useCallback(async () => {
    try {
      const supabase = createClient();

      // Check current user and JWT email
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Check if user is authenticated
      if (userError || !user) {
        setError("Please log in to view this invitation");
        setLoading(false);
        return;
      }

      // Get invitation details by token
      const { data: invitationData, error: invitationError } = await supabase
        .from("feeder_invitations")
        .select(
          "id, feeder_id, inviter_id, invitee_email, role, status, expires_at"
        )
        .eq("invitation_token", token)
        .single();

      if (invitationError || !invitationData) {
        setError("Invitation not found or has expired");
        setLoading(false);
        return;
      }

      // Check if invitation is still valid
      if (invitationData.status !== "pending") {
        setError(`Invitation has already been ${invitationData.status}`);
        setLoading(false);
        return;
      }

      const expiresAt = new Date(invitationData.expires_at);
      const now = new Date();
      const isExpired = expiresAt < now;

      if (isExpired) {
        setError(`Invitation expired on ${expiresAt.toLocaleDateString()}`);
        setLoading(false);
        return;
      }

      // Get feeder name and inviter email
      const [feederResponse, inviterResponse] = await Promise.all([
        supabase
          .from("feeders")
          .select("name")
          .eq("id", invitationData.feeder_id)
          .single(),
        supabase.rpc("get_user_emails", {
          user_ids: [invitationData.inviter_id],
        }),
      ]);

      const feederName = feederResponse.data?.name || "Unknown Feeder";
      const inviterEmail = inviterResponse.data?.[0]?.email || "Unknown";

      setInvitation({
        ...invitationData,
        feeder_name: feederName,
        inviter_name: inviterEmail,
      });
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError("Failed to load invitation details");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    loadInvitationDetails();
  }, [token, loadInvitationDetails]);

  const handleAccept = async () => {
    if (!invitation || !token) return;

    setProcessing(true);
    try {
      const result = await acceptInvitation(token);

      if (result.success) {
        toast.success("Invitation accepted! Welcome to the team.");
        // Redirect to the feeder page
        window.location.href = `/dashboard/feeder/${invitation.feeder_id}`;
      } else {
        toast.error(result.error || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation || !token) return;

    setProcessing(true);
    try {
      const result = await declineInvitation(token);

      if (result.success) {
        toast.success("Invitation declined");
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to decline invitation");
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    } finally {
      setProcessing(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Expires today";
    if (diffDays === 1) return "Expires tomorrow";
    return `Expires in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Clock className="h-8 w-8 animate-spin mr-3" />
              <p>Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <AlertCircle className="h-8 w-8 text-yellow-500 mr-3" />
              <p>No invitation found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{invitation.feeder_name}</h3>
            <p className="text-gray-600">
              You&apos;ve been invited to join this feeder
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invited by:</span>
              <span className="font-medium">
                {invitation.inviter_name || "Team member"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Role:</span>
              <Badge variant="outline">{invitation.role}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Valid until:</span>
              <span className="text-orange-600">
                {getTimeRemaining(invitation.expires_at)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={processing}
              className="w-full"
            >
              {processing ? (
                <Clock className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Accept Invitation
            </Button>

            <Button
              onClick={handleDecline}
              disabled={processing}
              variant="outline"
              className="w-full"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>

          <div className="text-center">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="ghost"
              size="sm"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-md py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Clock className="h-8 w-8 animate-spin mr-3" />
                <p>Loading invitation...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
