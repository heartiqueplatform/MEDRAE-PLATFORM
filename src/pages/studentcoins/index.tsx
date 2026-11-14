// src/pages/studentcoins/index.tsx

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";

import { useWalletData } from "./useWalletData";
import type { Reward, TabId } from "./types";

import { WalletHeader } from "./components/WalletHeader";
import { BalanceCard } from "./components/BalanceCard";
import { StatusBanner } from "./components/StatusBanner";
import { StatStrip } from "./components/StatStrip";
import { Tabs } from "./components/Tabs";
import { EarnTab } from "./components/EarnTab";
import { RedeemTab } from "./components/RedeemTab";
import { HistoryTab } from "./components/HistoryTab";
import { LearnTab } from "./components/LearnTab";     // 👈 NEW
import { RedeemModal } from "./components/RedeemModal";
import { ApplyModal } from "./components/ApplyModal";
import { WalletSkeleton } from "./components/WalletSkeleton";

export default function StudentCoinsPage() {
    const { user, loading, refreshing, data, rewards, refresh } = useWalletData();

    const [activeTab, setActiveTab] = useState<TabId>("earn");
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [applyOpen, setApplyOpen] = useState(false);
    const [applying, setApplying] = useState(false);

    const wallet = data?.wallet ?? null;
    const config = data?.config ?? null;
    const enrollment = data?.enrollment ?? null;

    const handleApply = async (reason: string) => {
        if (!user?.id || applying) return;
        setApplying(true);
        try {
            const { data: res, error } = await supabase.rpc("apply_for_coin_program", {
                p_reason: reason || null,
            });
            if (error) throw error;
            if (!res?.ok) throw new Error(res?.error || "failed");

            toast.success("Application submitted!", {
                description: "We'll review it within 24 hours.",
            });
            playSound("notification");
            setApplyOpen(false);
            await refresh();
        } catch (err: any) {
            toast.error("Could not apply", { description: err?.message });
        } finally {
            setApplying(false);
        }
    };

    const handleRedeem = async () => {
        if (!selectedReward || !user?.id || redeeming) return;
        setRedeeming(true);
        try {
            const { data: res, error } = await supabase.rpc("redeem_student_coins", {
                p_user_id: user.id,
                p_coins: selectedReward.coins_cost,
                p_reward_key: selectedReward.reward_key,
                p_reward_label: selectedReward.label,
            });
            if (error) throw error;
            if (!res?.ok) {
                throw new Error(String(res?.error || "failed").replace(/_/g, " "));
            }

            toast.success("Redemption requested!", {
                description: `You paid ${selectedReward.coins_cost} coins. We'll process it shortly.`,
            });
            playSound("notification");
            setSelectedReward(null);
            await refresh();
        } catch (err: any) {
            toast.error("Could not redeem", { description: err?.message });
        } finally {
            setRedeeming(false);
        }
    };

    if (loading) return <WalletSkeleton />;

    return (
        /* ✅ LOCKED FULL-SCREEN SHELL — same pattern as Feedback.tsx */
        <div
            className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* Header — pinned at top, back button goes to dashboard */}
            <WalletHeader refreshing={refreshing} onRefresh={refresh} />

            {/* The only scrollable region */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain">
                <div className="w-full max-w-2xl mx-auto px-3 pt-4 pb-24 space-y-4">
                    <BalanceCard wallet={wallet} config={config} />

                    <StatusBanner
                        enrollment={enrollment}
                        applying={applying}
                        onApply={() => {
                            playSound("ui-tap");
                            setApplyOpen(true);
                        }}
                    />

                    <StatStrip
                        today={data?.today_earned ?? 0}
                        week={data?.week_earned ?? 0}
                        lifetime={wallet?.lifetime_earned ?? 0}
                    />

                    <Tabs active={activeTab} onChange={setActiveTab} />

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "earn" && <EarnTab />}
                            {activeTab === "redeem" && (
                                <RedeemTab
                                    rewards={rewards}
                                    wallet={wallet}
                                    config={config}
                                    enrollment={enrollment}
                                    onSelect={setSelectedReward}
                                />
                            )}
                            {activeTab === "history" && (
                                <HistoryTab
                                    recent={data?.recent ?? []}
                                    redemptions={data?.redemptions ?? []}
                                    config={config}
                                />
                            )}
                            {activeTab === "learn" && <LearnTab />}   {/* 👈 NEW */}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Modals — mounted outside <main> so they cover the whole shell */}
            <ApplyModal
                open={applyOpen}
                onClose={() => setApplyOpen(false)}
                onSubmit={handleApply}
                submitting={applying}
            />

            <RedeemModal
                reward={selectedReward}
                wallet={wallet}
                config={config}
                redeeming={redeeming}
                onClose={() => setSelectedReward(null)}
                onConfirm={handleRedeem}
            />
        </div>
    );
}