"use client";

import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      // Check admin status if user is authenticated
      if (session?.user) {
        const isUserAdmin = session.user.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
      } else {
        setIsAdmin(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);

      // Check admin status on auth state change
      if (session?.user) {
        const isUserAdmin = session.user.app_metadata?.is_admin === true;
        setIsAdmin(isUserAdmin);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            SmartFeeder
          </Link>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium hover:underline"
                >
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium hover:underline"
                  >
                    Admin
                  </Link>
                )}
                <LogoutButton />
              </div>
            ) : (
              <>
                <Button variant="ghost">
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button>
                  <Link href="/auth/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
