// src/components/LogoutDialog.tsx
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, CloudRain, ArrowLeft, Loader2 } from "lucide-react";

interface LogoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void> | void;
    userName?: string;
    streakDays?: number;
}

export function LogoutDialog({
    open,
    onOpenChange,
    onConfirm,
    userName,
    streakDays,
}: LogoutDialogProps) {
    const [isLeaving, setIsLeaving] = useState(false);

    const handleConfirm = async () => {
        setIsLeaving(true);
        setTimeout(async () => {
            try {
                await onConfirm();
            } finally {
                setIsLeaving(false);
            }
        }, 900);
    };

    const firstName = userName?.trim().split(" ")[0] || "friend";

    return (
        <>
            <style>{`
        @keyframes medrae-gradient-shift {
          0%   { background-position:   0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position:   0% 50%; }
        }
        .medrae-hero-gradient {
          background-size: 200% 200%;
          animation: medrae-gradient-shift 8s ease infinite;
        }

        /* ── GitHub-dark theme (no borders, flat surfaces) ── */
        .dark .medrae-logout-dialog {
          background-color: #0d1117 !important;
          border: none !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
        }
        .dark .medrae-logout-body {
          background-color: #0d1117 !important;
          color: #e6edf3 !important;
        }
        .dark .medrae-logout-title {
          color: #e6edf3 !important;
        }
        .dark .medrae-logout-desc {
          color: #8b949e !important;
        }
        .dark .medrae-stay-btn {
          background-color: #21262d !important;
          color: #e6edf3 !important;
          border: none !important;
        }
        .dark .medrae-stay-btn:hover {
          background-color: #30363d !important;
        }
        .dark .medrae-streak-pill {
          background-color: rgba(210, 153, 34, 0.15) !important;
          color: #d29922 !important;
          border: none !important;
        }
        .dark .medrae-reassure {
          color: #6e7681 !important;
        }
        .dark .medrae-footer-whisper {
          color: #484f58 !important;
        }
        .dark .medrae-signing {
          color: #8b949e !important;
        }
      `}</style>

            <Dialog open={open} onOpenChange={(o) => !isLeaving && onOpenChange(o)}>
                <DialogContent
                    className="
            medrae-logout-dialog
            rounded-3xl shadow-xl overflow-hidden
            w-[calc(100%-2rem)] max-w-md
            p-0
            border-0
            animate-in fade-in zoom-in-95 duration-300
            data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out
          "
                >
                    {/* ═══════════════════════════════════════════════════════
              HERO — animated multi-stop gradient + logo badge
              ═══════════════════════════════════════════════════════ */}
                    <div
                        className="
              medrae-hero-gradient
              relative h-44 w-full overflow-hidden
              bg-gradient-to-br
              from-rose-200 via-amber-100 via-emerald-100 to-sky-200
              dark:from-[#1f2937] dark:via-[#111827] dark:via-[#0d1117] dark:to-[#1e1b4b]
            "
                    >
                        {/* Soft color blobs for depth */}
                        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-rose-300/50 dark:bg-rose-500/10 blur-2xl animate-pulse" />
                        <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-emerald-300/50 dark:bg-emerald-500/10 blur-2xl animate-pulse [animation-delay:600ms]" />
                        <div className="absolute top-4 right-6 h-16 w-16 rounded-full bg-amber-200/60 dark:bg-amber-500/10 blur-xl animate-pulse [animation-delay:1200ms]" />
                        <div className="absolute bottom-6 left-8 h-20 w-20 rounded-full bg-sky-200/50 dark:bg-sky-500/10 blur-xl animate-pulse [animation-delay:1800ms]" />

                        {/* ═══ Center badge — logo flips to sad rain cloud ═══ */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Logo card */}
                            <div
                                className={`
                  relative flex h-24 w-24 items-center justify-center rounded-3xl
                  bg-white/85 dark:bg-[#161b22]/90 backdrop-blur-sm
                  shadow-lg dark:shadow-black/40
                  transition-all duration-700 ease-out
                  ${isLeaving ? "scale-0 rotate-12 opacity-0" : "scale-100 rotate-0 opacity-100"}
                `}
                            >
                                {/* Soft pulsing halo behind logo */}
                                <span className="absolute inset-0 rounded-3xl bg-rose-300/30 dark:bg-[#58a6ff]/15 animate-ping [animation-duration:2.4s]" />

                                <img
                                    src="/pwa-512x512.png"
                                    alt="Medrae"
                                    className="relative h-16 w-16 object-contain select-none pointer-events-none"
                                    draggable={false}
                                />
                            </div>

                            {/* Sad cloud card (shown while leaving) */}
                            <div
                                className={`
                  absolute flex h-24 w-24 items-center justify-center rounded-3xl
                  bg-white/85 dark:bg-[#161b22]/90 backdrop-blur-sm
                  shadow-lg dark:shadow-black/40
                  transition-all duration-700 ease-out
                  ${isLeaving ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-12 opacity-0"}
                `}
                            >
                                <CloudRain className="h-11 w-11 text-sky-500 dark:text-[#58a6ff] animate-[bounce_1.4s_ease-in-out_infinite]" />
                            </div>
                        </div>

                        {/* Raindrops on leave */}
                        {isLeaving && (
                            <>
                                <span className="absolute top-8 left-1/3 h-2 w-0.5 rounded-full bg-sky-400/70 dark:bg-[#58a6ff]/70 animate-[bounce_0.9s_ease-in-out_infinite]" />
                                <span className="absolute top-10 left-1/2 h-3 w-0.5 rounded-full bg-sky-400/60 dark:bg-[#58a6ff]/60 animate-[bounce_1.1s_ease-in-out_infinite] [animation-delay:200ms]" />
                                <span className="absolute top-7 right-1/3 h-2 w-0.5 rounded-full bg-sky-400/70 dark:bg-[#58a6ff]/70 animate-[bounce_1s_ease-in-out_infinite] [animation-delay:400ms]" />
                            </>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════
              BODY — emotional copy
              ═══════════════════════════════════════════════════════ */}
                    <div className="medrae-logout-body px-6 pt-5 pb-6 text-center">
                        <DialogHeader className="space-y-2">
                            <DialogTitle
                                className={`
                  medrae-logout-title
                  text-xl md:text-2xl font-bold text-slate-900 dark:text-[#e6edf3]
                  transition-all duration-500
                  ${isLeaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isLeaving ? "See you soon…" : `Leaving so soon, ${firstName}?`}
                            </DialogTitle>

                            <DialogDescription
                                className={`
                  medrae-logout-desc
                  text-sm leading-relaxed text-slate-500 dark:text-[#8b949e]
                  transition-all duration-500 delay-75
                  ${isLeaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isLeaving ? (
                                    <>Saving your progress and closing the door gently…</>
                                ) : (
                                    <>
                                        We'll miss having you around. Your progress, streaks, and
                                        everything you've worked on will be right here waiting when
                                        you come back.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Streak pill — no border */}
                        {!isLeaving && streakDays && streakDays > 0 && (
                            <div className="medrae-streak-pill mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {streakDays}-day streak on the line
                            </div>
                        )}

                        {/* Reassurance line */}
                        {!isLeaving && (
                            <p className="medrae-reassure mt-4 text-[11px] text-slate-400 dark:text-[#6e7681] animate-in fade-in duration-700 delay-200">
                                You can log back in anytime — your account stays safe.
                            </p>
                        )}

                        {/* Buttons */}
                        <div
                            className={`
                mt-6 flex flex-col-reverse sm:flex-row gap-2
                transition-all duration-500
                ${isLeaving ? "translate-y-3 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
              `}
                        >
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="
                  medrae-stay-btn
                  flex-1 h-11 rounded-2xl border-0 shadow-none
                  bg-muted hover:bg-muted/80 text-foreground font-semibold
                  dark:bg-[#21262d] dark:hover:bg-[#30363d] dark:text-[#e6edf3] dark:border-0
                  active:scale-[0.97] transition-transform
                "
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                I'll stay
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                className="
                  flex-1 h-11 rounded-2xl border-0 shadow-none
                  bg-gradient-to-r from-rose-500 to-rose-600
                  hover:from-rose-600 hover:to-rose-700
                  dark:from-[#da3633] dark:to-[#b62324] dark:hover:from-[#f85149] dark:hover:to-[#da3633]
                  text-white font-semibold
                  active:scale-[0.97] transition-transform
                "
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Log me out
                            </Button>
                        </div>

                        {/* Signing out state */}
                        {isLeaving && (
                            <div className="medrae-signing mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-[#8b949e] animate-in fade-in duration-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing out…
                            </div>
                        )}

                        {/* Footer whisper */}
                        <p
                            className={`
                medrae-footer-whisper
                mt-4 text-[10px] text-slate-400/70 dark:text-[#484f58]
                transition-opacity duration-500
                ${isLeaving ? "opacity-0" : "opacity-100"}
              `}
                        >
                            Made with care · Medrae
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}