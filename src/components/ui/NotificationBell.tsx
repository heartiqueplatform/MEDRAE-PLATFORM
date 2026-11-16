// components/ui/NotificationBell.tsx
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotificationCount } from "@/lib/notifications/useNotificationCount";

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className = "" }: NotificationBellProps) {
    const navigate = useNavigate();
    const { count } = useNotificationCount();

    return (
        <button
            onClick={() => navigate("/notifications")}
            aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
            className={`relative h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center active:scale-95 transition-transform shrink-0 ${className}`}
            style={{ touchAction: "manipulation" }}
        >
            <Bell
                className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 dark:text-slate-400"
                strokeWidth={2}
            />
            {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums leading-none">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </button>
    );
}