import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn } from "lucide-react";

function LoginFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <LogIn className="h-8 w-8 animate-pulse mr-3" />
            <p>Loading login form...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
