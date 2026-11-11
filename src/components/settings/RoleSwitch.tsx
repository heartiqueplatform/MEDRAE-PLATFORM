// src/components/settings/RoleSwitch.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap,
    UserCheck,
    Stethoscope,
    AlertTriangle,
    Shield,
    RefreshCw,
    History,
    Trash2,
    Lock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useUserRole } from "@/context/UserRoleContext";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    try { playSound("ui-tap"); } catch { /* no-op */ }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  60-day cooldown constant                                          */
/* ------------------------------------------------------------------ */

const ROLE_COOLDOWN_DAYS = 60;
const ROLE_COOLDOWN_MS = ROLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

interface RoleSwitchProps {
    currentRole?: string;
    userId?: string;
    onRoleChange?: () => void;
}

export function RoleSwitch({ currentRole, userId, onRoleChange }: RoleSwitchProps) {
    const navigate = useNavigate();
    const { refreshRole } = useUserRole();

    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [roleHistory, setRoleHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [cooldownDaysLeft, setCooldownDaysLeft] = useState<number | null>(null);

    const roleOptions = [
        {
            id: "student",
            label: "Student",
            icon: GraduationCap,
            description: "Access learning materials and courses",
            accent: "blue",
        },
        {
            id: "tutor",
            label: "Tutor",
            icon: UserCheck,
            description: "Create content and teach students",
            accent: "emerald",
        },
        {
            id: "staff",
            label: "Staff",
            icon: Stethoscope,
            description: "Administrative & management access",
            accent: "violet",
            disabled: false,
        },
    ];

    const fetchRoleHistory = async () => {
        try {
            let userIdToUse = userId;
            if (!userIdToUse) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                userIdToUse = user.id;
            }

            const { data, error } = await supabase
                .from("role_change_history")
                .select("*")
                .eq("user_id", userIdToUse)
                .order("changed_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            const rows = data || [];
            setRoleHistory(rows);

            // Compute the 60-day cooldown from the most recent change
            if (rows.length > 0) {
                const lastChange = new Date(rows[0].changed_at).getTime();
                const elapsed = Date.now() - lastChange;
                const remaining = Math.ceil(
                    (ROLE_COOLDOWN_MS - elapsed) / (1000 * 60 * 60 * 24)
                );
                setCooldownDaysLeft(remaining > 0 ? remaining : null);
            } else {
                setCooldownDaysLeft(null);
            }
        } catch (error) {
            console.error("Error fetching role history:", error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchRoleHistory();
        }
    }, [userId]);

    const handleRoleClick = (roleId: string) => {
        if (cooldownDaysLeft !== null) {
            tap("warning");
            toast({
                title: "Role change locked",
                description: `You can switch roles again in ${cooldownDaysLeft} day${cooldownDaysLeft === 1 ? "" : "s"}.`,
                variant: "destructive",
            });
            return;
        }
        if (roleId === currentRole) {
            toast({
                title: "Already in this role",
                description: `You are already a ${roleId}`,
            });
            return;
        }
        tap();
        setSelectedRole(roleId);
        setShowConfirmDialog(true);
    };

    const logRoleChange = async (userIdToUse: string, oldRole: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from("role_change_history")
                .insert({
                    user_id: userIdToUse,
                    old_role: oldRole,
                    new_role: newRole,
                    changed_at: new Date().toISOString(),
                    changed_by: userIdToUse,
                    user_agent: navigator.userAgent || "unknown",
                    metadata: {
                        browser: navigator.userAgent,
                        platform: navigator.platform,
                        timestamp: new Date().toISOString(),
                    },
                });

            if (error) {
                console.error("Error logging role change:", error);
            }
        } catch (error) {
            console.error("Error in role change logging:", error);
        }
    };

    // Deep wipe: localStorage, sessionStorage, cookies, IndexedDB,
    // Service Worker caches, and SW registrations. Leaves no role-scoped
    // remnant behind, so the reload paints a clean tree.
    const clearAllAppData = async (newRole: string): Promise<boolean> => {
        try {
            // 1. Storage + cookies
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach((cookie) => {
                document.cookie = cookie
                    .replace(/^ +/, "")
                    .replace(/=.*/, `=; expires=${new Date(0).toUTCString()}; path=/`);
            });

            // 2. IndexedDB — wipe every database
            try {
                if ("indexedDB" in window && indexedDB.databases) {
                    const dbs = await indexedDB.databases();
                    await Promise.all(
                        dbs
                            .map((d) => d.name)
                            .filter((n): n is string => !!n)
                            .map(
                                (name) =>
                                    new Promise<void>((resolve) => {
                                        const req = indexedDB.deleteDatabase(name);
                                        req.onsuccess = () => resolve();
                                        req.onerror = () => resolve();
                                        req.onblocked = () => resolve();
                                    })
                            )
                    );
                }
            } catch (err) {
                console.warn("IndexedDB clear failed (non-fatal):", err);
            }

            // 3. Cache Storage
            try {
                if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                }
            } catch (err) {
                console.warn("Cache storage clear failed (non-fatal):", err);
            }

            // 4. Service Worker registrations
            try {
                if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                }
            } catch (err) {
                console.warn("Service worker unregister failed (non-fatal):", err);
            }

            // 5. Re-seed the new role AFTER the wipe
            if (userId) {
                localStorage.setItem(`userRole_${userId}`, newRole);
            }
            localStorage.setItem("last_known_role", newRole);

            console.log("App data cleared successfully!");
            return true;
        } catch (error) {
            console.error("Error clearing app data:", error);
            return false;
        }
    };

    const handleRoleChange = async () => {
        if (!selectedRole) return;

        // Last line of defense — the click handler already blocks this,
        // but a stale modal (opened before cooldown was hydrated) could
        // still land here.
        if (cooldownDaysLeft !== null) {
            tap("warning");
            toast({
                title: "Role change locked",
                description: `You can switch roles again in ${cooldownDaysLeft} day${cooldownDaysLeft === 1 ? "" : "s"}.`,
                variant: "destructive",
            });
            setShowConfirmDialog(false);
            return;
        }

        setIsLoading(true);
        tap("warning");

        try {
            let userIdToUse = userId;
            const oldRole = currentRole || "unknown";

            if (!userIdToUse) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("User not found");
                userIdToUse = user.id;
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ role: selectedRole })
                .eq("user_id", userIdToUse);

            if (updateError) {
                console.error("Update error:", updateError);
                throw new Error(`Failed to update role: ${updateError.message}`);
            }

            const { data: verifyData, error: verifyError } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", userIdToUse)
                .single();

            if (verifyError) {
                console.error("Verify error:", verifyError);
                throw new Error("Role update could not be verified");
            }

            if (verifyData.role !== selectedRole) {
                throw new Error(`Role mismatch: expected ${selectedRole}, got ${verifyData.role}`);
            }

            console.log(`✅ Role verified: ${verifyData.role}`);

            await logRoleChange(userIdToUse, oldRole, selectedRole);

            toast({
                title: "Role Updated Successfully",
                description: `Your role has been changed to ${selectedRole}. Refreshing...`,
            });

            // Await the deep wipe BEFORE refreshing role or reloading —
            // otherwise the reload races the cache clear and paints a
            // half-old tree.
            await clearAllAppData(selectedRole);

            await refreshRole();

            window.dispatchEvent(
                new CustomEvent("roleChanged", {
                    detail: { role: selectedRole, userId: userIdToUse },
                })
            );

            const { data: updatedProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", userIdToUse)
                .single();

            if (updatedProfile) {
                localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
                window.dispatchEvent(
                    new CustomEvent("profileUpdated", { detail: updatedProfile })
                );
            }

            if (onRoleChange) {
                onRoleChange();
            }

            setTimeout(() => {
                // 🔧 Navigate to the NEW role's home route — NOT the current URL.
                // Reloading the current URL leaves the user on their old role's page.
                const roleHome =
                    selectedRole === "tutor" ? "/dashboard/tutor"
                        : selectedRole === "staff" ? "/dashboard/staff"
                            : "/dashboard/student";

                // Cache-busted hard reload at the correct route.
                window.location.replace(roleHome + "?role-switch=" + Date.now());
            }, 500);
        } catch (error: any) {
            console.error("Role change error:", error);

            toast({
                title: "Role Change Failed",
                description: error.message || "Failed to change role. Please try again.",
                variant: "destructive",
            });

            setIsLoading(false);
            setShowConfirmDialog(false);
        }
    };

    /* ─── Cooldown display helper ──────────────────────────────── */
    const cooldownLabel =
        cooldownDaysLeft !== null
            ? `${cooldownDaysLeft} day${cooldownDaysLeft === 1 ? "" : "s"}`
            : null;

    const cooldownDate =
        cooldownDaysLeft !== null
            ? new Date(Date.now() + cooldownDaysLeft * 24 * 60 * 60 * 1000)
                .toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })
            : null;

    return (
        <>
            {/* ── CARD ─────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-4">
                {/* Header */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg
                                        bg-amber-50 dark:bg-amber-400/10
                                        flex items-center justify-center shrink-0">
                            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-amber-600 dark:text-amber-400 leading-none mb-1">
                                Account
                            </p>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                Change user role
                            </h2>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                        Switch your account role to access different features and dashboards.
                    </p>
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 leading-snug">
                        ⚠️ This will clear all cached data and refresh the page.
                    </p>
                </div>

                {/* Current role pill */}
                {currentRole && (
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                    flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Current role
                        </span>
                        <span className="text-[11px] font-bold capitalize
                                         text-blue-600 dark:text-blue-400">
                            {currentRole}
                        </span>
                    </div>
                )}

                {/* Cooldown banner */}
                {cooldownDaysLeft !== null && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3
                                    flex items-start gap-2">
                        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                Role change locked
                            </p>
                            <p className="text-[11px] text-amber-700/90 dark:text-amber-400 mt-0.5 leading-relaxed">
                                You can switch roles again in{" "}
                                <strong>{cooldownLabel}</strong>
                                {cooldownDate ? ` (${cooldownDate})` : ""}.
                                This {ROLE_COOLDOWN_DAYS}-day cooldown keeps role history clean.
                            </p>
                        </div>
                    </div>
                )}

                {/* Role options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {roleOptions.map((role) => {
                        const Icon = role.icon;
                        const isActive = currentRole === role.id;
                        const isLocked =
                            cooldownDaysLeft !== null ||
                            role.disabled ||
                            isLoading;
                        const isTappable = !isLocked && !isActive;

                        // Per-role accent classes
                        const accentClasses =
                            role.accent === "blue"
                                ? {
                                    iconBg: "bg-blue-50 dark:bg-blue-400/10",
                                    iconColor: "text-blue-600 dark:text-blue-400",
                                }
                                : role.accent === "emerald"
                                    ? {
                                        iconBg: "bg-emerald-50 dark:bg-emerald-400/10",
                                        iconColor: "text-emerald-600 dark:text-emerald-400",
                                    }
                                    : {
                                        iconBg: "bg-violet-50 dark:bg-violet-400/10",
                                        iconColor: "text-violet-600 dark:text-violet-400",
                                    };

                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => !isLocked && handleRoleClick(role.id)}
                                disabled={isLocked || isActive}
                                className={`text-left rounded-xl p-3 flex flex-col items-center gap-2
                                            transition-colors
                                            ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-50 dark:bg-[#0d1117] active:bg-slate-100 dark:active:bg-white/[0.1]"
                                    }
                                            ${isLocked && !isActive
                                        ? "opacity-60 cursor-not-allowed"
                                        : isActive
                                            ? "cursor-default"
                                            : ""
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center
                                                ${isActive ? "bg-white/20" : accentClasses.iconBg}`}>
                                    <Icon
                                        className={`h-5 w-5 ${isActive ? "text-white" : accentClasses.iconColor}`}
                                    />
                                </div>
                                <span
                                    className={`text-[12px] font-bold ${isActive ? "text-white" : "text-slate-900 dark:text-white"}`}
                                >
                                    {role.label}
                                </span>
                                <span
                                    className={`text-[10px] text-center leading-tight ${isActive ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}
                                >
                                    {role.description}
                                </span>

                                {/* Status pill: Current / Available / Locked / Coming soon */}
                                {isActive && (
                                    <span className="text-[10px] font-bold
                                                     bg-white/20 px-2 py-0.5 rounded-full text-white">
                                        Current
                                    </span>
                                )}
                                {!isActive && role.disabled && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                                     bg-amber-50 dark:bg-amber-400/10
                                                     text-amber-700 dark:text-amber-400">
                                        Coming soon
                                    </span>
                                )}
                                {!isActive && !role.disabled && cooldownDaysLeft !== null && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                                     bg-amber-50 dark:bg-amber-400/10
                                                     text-amber-700 dark:text-amber-400
                                                     flex items-center gap-1">
                                        <Lock className="h-2.5 w-2.5" />
                                        {cooldownLabel}
                                    </span>
                                )}
                                {!isActive && !role.disabled && cooldownDaysLeft === null && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                                                     bg-emerald-50 dark:bg-emerald-400/10
                                                     text-emerald-700 dark:text-emerald-400">
                                        Available
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Warning panel */}
                <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                    <div className="flex items-start gap-2">
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                                Role change will:
                            </p>
                            <ul className="mt-1 space-y-0.5">
                                {[
                                    "Update your role in the database",
                                    "Clear ALL localStorage and sessionStorage",
                                    "Clear IndexedDB and Service Worker caches",
                                    "Refresh the page to apply changes",
                                    "Lock further changes for 60 days",
                                ].map((item, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-1.5 text-[11px]
                                                   text-rose-700 dark:text-rose-300 leading-relaxed"
                                    >
                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* History toggle + list */}
                <div>
                    <button
                        type="button"
                        onClick={() => {
                            tap();
                            setShowHistory(!showHistory);
                        }}
                        className="h-9 px-3 rounded-full
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-[11px] font-bold
                                   text-slate-600 dark:text-slate-300
                                   flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <History className="h-3.5 w-3.5" />
                        {showHistory ? "Hide" : "Show"} role change history
                    </button>

                    {showHistory && (
                        <div className="mt-2 space-y-1.5">
                            {roleHistory.length === 0 ? (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2">
                                    No role changes recorded yet.
                                </p>
                            ) : (
                                roleHistory.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex flex-wrap items-center justify-between gap-2
                                                   rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5"
                                    >
                                        <div className="flex items-center gap-1.5 text-[11px] min-w-0">
                                            <span className="capitalize font-bold text-slate-900 dark:text-white truncate">
                                                {entry.old_role}
                                            </span>
                                            <span className="text-slate-400 dark:text-slate-500">→</span>
                                            <span className="capitalize font-bold text-slate-900 dark:text-white truncate">
                                                {entry.new_role}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                                            {new Date(entry.changed_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── CONFIRM MODAL ────────────────────────────────── */}
            <CenteredModal
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                title="Confirm role change"
                subtitle="Your app data will be cleared"
                maxWidthClass="max-w-md"
                maxHeight="80vh"
                locked={isLoading}
                footer={
                    <div className="flex items-center gap-2 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={isLoading}
                            className="flex-1 h-10 rounded-xl
                                       bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-50 disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleRoleChange}
                            disabled={isLoading}
                            className="flex-1 h-10 rounded-xl bg-rose-600 text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-1.5
                                       active:scale-[0.97] transition-transform
                                       disabled:opacity-50 disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Updating…
                                </>
                            ) : (
                                "Yes, change role"
                            )}
                        </button>
                    </div>
                }
            >
                <div className="px-4 pb-2 space-y-3">
                    {/* Warning banner */}
                    <div className="flex items-start gap-2 rounded-xl
                                    bg-rose-50 dark:bg-rose-400/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                                This will clear all saved app data
                            </p>
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">
                                You'll start fresh with your new role after the page reloads,
                                and cannot change roles again for {ROLE_COOLDOWN_DAYS} days.
                            </p>
                        </div>
                    </div>

                    {/* From → To */}
                    <div className="flex items-center justify-center gap-3 rounded-xl
                                    bg-slate-50 dark:bg-[#0d1117] p-3">
                        <div className="flex flex-col items-center min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider
                                             text-slate-500 dark:text-slate-400 mb-0.5">
                                From
                            </span>
                            <span className="text-sm font-bold capitalize text-slate-900 dark:text-white truncate">
                                {currentRole || "—"}
                            </span>
                        </div>
                        <span className="text-slate-400 dark:text-slate-500">→</span>
                        <div className="flex flex-col items-center min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider
                                             text-slate-500 dark:text-slate-400 mb-0.5">
                                To
                            </span>
                            <span className="text-sm font-bold capitalize
                                             text-emerald-600 dark:text-emerald-400 truncate">
                                {selectedRole || "—"}
                            </span>
                        </div>
                    </div>

                    {/* What will happen */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400">
                            What will happen
                        </p>
                        <ul className="space-y-1">
                            {[
                                "Clear all saved app data (localStorage, sessionStorage, IndexedDB, caches)",
                                "Update your role in the database",
                                "Refresh the page to apply changes",
                                `Lock further role changes for ${ROLE_COOLDOWN_DAYS} days`,
                            ].map((item, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-[11px]
                                               text-slate-600 dark:text-slate-300 leading-relaxed"
                                >
                                    <span className="mt-1 h-1 w-1 rounded-full
                                                     bg-slate-400 dark:bg-slate-500 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400
                                  text-center leading-relaxed">
                        This action cannot be undone.
                    </p>
                </div>
            </CenteredModal>
        </>
    );
}

export default RoleSwitch;