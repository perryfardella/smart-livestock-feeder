import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  status: "online" | "offline";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function ConnectionStatus({
  status,
  size = "md",
  showText = true,
  className,
}: ConnectionStatusProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const isOnline = status === "online";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeClasses[size],
        isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        className
      )}
    >
      {isOnline ? (
        <Wifi className={iconSizes[size]} />
      ) : (
        <WifiOff className={iconSizes[size]} />
      )}
      {showText && (isOnline ? "Online" : "Offline")}
    </div>
  );
}
