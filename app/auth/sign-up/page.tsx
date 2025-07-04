import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

function SignUpFallback() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Mail className="h-8 w-8 animate-pulse mr-3" />
            <p>Loading sign up form...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpForm />
    </Suspense>
  );
}
