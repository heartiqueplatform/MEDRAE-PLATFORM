// src/staff-cpd/admin/CoinConfigPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
    Coins, Save, AlertCircle, ShieldCheck, Lock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMedraeCoinConfig } from "../lib/admin-hooks";
import { tap } from "../pages/shared";

/* ------------------------------------------------------------------ */
/*  ADMIN IDs                                                         */
/* ------------------------------------------------------------------ */
const COIN_ADMIN_IDS = [
    "25f37970-c9b9-4c15-b8a2-514a912e3261",
    "731974f9-5af2-44c3-bf13-547fc4c89209",
];

const InputBase =
    "w-full h-11 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium " +
    "text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";

const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
        {children}
    </label>
);

const Sk = "rounded bg-slate-100 dark:bg-white/[0.06] animate-pulse";

/* ------------------------------------------------------------------ */
/*  Skeletons                                                         */
/* ------------------------------------------------------------------ */
function SkeletonIntroCard() {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-xl shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-3 w-56 ${Sk}`} />
                    <div className={`h-2.5 w-72 ${Sk}`} />
                </div>
            </div>
        </section>
    );
}

function SkeletonWarningBanner() {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
            <div className="flex items-start gap-2.5">
                <div className={`h-9 w-9 rounded-xl shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className={`h-2.5 w-full ${Sk}`} />
                    <div className={`h-2.5 w-5/6 ${Sk}`} />
                    <div className={`h-2.5 w-3/4 ${Sk}`} />
                </div>
            </div>
        </section>
    );
}

function SkeletonField() {
    return (
        <div className="space-y-1.5">
            <div className={`h-2 w-28 ml-1 ${Sk}`} />
            <div className={`h-11 w-full rounded-xl ${Sk}`} />
            <div className={`h-2 w-48 ml-1 ${Sk}`} />
        </div>
    );
}

function SkeletonPage() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            <SkeletonIntroCard />
            <SkeletonWarningBanner />
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <SkeletonField />
                <SkeletonField />
                <SkeletonField />
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <div className={`h-2 w-24 ml-1 ${Sk}`} />
                        <div className={`h-11 w-full rounded-xl ${Sk}`} />
                    </div>
                    <div className="space-y-1.5">
                        <div className={`h-2 w-28 ml-1 ${Sk}`} />
                        <div className={`h-11 w-full rounded-xl ${Sk}`} />
                    </div>
                </div>
                <div className={`h-11 w-full rounded-xl ${Sk}`} />
                <div className={`mx-auto h-2 w-40 ${Sk}`} />
            </section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */
