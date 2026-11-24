// src/components/system/OfflineBanner.tsx
import { WifiOff, Wifi } from "lucide-react";
import { useConnectivity } from "@/context/ConnectivityContext";

export function OfflineBanner() {
    const { isOnline, justRecovered, state } = useConnectivity();

    if (isOnline && !justRecovered) return null;
    if (!isOnline && state === "checking") return null;

    const offline = !isOnline;

    return (
        <div className="fixed top-0 inset-x-0 z-[9999] px-3 pt-3 pointer-events-none">
            <div
                className={`mx-auto max-w-md rounded-2xl px-3 py-2.5
                            flex items-center gap-2.5 pointer-events-auto
                            ${offline
                        ? "bg-amber-50 dark:bg-amber-400/10"
                        : "bg-emerald-50 dark:bg-emerald-400/10"}`}
            >
                {offline ? (
                    <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2.2} />
                ) : (
                    <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.2} />
                )}
                <p className={`text-[11px] font-semibold leading-tight
                               ${offline
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"}`}>
                    {offline
                        ? "No internet — you're browsing offline. We'll reconnect automatically."
                        : "Back online. Everything is in sync."}
                </p>
            </div>
        </div>
    );
}