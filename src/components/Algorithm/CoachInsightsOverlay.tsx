// src/components/Algorithm/CoachInsightsOverlay.tsx
// Uses the SAME BottomSheet component as the Top Students floating button —
// Instagram-style comment section feel, guaranteed above footer.
// GitHub dark palette, no borders, larger mascot (48px).

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ChampionMascot, CoachMascot } from "@/components/Algorithm/Mascots";
import type { UnitData } from "./types";

interface CoachInsightsOverlayProps {
    open: boolean;
    onClose: () => void;
    strongest: { value: UnitData }[];
    weakest: { value: UnitData }[];
    onUnitClick: (id: string) => void;
}

export function CoachInsightsOverlay({
    open,
    onClose,
    strongest,
    weakest,
    onUnitClick,
}: CoachInsightsOverlayProps) {
    return (
        <BottomSheet open={open} onClose={onClose} maxHeight="88vh">
            <div className="px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Header */}
                <div className="flex items-center gap-2.5 pb-3">
                    <ChampionMascot size={28} />
                    <h2 className="text-base font-bold text-gray-900 dark:text-[#e6edf3]">
                        Coach Insights
                    </h2>
                </div>

                {/* Champion section */}
                {strongest.length > 0 && (
                    <section className="mb-4">
                        <div className="flex items-center gap-1.5 mb-2 px-0.5">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Champion Areas · {strongest.length}
                            </span>
                            <div className="flex-1 h-px bg-emerald-200/50 dark:bg-emerald-900/40" />
                        </div>
                        <div className="space-y-1.5">
                            {strongest.map((item, i) => (
                                <UnitRow
                                    key={`s-${i}`}
                                    rank={i + 1}
                                    unit={item.value}
                                    tone="emerald"
                                    onTap={() => {
                                        onUnitClick(item.value.quiz_id);
                                        onClose();
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Focus section */}
                {weakest.length > 0 && (
                    <section>
                        <div className="flex items-center gap-1.5 mb-2 px-0.5">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                Needs Love · {weakest.length}
                            </span>
                            <div className="flex-1 h-px bg-rose-200/50 dark:bg-rose-900/40" />
                        </div>
                        <div className="space-y-1.5">
                            {weakest.map((item, i) => (
                                <UnitRow
                                    key={`w-${i}`}
                                    rank={i + 1}
                                    unit={item.value}
                                    tone="rose"
                                    onTap={() => {
                                        onUnitClick(item.value.quiz_id);
                                        onClose();
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {strongest.length === 0 && weakest.length === 0 && (
                    <div className="text-center py-10">
                        <div className="flex justify-center">
                            <ChampionMascot size={56} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#8b949e] mt-3">
                            Complete a few units to unlock insights
                        </p>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

/* ------------------------------
   One row in the scroll list
   ------------------------------ */
function UnitRow({
    rank,
    unit,
    tone,
    onTap,
}: {
    rank: number;
    unit: UnitData;
    tone: "emerald" | "rose";
    onTap: () => void;
}) {
    const bg =
        tone === "emerald"
            ? "bg-emerald-50/70 dark:bg-[#0f2a1e]"
            : "bg-rose-50/70 dark:bg-[#2a1418]";
    const hoverBg =
        tone === "emerald"
            ? "hover:dark:bg-[#143627]"
            : "hover:dark:bg-[#341a1f]";
    const nameColor =
        tone === "emerald"
            ? "text-emerald-900 dark:text-emerald-200"
            : "text-rose-900 dark:text-rose-200";
    const scoreColor =
        tone === "emerald"
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-rose-700 dark:text-rose-400";
    const subtitleColor =
        tone === "emerald"
            ? "text-emerald-700/70 dark:text-emerald-400/70"
            : "text-rose-700/70 dark:text-rose-400/70";

    return (
        <motion.button
            onClick={onTap}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(rank, 10) * 0.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left
                transition-colors ${bg} ${hoverBg}`}
        >
            {/* Mascot — bigger now: 48px */}
            <div className="shrink-0">
                {tone === "emerald" ? (
                    <ChampionMascot size={48} />
                ) : (
                    <CoachMascot size={48} />
                )}
            </div>

            {/* Rank + name + subtitle */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold tabular-nums ${subtitleColor}`}>
                        #{rank}
                    </span>
                    <p className={`text-[13px] font-bold truncate ${nameColor}`}>
                        {unit.unit_name}
                    </p>
                </div>
                <p className={`text-[10px] font-medium ${subtitleColor}`}>
                    {unit.attempts} attempts · best {unit.best_score.toFixed(0)}%
                </p>
            </div>

            {/* Score + chevron */}
            <div className="shrink-0 flex items-center gap-1">
                <span className={`text-base font-bold tabular-nums ${scoreColor}`}>
                    {unit.average_score.toFixed(0)}%
                </span>
                <ChevronRight className="w-4 h-4 opacity-50" />
            </div>
        </motion.button>
    );
}