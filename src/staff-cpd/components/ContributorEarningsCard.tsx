// src/staff-cpd/components/ContributorEarningsCard.tsx
import { Link } from "react-router-dom";
import { Coins, ArrowRight, ArrowDownLeft, ArrowUpRight, BookOpen } from "lucide-react";
import {
    useWallet, useRecentTransactions, useStaffProfile,
} from "@/staff-cpd/lib/contributor-hooks";
import { useMedraeCoinConfig } from "@/staff-cpd/lib/admin-hooks";
import { useAuth } from "@/context/AuthProvider";

const CONTRIB_FLAG_KEY = "medrae.isContributor";
let cachedIsContributor: boolean | null = (() => {
    try {
        const raw = localStorage.getItem(CONTRIB_FLAG_KEY);
        if (raw === "1") return true;
        if (raw === "0") return false;
    } catch { }
    return null;
})();

function writeContributorFlag(is: boolean) {
    cachedIsContributor = is;
    try { localStorage.setItem(CONTRIB_FLAG_KEY, is ? "1" : "0"); } catch { }
}

const Sk = "rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse";

export function ContributorEarningsCardSkeleton() {
    return (
        <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
                <div className={`h-10 w-10 rounded-xl shrink-0 ${Sk}`} />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-3 w-40 ${Sk}`} />
                    <div className={`h-2.5 w-52 ${Sk}`} />
                </div>
                <div className={`h-6 w-16 rounded-full shrink-0 ${Sk}`} />
            </div>
            <div className="rounded-xl bg-white/80 dark:bg-[#0d1117]/70 p-3 space-y-2">
                <div className={`h-2 w-24 ${Sk}`} />
                <div className={`h-7 w-32 ${Sk}`} />
                <div className={`h-3 w-20 ${Sk}`} />
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <div><div className={`h-2 w-16 ${Sk}`} /><div className={`mt-1 h-3 w-20 ${Sk}`} /></div>
                    <div><div className={`h-2 w-20 ${Sk}`} /><div className={`mt-1 h-3 w-16 ${Sk}`} /></div>
                </div>
            </div>
            <div className="space-y-1 min-h-[4.5rem]">
                <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
                <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
                <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-9 rounded-xl bg-white/70 dark:bg-[#0d1117]/60 animate-pulse" />
                <div className="h-9 rounded-xl bg-amber-600/40 animate-pulse" />
            </div>
        </section>
    );
}

/**
 * Renders the earnings card ONLY if the user is a known contributor,
 * renders a skeleton if unknown, renders nothing if known-non-contributor.
 * Cache-backed so it never re-flashes for non-contributors after visit #1.
 */
export function ContributorEarningsCard() {
    const { user } = useAuth();
    const userId = user?.id ?? null;

    const { data: profile, isLoading: profileLoading } = useStaffProfile(userId);
    const { data: wallet, isLoading: walletLoading } = useWallet(userId);
    const { data: transactions = [], isLoading: txLoading } = useRecentTransactions(userId, 3);
    const { data: coinConfig } = useMedraeCoinConfig();

    const profileSaysContributor = !!profile?.is_verified_contributor;
    const hasCachedWallet = wallet != null;
    const profileLoaded = !profileLoading && !!profile;

    if (profileLoaded) {
        writeContributorFlag(profileSaysContributor || hasCachedWallet);
    }

    const knownContributor =
        profileSaysContributor ||
        hasCachedWallet ||
        cachedIsContributor === true;

    const knownNotContributor =
        !knownContributor && (
            (profileLoaded && !profileSaysContributor && !hasCachedWallet) ||
            cachedIsContributor === false
        );

    if (!userId) return <ContributorEarningsCardSkeleton />;
    if (knownNotContributor) return null;
    if (!knownContributor) return <ContributorEarningsCardSkeleton />;

    // ─── Real card ───
    const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
    const minWithdrawal = coinConfig?.minimum_withdrawal ?? 1000;
    const coinsPerCompletion = coinConfig?.coins_per_completion ?? 20;

    const numbersLoading = walletLoading && !wallet && transactions.length === 0;
    const txLoadingOnly = txLoading && transactions.length === 0;

    const balance = wallet?.balance ?? 0;
    const lifetimeEarned = wallet?.lifetime_earned ?? 0;
    const balanceKes = (balance * coinToKes).toFixed(2);
    const canWithdraw = balance >= minWithdrawal;

    const tierLabel = (profile?.contributor_tier || "contributor")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return (
        <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-[14px] font-bold text-amber-800 dark:text-amber-300 leading-tight">
                        Your MedraeCoins
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        {tierLabel} · Verified contributor
                    </p>
                </div>
                <Link to="/cpd/redeem"
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                     bg-white/70 dark:bg-[#0d1117]/60 text-[10px] font-bold
                     text-amber-700 dark:text-amber-300 active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}>
                    Redeem <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Balance */}
            <div className="rounded-xl bg-white/80 dark:bg-[#0d1117]/70 p-3 space-y-2">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Wallet balance
                    </p>
                    <p className="h-8 text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
                        {numbersLoading ? (
                            <span className="inline-block h-6 w-24 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse align-middle" />
                        ) : (
                            <>{balance.toLocaleString()}
                                <span className="text-sm ml-1 text-amber-600 dark:text-amber-400">MC</span></>
                        )}
                    </p>
                    <p className="h-4 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {numbersLoading ? (
                            <span className="inline-block h-3 w-20 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
                        ) : `≈ KSh ${balanceKes}`}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifetime</p>
                        <p className="h-4 text-[12px] font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {numbersLoading ? (
                                <span className="inline-block h-3 w-16 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
                            ) : `${lifetimeEarned.toLocaleString()} MC`}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Withdrawable</p>
                        <p className={`h-4 text-[12px] font-bold tabular-nums mt-0.5 ${canWithdraw ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`}>
                            {numbersLoading ? (
                                <span className="inline-block h-3 w-12 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
                            ) : canWithdraw ? "Yes" : `Need ${(minWithdrawal - balance).toLocaleString()}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Transactions */}
            <div className="space-y-1 min-h-[4.5rem]">
                {txLoadingOnly ? (
                    <>
                        <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
                        <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
                        <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
                    </>
                ) : transactions.length > 0 ? (
                    transactions.map((tx) => {
                        const isEarn = tx.amount > 0;
                        return (
                            <div key={tx.id} className="flex items-center gap-2 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 px-2 py-1.5">
                                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isEarn ? "bg-emerald-50 dark:bg-emerald-400/10" : "bg-rose-50 dark:bg-rose-400/10"}`}>
                                    {isEarn
                                        ? <ArrowDownLeft className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                        : <ArrowUpRight className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />}
                                </div>
                                <p className="flex-1 text-[10px] font-bold text-slate-900 dark:text-white truncate">
                                    {tx.reason || tx.kind.replace(/_/g, " ")}
                                </p>
                                <span className={`text-[10px] font-bold tabular-nums shrink-0 ${isEarn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {isEarn ? "+" : ""}{tx.amount}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-snug text-center py-3">
                        No earnings yet — publish an activity to start earning {coinsPerCompletion} MC per completion.
                    </p>
                )}
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-2">
                <Link to="/cpd/admin/activities"
                    className="h-9 rounded-xl bg-white/70 dark:bg-[#0d1117]/60 text-amber-700 dark:text-amber-300
                     text-[11px] font-bold flex items-center justify-center gap-1.5
                     active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}>
                    <BookOpen className="h-3.5 w-3.5" /> Activities
                </Link>
                <Link to="/cpd/redeem"
                    className="h-9 rounded-xl bg-amber-600 text-white text-[11px] font-bold
                     flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}>
                    <Coins className="h-3.5 w-3.5" /> Redeem
                </Link>
            </div>
        </section>
    );
}

/** Exposes the current cached contributor verdict — used by callers who need to gate other UI. */
export function useContributorFlag() {
    return cachedIsContributor;
}