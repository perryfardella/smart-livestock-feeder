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
  Users,
  MoreHorizontal,
  UserMinus,
  Crown,
  Eye,
  Calendar,
  Settings,
} from "lucide-react";
import { type FeederRole } from "@/lib/utils/permissions";
import {
  getFeederMemberships,
  updateMembership,
  removeMembership,
} from "@/lib/actions/permissions";

interface FeederMember {
  id: string;
  user_id: string;
  role: FeederRole;
  status: string;
  invited_at: string;
  accepted_at?: string;
  profiles?: {
    email: string;
  };
}

interface FeederMembersListProps {
  feederId: string;
  currentUserRole: FeederRole;
  onMembershipChanged?: () => void;
}

const ROLE_ICONS = {
  viewer: Eye,
  scheduler: Calendar,
  manager: Settings,
  owner: Crown,
} as const;

const ROLE_COLORS = {
  viewer: "bg-blue-100 text-blue-800",
  scheduler: "bg-green-100 text-green-800",
  manager: "bg-orange-100 text-orange-800",
  owner: "bg-purple-100 text-purple-800",
} as const;

export function FeederMembersList({
  feederId,
  currentUserRole,
  onMembershipChanged,
}: FeederMembersListProps) {
  const [members, setMembers] = useState<FeederMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const canManageMembers =
    currentUserRole === "owner" || currentUserRole === "manager";

  useEffect(() => {
    loadMembers();
  }, [feederId]);

  const loadMembers = async () => {
    try {
      const result = await getFeederMemberships(feederId);
      if (result.success) {
        setMembers(result.memberships || []);
      } else {
        toast.error("Failed to load team members");
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: FeederRole) => {
    setUpdatingMemberId(memberId);

    try {
      const result = await updateMembership({
        membership_id: memberId,
        role: newRole,
      });

      if (result.success) {
        toast.success(`Role updated to ${newRole}`);
        await loadMembers();
        onMembershipChanged?.();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    setUpdatingMemberId(memberId);

    try {
      const result = await removeMembership(memberId);

      if (result.success) {
        toast.success(`Removed ${memberEmail} from team`);
        await loadMembers();
        onMembershipChanged?.();
      } else {
        toast.error(result.error || "Failed to remove member");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading team members...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No team members yet</p>
            <p className="text-sm">
              Invite team members to start collaborating
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role];
              const isUpdating = updatingMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <RoleIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.profiles?.email ||
                          `User ${member.user_id.slice(0, 8)}...`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={ROLE_COLORS[member.role]}>
                          {member.role}
                        </Badge>
                        {member.accepted_at && (
                          <span className="text-xs text-gray-500">
                            Joined{" "}
                            {new Date(member.accepted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageMembers && member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={isUpdating}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "viewer")}
                          disabled={member.role === "viewer"}
                        >
                          Change to Viewer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(member.id, "scheduler")
                          }
                          disabled={member.role === "scheduler"}
                        >
                          Change to Scheduler
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, "manager")}
                          disabled={member.role === "manager"}
                        >
                          Change to Manager
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={(e: Event) => e.preventDefault()}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from team
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove team member
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove{" "}
                                {member.profiles?.email ||
                                  `User ${member.user_id.slice(0, 8)}...`}{" "}
                                from this feeder? They will lose all access
                                immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveMember(
                                    member.id,
                                    member.profiles?.email ||
                                      `User ${member.user_id.slice(0, 8)}...`
                                  )
                                }
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {isUpdating && (
                    <div className="text-sm text-gray-500">Updating...</div>
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
