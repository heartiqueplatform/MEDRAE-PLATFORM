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
import { playSound } from "@/lib/soundManager";

interface Props {
    user: any;
}

const PAGE_SIZE = 8;
const SKELETON_COUNT = 3;

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

/* ═══════════════════════════════════════════════════════════════ */
/* SKELETON CARD — token palette, solid visible blocks            */
/* ═══════════════════════════════════════════════════════════════ */
function WardCaseSkeleton() {
    return (
        <div className="mb-2 bg-white dark:bg-[#161b22] rounded-2xl overflow-hidden animate-pulse">
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-2 w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
            <div className="px-3 pb-2 space-y-1.5">
                <div className="h-4 w-3/4 rounded-md bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex gap-1.5">
                    <div className="h-4 w-16 rounded-md bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-4 w-12 rounded-md bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
            <div className="px-3 pb-2 space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] space-y-1.5">
                    <div className="h-2 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] space-y-1.5">
                    <div className="h-2 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
            <div className="px-3 py-2 flex items-center gap-1.5 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="h-8 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-8 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-8 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════ */
/* EMPTY STATE — original stacked cards, just tighter             */
/* ═══════════════════════════════════════════════════════════════ */
function EmptyState({ onCompose }: { onCompose: () => void }) {
    const templates = [
        {
            icon: Stethoscope,
            title: "Ward Case",
            desc: "Real patient scenarios — vitals, decisions, rationale.",
            accent: "bg-teal-600",
        },
        {
            icon: FileText,
            title: "Exam MCQ",
            desc: "Test clinical knowledge with structured questions.",
            accent: "bg-blue-600",
        },
        {
            icon: MessageSquareQuote,
            title: "Reflection",
            desc: "Turn a learning moment into a lesson for others.",
            accent: "bg-violet-600",
        },
    ];

    return (
        <div className="w-full flex flex-col items-center text-center px-3 pt-3 pb-2">
            {/* Hero — reduced from 320 to 160 max-width */}
            <div className="w-full max-w-[160px] mx-auto">
                <HeroLottie />
            </div>

            {/* Headline */}
            <h2 className="mt-2 text-[16px] font-bold text-slate-900 dark:text-white leading-tight">
                Your ward, your wisdom.
            </h2>

            {/* Subheadline — tightened copy, 2 lines instead of 4 */}
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[340px] mx-auto">
                Share a clinical moment — a patient you learned from, a
                decision that taught you something. Others learn from you.
            </p>

            {/* Template cards — vertical stack preserved, reduced size */}
            <div className="w-full max-w-[420px] mt-4 space-y-1.5">
                {templates.map((t) => {
                    const Icon = t.icon;
                    return (
                        <div
                            key={t.title}
                            className="flex items-center gap-2.5
                                       bg-slate-50 dark:bg-[#161b22]
                                       rounded-xl px-2.5 py-2 text-left"
                        >
                            <div
                                className={`${t.accent} h-8 w-8 rounded-lg
                                            flex items-center justify-center
                                            text-white shrink-0`}
                            >
                                <Icon size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                                    {t.title}
                                </p>
                                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                                    {t.desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Big CTA */}
            <button
                onClick={() => {
                    tap();
                    onCompose();
                }}
                className="mt-3 w-full max-w-[360px] h-11 rounded-xl
                           text-sm font-bold text-white
                           bg-blue-600
                           flex items-center justify-center gap-2
                           active:scale-[0.97] transition-transform"
                style={{ touchAction: "manipulation" }}
            >
                Share your first case
                <ArrowRight size={15} />
            </button>

            {/* Reassurance */}
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                Takes less than 2 minutes · Structured format · Instant feedback
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN FEED                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function WardCaseFeed({ user }: Props) {
    const [cases, setCases] = useState<WardCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [composerOpen, setComposerOpen] = useState(false);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const exhaustedRef = useRef(false);

    const fetchPage = useCallback(async (pageOffset: number) => {
        if (loadingRef.current) return;
        if (exhaustedRef.current) return;
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

            // Terminate when a page comes back short
            if (mapped.length < PAGE_SIZE) {
                setHasMore(false);
                exhaustedRef.current = true;
            } else {
                setOffset(pageOffset + mapped.length);
            }
        } catch (err) {
            console.warn("[WardCaseFeed] fetch failed:", err);
            setHasMore(false);
            exhaustedRef.current = true;
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(0);
    }, [fetchPage]);

    /* Infinite scroll — guarded by exhaustedRef + not-mounted sentinel */
    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        if (!hasMore || exhaustedRef.current) return;

        const obs = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMore &&
                    !loadingRef.current &&
                    !exhaustedRef.current
                ) {
                    fetchPage(offset);
                }
            },
            { rootMargin: "800px 0px", threshold: 0 }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [hasMore, offset, fetchPage]);

    const handlePosted = () => {
        exhaustedRef.current = false;
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
        <div className="w-full max-w-4xl mx-auto px-2 pt-2 pb-24 relative">
            {/* Intro */}
            <div className="mb-3 px-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Community cases
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Share your clinical moments. Learn from each other.
                </p>
            </div>

            {/* Skeletons */}
            {showSkeletons &&
                Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <WardCaseSkeleton key={i} />
                ))}

            {/* Empty */}
            {showEmpty && <EmptyState onCompose={() => setComposerOpen(true)} />}

            {/* Feed */}
            {cases.map((c) => (
                <div key={c.id} className="mb-2">
                    <WardCaseCard
                        wardCase={c}
                        currentUser={user}
                        onDeleted={handleDeleted}
                    />
                </div>
            ))}

            {/* Sentinel — only mounted while more pages exist */}
            {hasMore && !exhaustedRef.current && (
                <div ref={sentinelRef} className="h-16" />
            )}

            {/* Pagination spinner — only when actually loading more */}
            {loading && cases.length > 0 && (
                <div className="py-4 flex items-center justify-center gap-2">
                    <Loader2
                        size={14}
                        className="animate-spin text-slate-400 dark:text-slate-500"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Loading more cases…
                    </span>
                </div>
            )}

            {/* End cap */}
            {!hasMore && cases.length > 0 && (
                <div className="py-6 text-center">
                    <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                        You've seen every case for now
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Come back later for fresh clinical moments.
                    </p>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => {
                    tap();
                    setComposerOpen(true);
                }}
                className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40
                           h-14 w-14 rounded-full
                           bg-blue-600 text-white
                           flex items-center justify-center
                           active:scale-[0.92] transition-transform"
                aria-label="Post a case"
                style={{
                    touchAction: "manipulation",
                    boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
                }}
            >
                <Plus size={22} strokeWidth={2.5} />
            </button>

            {/* Composer */}
            <WardCaseComposer
                open={composerOpen}
                onClose={() => setComposerOpen(false)}
                user={user}
                onPosted={handlePosted}
            />
        </div>
    );
}