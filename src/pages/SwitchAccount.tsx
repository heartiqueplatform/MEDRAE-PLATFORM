// src/pages/SwitchAccount.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import {
    getLinkedRoles,
    buildShadowEmail,
    type Role,
} from "@/lib/multiAccount";
import {
    Loader2,
    Lock,
    ArrowLeft,
    Eye,
    EyeOff,
    ShieldCheck,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Logging
   ───────────────────────────────────────────────────────────── */
const LOG = (label: string, ...args: any[]) =>
    console.log(
        `%c[SwitchAccount] ${label}`,
        "color:#9C27B0;font-weight:bold",
        ...args
    );
const WARN = (label: string, ...args: any[]) =>
    console.warn(
        `%c[SwitchAccount] ${label}`,
        "color:#FF9800;font-weight:bold",
        ...args
    );
const ERR = (label: string, ...args: any[]) =>
    console.error(
        `%c[SwitchAccount] ${label}`,
        "color:#F44336;font-weight:bold",
        ...args
    );

/* ─────────────────────────────────────────────────────────────
   Config
   ───────────────────────────────────────────────────────────── */
const ROLE_LABEL: Record<Role, string> = {
    student: "Student",
    tutor: "Tutor",
    staff: "Staff",
};

const ROLE_HOME: Record<Role, string> = {
    student: "/dashboard/student",
    tutor: "/dashboard/tutor",
    staff: "/dashboard/staff",
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function SwitchAccount() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const targetRole = (params.get("role") || "") as Role;

    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [baseEmail, setBaseEmail] = useState("");
    const [targetEmail, setTargetEmail] = useState("");
    const [currentRole, setCurrentRole] = useState<string>("");
    const [initError, setInitError] = useState<string>("");
    const [initDone, setInitDone] = useState(false);

    /* ─── On mount: resolve which email to sign in with ───────── */
    useEffect(() => {
        LOG("useEffect → start", { targetRole });
        let cancelled = false;

        (async () => {
            try {
                LOG("Step 1: getting current session (localStorage, no network)");
                const t1 = Date.now();
                const { data: sessionData, error: sessionError } =
                    await supabase.auth.getSession();
                const currentUserId = sessionData?.session?.user?.id ?? null;
                LOG(`Step 1: session fetched in ${Date.now() - t1}ms`, {
                    hasSession: !!sessionData?.session,
                    userId: currentUserId,
                    userEmail: sessionData?.session?.user?.email,
                    error: sessionError?.message,
                });
                if (!currentUserId) {
                    if (!cancelled) {
                        setInitError(
                            "You're not signed in. Please log in first."
                        );
                        setInitDone(true);
                    }
                    return;
                }

                LOG("Step 2: fetching profile");
                const t2 = Date.now();
                const { data: prof, error: profErr } = await supabase
                    .from("profiles")
                    .select("email, role")
                    .eq("user_id", currentUserId)
                    .maybeSingle();
                LOG(`Step 2: profile fetched in ${Date.now() - t2}ms`, {
                    prof,
                    error: profErr?.message,
                });

                if (!prof?.email) {
                    if (!cancelled) {
                        setInitError(
                            "We couldn't load your profile. Please refresh and try again."
                        );
                        setInitDone(true);
                    }
                    return;
                }

                LOG("Step 3: getting linked roles");
                const t3 = Date.now();
                const { roles, primaryUserId } = await getLinkedRoles(
                    currentUserId
                );
                LOG(`Step 3: roles fetched in ${Date.now() - t3}ms`, {
                    roles,
                    primaryUserId,
                });

                const target = roles.find((r) => r.role === targetRole);
                if (!target) {
                    if (!cancelled) {
                        setInitError(
                            `You don't have a ${ROLE_LABEL[targetRole] || targetRole
                            } profile yet.`
                        );
                        setInitDone(true);
                    }
                    return;
                }

                const loginEmail =
                    target.linked_user_id === primaryUserId
                        ? prof.email
                        : buildShadowEmail(prof.email, targetRole);
                LOG("Step 4: resolved emails", {
                    baseEmail: prof.email,
                    loginEmail,
                });

                if (!cancelled) {
                    setBaseEmail(prof.email);
                    setCurrentRole(prof.role || "");
                    setTargetEmail(loginEmail);
                    setInitDone(true);
                }
                LOG("useEffect → init complete");
            } catch (err: any) {
                ERR("useEffect → exception", err?.message, err);
                if (!cancelled) {
                    setInitError(
                        err?.message ||
                        "Something went wrong. Please refresh and try again."
                    );
                    setInitDone(true);
                }
            }
        })();

        return () => {
            cancelled = true;
            LOG("useEffect → cleanup");
        };
    }, [targetRole]);

    /* ─── Submit: sign in directly (replaces current session) ─── */
    async function handleSubmit() {
        LOG("handleSubmit → start", {
            targetRole,
            targetEmail,
            passwordLength: password.length,
        });
        if (!password || !targetEmail) {
            WARN("handleSubmit → missing password or email");
            return;
        }

        setIsLoading(true);

        const hardTimeout = setTimeout(() => {
            WARN("handleSubmit → hard timeout fired (30s)");
            setIsLoading(false);
            toast({
                title: "Switch is taking too long",
                description: "Please refresh the page and try again.",
                variant: "destructive",
            });
        }, 30000);

        try {
            LOG("handleSubmit → signIn (15s timeout)", { targetEmail });
            const tSi = Date.now();
            const signInResult: any = await Promise.race([
                supabase.auth.signInWithPassword({
                    email: targetEmail,
                    password,
                }),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error("signIn timeout")),
                        15000
                    )
                ),
            ]);
            LOG(`handleSubmit → signIn resolved in ${Date.now() - tSi}ms`, {
                hasError: !!signInResult?.error,
                errorMessage: signInResult?.error?.message,
                userId: signInResult?.data?.user?.id,
                userEmail: signInResult?.data?.user?.email,
                hasSession: !!signInResult?.data?.session,
            });

            if (signInResult?.error || !signInResult?.data?.user) {
                throw new Error(
                    signInResult?.error?.message ||
                    "That password doesn't match this profile. Please try again."
                );
            }

            LOG("handleSubmit → verifying new profile role");
            const { data: newProf } = await supabase
                .from("profiles")
                .select("role")
                .eq("user_id", signInResult.data.user.id)
                .maybeSingle();
            LOG("handleSubmit → new profile", newProf);

            if (newProf?.role && newProf.role !== targetRole) {
                throw new Error(
                    "That profile didn't load correctly. Please try again."
                );
            }

            clearTimeout(hardTimeout);
            LOG(
                "handleSubmit → SUCCESS, redirecting to",
                ROLE_HOME[targetRole]
            );
            toast({
                title: `You're now in your ${ROLE_LABEL[targetRole]
                    } profile`,
                description: "Taking you to your dashboard…",
            });

            window.location.replace(
                `${ROLE_HOME[targetRole]}?switched=${Date.now()}`
            );
        } catch (err: any) {
            clearTimeout(hardTimeout);
            ERR("handleSubmit → exception", err?.message, err);
            toast({
                title: "Couldn't switch profiles",
                description: err?.message || "Please try again in a moment.",
                variant: "destructive",
            });
            setIsLoading(false);
            // Stay on page so user can retry
        }
    }

    /* ─── Render ──────────────────────────────────────────────── */
    const roleLabel = ROLE_LABEL[targetRole] || targetRole;

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0d1117] flex flex-col">
            {/* ── Floating back button (top-left of screen) ── */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-[#161b22] disabled:opacity-50"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            {/* ── Centered card ── */}
            <div className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md">
                    {!initDone ? (
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center justify-center min-h-[320px]">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Loading your profiles…
                            </p>
                        </div>
                    ) : initError ? (
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                    <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                        Couldn't switch profiles
                                    </h2>
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        {initError}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="w-full h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-sm font-bold active:scale-[0.97] transition-transform"
                            >
                                Go back
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 space-y-6">
                            {/* ── Card header ── */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-400/10 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none mb-1.5">
                                            Switch profile
                                        </p>
                                        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                            Switch to {roleLabel}
                                        </h1>
                                    </div>
                                </div>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    {currentRole ? (
                                        <>
                                            You're currently signed in as{" "}
                                            <span className="capitalize font-semibold text-slate-700 dark:text-slate-200">
                                                {currentRole}
                                            </span>
                                            . Enter your {roleLabel} password to
                                            switch into that profile. Your
                                            other profiles stay exactly as they
                                            are.
                                        </>
                                    ) : (
                                        <>
                                            Enter your {roleLabel} password to
                                            switch into that profile.
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* ── Password field ── */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="password"
                                    className="text-[11px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1"
                                >
                                    {roleLabel} Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                                    <Input
                                        id="password"
                                        type={showPw ? "text" : "password"}
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                password &&
                                                !isLoading
                                            ) {
                                                handleSubmit();
                                            }
                                        }}
                                        placeholder={`Enter your ${roleLabel.toLowerCase()} password`}
                                        disabled={isLoading}
                                        className="pl-11 pr-11 h-12 w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all text-sm"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                        tabIndex={-1}
                                    >
                                        {showPw ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed pl-1 pt-0.5">
                                    Each profile has its own password. This is
                                    the one you chose when you created your{" "}
                                    {roleLabel.toLowerCase()} profile.
                                </p>
                            </div>

                            {/* ── Actions ── */}
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    disabled={isLoading}
                                    className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
                                >
                                    Stay as{" "}
                                    <span className="capitalize">
                                        {currentRole || "current"}
                                    </span>
                                </button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !password}
                                    className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Switching…
                                        </>
                                    ) : (
                                        `Switch to ${roleLabel}`
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Small reassurance below card ── */}
                    {initDone && !initError && (
                        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4 px-4 leading-relaxed">
                            Nothing is lost when you switch — you can return to{" "}
                            <span className="capitalize font-medium text-slate-500 dark:text-slate-400">
                                {currentRole || "your current profile"}
                            </span>{" "}
                            any time.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}