/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DebugData {
  currentUser: any;
  ownedFeeders: any[];
  memberships: any[];
  invitations: any[];
  allFeeders: any[];
  rpcResult: any[];
}

export default function DebugMembershipsPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get owned feeders
      const { data: ownedFeeders } = await supabase
        .from("feeders")
        .select("*")
        .eq("user_id", user?.id || "");

      // Get memberships
      const { data: memberships } = await supabase
        .from("feeder_memberships")
        .select("*, feeders(name)")
        .eq("user_id", user?.id || "");

      // Get invitations to current user
      const { data: invitations } = await supabase
        .from("feeder_invitations")
        .select("*, feeders(name)")
        .eq("invitee_email", user?.email || "");

      // Get all feeders (should be filtered by RLS)
      const { data: allFeeders } = await supabase.from("feeders").select("*");

      // Test the RPC function
      const { data: rpcResult } = await supabase.rpc(
        "get_user_feeders_with_status"
      );

      setDebugData({
        currentUser: user,
        ownedFeeders: ownedFeeders || [],
        memberships: memberships || [],
        invitations: invitations || [],
        allFeeders: allFeeders || [],
        rpcResult: rpcResult || [],
      });
    } catch (error) {
      console.error("Debug fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Membership Debug Panel</h1>
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {debugData && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Current User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>ID:</strong> {debugData.currentUser?.id}
                </p>
                <p>
                  <strong>Email:</strong> {debugData.currentUser?.email}
                </p>
                <p>
                  <strong>Created:</strong> {debugData.currentUser?.created_at}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Owned Feeders ({debugData.ownedFeeders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.ownedFeeders.length === 0 ? (
                <p className="text-gray-500">No owned feeders</p>
              ) : (
                <div className="space-y-2">
                  {debugData.ownedFeeders.map((feeder) => (
                    <div key={feeder.id} className="p-2 border rounded">
                      <p>
                        <strong>{feeder.name}</strong> ({feeder.device_id})
                      </p>
                      <p className="text-sm text-gray-600">ID: {feeder.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Memberships ({debugData.memberships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.memberships.length === 0 ? (
                <p className="text-gray-500">No memberships found</p>
              ) : (
                <div className="space-y-2">
                  {debugData.memberships.map((membership) => (
                    <div key={membership.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>
                            {membership.feeders?.name || "Unknown Feeder"}
                          </strong>
                        </span>
                        <div className="flex gap-2">
                          <Badge>{membership.role}</Badge>
                          <Badge
                            variant={
                              membership.status === "accepted"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {membership.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Feeder ID: {membership.feeder_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Invited: {membership.invited_at}
                      </p>
                      {membership.accepted_at && (
                        <p className="text-sm text-gray-600">
                          Accepted: {membership.accepted_at}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Invitations ({debugData.invitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.invitations.length === 0 ? (
                <p className="text-gray-500">No invitations found</p>
              ) : (
                <div className="space-y-2">
                  {debugData.invitations.map((invitation) => (
                    <div key={invitation.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>
                            {invitation.feeders?.name || "Unknown Feeder"}
                          </strong>
                        </span>
                        <div className="flex gap-2">
                          <Badge>{invitation.role}</Badge>
                          <Badge
                            variant={
                              invitation.status === "accepted"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {invitation.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Feeder ID: {invitation.feeder_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Created: {invitation.created_at}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires: {invitation.expires_at}
                      </p>
                      {invitation.responded_at && (
                        <p className="text-sm text-gray-600">
                          Responded: {invitation.responded_at}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                All Accessible Feeders (RLS Filtered) (
                {debugData.allFeeders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.allFeeders.length === 0 ? (
                <p className="text-gray-500">No accessible feeders found</p>
              ) : (
                <div className="space-y-2">
                  {debugData.allFeeders.map((feeder) => (
                    <div key={feeder.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>{feeder.name}</strong> ({feeder.device_id})
                        </span>
                        <Badge
                          variant={
                            feeder.user_id === debugData.currentUser?.id
                              ? "default"
                              : "secondary"
                          }
                        >
                          {feeder.user_id === debugData.currentUser?.id
                            ? "Owned"
                            : "Shared"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">ID: {feeder.id}</p>
                      <p className="text-sm text-gray-600">
                        Owner: {feeder.user_id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                RPC Function Result ({debugData.rpcResult.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.rpcResult.length === 0 ? (
                <p className="text-gray-500">No feeders from RPC function</p>
              ) : (
                <div className="space-y-2">
                  {debugData.rpcResult.map((feeder) => (
                    <div key={feeder.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>{feeder.name}</strong> ({feeder.device_id})
                        </span>
                        <div className="flex gap-2">
                          <Badge>{feeder.user_role || "no role"}</Badge>
                          <Badge
                            variant={feeder.is_owner ? "default" : "secondary"}
                          >
                            {feeder.is_owner ? "Owner" : "Member"}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Status: {feeder.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Last comm: {feeder.last_communication || "Never"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
