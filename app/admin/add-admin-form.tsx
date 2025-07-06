"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { addAdminByEmail } from "@/lib/actions/admin-users";
import { UserPlus } from "lucide-react";

export function AddAdminForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    startTransition(async () => {
      try {
        await addAdminByEmail({
          email: email.trim(),
        });

        toast.success("Admin privileges added successfully!");

        // Reset form
        setEmail("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to add admin privileges"
        );
        console.error("Error adding admin privileges:", error);
      }
    });
  };

  return (
    <Card className="h-fit shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
          Add Admin User
        </CardTitle>
        <CardDescription className="text-sm">
          Grant admin privileges to an existing user by their email address. The
          user must already have an account in the system.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter user's email address"
              required
              className="text-sm"
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              The user must already have an account with this email address
            </p>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-10 text-sm font-medium"
          >
            {isPending ? "Adding Admin..." : "Add Admin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
