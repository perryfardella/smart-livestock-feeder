"use client";

import { useState } from "react";
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
import { type FeederRole } from "@/lib/utils/permissions-client";
import { updateMembership, removeMembership } from "@/lib/actions/permissions";

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

interface FeederMembersListProps {
  currentUserRole: FeederRole;
  members: FeederMember[];
  isLoading: boolean;
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
  currentUserRole,
  members,
  isLoading,
  onMembershipChanged,
}: FeederMembersListProps) {
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const canManageMembers =
    currentUserRole === "owner" || currentUserRole === "manager";

  // Helper function to get user email from profiles array
  const getUserEmail = (member: FeederMember): string => {
    if (member.email) {
      return member.email;
    }
    return `User ${member.user_id.slice(0, 8)}...`;
  };

  const handleRoleChange = async (memberId: string, newRole: FeederRole) => {
    // Safety check: prevent role changes for owners
    const member = members.find((m) => m.id === memberId);
    if (member && (member.is_owner || member.role === "owner")) {
      toast.error("Cannot change role for feeder owner");
      return;
    }

    setUpdatingMemberId(memberId);

    try {
      const result = await updateMembership({
        membership_id: memberId,
        role: newRole,
      });

      if (result.success) {
        toast.success(`Role updated to ${newRole}`);
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
    // Safety check: prevent removal for owners
    const member = members.find((m) => m.id === memberId);
    if (member && (member.is_owner || member.role === "owner")) {
      toast.error("Cannot remove feeder owner from team");
      return;
    }

    setUpdatingMemberId(memberId);

    try {
      const result = await removeMembership(memberId);

      if (result.success) {
        toast.success(`Removed ${memberEmail} from team`);
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
          Team Members ({members.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No team members yet</p>
            <p className="text-sm">
              Start by inviting team members to help manage this feeder
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const IconComponent = ROLE_ICONS[member.role];
              const memberEmail = getUserEmail(member);
              const isCurrentMember =
                member.is_owner || member.role === "owner";

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {memberEmail}
                        {isCurrentMember && (
                          <Crown className="inline h-4 w-4 ml-2 text-purple-600" />
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={ROLE_COLORS[member.role]}>
                          {member.role}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {member.accepted_at
                            ? `Joined ${new Date(
                                member.accepted_at
                              ).toLocaleDateString()}`
                            : member.invited_at
                              ? `Invited ${new Date(
                                  member.invited_at
                                ).toLocaleDateString()}`
                              : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Menu - Only show for non-owners if user can manage */}
                  {canManageMembers && !isCurrentMember && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingMemberId === member.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Role change options */}
                        {(["viewer", "scheduler", "manager"] as FeederRole[])
                          .filter((role) => role !== member.role)
                          .map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => handleRoleChange(member.id, role)}
                            >
                              Change to {role}
                            </DropdownMenuItem>
                          ))}

                        {/* Remove member */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from team
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {memberEmail}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this member from
                                the team? They will lose all access to this
                                feeder and need to be re-invited to join again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveMember(member.id, memberEmail)
                                }
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
