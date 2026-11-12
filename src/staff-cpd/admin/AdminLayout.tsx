// src/staff-cpd/admin/AdminLayout.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
    BookOpen, HelpCircle, Calendar, ClipboardList, LayoutDashboard,
    ChevronLeft,
    UserCheck,
    Coins,
} from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { playSound } from "@/lib/soundManager";
import { supabase } from "@/lib/supabaseClient";

const vibrate = (p: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = () => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Admin IDs — same as ContributorReviewsPage / CoinConfigPage       */
/* ------------------------------------------------------------------ */

const ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

/* ------------------------------------------------------------------ */
/*  NAV — `adminOnly` items only show to the 2 admin accounts         */
/* ------------------------------------------------------------------ */

type NavItem = {
    label: string;
    to: string;
    icon: React.ComponentType<any>;
    exact?: boolean;
    adminOnly?: boolean;
};

const NAV: NavItem[] = [
    { label: "Overview", to: "/cpd/admin", icon: LayoutDashboard, exact: true },
    { label: "Activities", to: "/cpd/admin/activities", icon: BookOpen },
    { label: "Contributors", to: "/cpd/admin/contributors", icon: UserCheck, adminOnly: true },
    { label: "Question Bank", to: "/cpd/admin/questions", icon: HelpCircle },
    { label: "Completions", to: "/cpd/admin/completions", icon: ClipboardList },
    { label: "Periods", to: "/cpd/admin/periods", icon: Calendar },
    { label: "Coin Config", to: "/cpd/admin/coin-config", icon: Coins, adminOnly: true },
    { label: "Redemptions", to: "/cpd/admin/redemptions", icon: Coins, adminOnly: true },
    { label: "Apply", to: "/cpd/apply", icon: UserCheck },
];

export default function AdminLayout() {
    const loc = useLocation();
    const nav = useNavigate();
    const home = useHomeRoute();

    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase.auth.getSession();
            if (!cancelled) setUserId(data.session?.user.id ?? null);
        })();
        return () => { cancelled = true; };
    }, []);

    const isAdmin = userId ? ADMIN_IDS.includes(userId) : false;

    // Filter tabs based on who's logged in
    const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);

    const active = (item: NavItem) =>
        item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* Header */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={() => { tap(); nav(home); }}
                    aria-label="Back to dashboard"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate">
                        CPD Admin
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Author, publish, and manage CPD content
                    </p>
                </div>
            </header>

            {/* Tab strip */}
            <div className="shrink-0 px-2 py-2 border-b border-slate-200/70 dark:border-white/[0.06]
                            bg-white dark:bg-[#0d1117] overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 min-w-max">
                    {visibleNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = active(item);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={tap}
                                className={`shrink-0 h-9 px-3 rounded-xl flex items-center gap-1.5
                                            text-[11px] font-bold
                                            active:scale-[0.97] transition-transform
                                            ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <main
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <Outlet />
            </main>
        </div>
    );
}