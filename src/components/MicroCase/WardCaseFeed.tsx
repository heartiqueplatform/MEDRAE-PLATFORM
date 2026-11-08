"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    Plus,
    Loader2,
    Stethoscope,
    FileText,
    MessageSquareQuote,
    ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import WardCaseCard from "./WardCaseCard";
import WardCaseComposer from "./WardCaseComposer";
import { WardCase, TemplateId } from "./wardCaseTypes";
import HeroLottie from "@/components/HeroLottie";

interface Props {
    user: any;
}

const PAGE_SIZE = 8;
const SKELETON_COUNT = 3;

// ═══════════════════════════════════════════════════════════════
// SKELETON CARD — matches the real WardCaseCard layout
// ═══════════════════════════════════════════════════════════════
function WardCaseSkeleton() {
    return (
        <div className="mb-2 bg-white dark:bg-[#0d1117] rounded-2xl overflow-hidden animate-pulse">
            {/* Author header */}
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#161b22]" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 bg-gray-200 dark:bg-[#161b22] rounded" />
                    <div className="h-2 w-32 bg-gray-100 dark:bg-[#161b22]/60 rounded" />
                </div>
            </div>

            {/* Title */}
            <div className="px-3 pb-2 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#161b22] rounded" />
                <div className="flex gap-1.5">
                    <div className="h-4 w-16 bg-gray-100 dark:bg-[#161b22]/60 rounded-md" />
                    <div className="h-4 w-12 bg-gray-100 dark:bg-[#161b22]/60 rounded-md" />
                </div>
            </div>

            {/* Content sections */}
            <div className="px-3 pb-2 space-y-2">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#161b22]/70 space-y-1.5">
                    <div className="h-2 w-20 bg-gray-200 dark:bg-[#21262d] rounded" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-[#21262d] rounded" />
                    <div className="h-3 w-5/6 bg-gray-200 dark:bg-[#21262d] rounded" />
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#161b22]/70 space-y-1.5">
                    <div className="h-2 w-16 bg-gray-200 dark:bg-[#21262d] rounded" />
                    <div className="h-3 w-full bg-gray-200 dark:bg-[#21262d] rounded" />
                </div>
            </div>

            {/* Action bar */}
            <div className="px-3 py-2 flex items-center gap-1.5 border-t border-gray-100 dark:border-[#30363d]">
                <div className="h-8 w-14 bg-gray-100 dark:bg-[#161b22] rounded-full" />
                <div className="h-8 w-14 bg-gray-100 dark:bg-[#161b22] rounded-full" />
                <div className="h-8 w-14 bg-gray-100 dark:bg-[#161b22] rounded-full" />
                <div className="ml-auto h-8 w-12 bg-gray-100 dark:bg-[#161b22] rounded-full" />
            </div>

            {/* Comment toggle row */}
            <div className="px-3 py-2 border-t border-gray-100 dark:border-[#30363d]">
                <div className="h-6 w-32 bg-gray-100 dark:bg-[#161b22] rounded" />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE — rich, inviting, with template previews
// ═══════════════════════════════════════════════════════════════
function EmptyState({ onCompose }: { onCompose: () => void }) {
    const templates = [
        {
            icon: Stethoscope,
            title: "Ward Case",
            desc: "Real patient scenarios — vitals, decisions, rationale.",
            accent: "bg-teal-500",
        },
        {
            icon: FileText,
            title: "Exam MCQ",
            desc: "Test clinical knowledge with structured questions.",
            accent: "bg-blue-500",
        },
        {
            icon: MessageSquareQuote,
            title: "Reflection",
            desc: "Turn a learning moment into a lesson for others.",
            accent: "bg-purple-500",
        },
    ];

    return (
        <div className="w-full flex flex-col items-center text-center px-4 pt-6 pb-2">
            {/* Hero animation */}
            <div className="w-full max-w-[320px] mx-auto">
                <HeroLottie />
            </div>

            {/* Headline */}
            <h2 className="mt-4 text-[19px] font-extrabold text-gray-900 dark:text-[#e6edf3] leading-tight">
                Your ward, your wisdom.
            </h2>

            {/* Subheadline */}
            <p className="mt-2 text-[13px] text-gray-600 dark:text-[#8b949e] leading-relaxed max-w-[420px] mx-auto">
                Share a clinical moment from your practice — a patient you learned
                from, a decision you made, a mistake that taught you something.
                Others will learn from your experience, and you'll learn from theirs.
            </p>

            {/* Template preview cards */}
            <div className="w-full max-w-[520px] mt-6 space-y-2">
                {templates.map((t) => {
                    const Icon = t.icon;
                    return (
                        <div
                            key={t.title}
                            className="flex items-center gap-3 bg-gray-50 dark:bg-[#161b22] rounded-2xl px-3 py-3 text-left"
                        >
                            <div
                                className={`${t.accent} w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0`}
                            >
                                <Icon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-gray-900 dark:text-[#e6edf3]">
                                    {t.title}
                                </p>
                                <p className="text-[11.5px] text-gray-600 dark:text-[#8b949e] mt-0.5 leading-snug">
                                    {t.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Big CTA */}
            <button
                onClick={onCompose}
                className="mt-6 w-full max-w-[420px] flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
                Share your first case
                <ArrowRight size={16} />
            </button>

            {/* Subtle reassurance */}
            <p className="mt-3 text-[11px] text-gray-500 dark:text-[#8b949e]">
                Takes less than 2 minutes · Structured format · Instant feedback
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN FEED
// ═══════════════════════════════════════════════════════════════
export default function WardCaseFeed({ user }: Props) {
    const [cases, setCases] = useState<WardCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [composerOpen, setComposerOpen] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    const fetchPage = useCallback(async (pageOffset: number) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("get_ward_cases_feed", {
                p_limit: PAGE_SIZE,
                p_offset: pageOffset,
            });
            if (error) throw error;
            const rows = (data ?? []) as any[];
            const mapped: WardCase[] = rows.map((r) => ({
                ...r,
                template: r.template as TemplateId,
                tags: r.tags ?? [],
                author_name: r.author_name ?? "Member",
            }));
            if (pageOffset === 0) setCases(mapped);
            else setCases((prev) => [...prev, ...mapped]);
            if (mapped.length < PAGE_SIZE) setHasMore(false);
            setOffset(pageOffset + mapped.length);
        } catch (err) {
            console.warn("[WardCaseFeed] fetch failed:", err);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(0);
    }, [fetchPage]);

    // Infinite scroll
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                    fetchPage(offset);
                }
            },
            { rootMargin: "800px 0px", threshold: 0 }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [hasMore, offset, fetchPage]);

    const handlePosted = () => {
        setCases([]);
        setHasMore(true);
        setOffset(0);
        fetchPage(0);
    };

    const handleDeleted = (id: string) => {
        setCases((prev) => prev.filter((c) => c.id !== id));
    };

    const showSkeletons = loading && cases.length === 0;
    const showEmpty = !loading && cases.length === 0;

    return (
        <div
            className="w-full max-w-4xl mx-auto px-2 pt-2 pb-24 relative custom-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
            {/* Intro */}
            <div className="mb-3 px-1">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-[#e6edf3]">
                    Community cases
                </h2>
                <p className="text-[12px] text-gray-600 dark:text-[#8b949e] mt-0.5">
                    Share your clinical moments. Learn from each other.
                </p>
            </div>

            {/* ── SKELETONS (first load) ── */}
            {showSkeletons &&
                Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <WardCaseSkeleton key={i} />
                ))}

            {/* ── RICH EMPTY STATE (no posts yet) ── */}
            {showEmpty && (
                <EmptyState onCompose={() => setComposerOpen(true)} />
            )}

            {/* ── FEED ── */}
            {cases.map((c) => (
                <div key={c.id} className="mb-2">
                    <WardCaseCard
                        wardCase={c}
                        currentUser={user}
                        onDeleted={handleDeleted}
                    />
                </div>
            ))}

            {/* ── Infinite scroll sentinel ── */}
            <div ref={sentinelRef} className="h-16" />

            {/* ── Loading more (pagination) ── */}
            {loading && cases.length > 0 && (
                <div className="py-4 flex items-center justify-center gap-2">
                    <Loader2
                        size={16}
                        className="animate-spin text-gray-400 dark:text-[#8b949e]"
                    />
                    <span className="text-[11px] text-gray-500 dark:text-[#8b949e]">
                        Loading more cases…
                    </span>
                </div>
            )}

            {/* ── End cap ── */}
            {!hasMore && cases.length > 0 && (
                <div className="py-6 text-center">
                    <p className="text-[12px] font-semibold text-gray-600 dark:text-[#8b949e]">
                        You've seen every case for now
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-[#8b949e] mt-0.5">
                        Come back later for fresh clinical moments.
                    </p>
                </div>
            )}

            {/* ── FAB (post new case) ── */}
            <button
                onClick={() => setComposerOpen(true)}
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-95 transition-all"
                aria-label="Post a case"
                style={{ boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
            >
                <Plus size={24} strokeWidth={2.5} />
            </button>

            {/* ── Composer ── */}
            <WardCaseComposer
                open={composerOpen}
                onClose={() => setComposerOpen(false)}
                user={user}
                onPosted={handlePosted}
            />
        </div>
    );
}