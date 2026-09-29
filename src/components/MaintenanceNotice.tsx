// src/components/MaintenanceNotice.tsx
"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    useCelebrationNotification,
    type CelebrationNotice,
} from "@/hooks/useCelebrationNotification";

// ============================================================
// 🎉 CELEBRATION OVERLAY — driven by real notifications
// ============================================================
// Fires when an UNREAD notification with `celebrate = true`
// exists for the logged-in user. Refreshes on:
//   - initial mount
//   - route change (react-router)
//   - tab regaining focus (visibilitychange)
//
// Dismissal = mark the row `is_read = true` in the DB, so the
// overlay stays gone across refreshes and across devices.
//
// Plays /sounds/Trivia.mp3 when the overlay opens.
//
// FORCE SHOW (for testing):
//   - Add ?notice=1 to any URL
// ============================================================

const SOUND_SRC = "/sounds/Toast.mp3";
const SOUND_VOLUME = 0.55; // 0.0 – 1.0

// Per-type copy: emoji, CTA label, fallback link, tip
const TYPE_COPY: Record<
    string,
    { emoji: string; ctaLabel: string; ctaHrefFallback: string; tip: string }
> = {
    quiz: {
        emoji: "📚",
        ctaLabel: "Go to Prep Quizzes",
        ctaHrefFallback: "/Medrae-quizzes",
        tip: "We'll keep updating regularly — so stay stocked, stay sharp, and check back often. You'll never run out of practice.",
    },
    video: {
        emoji: "🎬",
        ctaLabel: "Watch now",
        ctaHrefFallback: "/medtube",
        tip: "New videos drop regularly — follow along to stay sharp.",
    },
    flashcard: {
        emoji: "🃏",
        ctaLabel: "Study now",
        ctaHrefFallback: "/flashcards",
        tip: "Spaced repetition wins — review a few cards a day.",
    },
    paper: {
        emoji: "📝",
        ctaLabel: "Take the paper",
        ctaHrefFallback: "/papers",
        tip: "Practice under timed conditions for the best gains.",
    },
    system: {
        emoji: "🎉",
        ctaLabel: "Open",
        ctaHrefFallback: "/",
        tip: "",
    },
};

// ============================================================
// 🎊 CONFETTI ENGINE
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

    for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        const angle = fromLeft
            ? -Math.PI / 3 + (Math.random() - 0.5) * 0.5
            : (-Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.5;
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

// ============================================================
// COMPONENT
// ============================================================
export default function MaintenanceNotice() {
    const navigate = useNavigate();
    const { notice, markRead } = useCelebrationNotification();

    const [burstKey, setBurstKey] = useState(0);
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
    const [forceOpen, setForceOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ?notice=1 → demo notice for testing
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (new URLSearchParams(window.location.search).has("notice")) {
            setForceOpen(true);
        }
    }, []);

    // Pick whichever is active: real notice, or the forced demo
    const activeNotice: CelebrationNotice | null =
        notice ??
        (forceOpen
            ? {
                id: "demo-" + Date.now(),
                title: "7,000 new questions just landed",
                message:
                    "We've massively expanded the question bank with 7,000 brand-new, fully verified questions. Every Prep Quiz is now bigger, sharper, and closer to the real exam.",
                type: "quiz",
                link_url: "/Medrae-quizzes",
                created_at: new Date().toISOString(),
            }
            : null);

    const open = !!activeNotice;
    const copy = TYPE_COPY[activeNotice?.type || "system"] || TYPE_COPY.system;
    const ctaHref = activeNotice?.link_url || copy.ctaHrefFallback;

    // ---------------------------------------------------------
    // 🔊 Play /sounds/Trivia.mp3 whenever the overlay opens
    // ---------------------------------------------------------
    useEffect(() => {
        if (!open) {
            // Overlay closed → stop any playing sound
            const a = audioRef.current;
            if (a) {
                a.pause();
                a.currentTime = 0;
            }
            return;
        }

        // Lazily create the audio element once
        if (!audioRef.current) {
            const a = new Audio(SOUND_SRC);
            a.volume = SOUND_VOLUME;
            a.preload = "auto";
            audioRef.current = a;
        }

        const audio = audioRef.current;
        try {
            audio.currentTime = 0;
            const p = audio.play();
            // Browsers may block autoplay until user interaction —
            // we swallow the rejection so it doesn't spam the console.
            if (p && typeof p.catch === "function") {
                p.catch(() => { /* autoplay blocked, ignore */ });
            }
        } catch {
            /* ignore */
        }

        return () => {
            // On unmount / close: stop the sound
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch { /* ignore */ }
        };
    }, [open, activeNotice?.id]);

    // Fire confetti shortly after the card mounts
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => setBurstKey((k) => k + 1), 220);
        return () => clearTimeout(t);
    }, [open]);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    // Escape to dismiss
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, activeNotice]);

    // Run confetti on burstKey change
    useEffect(() => {
        if (!open || !canvasEl || burstKey === 0) return;
        const stop = fireConfetti(canvasEl);
        return stop;
    }, [burstKey, open, canvasEl]);

    const dismiss = () => {
        // Stop the sound immediately
        const a = audioRef.current;
        if (a) {
            try {
                a.pause();
                a.currentTime = 0;
            } catch { /* ignore */ }
        }

        // Real notification → mark it read in the DB.
        // Demo (?notice=1) → just close, don't touch DB.
        if (activeNotice && !activeNotice.id.startsWith("demo-")) {
            markRead(activeNotice.id);
        }
        setForceOpen(false);
    };

    const goTo = () => {
        dismiss();
        if (ctaHref) navigate(ctaHref);
    };

    // SSR guard
    const isClient = useMemo(() => typeof window !== "undefined", []);
    if (!open || !isClient || !activeNotice) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
            {/* 🎊 Confetti canvas */}
            <canvas
                ref={setCanvasEl}
                className="pointer-events-none fixed inset-0"
                style={{ zIndex: 10001 }}
                aria-hidden="true"
            />

            {/* Card */}
            <div
                className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#0d0d10] p-6 text-left overflow-hidden"
                style={{
                    zIndex: 10002,
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,31,31,0.15)",
                    animation: "medrae-notice-in 320ms cubic-bezier(0.2,0.8,0.2,1) both",
                }}
            >
                {/* Red glow */}
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
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
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
                    <span className="mr-1.5">{copy.emoji}</span>
                    {activeNotice.title}
                </h2>

                {/* Body */}
                <p className="mt-2 text-[14px] md:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {activeNotice.message}
                </p>

                {/* Tip */}
                {copy.tip && (
                    <div className="mt-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] p-3.5">
                        <p className="text-[13px] md:text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                            {copy.tip}
                        </p>
                    </div>
                )}

                {/* Timestamp */}
                <div className="mt-4 flex items-center gap-2 text-[12px] md:text-[13px] text-slate-500 dark:text-slate-400">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                    </svg>
                    <span>
                        {new Date(activeNotice.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                    <button
                        onClick={goTo}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF1F1F] hover:bg-[#e01a1a] text-white text-[14px] font-medium transition-colors"
                    >
                        {copy.ctaLabel}
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </button>
                    <button
                        onClick={dismiss}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-[14px] font-medium transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>

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