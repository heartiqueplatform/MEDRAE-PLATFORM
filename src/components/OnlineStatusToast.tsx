"use client";

import { useEffect, useRef } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "sonner"; // or 'react-hot-toast'
import { WifiOff, Wifi } from "lucide-react";

export default function OnlineStatusToast() {
  const isOnline = useOnlineStatus();
  const isFirstRender = useRef(true);
  const TOAST_ID = "network-status-toast";

  useEffect(() => {
    // 1. Skip the very first check when the app opens
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // If they start offline, we SHOULD show it immediately
      if (isOnline) return;
    }

    if (!isOnline) {
      // 2. Persistent "Offline" Toast
      // duration: Infinity ensures it stays until the internet comes back
      toast.error("You are offline", {
        id: TOAST_ID,
        description: "Your progress will be synced once connection is restored.",
        duration: Infinity,
        icon: <WifiOff className="w-4 h-4" />,
      });
    } else {
      // 3. Success "Back Online" Toast
      // This will REFRESH the existing "Offline" toast into a success one
      toast.success("Back online", {
        id: TOAST_ID,
        description: "Connection established successfully.",
        duration: 3000,
        icon: <Wifi className="w-4 h-4" />,
      });
    }
  }, [isOnline]);

  return null; // Logic-only component
}