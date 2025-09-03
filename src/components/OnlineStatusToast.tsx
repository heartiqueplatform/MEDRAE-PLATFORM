"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OnlineStatusToast() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);

    // Hide toast automatically after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOnline]);

  return (
    <div
      className={`
        fixed top-16 right-4 z-50 px-4 py-2 rounded-md text-white font-medium shadow-lg
        transition-transform duration-300
        ${visible ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"}
        ${isOnline ? "bg-green-500" : "bg-red-500"}
      `}
    >
      {isOnline
        ? "You are online"
        : "Offline: You may not access content until you reconnect"}
    </div>
  );
}
