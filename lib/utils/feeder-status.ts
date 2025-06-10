export function isFeederOnline(lastCommunicationTime: string | null): boolean {
  if (!lastCommunicationTime) {
    return false;
  }

  const now = new Date().getTime();
  const lastComm = new Date(lastCommunicationTime).getTime();
  const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes in milliseconds

  return lastComm > tenMinutesAgo;
}

export type FeederStatusType = "online" | "offline";

export interface FeederConnectionStatus {
  isOnline: boolean;
  lastCommunication: string | null;
}

export interface FeederStatus {
  status: FeederStatusType;
  isOnline: boolean;
  lastCommunication: string | null;
  displayText: string;
  colorClass: string;
  iconType: "online" | "offline";
}

export function getFeederStatus(
  lastCommunicationTime: string | null
): FeederStatus {
  const isOnline = isFeederOnline(lastCommunicationTime);

  if (isOnline) {
    return {
      status: "online",
      isOnline: true,
      lastCommunication: lastCommunicationTime,
      displayText: "Online",
      colorClass: "bg-green-100 text-green-800",
      iconType: "online",
    };
  }

  return {
    status: "offline",
    isOnline: false,
    lastCommunication: lastCommunicationTime,
    displayText: "Offline",
    colorClass: "bg-red-100 text-red-800",
    iconType: "offline",
  };
}
