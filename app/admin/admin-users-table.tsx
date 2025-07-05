"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserMinus, Shield } from "lucide-react";
import { type AdminUser, removeAdminByEmail } from "@/lib/actions/admin-users";

interface AdminUsersTableProps {
  users: AdminUser[];
  currentUserEmail?: string;
}

export function AdminUsersTable({
  users,
  currentUserEmail,
}: AdminUsersTableProps) {
  const handleRemoveAdmin = async (user: AdminUser) => {
    try {
      await removeAdminByEmail(user.email);
      toast.success("Admin privileges removed successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove admin privileges"
      );
      console.error("Error removing admin privileges:", error);
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Shield className="h-12 w-12 text-gray-400" />
          <p className="text-gray-500">
            No admin users found. This shouldn&apos;t happen - there should
            always be at least one admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Account Created</TableHead>
            <TableHead>Last Sign In</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isCurrentUser = user.email === currentUserEmail;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.email}
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), "MMM d, yyyy")
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-blue-600">
                    Admin
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCurrentUser}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Remove Admin Privileges
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove admin privileges
                            from &quot;{user.email}&quot;? They will no longer
                            have access to the admin dashboard and cannot manage
                            other users or commission feeders.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveAdmin(user)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove Admin
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isCurrentUser && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cannot remove yourself
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
