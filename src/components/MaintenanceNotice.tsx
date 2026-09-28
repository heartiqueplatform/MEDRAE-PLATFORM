// src/components/MaintenanceNotice.tsx
"use client";
import { useEffect, useState } from "react";

// ============================================================
// 🔧 MAINTENANCE NOTICE — FULL-SCREEN OVERLAY
// ============================================================
// Show this overlay when a feature is temporarily down.
//
// HOW TO ACTIVATE:
//   1. Set ENABLED = true below (instant, global)
//   2. OR open your app with ?maintenance=quiz-bank
//   3. OR set localStorage.setItem('maintenance_notice', 'quiz-bank')
//
// HOW TO DISMISS:
//   - User taps the X or "Got it" button
//   - Dismissal is remembered for SESSION_DURATION_MS
//   - After that window, the notice reappears on next visit
//
// ============================================================

const ENABLED = false;                          // ← flip to true to force-show
const STORAGE_KEY = "maintenance_notice_dismissed";
const SESSION_DURATION_MS = 60 * 60 * 1000;    // 1 hour re-show window

// ---- Message content (edit here) ----
const NOTICE = {
    badge: "Scheduled maintenance",
    title: "Question Bank is updating",
    body:
        "Our NCK Prep Quiz question bank is temporarily unavailable for the next 24 hours while we deploy a fresh set of fully verified questions.",
    tip:
        "In the meantime, keep learning with Nursing Compass questions — same NCK style, ready now.",
    ctaLabel: "Continue with Nursing Compass",
    ctaHref: "/nursing",
    etaLabel: "Expected back by Monday 28-9-2026",
};

// ---- Compute ETA string (2 hours from mount) ----
function getEtaLabel(): string {
    const eta = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return eta.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

// ---- Was the notice recently dismissed? ----
function wasRecentlyDismissed(): boolean {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const ts = Number(raw);
        if (!ts || Number.isNaN(ts)) return false;
        return Date.now() - ts < SESSION_DURATION_MS;
    } catch {
        return false;
    }
}

function rememberDismissal() {
    try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* ignore */ }
}

export default function MaintenanceNotice() {
    const [open, setOpen] = useState(false);
    const [eta, setEta] = useState<string>("");

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Show if:
        //   1. ENABLED is true, OR
        //   2. ?maintenance=1 (or any value) is in the URL
        // AND user hasn't dismissed it recently.
        const urlHasFlag = new URLSearchParams(window.location.search).has("maintenance");
        const shouldShow = (ENABLED || urlHasFlag) && !wasRecentlyDismissed();

        if (shouldShow) {
            setEta(getEtaLabel());
            setOpen(true);
        }
    }, []);

    // Lock body scroll while overlay is open
    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const dismiss = () => {
        rememberDismissal();
        setOpen(false);
    };

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-title"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        >
            {/* Card */}
            <div
                className="
                    relative w-full max-w-md
                    rounded-2xl
                    bg-white dark:bg-[#0d0d10]
                    p-6
                    text-left
                "
                style={{
                    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
                    animation: "medrae-notice-in 260ms cubic-bezier(0.2,0.8,0.2,1) both",
                }}
            >
                {/* Close button */}
                <button
                    onClick={dismiss}
                    aria-label="Dismiss notice"
                    className="
                        absolute top-3 right-3
                        w-8 h-8 rounded-full
                        flex items-center justify-center
                        text-slate-400 hover:text-slate-700
                        dark:text-slate-500 dark:hover:text-slate-200
                        hover:bg-slate-100 dark:hover:bg-white/5
                        transition-colors
                    "
                >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>

                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF1F1F]/10 dark:bg-[#FF1F1F]/15 border border-[#FF1F1F]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF1F1F] animate-pulse" />
                    <span className="text-[11px] font-semibold tracking-wide text-[#FF1F1F] dark:text-[#FF5757] uppercase">
                        {NOTICE.badge}
                    </span>
                </div>

                {/* Title */}
                <h2
                    id="maintenance-title"
                    className="mt-3 text-[22px] md:text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white"
                >
                    {NOTICE.title}
                </h2>

                {/* Body */}
                <p className="mt-2 text-[14px] md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {NOTICE.body}
                </p>

                {/* Tip box */}
                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] p-3.5">
                    <p className="text-[13px] md:text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                        {NOTICE.tip}
                    </p>
                </div>

                {/* ETA */}
                <div className="mt-4 flex items-center gap-2 text-[12px] md:text-[13px] text-slate-500 dark:text-slate-400">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                    </svg>
                    <span>
                        {NOTICE.etaLabel} <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{eta}</strong>
                    </span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                    <a
                        href={NOTICE.ctaHref}
                        onClick={dismiss}
                        className="
                            flex-1 inline-flex items-center justify-center gap-2
                            px-4 py-2.5 rounded-xl
                            bg-[#FF1F1F] hover:bg-[#e01a1a]
                            text-white text-[14px] font-medium
                            transition-colors
                        "
                    >
                        {NOTICE.ctaLabel}
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </a>
                    <button
                        onClick={dismiss}
                        className="
                            flex-1 sm:flex-initial
                            px-4 py-2.5 rounded-xl
                            bg-slate-100 hover:bg-slate-200
                            dark:bg-white/5 dark:hover:bg-white/10
                            text-slate-700 dark:text-slate-200
                            text-[14px] font-medium
                            transition-colors
                        "
                    >
                        Got it
                    </button>
                </div>
            </div>

            {/* Animation */}
            <style>{`
                @keyframes medrae-notice-in {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [role="dialog"] > div { animation: none !important; }
                }
            `}</style>
        </div>
    );
}