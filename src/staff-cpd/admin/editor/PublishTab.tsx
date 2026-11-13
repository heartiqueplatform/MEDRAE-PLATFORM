// src/staff-cpd/admin/editor/PublishTab.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertCircle, Coins, ChevronLeft } from "lucide-react";
import {
    usePublishActivity, useUpdateActivity, useMedraeCoinConfig,
} from "../../lib/admin-hooks";
import { tap, getStatusTone } from "./editor-helpers";

const PrimaryBtn = "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const SecondaryBtn = "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

export function PublishTab({ activity }: { activity: any }) {
    const publish = usePublishActivity();
    const update = useUpdateActivity();
    const nav = useNavigate();
    const { data: coinConfig, isLoading: coinConfigLoading } = useMedraeCoinConfig();
    const [error, setError] = useState<string | null>(null);

    const coinsPerCompletion = coinConfig?.coins_per_completion ?? 20;
    const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
    const perCompletionKes = (coinsPerCompletion * coinToKes).toFixed(2);
    const minWithdrawal = coinConfig?.minimum_withdrawal ?? 1000;
    const minWithdrawalKes = (minWithdrawal * coinToKes).toFixed(2);

    const handlePublish = async () => {
        setError(null);
        tap("success");
        try { await publish.mutateAsync(activity.id); }
        catch (e: any) { setError(e?.message ?? "Publish failed"); }
    };

    return (
        <div className="space-y-3">
            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Current status
                        </p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 mt-0.5 text-[10px] font-bold capitalize ${getStatusTone(activity.status)}`}>
                            {activity.status}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Publishing validates: at least one module, at least one content item,
                        all external URLs start with http(s). On success, status becomes{" "}
                        <b className="text-blue-700 dark:text-blue-400">published</b> and the
                        activity appears in the nurse catalog.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">{error}</p>
                    </div>
                )}

                {activity.status === "published" && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            Live in catalog since {new Date(activity.published_at).toLocaleDateString()}
                        </p>
                    </div>
                )}
            </section>

            <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                    <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 leading-tight">
                            MedraeCoins reward
                        </h3>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                            This activity earns you coins — not editable
                        </p>
                    </div>
                </div>

                <div className="rounded-xl bg-white/70 dark:bg-[#0d1117]/60 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Reward per completion</span>
                        <span className="text-[14px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                            {coinConfigLoading ? "…" : `${coinsPerCompletion} MC`}
                        </span>
                    </div>
                    <div className="h-px bg-amber-200/60 dark:bg-amber-400/10" />
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Value at current rate</span>
                        <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                            {coinConfigLoading ? "…" : `KSh ${perCompletionKes}`}
                        </span>
                    </div>
                </div>

                <ul className="space-y-1 text-[10px] text-amber-700/80 dark:text-amber-300/80 leading-snug">
                    <li>• You earn <b>{coinsPerCompletion} MedraeCoins (KSh {perCompletionKes})</b> each time a nurse completes this activity.</li>
                    <li>• Self-completions are blocked (you cannot complete your own activity for coins).</li>
                    <li>• The reward is fixed. <b>You cannot edit it</b>.</li>
                    <li>• Withdrawal unlocks at {minWithdrawal.toLocaleString()} MC (KSh {minWithdrawalKes}). Not yet live — see policy.</li>
                </ul>

                <a href="/cpd/coins-policy"
                    onClick={(e) => { e.preventDefault(); tap(); nav("/cpd/coins-policy"); }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 underline underline-offset-4 active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}>
                    Read full MedraeCoins policy
                    <ChevronLeft className="h-3 w-3 rotate-180" />
                </a>
            </section>

            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">
                <button onClick={handlePublish} disabled={publish.isPending}
                    className={PrimaryBtn + " w-full"} style={{ touchAction: "manipulation" }}>
                    {publish.isPending ? "Publishing…" : "Publish"}
                </button>
                <button onClick={() => { tap(); update.mutate({ id: activity.id, patch: { status: "review" } }); }}
                    className={SecondaryBtn + " w-full"} style={{ touchAction: "manipulation" }}>
                    Submit for review
                </button>
                <button onClick={() => {
                    tap("warning");
                    update.mutate({ id: activity.id, patch: { status: "archived", archived_at: new Date().toISOString() } });
                }} className="w-full h-10 px-4 rounded-xl bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400 text-[13px] font-bold active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}>
                    Archive
                </button>
            </section>
        </div>
    );
}