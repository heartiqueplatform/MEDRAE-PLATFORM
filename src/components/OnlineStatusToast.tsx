"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OnlineStatusToast() {
  const isOnline = useOnlineStatus();

  // Toast removed – component no longer renders anything
  return null;
}
