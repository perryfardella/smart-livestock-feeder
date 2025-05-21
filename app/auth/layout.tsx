import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  );
}
