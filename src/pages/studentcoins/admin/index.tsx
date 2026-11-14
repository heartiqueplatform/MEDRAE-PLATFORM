"use client";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import {
    ChevronLeft, Check, X, Ban, RotateCcw, Loader2, RefreshCw, Users,
    Settings as SettingsIcon, Save,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type Row = {
    user_id: string;
    status: "pending" | "approved" | "rejected" | "suspended";
    reason: string | null;
    notes: string | null;
    applied_at: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    balance: number | null;
};

type Config = {
    ksh_per_coin: number;
    min_redeem_coins: number;
    max_redeem_coins: number;
    redemption_enabled: boolean;
    updated_at: string | null;
    updated_by: string | null;
};

const TABS = ["pending", "approved", "suspended", "rejected", "config"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
    pending: "Pending",
    approved: "Approved",
    suspended: "Suspended",
    rejected: "Rejected",
    config: "Config",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
    approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
    suspended: { label: "Suspended", color: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" },
    rejected: { label: "Rejected", color: "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function CoinsAdminPage() {
    const navigate = useNavigate();
    const home = useHomeRoute();

    const [tab, setTab] = useState<Tab>("pending");
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    /* Config state (only loaded when tab === "config") */
    const [config, setConfig] = useState<Config | null>(null);
    const [configLoading, setConfigLoading] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);
    const [editRate, setEditRate] = useState("");
    const [editMin, setEditMin] = useState("");
    const [editMax, setEditMax] = useState("");
    const [editEnabled, setEditEnabled] = useState(true);

    /* ---------- Loaders ---------- */
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("admin_list_enrollments", {
                p_status: tab === "config" ? "pending" : tab, // Config tab doesn't need user rows
            });
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || "failed");
            setRows((data.rows || []) as Row[]);
        } catch (e: any) {
            toast.error("Could not load", { description: e?.message });
        } finally {
            setLoading(false);
        }
    }, [tab]);

    const loadConfig = useCallback(async () => {
        setConfigLoading(true);
        try {
            const { data, error } = await supabase.rpc("admin_get_config");
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || "failed");
            const c = data.config as Config;
            setConfig(c);
            setEditRate(String(c.ksh_per_coin));
            setEditMin(String(c.min_redeem_coins));
            setEditMax(String(c.max_redeem_coins));
            setEditEnabled(c.redemption_enabled);
        } catch (e: any) {
            toast.error("Could not load config", { description: e?.message });
        } finally {
            setConfigLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === "config") {
            loadConfig();
        } else {
            load();
        }
    }, [tab, load, loadConfig]);

    /* ---------- Actions ---------- */
    const act = async (
        userId: string,
        action: "approve" | "reject" | "suspend" | "reinstate",
        notes?: string
    ) => {
        if (busyId) return;
        setBusyId(userId);
        playSound("ui-tap");
        try {
            const { data, error } = await supabase.rpc("admin_review_enrollment", {
                p_user_id: userId,
                p_action: action,
                p_notes: notes ?? null,
            });
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || "failed");
            toast.success(`User ${action}d`);
            await load();
        } catch (e: any) {
            toast.error("Action failed", { description: e?.message });
        } finally {
            setBusyId(null);
        }
    };

    const selfEnroll = async () => {
        if (busyId) return;
        setBusyId("self");
        try {
            const { data, error } = await supabase.rpc("admin_self_enroll");
            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || "failed");
            toast.success("You're now enrolled — start earning!");
            await load();
        } catch (e: any) {
            toast.error("Failed", { description: e?.message });
        } finally {
            setBusyId(null);
        }
    };

    const saveConfig = async () => {
        if (configSaving) return;

        const rate = parseFloat(editRate);
        const min = parseInt(editMin, 10);
        const max = parseInt(editMax, 10);

        if (isNaN(rate) || rate <= 0) {
            toast.error("Invalid rate", { description: "Enter a positive number for KSh per coin" });
            return;
        }
        if (isNaN(min) || min < 1) {
            toast.error("Invalid minimum", { description: "Minimum must be at least 1 coin" });
            return;
        }
        if (isNaN(max) || max < min) {
            toast.error("Invalid maximum", { description: "Maximum must be ≥ minimum" });
            return;
        }

        playSound("ui-tap");
        setConfigSaving(true);
        try {
            const { data, error } = await supabase.rpc("admin_update_config", {
                p_ksh_per_coin: rate,
                p_min_redeem_coins: min,
                p_max_redeem_coins: max,
                p_redemption_enabled: editEnabled,
            });
            if (error) throw error;
            if (!data?.ok) {
                throw new Error(
                    `${data?.error || "failed"}${data?.message ? " — " + data.message : ""
                    }`
                );
            }
            toast.success("Config updated", {
                description: "Changes apply immediately to all students.",
            });
            playSound("notification");
            await loadConfig();
        } catch (e: any) {
            toast.error("Could not save", { description: e?.message });
        } finally {
            setConfigSaving(false);
        }
    };

    /* ---------- Derived ---------- */
    const ratePreview = parseFloat(editRate || "0");
    const example100 = isNaN(ratePreview) ? 0 : Math.round(100 * ratePreview * 100) / 100;
    const example1000 = isNaN(ratePreview) ? 0 : Math.round(1000 * ratePreview * 100) / 100;
    const example10000 = isNaN(ratePreview) ? 0 : Math.round(10000 * ratePreview * 100) / 100;

    /* ---------- Render ---------- */
    return (
        <div
            className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* Header */}
            <header
                className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30 safe-top"
            >
                <button
                    onClick={() => { playSound("ui-tap"); navigate(home, { replace: true }); }}
                    aria-label="Go home"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>

                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                        Coin Program Admin
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Approve, reject, or suspend students
                    </p>
                </div>

                <button
                    onClick={() => { playSound("ui-tap"); tab === "config" ? loadConfig() : load(); }}
                    disabled={loading || configLoading}
                    aria-label="Refresh"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors disabled:opacity-50"
                    style={{ touchAction: "manipulation" }}
                >
                    <RefreshCw
                        className={`h-4 w-4 ${loading || configLoading ? "animate-spin" : ""}`}
                        strokeWidth={2.5}
                    />
                </button>
            </header>

            {/* Scrollable body */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-3 pt-4 pb-24 space-y-4">

                    {/* Self-enroll shortcut — only on non-config tabs */}
                    {tab !== "config" && (
                        <button
                            onClick={selfEnroll}
                            disabled={busyId === "self"}
                            className="w-full p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10
                                       border border-blue-100 dark:border-blue-500/20
                                       text-left active:scale-[0.99] transition
                                       disabled:opacity-60"
                            style={{ touchAction: "manipulation" }}
                        >
                            <p className="text-[12px] font-bold text-blue-800 dark:text-blue-300">
                                Approve myself (admin shortcut)
                            </p>
                            <p className="text-[11px] text-blue-700/80 dark:text-blue-300/70 mt-0.5 leading-snug">
                                Instantly enroll yourself so you can start earning coins too.
                            </p>
                        </button>
                    )}

                    {/* Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-white/[0.06] rounded-2xl gap-1
                                    overflow-x-auto no-scrollbar">
                        {TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => { playSound("ui-tap"); setTab(t); }}
                                className={`relative shrink-0 min-w-[78px] px-2 py-2 rounded-xl
                                            text-[10px] font-bold uppercase tracking-wider whitespace-nowrap
                                            transition-colors inline-flex items-center justify-center gap-1
                                            ${tab === t
                                        ? "bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-sm"
                                        : "text-slate-600 dark:text-slate-400"
                                    }`}
                                style={{ touchAction: "manipulation" }}
                            >
                                {t === "config" && <SettingsIcon className="w-3 h-3 shrink-0" />}
                                {TAB_LABELS[t]}
                            </button>
                        ))}
                    </div>

                    {/* ── CONFIG TAB ── */}
                    {tab === "config" && (
                        <div className="space-y-4">
                            {configLoading || !config ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="h-20 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Rate section */}
                                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                        <div>
                                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                Coin rate
                                            </h2>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                How much KSh 1 coin is worth. Changes apply to everyone immediately.
                                            </p>
                                        </div>

                                        <label className="block">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider
                                                             text-slate-500 dark:text-slate-400 mb-1.5">
                                                KSh per coin
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.0001"
                                                    min="0.000001"
                                                    max="100"
                                                    value={editRate}
                                                    onChange={(e) => setEditRate(e.target.value)}
                                                    className="flex-1 h-11 px-3 rounded-xl
                                                               bg-slate-50 dark:bg-[#0d1117]
                                                               text-sm font-bold tabular-nums
                                                               text-slate-900 dark:text-white
                                                               border-0 outline-none
                                                               focus:ring-2 focus:ring-blue-500/40"
                                                />
                                                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                                    KSh
                                                </span>
                                            </div>
                                        </label>

                                        {/* Live preview */}
                                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-slate-500 dark:text-slate-400 mb-1">
                                                Value preview
                                            </p>
                                            <PreviewRow coins={100} ksh={example100} />
                                            <PreviewRow coins={1000} ksh={example1000} />
                                            <PreviewRow coins={10000} ksh={example10000} />
                                        </div>
                                    </section>

                                    {/* Limits section */}
                                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                        <div>
                                            <h2 className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                Redemption limits
                                            </h2>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                Minimum and maximum coins a student can redeem in one request.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider
                                                                 text-slate-500 dark:text-slate-400 mb-1.5">
                                                    Minimum
                                                </span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    value={editMin}
                                                    onChange={(e) => setEditMin(e.target.value)}
                                                    className="w-full h-11 px-3 rounded-xl
                                                               bg-slate-50 dark:bg-[#0d1117]
                                                               text-sm font-bold tabular-nums
                                                               text-slate-900 dark:text-white
                                                               border-0 outline-none
                                                               focus:ring-2 focus:ring-blue-500/40"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="block text-[10px] font-bold uppercase tracking-wider
                                                                 text-slate-500 dark:text-slate-400 mb-1.5">
                                                    Maximum
                                                </span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    value={editMax}
                                                    onChange={(e) => setEditMax(e.target.value)}
                                                    className="w-full h-11 px-3 rounded-xl
                                                               bg-slate-50 dark:bg-[#0d1117]
                                                               text-sm font-bold tabular-nums
                                                               text-slate-900 dark:text-white
                                                               border-0 outline-none
                                                               focus:ring-2 focus:ring-blue-500/40"
                                                />
                                            </label>
                                        </div>
                                    </section>

                                    {/* Redemption enabled */}
                                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                    Redemption enabled
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                    Turn off to freeze all redemptions (students can still earn).
                                                </p>
                                            </div>
                                            <button
                                                role="switch"
                                                aria-checked={editEnabled}
                                                onClick={() => { playSound("ui-tap"); setEditEnabled(!editEnabled); }}
                                                className={`relative inline-flex shrink-0 items-center
                                                            h-6 w-11 rounded-full transition-colors
                                                            ${editEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-white/[0.12]"}`}
                                                style={{ touchAction: "manipulation" }}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm
                                                                transform transition-transform duration-200
                                                                ${editEnabled ? "translate-x-[22px]" : "translate-x-[2px]"}`}
                                                />
                                            </button>
                                        </div>
                                    </section>

                                    {/* Save button */}
                                    <button
                                        onClick={saveConfig}
                                        disabled={configSaving}
                                        className="w-full h-12 rounded-xl
                                                   bg-blue-600 text-white text-sm font-bold
                                                   flex items-center justify-center gap-2
                                                   active:scale-[0.98] transition-transform
                                                   disabled:opacity-50"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {configSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving…
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save changes
                                            </>
                                        )}
                                    </button>

                                    {/* Last updated */}
                                    {config.updated_at && (
                                        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 pt-1">
                                            Last updated{" "}
                                            {new Date(config.updated_at).toLocaleString("en-KE", {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                            })}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── USER LIST TABS (pending / approved / suspended / rejected) ── */}
                    {tab !== "config" && (
                        <>
                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
                                    ))}
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400
                                                flex flex-col items-center gap-2">
                                    <Users className="w-8 h-8 opacity-40" />
                                    <p>No {tab} users</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rows.map((r) => {
                                        const meta = STATUS_META[r.status];
                                        const isBusy = busyId === r.user_id;

                                        return (
                                            <div
                                                key={r.user_id}
                                                className="bg-white dark:bg-[#161b22] rounded-2xl p-3 shadow-sm
                                                           min-w-0 overflow-hidden"
                                            >
                                                {/* Row header */}
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="h-11 w-11 rounded-full overflow-hidden
                                                                    bg-slate-200 dark:bg-slate-800
                                                                    flex items-center justify-center shrink-0">
                                                        {r.avatar_url ? (
                                                            <img
                                                                src={r.avatar_url}
                                                                className="h-full w-full object-cover"
                                                                alt=""
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <span className="text-[13px] font-bold text-slate-500">
                                                                {r.name?.[0]?.toUpperCase() || "?"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                                            {r.name || "Unknown"}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                            @{r.username || "user"}
                                                        </p>
                                                        {r.reason && (
                                                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400
                                                                          mt-1 line-clamp-2 break-words">
                                                                {r.reason}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <span
                                                        className={`shrink-0 whitespace-nowrap
                                                                    text-[9px] font-bold uppercase tracking-wider
                                                                    px-2 py-0.5 rounded-full ${meta.color}`}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 mt-3 min-w-0">
                                                    {r.status === "pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => act(r.user_id, "approve")}
                                                                disabled={isBusy}
                                                                className="flex-1 min-w-0 h-9 rounded-xl
                                                                           bg-emerald-600 text-white
                                                                           text-[12px] font-bold
                                                                           flex items-center justify-center gap-1.5
                                                                           active:scale-[0.97] transition-transform
                                                                           disabled:opacity-50"
                                                                style={{ touchAction: "manipulation" }}
                                                            >
                                                                {isBusy
                                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                                                    : <Check className="w-3.5 h-3.5 shrink-0" />}
                                                                <span className="truncate">Approve</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const note = prompt("Reason for rejection?") || "";
                                                                    act(r.user_id, "reject", note);
                                                                }}
                                                                disabled={isBusy}
                                                                className="flex-1 min-w-0 h-9 rounded-xl
                                                                           bg-rose-600 text-white
                                                                           text-[12px] font-bold
                                                                           flex items-center justify-center gap-1.5
                                                                           active:scale-[0.97] transition-transform
                                                                           disabled:opacity-50"
                                                                style={{ touchAction: "manipulation" }}
                                                            >
                                                                <X className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">Reject</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === "approved" && (
                                                        <button
                                                            onClick={() => act(r.user_id, "suspend", prompt("Why suspend?") || "")}
                                                            disabled={isBusy}
                                                            className="flex-1 min-w-0 h-9 rounded-xl
                                                                       bg-amber-600 text-white
                                                                       text-[12px] font-bold
                                                                       flex items-center justify-center gap-1.5
                                                                       active:scale-[0.97] transition-transform
                                                                       disabled:opacity-50"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            {isBusy
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                                                : <Ban className="w-3.5 h-3.5 shrink-0" />}
                                                            <span className="truncate">Suspend</span>
                                                        </button>
                                                    )}
                                                    {(r.status === "suspended" || r.status === "rejected") && (
                                                        <button
                                                            onClick={() => act(r.user_id, "reinstate")}
                                                            disabled={isBusy}
                                                            className="flex-1 min-w-0 h-9 rounded-xl
                                                                       bg-blue-600 text-white
                                                                       text-[12px] font-bold
                                                                       flex items-center justify-center gap-1.5
                                                                       active:scale-[0.97] transition-transform
                                                                       disabled:opacity-50"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            {isBusy
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                                                : <RotateCcw className="w-3.5 h-3.5 shrink-0" />}
                                                            <span className="truncate">Reinstate</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Preview helper                                                    */
/* ------------------------------------------------------------------ */

function PreviewRow({ coins, ksh }: { coins: number; ksh: number }) {
    return (
        <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500 dark:text-slate-400">
                {coins.toLocaleString()} coins
            </span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                KSh {ksh.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
    );
}