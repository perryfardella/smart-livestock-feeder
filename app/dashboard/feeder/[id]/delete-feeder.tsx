"use client";

import { Button } from "@/components/ui/button";
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
import { Trash2 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { deleteFeeder, type Feeder } from "@/lib/actions/feeders";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DeleteFeederProps {
  feeder: Feeder;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function DeleteFeeder({
  feeder,
  variant = "destructive",
  size = "sm",
}: DeleteFeederProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  // Check if current user is the owner of the feeder
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if the current user is the feeder owner
          setIsOwner(feeder.user_id === user.id);
        }
      } catch (error) {
        console.error("Error checking feeder ownership:", error);
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [feeder.user_id]);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteFeeder(feeder.id);
        toast.success("Feeder deleted successfully!");
        setOpen(false);
        router.push("/dashboard");
      } catch (error) {
        toast.error("Failed to delete feeder");
        console.error("Error deleting feeder:", error);
      }
    });
  };

  // Only show delete button for feeder owners
  if (!isOwner) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Feeder
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete feeder permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the feeder &ldquo;{feeder.name}&rdquo;
            and remove all associated data including:
            <br />
            <br />
            <strong>• All team members and their access permissions</strong>
            <br />
            <strong>• All pending invitations</strong>
            <br />
            <strong>• All feeding schedules</strong>
            <br />
            <br />
            Your sensor data history will be preserved and can be accessed if
            you add this device again in the future.
            <br />
            <br />
            <strong>This action cannot be undone.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Deleting..." : "Delete Feeder"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
