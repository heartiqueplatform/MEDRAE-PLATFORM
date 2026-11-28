"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicroCaseCard } from "@/components/MicroCaseCard";
import ShortMedical from "@/components/ShortMedical";
import { useConnectivity } from "@/context/ConnectivityContext";
import OfflineLottie from "@/components/OfflineLottie";

// ── Tunables ──────────────────────────────────────────────
const INITIAL_CASES = 4;
const APPEND_BATCH = 3;
const MAX_CASES = 60;

// Paper-card placement: after N more cases, inject one ShortMedical.
const PAPER_GAP_LADDER = [3, 5, 7, 15];
const PAPER_GAP_WEIGHTS = [0.40, 0.30, 0.20, 0.10];

type Slot =
    | { kind: "case"; id: number }
    | { kind: "medical"; id: number };

function pickGap(previousGap: number | null): number {
    let candidates = [...PAPER_GAP_LADDER];
    let weights = [...PAPER_GAP_WEIGHTS];
    if (previousGap !== null && candidates.length > 1) {
        const filtered: number[] = [];
        const fw: number[] = [];
        for (let i = 0; i < candidates.length; i++) {
            if (candidates[i] !== previousGap) {
                filtered.push(candidates[i]);
                fw.push(weights[i]);
            }
        }
        candidates = filtered;
        weights = fw;
    }
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
        r -= weights[i];
        if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

/* ------------------------------------------------------------------ */
/*  Offline empty state — shown only when the feed has NEVER loaded  */
/*  content and we're offline. Same pattern as the Questions tab.    */
/* ------------------------------------------------------------------ */
function OfflineCasesEmpty({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="w-full max-w-4xl mx-auto px-2 pt-2 pb-6">
            <div className="
                rounded-2xl
                bg-white dark:bg-[#161b22]
                px-5 py-10 sm:py-14
                flex flex-col items-center text-center
            ">
                <div className="w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 shrink-0">
                    <OfflineLottie />
                </div>

                <h3 className="
                    mt-5 text-lg sm:text-xl font-bold tracking-tight
                    text-slate-900 dark:text-white
                ">
                    No cases loaded yet
                </h3>

                <p className="
                    mt-2 max-w-sm text-sm leading-relaxed
                    text-slate-500 dark:text-slate-400
                ">
                    You're offline and this feed hasn't been cached yet. Clinical
                    cases will appear as soon as you reconnect.
                </p>

                <button
                    type="button"
                    onClick={onRetry}
                    className="
                        mt-6 h-11 px-5 rounded-2xl
                        bg-violet-600 text-white
                        text-sm font-bold
                        flex items-center justify-center gap-2
                        active:scale-[0.97] transition-transform
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
                    "
                    style={{ touchAction: "manipulation" }}
                >
                    <svg
                        viewBox="0 0 24 24" fill="none"
                        className="h-4 w-4" strokeWidth={2.4} stroke="currentColor"
                    >
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <polyline points="21 3 21 9 15 9" />
                    </svg>
                    Try again
                </button>

                <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                    Cached cases will still open offline once loaded.
                </p>
            </div>
        </div>
    );
}

export default function FeedCasesTab() {
    const { isOnline } = useConnectivity();

    // ── ✅ NEW: has ANY card ever actually loaded data this session? ──
    // This is what controls the offline gate. It flips to true the moment
    // any MicroCaseCard reports success. It never flips back to false.
    const [hasAnyCardLoaded, setHasAnyCardLoaded] = useState(false);

    // Callback passed down to every MicroCaseCard.
    const handleCardLoaded = useCallback(() => {
        setHasAnyCardLoaded(true);
    }, []);

    // ── Gap state ──
    const nextCaseIdRef = useRef(0);
    const nextMedicalIdRef = useRef(10000);
    const casesSinceLastPaperRef = useRef(0);
    const lastGapRef = useRef<number | null>(null);
    const nextPaperAtRef = useRef<number | null>(null);
    const caseCountRef = useRef(0);

    const [slots, setSlots] = useState<Slot[]>(() => {
        const initial: Slot[] = [];
        nextPaperAtRef.current = pickGap(null);
        casesSinceLastPaperRef.current = 0;
        caseCountRef.current = 0;

        for (let i = 0; i < INITIAL_CASES; i++) {
            initial.push({ kind: "case", id: nextCaseIdRef.current++ });
            caseCountRef.current += 1;
            casesSinceLastPaperRef.current += 1;

            if (
                nextPaperAtRef.current !== null &&
                casesSinceLastPaperRef.current >= nextPaperAtRef.current
            ) {
                initial.push({
                    kind: "medical",
                    id: nextMedicalIdRef.current++,
                });
                lastGapRef.current = nextPaperAtRef.current;
                nextPaperAtRef.current = pickGap(lastGapRef.current);
                casesSinceLastPaperRef.current = 0;
            }
        }
        return initial;
    });

    const sentinelRef = useRef<HTMLDivElement>(null);

    const appendMore = useCallback(() => {
        // 🚫 No network → do not append more placeholders that will fail
        if (!isOnline) return;
        if (caseCountRef.current >= MAX_CASES) return;

        const additions: Slot[] = [];
        for (let i = 0; i < APPEND_BATCH; i++) {
            if (caseCountRef.current >= MAX_CASES) break;

            additions.push({ kind: "case", id: nextCaseIdRef.current++ });
            caseCountRef.current += 1;
            casesSinceLastPaperRef.current += 1;

            if (
                nextPaperAtRef.current !== null &&
                casesSinceLastPaperRef.current >= nextPaperAtRef.current
            ) {
                additions.push({
                    kind: "medical",
                    id: nextMedicalIdRef.current++,
                });
                lastGapRef.current = nextPaperAtRef.current;
                nextPaperAtRef.current = pickGap(lastGapRef.current);
                casesSinceLastPaperRef.current = 0;
            }
        }
        setSlots((prev) => [...prev, ...additions]);
    }, [isOnline]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) appendMore();
            },
            { rootMargin: "800px 0px", threshold: 0 }
        );
        obs.observe(node);
        return () => obs.disconnect();
    }, [appendMore]);

    // ── ✅ FIXED GATE ──
    // Show the full-page offline state only when:
    //   - we're offline, AND
    //   - no card has EVER loaded (i.e. genuinely first-visit offline)
    //
    // Once the user has loaded even one card, they see the feed + the
    // quiet amber footer below instead of the full-page takeover.
    const showOfflineEmpty = !isOnline && !hasAnyCardLoaded;

    if (showOfflineEmpty) {
        return (
            <OfflineCasesEmpty
                onRetry={() => {
                    if (typeof window !== "undefined") {
                        window.location.reload();
                    }
                }}
            />
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-2 pt-2 pb-6">
            <div className="mb-3 px-1">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
                    Clinical Micro-Cases
                </h2>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-0.5">
                    Real scenarios. Real decisions. Learn by doing.
                </p>
            </div>

            {slots.map((slot) =>
                slot.kind === "case" ? (
                    <div key={`case-${slot.id}`} className="w-full">
                        <MicroCaseCard onLoaded={handleCardLoaded} />
                    </div>
                ) : (
                    <div key={`medical-${slot.id}`} className="w-full mb-3">
                        <ShortMedical
                            limit={3}
                            title="Medical Conditions"
                            subtitle="Hypertension, Heart Failure & more"
                        />
                    </div>
                )
            )}

            <div ref={sentinelRef} className="h-16" />

            {caseCountRef.current >= MAX_CASES && (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
                    You've reached the end for now. Come back later for more.
                </p>
            )}

            {!isOnline && hasAnyCardLoaded && (
                <p className="text-center text-[11px] text-amber-600 dark:text-amber-400 py-4">
                    You're offline — new cases will load when you reconnect.
                </p>
            )}
        </div>
    );
}