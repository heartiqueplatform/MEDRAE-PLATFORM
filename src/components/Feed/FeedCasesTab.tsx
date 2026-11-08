"use client";

import { useEffect, useRef, useState } from "react";
import { MicroCaseCard } from "@/components/MicroCaseCard";
import ShortMedical from "@/components/ShortMedical";

// ── Tunables ──────────────────────────────────────────────
const INITIAL_CASES = 4;        // cards rendered on first paint
const APPEND_BATCH = 3;         // cards added per scroll tick
const MAX_CASES = 60;           // hard cap so the feed never explodes
const MEDICAL_EVERY_N = 2;      // inject ShortMedical after every 2 cases

// Slot types — each entry in the render queue is one of these.
type Slot =
    | { kind: "case"; id: number }
    | { kind: "medical"; id: number };

export default function FeedCasesTab() {
    // Render queue. We only append — never reorder — so React keeps
    // each MicroCaseCard's state (liked, saved) stable across renders.
    const [slots, setSlots] = useState<Slot[]>(() => {
        const initial: Slot[] = [];
        for (let i = 0; i < INITIAL_CASES; i++) {
            initial.push({ kind: "case", id: i });
            // After every MEDICAL_EVERY_N cases, inject ShortMedical
            if ((i + 1) % MEDICAL_EVERY_N === 0) {
                initial.push({ kind: "medical", id: 1000 + i });
            }
        }
        return initial;
    });

    const nextCaseIdRef = useRef(INITIAL_CASES);
    const nextMedicalIdRef = useRef(1000 + INITIAL_CASES);
    const caseCountRef = useRef(INITIAL_CASES);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // ── Append a batch of slots (cases + medicals interleaved) ──
    const appendMore = () => {
        setSlots((prev) => {
            if (prev.filter((s) => s.kind === "case").length >= MAX_CASES) {
                return prev;
            }
            const next = [...prev];
            for (let i = 0; i < APPEND_BATCH; i++) {
                next.push({ kind: "case", id: nextCaseIdRef.current++ });
                caseCountRef.current += 1;
                if (caseCountRef.current % MEDICAL_EVERY_N === 0) {
                    next.push({
                        kind: "medical",
                        id: nextMedicalIdRef.current++,
                    });
                }
            }
            return next;
        });
    };

    // ── Infinite scroll sentinel ────────────────────────────────
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
    }, []);

    // ── Render ──────────────────────────────────────────────────
    return (
        <div className="w-full max-w-4xl mx-auto px-2 pt-2 pb-6">
            {/* Page intro */}
            <div className="mb-3 px-1">
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-50">
                    Clinical Micro-Cases
                </h2>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-0.5">
                    Real scenarios. Real decisions. Learn by doing.
                </p>
            </div>

            {/* Render queue — cases + ShortMedical interleaved */}
            {slots.map((slot) =>
                slot.kind === "case" ? (
                    <div key={`case-${slot.id}`} className="w-full">
                        <MicroCaseCard />
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

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-16" />

            {/* Cap message */}
            {slots.filter((s) => s.kind === "case").length >= MAX_CASES && (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
                    You've reached the end for now. Come back later for more.
                </p>
            )}
        </div>
    );
}