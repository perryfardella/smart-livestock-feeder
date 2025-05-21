import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8">
        <SignUpForm />
      </div>
    </div>
  );
}
