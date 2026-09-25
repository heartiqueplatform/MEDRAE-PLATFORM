"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    BookOpen, Play, Lock, Sparkles, ChevronRight,
    GraduationCap, FileText, ClipboardCheck, Globe, Stethoscope,
} from "lucide-react";
import { useUnits, Unit } from "@/hooks/useUnits"; // <- your existing hook
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useUser } from "@supabase/auth-helpers-react";
import { getCachedPremium } from "@/lib/subscription";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------
   Config — one row per genre. `paperNumber` must match what useUnits
   returns so we can filter. Labels/icons are what show on screen.
------------------------------------------------------------------ */
const GENRES = [
    { key: "paper1", paperNumber: 1, label: "Paper 1", tagline: "Foundational Nursing", icon: GraduationCap, ring: "ring-amber-500", accent: "from-amber-500 to-amber-700" },
    { key: "paper2", paperNumber: 2, label: "Paper 2", tagline: "Leadership & Community", icon: FileText, ring: "ring-blue-500", accent: "from-blue-500 to-blue-700" },
    { key: "practice", paperNumber: 4, label: "Practice", tagline: "Mock exams for readiness", icon: ClipboardCheck, ring: "ring-emerald-500", accent: "from-emerald-500 to-emerald-700" },
    { key: "nclex", paperNumber: 3, label: "NCLEX", tagline: "International standards", icon: Globe, ring: "ring-purple-500", accent: "from-purple-500 to-purple-700" },
    { key: "medical", paperNumber: 5, label: "Medical", tagline: "Condition-specific quizzes", icon: Stethoscope, ring: "ring-rose-500", accent: "from-rose-500 to-rose-700" },
];

const FALLBACK_GRADIENTS = {
    blue: "from-blue-500 to-blue-700",
    emerald: "from-emerald-500 to-emerald-700",
    rose: "from-rose-500 to-rose-700",
    amber: "from-amber-500 to-amber-700",
    purple: "from-purple-500 to-purple-700",
    gray: "from-gray-600 to-gray-800",
};

const pickGradient = (accent) =>
    FALLBACK_GRADIENTS[(accent || "blue").toLowerCase()] || FALLBACK_GRADIENTS.blue;

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------ */
export default function Short({
    limit = 5,             // how many units per genre
    paperFilter = null,    // pass a paperNumber to render only ONE genre
    title = "Jump back in",// optional header text
    subtitle = "Pick a topic and start practicing",
}) {
    const navigate = useNavigate();
    const user = useUser();
    const isPremium = getCachedPremium(user?.id) ?? false;

    const { papers, loading: unitsLoading } = useUnits();
    const { data: unitCounts } = useUnitQuestionCount();

    // Map unit_code -> question count for O(1) lookups
    const countsByCode = useMemo(() => {
        const map = {};
        (unitCounts || []).forEach((row) => {
            if (row?.unit_code) map[row.unit_code.trim()] = row.count;
        });
        return map;
    }, [unitCounts]);

    // For each genre, grab the first N units
    const rows = useMemo(() => {
        if (!papers?.length) return [];

        return GENRES
            .filter((g) => (paperFilter ? g.paperNumber === paperFilter : true))
            .map((genre) => {
                const paper = papers.find((p) => p.paperNumber === genre.paperNumber);
                const units = (paper?.units || []).slice(0, limit);
                return { genre, units };
            })
            .filter((row) => row.units.length > 0);
    }, [papers, limit, paperFilter]);

    const handleTap = (unit) => {
        playSound?.("start");
        if (navigator.vibrate) navigator.vibrate(50);
        navigate(`/quiz?unit=${encodeURIComponent(unit.title)}`);
    };

    /* ---------------------------------------------------------------
       Loading skeleton — matches the rest of your dashboard
    --------------------------------------------------------------- */
    if (unitsLoading && rows.length === 0) {
        return (
            <div className="space-y-6 px-4 sm:px-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                        <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {[1, 2, 3, 4, 5].map((j) => (
                                <div
                                    key={j}
                                    className="flex-shrink-0 w-40 h-52 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (rows.length === 0) return null;

    /* ---------------------------------------------------------------
       Render
    --------------------------------------------------------------- */
    return (
        <div className="space-y-6 w-full">
            {(title || subtitle) && (
                <div className="px-4 sm:px-0">
                    {title && (
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                    )}
                    {subtitle && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}

            {rows.map(({ genre, units }) => {
                const Icon = genre.icon;
                return (
                    <div key={genre.key} className="space-y-3">
                        {/* Genre header — same rhythm as your MedraeQuizzes paper headers */}
                        <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-7 sm:h-8 rounded-full bg-gradient-to-b ${genre.accent} flex-shrink-0`} />
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">
                                        {genre.label}
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {genre.tagline}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/quizzes?category=${genre.key}`)}
                                className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                            >
                                See all
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Horizontal scroller of unit cards */}
                        <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 px-4 sm:px-0 snap-x snap-mandatory">
                            {units.map((unit) => {
                                const count = countsByCode[unit.code?.trim()] ?? 0;
                                const isFree = unit.is_free;
                                const unlocked = isPremium || isFree;
                                const imageUrl = unit.image_url;

                                return (
                                    <motion.button
                                        key={unit.code}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => unlocked && handleTap(unit)}
                                        disabled={!unlocked}
                                        className={`
                      relative flex-shrink-0 snap-start
                      w-[170px] sm:w-[200px] h-[220px] sm:h-[240px]
                      rounded-2xl overflow-hidden text-left
                      shadow-sm hover:shadow-xl transition-shadow duration-300
                      ${unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-90"}
                    `}
                                    >
                                        {/* Cue image (or gradient fallback) */}
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={unit.image_alt || unit.title}
                                                loading="lazy"
                                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                    e.currentTarget.parentElement?.classList.add(
                                                        "bg-gradient-to-br",
                                                        ...pickGradient(unit.accent_color).split(" ")
                                                    );
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className={`absolute inset-0 bg-gradient-to-br ${pickGradient(
                                                    unit.accent_color
                                                )} flex items-center justify-center`}
                                            >
                                                <BookOpen className="w-12 h-12 text-white/50" />
                                            </div>
                                        )}

                                        {/* Dark gradient for text legibility */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                                        {/* Top-right badge */}
                                        <div className="absolute top-2.5 right-2.5">
                                            {isPremium ? (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                                    <Sparkles className="w-3 h-3" /> PRO
                                                </span>
                                            ) : isFree ? (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                                    <Sparkles className="w-3 h-3" /> FREE
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg shadow">
                                                    <Lock className="w-3 h-3" /> PRO
                                                </span>
                                            )}
                                        </div>

                                        {/* Bottom content */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 uppercase tracking-wider">
                                                <Icon className="w-3 h-3" />
                                                {unit.code}
                                            </div>
                                            <h4 className="text-sm font-bold text-white leading-tight line-clamp-2">
                                                {unit.title}
                                            </h4>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-[10px] font-semibold text-white/70">
                                                    {count} Qs
                                                </span>
                                                {unlocked ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-full shadow">
                                                        <Play className="w-3 h-3 fill-current" />
                                                        Start
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-white/90 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                                                        <Lock className="w-3 h-3" />
                                                        Locked
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
            })}
        </div>
    );
}