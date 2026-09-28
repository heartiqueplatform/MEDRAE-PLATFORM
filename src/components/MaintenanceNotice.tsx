// src/components/MaintenanceNotice.tsx
"use client";
import { useEffect, useState, useMemo } from "react";

// ============================================================
// 🎉 ONE-TIME ANNOUNCEMENT / CELEBRATION OVERLAY
// ============================================================
// Shows ONCE per user (per browser). After dismissal, it never
// shows again — unless you bump NOTICE_VERSION below.
//
// HOW IT WORKS:
//   - STORAGE_KEY stores the version the user has already seen.
//   - If NOTICE_VERSION !== stored version → show once.
//   - After dismiss → store NOTICE_VERSION → never shows again.
//
// HOW TO RE-SHOW TO EVERYONE:
//   - Bump NOTICE_VERSION (e.g. "1" → "2") and deploy.
//   - Everyone sees it once more, then it goes quiet again.
//
// HOW TO FORCE-SHOW FOR TESTING (only you):
//   - Add ?notice=1 to any URL
//   - OR localStorage.removeItem("medrae_notice_seen_v1")
// ============================================================

const NOTICE_VERSION = "3";                          // ← bump to re-show to all
const STORAGE_KEY = `medrae_notice_seen_v${NOTICE_VERSION}`;

// ---- Message content (edit here) ----
const NOTICE = {

    title: "7,000 new questions just landed",
    body:
        "We've massively expanded the question bank with 7,000 brand-new, fully verified questions. Every Prep Quiz is now bigger, sharper, and closer to the real exam.",
    tip:
        "We'll keep updating regularly — so stay stocked, stay sharp, and check back often. You'll never run out of practice.",
    ctaLabel: "Go to Prep Quizzes",
    ctaHref: "/Medrae-quizzes",
    etaLabel: "Live now — no action needed",
};

// ---- Has this version been seen? ----
function hasSeenNotice(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === NOTICE_VERSION;
    } catch {
        return false;
    }
}

function markNoticeSeen() {
    try {
        localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
    } catch { /* ignore */ }
}

// ============================================================
// 🎊 CONFETTI ENGINE — lightweight, no dependencies
// ============================================================
function fireConfetti(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const COLORS = [
        "#FF1F1F", "#FF5757", "#FFD700", "#FFA500",
        "#00C9A7", "#4D96FF", "#B983FF", "#FFFFFF",
    ];

    type Piece = {
        x: number; y: number; vx: number; vy: number;
        w: number; h: number; rot: number; vrot: number;
        color: string; shape: "rect" | "circle" | "ribbon";
        life: number; maxLife: number;
    };

    const pieces: Piece[] = [];
    const count = 180;

    // Two cannons — left & right corners
    for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        const angle = fromLeft
            ? -Math.PI / 3 + (Math.random() - 0.5) * 0.5
            : -Math.PI * 2 / 3 + (Math.random() - 0.5) * 0.5;
        const speed = 9 + Math.random() * 9;

        pieces.push({
            x: fromLeft ? 0 : W,
            y: H * 0.75,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            w: 6 + Math.random() * 6,
            h: 4 + Math.random() * 8,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 0.35,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            shape: Math.random() < 0.7 ? "rect" : Math.random() < 0.5 ? "circle" : "ribbon",
            life: 0,
            maxLife: 180 + Math.random() * 90,
        });
    }

    let raf = 0;
    const gravity = 0.32;
    const drag = 0.992;

    const tick = () => {
        ctx.clearRect(0, 0, W, H);
        let alive = 0;

        for (const p of pieces) {
            p.life++;
            if (p.life > p.maxLife) continue;
            alive++;

            p.vy += gravity;
            p.vx *= drag;
            p.vy *= drag;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vrot;

            const alpha = Math.max(0, 1 - p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;

            if (p.shape === "circle") {
                ctx.beginPath();
                ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === "ribbon") {
                ctx.fillRect(-p.w / 2, -p.h * 1.5, p.w, p.h * 3);
            } else {
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            }
            ctx.restore();
        }

        if (alive > 0) {
            raf = requestAnimationFrame(tick);
        } else {
            ctx.clearRect(0, 0, W, H);
        }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
}

export default function MaintenanceNotice() {
    const [open, setOpen] = useState(false);
    const [burstKey, setBurstKey] = useState(0);
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const force = new URLSearchParams(window.location.search).has("notice");
        const shouldShow = force || !hasSeenNotice();

        if (shouldShow) {
            setOpen(true);
            // Slight delay so the entrance animation feels choreographed
            const t = setTimeout(() => setBurstKey((k) => k + 1), 220);
            return () => clearTimeout(t);
        }
    }, []);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Fire confetti each time burstKey changes
    useEffect(() => {
        if (!open || !canvasEl || burstKey === 0) return;
        const stop = fireConfetti(canvasEl);
        return stop;
    }, [burstKey, open, canvasEl]);

    const dismiss = () => {
        markNoticeSeen();
        setOpen(false);
    };

    // SSR guard
    const isClient = useMemo(() => typeof window !== "undefined", []);
    if (!open || !isClient) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
            {/* 🎊 Confetti canvas — sits above the dim, behind the card */}
            <canvas
                ref={setCanvasEl}
                className="pointer-events-none fixed inset-0"
                style={{ zIndex: 10001 }}
                aria-hidden="true"
            />

            {/* Card */}
            <div
                className="
                    relative w-full max-w-md
                    rounded-2xl
                    bg-white dark:bg-[#0d0d10]
                    p-6
                    text-left
                    overflow-hidden
                "
                style={{
                    zIndex: 10002,
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,31,31,0.15)",
                    animation: "medrae-notice-in 320ms cubic-bezier(0.2,0.8,0.2,1) both",
                }}
            >
                {/* Red celebration glow */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full"
                    style={{
                        background:
                            "radial-gradient(circle, rgba(255,31,31,0.18), rgba(255,31,31,0) 70%)",
                    }}
                />

                {/* Close button */}
                <button
                    onClick={dismiss}
                    aria-label="Dismiss announcement"
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



                {/* Title */}
                <h2
                    id="announcement-title"
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

                {/* ETA / status line */}
                <div className="mt-4 flex items-center gap-2 text-[12px] md:text-[13px] text-slate-500 dark:text-slate-400">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                    </svg>
                    <span>{NOTICE.etaLabel}</span>
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

            {/* Animations */}
            <style>{`
                @keyframes medrae-notice-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [role="dialog"] > div { animation: none !important; }
                }
            `}</style>
        </div>
    );
}