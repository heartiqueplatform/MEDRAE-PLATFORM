// src/components/DeleteAccountDialog.tsx
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, ArrowLeft, Loader2, X } from "lucide-react";

interface DeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void> | void;
    userName?: string;
    username?: string;
}

export function DeleteAccountDialog({
    open,
    onOpenChange,
    onConfirm,
    userName,
    username,
}: DeleteAccountDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [stage, setStage] = useState<"warn" | "confirm">("warn");

    const firstName = userName?.trim().split(" ")[0] || "friend";
    const requiredWord = (username || firstName).trim();
    const canDelete =
        confirmText.trim().toLowerCase() === requiredWord.toLowerCase() &&
        requiredWord.length > 0;

    // Reset internal state whenever the dialog reopens
    useEffect(() => {
        if (!open) {
            setConfirmText("");
            setStage("warn");
            setIsDeleting(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!canDelete) return;
        setIsDeleting(true);
        setTimeout(async () => {
            try {
                await onConfirm();
            } finally {
                setIsDeleting(false);
            }
        }, 1100);
    };

    return (
        <>
            <style>{`
        @keyframes medrae-delete-gradient-shift {
          0%   { background-position:   0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position:   0% 50%; }
        }
        .medrae-delete-hero-gradient {
          background-size: 200% 200%;
          animation: medrae-delete-gradient-shift 9s ease infinite;
        }

        @keyframes medrae-ash-fall {
          0%   { transform: translateY(-10px) scale(0.7); opacity: 0; }
          20%  { opacity: 0.85; }
          100% { transform: translateY(60px) scale(0.4); opacity: 0; }
        }
        .medrae-ash {
          animation: medrae-ash-fall 2.4s ease-in infinite;
        }

        /* ── GitHub-dark theme (no borders) ── */
        .dark .medrae-delete-dialog {
          background-color: #0d1117 !important;
          border: none !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7) !important;
        }
        .dark .medrae-delete-body {
          background-color: #0d1117 !important;
          color: #e6edf3 !important;
        }
        .dark .medrae-delete-title {
          color: #e6edf3 !important;
        }
        .dark .medrae-delete-desc {
          color: #8b949e !important;
        }
        .dark .medrae-delete-stay-btn {
          background-color: #21262d !important;
          color: #e6edf3 !important;
          border: none !important;
        }
        .dark .medrae-delete-stay-btn:hover {
          background-color: #30363d !important;
        }
        .dark .medrae-delete-input {
          background-color: #161b22 !important;
          color: #e6edf3 !important;
          border: none !important;
        }
        .dark .medrae-delete-input::placeholder {
          color: #484f58 !important;
        }
        .dark .medrae-delete-warn {
          color: #f85149 !important;
        }
        .dark .medrae-delete-footer {
          color: #484f58 !important;
        }
        .dark .medrae-delete-signing {
          color: #8b949e !important;
        }
      `}</style>

            <Dialog
                open={open}
                onOpenChange={(o) => !isDeleting && onOpenChange(o)}
            >
                <DialogContent
                    className="
            medrae-delete-dialog
            rounded-3xl shadow-2xl overflow-hidden
            w-[calc(100%-2rem)] max-w-md
            p-0
            border-0
            animate-in fade-in zoom-in-95 duration-300
            data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out
          "
                >
                    {/* ═══════════════════════════════════════════════════════
              HERO — somber animated gradient + logo
              ═══════════════════════════════════════════════════════ */}
                    <div
                        className="
              medrae-delete-hero-gradient
              relative h-44 w-full overflow-hidden
              bg-gradient-to-br
              from-slate-200 via-rose-100 via-slate-100 to-slate-300
              dark:from-[#111827] dark:via-[#1c1014] dark:via-[#0d1117] dark:to-[#1a1f2e]
            "
                    >
                        {/* Muted, heavy color blobs — less playful than logout */}
                        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-rose-300/40 dark:bg-rose-500/10 blur-2xl animate-pulse" />
                        <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-slate-300/50 dark:bg-slate-500/10 blur-2xl animate-pulse [animation-delay:800ms]" />
                        <div className="absolute top-4 right-6 h-16 w-16 rounded-full bg-rose-200/40 dark:bg-rose-500/10 blur-xl animate-pulse [animation-delay:1600ms]" />

                        {/* Center badge — logo grays out during delete */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className={`
                  relative flex h-24 w-24 items-center justify-center rounded-3xl
                  bg-white/85 dark:bg-[#161b22]/90 backdrop-blur-sm
                  shadow-lg dark:shadow-black/50
                  transition-all duration-1000 ease-out
                  ${isDeleting
                                        ? "grayscale opacity-30 scale-90 blur-[1px]"
                                        : "grayscale-0 opacity-100 scale-100 blur-0"
                                    }
                `}
                            >
                                {/* Slow, heavy pulsing halo (red) */}
                                <span className="absolute inset-0 rounded-3xl bg-rose-400/25 dark:bg-[#f85149]/15 animate-ping [animation-duration:3s]" />

                                <img
                                    src="/pwa-512x512.png"
                                    alt="Medrae"
                                    className="relative h-16 w-16 object-contain select-none pointer-events-none"
                                    draggable={false}
                                />
                            </div>
                        </div>

                        {/* Warning triangle appears once the user starts the confirm step */}
                        {stage === "confirm" && !isDeleting && (
                            <div className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/90 text-white shadow-lg animate-in fade-in zoom-in-50 duration-300">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        )}

                        {/* Falling ash particles during deletion */}
                        {isDeleting && (
                            <>
                                <span className="medrae-ash absolute top-6 left-[18%] h-1.5 w-1.5 rounded-full bg-slate-400/70 dark:bg-slate-500/60" />
                                <span className="medrae-ash absolute top-4 left-[36%] h-1 w-1 rounded-full bg-rose-400/70 dark:bg-rose-500/50 [animation-delay:0.4s]" />
                                <span className="medrae-ash absolute top-8 left-[52%] h-1.5 w-1.5 rounded-full bg-slate-400/70 dark:bg-slate-500/60 [animation-delay:0.8s]" />
                                <span className="medrae-ash absolute top-5 left-[68%] h-1 w-1 rounded-full bg-rose-400/70 dark:bg-rose-500/50 [animation-delay:0.2s]" />
                                <span className="medrae-ash absolute top-7 left-[84%] h-1.5 w-1.5 rounded-full bg-slate-400/70 dark:bg-slate-500/60 [animation-delay:1.1s]" />
                            </>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════
              BODY
              ═══════════════════════════════════════════════════════ */}
                    <div className="medrae-delete-body px-6 pt-5 pb-6 text-center">
                        <DialogHeader className="space-y-2">
                            <DialogTitle
                                className={`
                  medrae-delete-title
                  text-xl md:text-2xl font-bold text-slate-900 dark:text-[#e6edf3]
                  transition-all duration-500
                  ${isDeleting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isDeleting
                                    ? "Erasing everything…"
                                    : stage === "warn"
                                        ? `Before you go, ${firstName}…`
                                        : "This cannot be undone."}
                            </DialogTitle>

                            <DialogDescription
                                className={`
                  medrae-delete-desc
                  text-sm leading-relaxed text-slate-500 dark:text-[#8b949e]
                  transition-all duration-500 delay-75
                  ${isDeleting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isDeleting ? (
                                    <>Removing your account, progress, and everything you built.</>
                                ) : stage === "warn" ? (
                                    <>
                                        Deleting your account will permanently erase your progress,
                                        streaks, saved questions, notes, and every memory you've
                                        made here. Nothing can be recovered.
                                    </>
                                ) : (
                                    <>
                                        All of your data will be gone forever. There is no undo, no
                                        recovery, no second chance.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Stage 1 — warning list */}
                        {!isDeleting && stage === "warn" && (
                            <div className="mt-5 space-y-2 text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8b949e]">
                                    <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>Your streak and XP will be reset</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8b949e]">
                                    <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>All saved questions and mistakes will be lost</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8b949e]">
                                    <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>Notes, certificates, and progress disappear</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#8b949e]">
                                    <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>Your account cannot be restored</span>
                                </div>
                            </div>
                        )}

                        {/* Stage 2 — confirm input */}
                        {!isDeleting && stage === "confirm" && (
                            <div className="mt-5 text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <label className="text-[11px] font-semibold text-slate-600 dark:text-[#8b949e] uppercase tracking-wide">
                                    Type{" "}
                                    <span className="medrae-delete-warn text-rose-600 dark:text-[#f85149]">
                                        {requiredWord}
                                    </span>{" "}
                                    to confirm
                                </label>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder={requiredWord}
                                    autoFocus
                                    disabled={isDeleting}
                                    className="
                    medrae-delete-input
                    mt-2 h-11 rounded-2xl text-sm
                    border-0 shadow-none
                    bg-slate-100 dark:bg-[#161b22] dark:text-[#e6edf3]
                    focus-visible:ring-2 focus-visible:ring-rose-400
                    dark:focus-visible:ring-[#f85149]
                  "
                                />
                            </div>
                        )}

                        {/* Buttons */}
                        <div
                            className={`
                mt-6 flex flex-col-reverse sm:flex-row gap-2
                transition-all duration-500
                ${isDeleting ? "translate-y-3 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
              `}
                        >
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="
                  medrae-delete-stay-btn
                  flex-1 h-11 rounded-2xl border-0 shadow-none
                  bg-muted hover:bg-muted/80 text-foreground font-semibold
                  dark:bg-[#21262d] dark:hover:bg-[#30363d] dark:text-[#e6edf3] dark:border-0
                  active:scale-[0.97] transition-transform
                "
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {stage === "warn" ? "Never mind" : "Cancel"}
                            </Button>

                            {stage === "warn" ? (
                                <Button
                                    onClick={() => setStage("confirm")}
                                    className="
                    flex-1 h-11 rounded-2xl border-0 shadow-none
                    bg-gradient-to-r from-rose-500 to-rose-600
                    hover:from-rose-600 hover:to-rose-700
                    dark:from-[#da3633] dark:to-[#b62324] dark:hover:from-[#f85149] dark:hover:to-[#da3633]
                    text-white font-semibold
                    active:scale-[0.97] transition-transform
                  "
                                >
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    I understand
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleConfirm}
                                    disabled={!canDelete}
                                    className="
                    flex-1 h-11 rounded-2xl border-0 shadow-none
                    bg-gradient-to-r from-rose-600 to-rose-700
                    hover:from-rose-700 hover:to-rose-800
                    dark:from-[#b62324] dark:to-[#8b1a1b] dark:hover:from-[#da3633] dark:hover:to-[#b62324]
                    text-white font-semibold
                    disabled:opacity-40 disabled:cursor-not-allowed
                    active:scale-[0.97] transition-transform
                  "
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete forever
                                </Button>
                            )}
                        </div>

                        {/* Signing out / erasing state */}
                        {isDeleting && (
                            <div className="medrae-delete-signing mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-[#8b949e] animate-in fade-in duration-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting your account…
                            </div>
                        )}

                        {/* Footer */}
                        <p
                            className={`
                medrae-delete-footer
                mt-4 text-[10px] text-slate-400/70 dark:text-[#484f58]
                transition-opacity duration-500
                ${isDeleting ? "opacity-0" : "opacity-100"}
              `}
                        >
                            This action is permanent and cannot be reversed.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}