"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OnlineStatusToast() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOnline) {
      // Show online message briefly (3s)
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Stay visible while offline
      setVisible(true);
    }
  }, [isOnline]);

  if (!visible) return null;

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50
        px-4 py-2 rounded-md text-white font-medium shadow-lg
        transition-all duration-300
        ${isOnline ? "bg-green-500" : "bg-red-500"}
      `}
    >
      {isOnline
        ? "You are online"
        : "Offline: You may not access content until you reconnect"}
    </div>
  );
}
