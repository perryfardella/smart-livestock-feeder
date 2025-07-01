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
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteFeeder, type Feeder } from "@/lib/actions/feeders";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteFeeder(feeder.id);
        toast.success("Feeder removed from your account!");
        setOpen(false);
        router.push("/dashboard");
      } catch (error) {
        toast.error("Failed to remove feeder");
        console.error("Error removing feeder:", error);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Remove Feeder
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove feeder from your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the feeder &ldquo;{feeder.name}&rdquo; from your
            account, but all feeder data (feeding schedules, sensor readings)
            will be preserved. You can reclaim this feeder later by adding the
            same device ID again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Removing..." : "Remove Feeder"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
