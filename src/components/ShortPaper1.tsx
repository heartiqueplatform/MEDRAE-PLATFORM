"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Play, Lock, Sparkles, ChevronRight, GraduationCap } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useUser } from "@supabase/auth-helpers-react";
import { getCachedPremium } from "@/lib/subscription";
import { playSound } from "@/lib/soundManager";

const PAPER_NUMBER = 1;
const GRADIENT = "from-amber-500 to-amber-700";

export default function ShortPaper1({
    limit = 5,
    title = "Paper 1",
    subtitle = "Most frequently tested foundational nursing units",
}) {
    const navigate = useNavigate();
    const user = useUser();
    const isPremium = getCachedPremium(user?.id) ?? false;
    const { papers, loading } = useUnits();
    const { data: unitCounts } = useUnitQuestionCount();

    const countsByCode = useMemo(() => {
        const m = {};
        (unitCounts || []).forEach((r) => {
            if (r?.unit_code) m[r.unit_code.trim()] = r.count;
        });
        return m;
    }, [unitCounts]);

    const units = useMemo(() => {
        const paper = papers?.find((p) => p.paperNumber === PAPER_NUMBER);
        return (paper?.units || []).slice(0, limit);
    }, [papers, limit]);

    const tap = (u) => {
        playSound?.("start");
        if (navigator.vibrate) navigator.vibrate(50);
        navigate(`/quiz?unit=${encodeURIComponent(u.title)}`);
    };

    if (loading && units.length === 0) {
        return (
            <div className="space-y-3 px-4 sm:px-0">
                <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-[170px] sm:w-[200px] h-[220px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        );
    }
    if (units.length === 0) return null;

    return (
        <div className="space-y-3 w-full">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div
                        className={`w-1.5 h-7 sm:h-8 rounded-full bg-gradient-to-b ${GRADIENT} flex-shrink-0`}
                    />
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-amber-500" />
                            {title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {subtitle}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate("/quizzes?category=paper1")}
                    className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                >
                    See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto custom-scrollbar pb-2 px-4 sm:px-0 snap-x snap-mandatory">
                {units.map((unit) => {
                    const count = countsByCode[unit.code?.trim()] ?? 0;
                    const unlocked = isPremium || unit.is_free;
                    return (
                        <motion.button
                            key={unit.code}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => unlocked && tap(unit)}
                            disabled={!unlocked}
                            className={`relative flex-shrink-0 snap-start w-[170px] sm:w-[200px] h-[220px] sm:h-[240px] rounded-2xl overflow-hidden text-left shadow-sm hover:shadow-xl transition-shadow ${unlocked ? "cursor-pointer" : "cursor-not-allowed"
                                }`}
                        >
                            {unit.image_url ? (
                                <img
                                    src={unit.image_url}
                                    alt={unit.image_alt || unit.title}
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            ) : (
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${GRADIENT} flex items-center justify-center`}
                                >
                                    <BookOpen className="w-12 h-12 text-white/50" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                            <div className="absolute top-2.5 right-2.5">
                                {isPremium ? (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                        <Sparkles className="w-3 h-3" /> PRO
                                    </span>
                                ) : unit.is_free ? (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                        <Sparkles className="w-3 h-3" /> FREE
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                        <Lock className="w-3 h-3" /> PRO
                                    </span>
                                )}
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                                    <GraduationCap className="w-3 h-3" /> {unit.code}
                                </div>
                                <h4 className="text-sm font-bold text-white leading-tight line-clamp-2">
                                    {unit.title}
                                </h4>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] font-semibold text-white/70">
                                        {count} Qs
                                    </span>
                                    {unlocked ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-full">
                                            <Play className="w-3 h-3 fill-current" /> Start
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-white/90 bg-black/40 px-2.5 py-1 rounded-full">
                                            <Lock className="w-3 h-3" /> Locked
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}