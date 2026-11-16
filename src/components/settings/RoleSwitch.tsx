// src/components/settings/RoleSwitch.tsx
"use client";

import { useState, useEffect } from "react";
import {
    GraduationCap,
    UserCheck,
    Stethoscope,
    Shield,
    RefreshCw,
    Plus,
    CheckCircle2,
    Eye,
    EyeOff,
    AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";
import {
    getLinkedRoles,
    createLinkedRole,
    navigateToSwitchAccount,
    type Role,
} from "@/lib/multiAccount";
import {
    cachedUser,
    cachedProfile,
    cachedRoles,
} from "@/lib/settingsCache";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    try {
        playSound("ui-tap");
    } catch {
        /* no-op */
    }
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Role definitions                                                  */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS: {
    id: Role;
    label: string;
    icon: any;
    description: string;
    accent: "blue" | "emerald" | "violet";
}[] = [
        {
            id: "student",
            label: "Student",
            icon: GraduationCap,
            description: "Learn and take exams",
            accent: "blue",
        },
        {
            id: "tutor",
            label: "Tutor",
            icon: UserCheck,
            description: "Teach and create content",
            accent: "emerald",
        },
        {
            id: "staff",
            label: "Staff",
            icon: Stethoscope,
            description: "Manage the platform",
            accent: "violet",
        },
    ];

interface RoleSwitchProps {
    currentRole?: string;
    userId?: string;
    onRoleChange?: () => void;
}

export function RoleSwitch({ currentRole, userId }: RoleSwitchProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [roles, setRoles] = useState<{ role: Role; userId: string }[]>([]);
    const [email, setEmail] = useState<string>("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // True once we have a definitive answer (from cache or network).
    // While false, we don't know which roles exist — render skeletons, not "Add".
    const [rolesLoaded, setRolesLoaded] = useState(false);

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [targetRole, setTargetRole] = useState<Role | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw, setShowPw] = useState(false);

    useEffect(() => {
        loadRoles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    async function loadRoles() {
        /* ─── Step 1: Paint from cache IMMEDIATELY ────────────── */
        const cProfile = cachedProfile.get();
        const cRoles = cachedRoles.get();

        if (cProfile?.email) {
            setEmail(cProfile.email);
        }
        if (cRoles && cRoles.length > 0) {
            setRoles(cRoles as { role: Role; userId: string }[]);
            // Non-empty cache is authoritative enough to render Switch/Add.
            setRolesLoaded(true);
        }

        /* ─── Step 2: Background refresh ──────────────────────── */
        setIsRefreshing(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setIsRefreshing(false);
                setRolesLoaded(true);
                return;
            }
            cachedUser.set({ id: user.id, email: user.email || "" });

            const { data: prof, error: profErr } = await supabase
                .from("profiles")
                .select("email, role")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!profErr && prof?.email) {
                setEmail(prof.email);
                cachedProfile.set({
                    email: prof.email,
                    role: prof.role || "",
                });
            }

            const { roles: linked } = await getLinkedRoles(user.id);
            const mapped = linked.map((r) => ({
                role: r.role,
                userId: r.linked_user_id,
            }));

            setRoles(mapped);
            cachedRoles.set(mapped);
            setRolesLoaded(true);
        } catch (err: any) {
            if (!cProfile && (!cRoles || cRoles.length === 0)) {
                toast({
                    title: "Couldn't refresh profiles",
                    description:
                        "Showing last known data. Pull down or refresh to retry.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsRefreshing(false);
            // Whatever happened, stop showing skeletons — either we have
            // cache, or the network failed and we show last known state.
            setRolesLoaded(true);
        }
    }

    /**
     * Tri-state:
     *   null  → roles still loading → render skeleton
     *   true  → role exists → show "Switch"
     *   false → role doesn't exist → show "Add"
     */
    function hasRole(roleId: Role): boolean | null {
        if (!rolesLoaded) return null;
        return roles.some((r) => r.role === roleId);
    }

    function handleCardClick(roleId: Role) {
        if (roleId === currentRole) return;
        tap();

        const exists = hasRole(roleId);
        if (exists === null) return; // still loading — ignore

        if (exists) {
            navigateToSwitchAccount(roleId);
        } else {
            setTargetRole(roleId);
            setNewPassword("");
            setConfirmPassword("");
            setShowPw(false);
            setShowCreate(true);
        }
    }

    async function handleCreate() {
        if (!targetRole) return;

        if (newPassword.length < 6) {
            tap("warning");
            toast({
                title: "Password too short",
                description: "Please use at least 6 characters.",
                variant: "destructive",
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            tap("warning");
            toast({
                title: "Passwords don't match",
                description: "Please make sure both fields are the same.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await createLinkedRole(email, newPassword, targetRole);

            // Invalidate cache so the next Settings visit fetches fresh data.
            cachedRoles.clear();
            cachedProfile.clear();
            setRolesLoaded(false);

            toast({
                title: `${capitalize(targetRole)} profile created`,
                description: "Now confirm your password to switch in.",
            });

            setShowCreate(false);
            navigateToSwitchAccount(targetRole);
        } catch (err: any) {
            tap("warning");
            toast({
                title: "Couldn't add profile",
                description:
                    err.message ||
                    "Something went wrong. Please try again in a moment.",
                variant: "destructive",
            });
            setIsLoading(false);
            setShowCreate(false);
        }
    }

    return (
        <>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-4">
                {/* ── HEADER ─────────────────────────────── */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0">
                            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 leading-none mb-1">
                                Account
                            </p>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                Your profiles
                            </h2>
                        </div>
                        {isRefreshing && (
                            <RefreshCw className="h-3 w-3 text-slate-400 animate-spin shrink-0" />
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                        Add up to 3 profiles to one email. Each profile keeps its own
                        data, progress, and password — nothing is shared between them.
                    </p>
                </div>

                {/* ── CURRENT PROFILE PILL ───────────────── */}
                {currentRole && (
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Currently signed in as
                        </span>
                        <span className="text-[11px] font-bold capitalize text-blue-600 dark:text-blue-400">
                            {currentRole}
                        </span>
                    </div>
                )}

                {/* ── ROLE CARDS ─────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map((role) => {
                        const Icon = role.icon;
                        const isActive = currentRole === role.id;
                        const exists = hasRole(role.id);

                        const accent =
                            role.accent === "blue"
                                ? {
                                    bg: "bg-blue-50 dark:bg-blue-400/10",
                                    fg: "text-blue-600 dark:text-blue-400",
                                }
                                : role.accent === "emerald"
                                    ? {
                                        bg: "bg-emerald-50 dark:bg-emerald-400/10",
                                        fg: "text-emerald-600 dark:text-emerald-400",
                                    }
                                    : {
                                        bg: "bg-violet-50 dark:bg-violet-400/10",
                                        fg: "text-violet-600 dark:text-violet-400",
                                    };

                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => handleCardClick(role.id)}
                                disabled={isActive || isLoading || exists === null}
                                className={`text-left rounded-xl p-3 flex flex-col items-center gap-2 transition-colors ${isActive
                                    ? "bg-blue-600 text-white cursor-default"
                                    : "bg-slate-50 dark:bg-[#0d1117] active:bg-slate-100 dark:active:bg-white/[0.1]"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${isActive ? "bg-white/20" : accent.bg
                                        }`}
                                >
                                    <Icon
                                        className={`h-5 w-5 ${isActive ? "text-white" : accent.fg
                                            }`}
                                    />
                                </div>
                                <span
                                    className={`text-[12px] font-bold ${isActive
                                        ? "text-white"
                                        : "text-slate-900 dark:text-white"
                                        }`}
                                >
                                    {role.label}
                                </span>
                                <span
                                    className={`text-[10px] text-center leading-tight ${isActive
                                        ? "text-white/80"
                                        : "text-slate-500 dark:text-slate-400"
                                        }`}
                                >
                                    {role.description}
                                </span>

                                {/* ── Tri-state badge ── */}
                                {isActive ? (
                                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white flex items-center gap-1">
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        Active
                                    </span>
                                ) : exists === null ? (
                                    // Unknown yet — skeleton pill, same height
                                    // as the real badges, so the card doesn't jump.
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center min-w-[52px]"
                                        aria-hidden="true"
                                    >
                                        <span className="inline-block h-2 w-8 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
                                    </span>
                                ) : exists ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400">
                                        Switch
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                        <Plus className="h-2.5 w-2.5" />
                                        Add
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── INFO PANEL ─────────────────────────── */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                    <div className="flex items-start gap-2">
                        <Shield className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                Good to know
                            </p>
                            <ul className="mt-1 space-y-0.5">
                                {[
                                    "Each profile has its own password",
                                    "Switching asks for the target profile's password",
                                    "Progress and data stay separate for every profile",
                                    "One profile per role — up to 3 total",
                                ].map((item, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed"
                                    >
                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
          CREATE MODAL — only for adding a new role
          ═══════════════════════════════════════════════ */}
            <CenteredModal
                open={showCreate}
                onClose={() => {
                    if (!isLoading) setShowCreate(false);
                }}
                title={`Add ${capitalize(targetRole ?? "")} profile`}
                subtitle="Choose a password for this profile"
                maxWidthClass="max-w-md"
                maxHeight="80vh"
                locked={isLoading}
                footer={
                    <div className="flex items-center gap-2 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            disabled={isLoading}
                            className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isLoading}
                            className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Adding…
                                </>
                            ) : (
                                "Add profile"
                            )}
                        </button>
                    </div>
                }
            >
                <div className="px-4 pb-2 space-y-3">
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            Use a <strong>different password</strong> than your other
                            profiles. That way if one is compromised, the others stay
                            safe.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Password for {capitalize(targetRole ?? "")}
                        </label>
                        <div className="relative">
                            <input
                                type={showPw ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1117] px-3 pr-10 text-sm"
                                placeholder="At least 6 characters"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
                            >
                                {showPw ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Confirm password
                        </label>
                        <input
                            type={showPw ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1117] px-3 text-sm"
                            placeholder="Repeat password"
                            autoComplete="new-password"
                        />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        This profile will have its own dashboard, data, and settings.
                        You can switch to it any time from this page.
                    </p>
                </div>
            </CenteredModal>
        </>
    );
}

/* ---------- tiny helper ---------- */
function capitalize(s: string): string {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default RoleSwitch;