export default function CoinConfigPage() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const { data: config, isLoading, refetch } = useMedraeCoinConfig();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [coinToKes, setCoinToKes] = useState<string>("");
    const [coinsPerCompletion, setCoinsPerCompletion] = useState<string>("");
    const [minWithdrawal, setMinWithdrawal] = useState<string>("");
    const [maxActivities, setMaxActivities] = useState<string>("");
    const [maxSubmissionsMonth, setMaxSubmissionsMonth] = useState<string>("");

    /* Verify admin */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (cancelled) return;
            if (user && COIN_ADMIN_IDS.includes(user.id)) setIsAuthorized(true);
            setCheckingAuth(false);
        })();
        return () => { cancelled = true; };
    }, []);

    /* Seed form from config */
    useEffect(() => {
        if (!config) return;
        setCoinToKes(String(config.coin_to_kes_rate));
        setCoinsPerCompletion(String(config.coins_per_completion));
        setMinWithdrawal(String(config.minimum_withdrawal));
        setMaxActivities(String(config.max_activities_per_user));
        setMaxSubmissionsMonth(String(config.max_submissions_per_month));
    }, [config]);

    /* Save */
    const handleSave = useCallback(async () => {
        if (saving) return;
        setError(null);

        const numCoinToKes = parseFloat(coinToKes);
        const numCoins = parseInt(coinsPerCompletion, 10);
        const numMin = parseInt(minWithdrawal, 10);
        const numMaxAct = parseInt(maxActivities, 10);
        const numMaxSub = parseInt(maxSubmissionsMonth, 10);

        if (isNaN(numCoinToKes) || numCoinToKes <= 0 || numCoinToKes > 100) {
            setError("Coin-to-KES rate must be between 0.0001 and 100.");
            tap("warning");
            return;
        }
        if (isNaN(numCoins) || numCoins <= 0 || numCoins > 1000) {
            setError("Coins per completion must be between 1 and 1000.");
            tap("warning");
            return;
        }
        if (isNaN(numMin) || numMin <= 0) {
            setError("Minimum withdrawal must be a positive integer.");
            tap("warning");
            return;
        }
        if (isNaN(numMaxAct) || numMaxAct <= 0) {
            setError("Max activities per user must be a positive integer.");
            tap("warning");
            return;
        }
        if (isNaN(numMaxSub) || numMaxSub <= 0) {
            setError("Max submissions per month must be a positive integer.");
            tap("warning");
            return;
        }

        tap("success");
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error: updateError } = await supabase
                .from("medrae_coin_config")
                .update({
                    coin_to_kes_rate: numCoinToKes,
                    coins_per_completion: numCoins,
                    minimum_withdrawal: numMin,
                    max_activities_per_user: numMaxAct,
                    max_submissions_per_month: numMaxSub,
                    updated_at: new Date().toISOString(),
                    updated_by: user.id,
                })
                .eq("id", 1);
            if (updateError) throw updateError;

            await refetch();
            await qc.invalidateQueries({ queryKey: ["medrae", "coin-config"] });

            alert("Configuration saved. All frontend pages will reflect the new values on next render.");
        } catch (e: any) {
            setError(e?.message ?? "Failed to save.");
        } finally {
            setSaving(false);
        }
    }, [saving, coinToKes, coinsPerCompletion, minWithdrawal, maxActivities, maxSubmissionsMonth, refetch, qc]);

    if (checkingAuth || isLoading) return <SkeletonPage />;

    if (!isAuthorized) {
        return (
            <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-8 pb-16">
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-400/10 p-6 text-center">
                    <Lock className="h-10 w-10 text-rose-600 dark:text-rose-400 mx-auto mb-3" />
                    <p className="text-[13px] font-bold text-rose-700 dark:text-rose-400">
                        Access denied
                    </p>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">
                        Only Medrae coin admins can edit the coin configuration.
                    </p>
                </div>
            </div>
        );
    }

    const perCompletionKes = (parseFloat(coinToKes || "0") * parseInt(coinsPerCompletion || "0", 10)).toFixed(2);
    const minWithdrawalKes = (parseFloat(coinToKes || "0") * parseInt(minWithdrawal || "0", 10)).toFixed(2);

    return (
        // ✅ Gutter restored (bare-mounted page)
        <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-3">
            {/* Intro */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                <div className="flex items-start gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Coins className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                            MedraeCoins Configuration
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            Single source of truth — changes affect all pages instantly
                        </p>
                    </div>
                </div>
            </section>

            {/* Warning banner — neutral surface, amber only on the icon */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3">
                <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-snug">
                            This is production config. Every change affects live users.
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Only 2 admin accounts can access this page. All changes are logged with your user ID and timestamp. Changing the coin rate reduces the value of existing balances — use with extreme care.
                        </p>
                    </div>
                </div>
            </section>

            {/* Config form */}
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div>
                    <Label>Coin-to-KES rate</Label>
                    <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        max="100"
                        value={coinToKes}
                        onChange={(e) => setCoinToKes(e.target.value)}
                        className={InputBase}
                        style={{ touchAction: "manipulation" }}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                        1 MedraeCoin = KSh {parseFloat(coinToKes || "0").toFixed(4)}
                    </p>
                </div>

                <div>
                    <Label>Coins per completion</Label>
                    <input
                        type="number"
                        step="1"
                        min="1"
                        max="1000"
                        value={coinsPerCompletion}
                        onChange={(e) => setCoinsPerCompletion(e.target.value)}
                        className={InputBase}
                        style={{ touchAction: "manipulation" }}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                        Contributor earns <b>{coinsPerCompletion || "0"} MC</b> per nurse completion = <b>KSh {perCompletionKes}</b>
                    </p>
                </div>

                <div>
                    <Label>Minimum withdrawal (in MC)</Label>
                    <input
                        type="number"
                        step="1"
                        min="1"
                        value={minWithdrawal}
                        onChange={(e) => setMinWithdrawal(e.target.value)}
                        className={InputBase}
                        style={{ touchAction: "manipulation" }}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                        Withdrawal unlocks at {minWithdrawal || "0"} MC = <b>KSh {minWithdrawalKes}</b>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Max activities per user</Label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            value={maxActivities}
                            onChange={(e) => setMaxActivities(e.target.value)}
                            className={InputBase}
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                    <div>
                        <Label>Max submissions per month</Label>
                        <input
                            type="number"
                            step="1"
                            min="1"
                            value={maxSubmissionsMonth}
                            onChange={(e) => setMaxSubmissionsMonth(e.target.value)}
                            className={InputBase}
                            style={{ touchAction: "manipulation" }}
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-700 dark:text-rose-300">{error}</p>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-11 px-4 rounded-xl bg-blue-600 text-white
                               text-[13px] font-bold
                               flex items-center justify-center gap-1.5
                               active:scale-[0.97] transition-transform
                               disabled:opacity-50"
                    style={{ touchAction: "manipulation" }}
                >
                    {saving ? (
                        <div className="h-3.5 w-28 rounded bg-white/30 animate-pulse" />
                    ) : (
                        <><Save className="h-3.5 w-3.5" /> Save configuration</>
                    )}
                </button>

                {config?.updated_at && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                        Last updated: {new Date(config.updated_at).toLocaleString()}
                    </p>
                )}
            </section>
        </div>
    );
}