// src/components/ChangePasswordDialog.tsx
import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    KeyRound,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    Check,
    ShieldCheck,
} from "lucide-react";

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (newPassword: string) => Promise<void> | void;
}

// ── Simple, dependency-free strength scorer ──
function scorePassword(pw: string) {
    if (!pw) return { score: 0, label: "—", tone: "muted" as const };
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;

    if (s <= 1) return { score: 1, label: "Weak", tone: "rose" as const };
    if (s === 2) return { score: 2, label: "Fair", tone: "amber" as const };
    if (s === 3) return { score: 3, label: "Good", tone: "sky" as const };
    return { score: 4, label: "Strong", tone: "emerald" as const };
}

export function ChangePasswordDialog({
    open,
    onOpenChange,
    onSubmit,
}: ChangePasswordDialogProps) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Reset on reopen
    useEffect(() => {
        if (!open) {
            setNewPassword("");
            setConfirmPassword("");
            setShowNew(false);
            setShowConfirm(false);
            setIsSaving(false);
        }
    }, [open]);

    const strength = useMemo(() => scorePassword(newPassword), [newPassword]);

    const passwordsMatch =
        confirmPassword.length > 0 && newPassword === confirmPassword;
    const tooShort = newPassword.length > 0 && newPassword.length < 6;
    const canSave =
        newPassword.length >= 6 &&
        passwordsMatch &&
        !isSaving;

    const handleSubmit = async () => {
        if (!canSave) return;
        setIsSaving(true);
        setTimeout(async () => {
            try {
                await onSubmit(newPassword);
            } finally {
                setIsSaving(false);
            }
        }, 800);
    };

    const toneBar = {
        muted: "bg-slate-200 dark:bg-[#30363d]",
        rose: "bg-rose-500 dark:bg-[#f85149]",
        amber: "bg-amber-500 dark:bg-[#d29922]",
        sky: "bg-sky-500 dark:bg-[#58a6ff]",
        emerald: "bg-emerald-500 dark:bg-[#3fb950]",
    }[strength.tone];

    const toneText = {
        muted: "text-slate-400 dark:text-[#6e7681]",
        rose: "text-rose-600 dark:text-[#f85149]",
        amber: "text-amber-600 dark:text-[#d29922]",
        sky: "text-sky-600 dark:text-[#58a6ff]",
        emerald: "text-emerald-600 dark:text-[#3fb950]",
    }[strength.tone];

    return (
        <>
            <style>{`
        @keyframes medrae-pw-gradient-shift {
          0%   { background-position:   0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position:   0% 50%; }
        }
        .medrae-pw-hero-gradient {
          background-size: 200% 200%;
          animation: medrae-pw-gradient-shift 8s ease infinite;
        }

        /* ── GitHub-dark theme (no borders) ── */
        .dark .medrae-pw-dialog {
          background-color: #0d1117 !important;
          border: none !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
        }
        .dark .medrae-pw-body {
          background-color: #0d1117 !important;
          color: #e6edf3 !important;
        }
        .dark .medrae-pw-title {
          color: #e6edf3 !important;
        }
        .dark .medrae-pw-desc {
          color: #8b949e !important;
        }
        .dark .medrae-pw-label {
          color: #8b949e !important;
        }
        .dark .medrae-pw-input {
          background-color: #161b22 !important;
          color: #e6edf3 !important;
          border: none !important;
        }
        .dark .medrae-pw-input::placeholder {
          color: #484f58 !important;
        }
        .dark .medrae-pw-cancel-btn {
          background-color: #21262d !important;
          color: #e6edf3 !important;
          border: none !important;
        }
        .dark .medrae-pw-cancel-btn:hover {
          background-color: #30363d !important;
        }
        .dark .medrae-pw-footer {
          color: #484f58 !important;
        }
        .dark .medrae-pw-saving {
          color: #8b949e !important;
        }
      `}</style>

            <Dialog
                open={open}
                onOpenChange={(o) => !isSaving && onOpenChange(o)}
            >
                <DialogContent
                    className="
            medrae-pw-dialog
            rounded-3xl shadow-2xl overflow-hidden
            w-[calc(100%-2rem)] max-w-md
            p-0
            border-0
            animate-in fade-in zoom-in-95 duration-300
            data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out
          "
                >
                    {/* ═══════════════════════════════════════════════════════
              HERO — trust/secure themed gradient + logo
              ═══════════════════════════════════════════════════════ */}
                    <div
                        className="
              medrae-pw-hero-gradient
              relative h-44 w-full overflow-hidden
              bg-gradient-to-br
              from-sky-200 via-indigo-100 via-emerald-100 to-sky-200
              dark:from-[#0f172a] dark:via-[#0d1117] dark:via-[#111827] dark:to-[#0e7490]/40
            "
                    >
                        {/* Calm, cool color blobs */}
                        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-sky-300/50 dark:bg-[#58a6ff]/10 blur-2xl animate-pulse" />
                        <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-indigo-300/50 dark:bg-indigo-500/10 blur-2xl animate-pulse [animation-delay:700ms]" />
                        <div className="absolute top-4 right-6 h-16 w-16 rounded-full bg-emerald-200/50 dark:bg-emerald-500/10 blur-xl animate-pulse [animation-delay:1400ms]" />

                        {/* Center badge — logo with soft pulsing shield halo */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className={`
                  relative flex h-24 w-24 items-center justify-center rounded-3xl
                  bg-white/85 dark:bg-[#161b22]/90 backdrop-blur-sm
                  shadow-lg dark:shadow-black/40
                  transition-all duration-700 ease-out
                  ${isSaving ? "scale-95 opacity-40 blur-[1px]" : "scale-100 opacity-100 blur-0"}
                `}
                            >
                                <span className="absolute inset-0 rounded-3xl bg-sky-400/25 dark:bg-[#58a6ff]/15 animate-ping [animation-duration:2.6s]" />

                                <img
                                    src="/pwa-512x512.png"
                                    alt="Medrae"
                                    className="relative h-16 w-16 object-contain select-none pointer-events-none"
                                    draggable={false}
                                />
                            </div>
                        </div>

                        {/* Success shield peeks in when password is valid and matches */}
                        {canSave && !isSaving && (
                            <div className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-lg animate-in fade-in zoom-in-50 duration-300 dark:bg-[#3fb950]/90">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                        )}

                        {/* Key rotating subtly during save */}
                        {isSaving && (
                            <KeyRound className="absolute top-4 right-4 h-5 w-5 text-sky-500 dark:text-[#58a6ff] animate-[spin_2.4s_linear_infinite]" />
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════
              BODY
              ═══════════════════════════════════════════════════════ */}
                    <div className="medrae-pw-body px-6 pt-5 pb-6">
                        <DialogHeader className="space-y-2 text-center">
                            <DialogTitle
                                className={`
                  medrae-pw-title
                  text-xl md:text-2xl font-bold text-slate-900 dark:text-[#e6edf3]
                  transition-all duration-500
                  ${isSaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isSaving ? "Updating…" : "Choose a new password"}
                            </DialogTitle>

                            <DialogDescription
                                className={`
                  medrae-pw-desc
                  text-sm leading-relaxed text-slate-500 dark:text-[#8b949e]
                  transition-all duration-500 delay-75
                  ${isSaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}
                `}
                            >
                                {isSaving ? (
                                    <>Saving your new password securely…</>
                                ) : (
                                    <>
                                        Pick something strong that you'll remember. Your old
                                        password stops working the moment you save.
                                    </>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Form fields */}
                        {!isSaving && (
                            <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                {/* New password */}
                                <div>
                                    <Label
                                        htmlFor="newPassword"
                                        className="medrae-pw-label text-xs font-semibold text-slate-600 dark:text-[#8b949e] uppercase tracking-wide"
                                    >
                                        New Password
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="newPassword"
                                            type={showNew ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            autoComplete="new-password"
                                            className="
                        medrae-pw-input
                        h-11 rounded-2xl pr-11 text-sm
                        border-0 shadow-none
                        bg-slate-100 dark:bg-[#161b22] dark:text-[#e6edf3]
                        focus-visible:ring-2 focus-visible:ring-sky-400
                        dark:focus-visible:ring-[#58a6ff]
                      "
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-[#6e7681] hover:text-slate-600 dark:hover:text-[#8b949e] transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showNew ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Strength meter */}
                                    {newPassword.length > 0 && (
                                        <div className="mt-2 space-y-1.5 animate-in fade-in duration-300">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score
                                                            ? toneBar
                                                            : "bg-slate-200 dark:bg-[#30363d]"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-[11px] font-medium ${toneText}`}>
                                                Strength: {strength.label}
                                            </p>
                                        </div>
                                    )}

                                    {tooShort && (
                                        <p className="mt-1.5 text-[11px] text-rose-500 dark:text-[#f85149] animate-in fade-in duration-200">
                                            Password must be at least 6 characters.
                                        </p>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="medrae-pw-label text-xs font-semibold text-slate-600 dark:text-[#8b949e] uppercase tracking-wide"
                                    >
                                        Confirm Password
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirm ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            autoComplete="new-password"
                                            className="
                        medrae-pw-input
                        h-11 rounded-2xl pr-11 text-sm
                        border-0 shadow-none
                        bg-slate-100 dark:bg-[#161b22] dark:text-[#e6edf3]
                        focus-visible:ring-2 focus-visible:ring-sky-400
                        dark:focus-visible:ring-[#58a6ff]
                      "
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 dark:text-[#6e7681] hover:text-slate-600 dark:hover:text-[#8b949e] transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showConfirm ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Match indicator */}
                                    {confirmPassword.length > 0 && (
                                        <div className="mt-2 flex items-center gap-1.5 animate-in fade-in duration-300">
                                            {passwordsMatch ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-[#3fb950]" />
                                                    <span className="text-[11px] font-medium text-emerald-600 dark:text-[#3fb950]">
                                                        Passwords match
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[11px] font-medium text-rose-500 dark:text-[#f85149]">
                                                    Passwords don't match yet
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div
                            className={`
                mt-6 flex flex-col-reverse sm:flex-row gap-2
                transition-all duration-500
                ${isSaving ? "translate-y-3 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}
              `}
                        >
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="
                  medrae-pw-cancel-btn
                  flex-1 h-11 rounded-2xl border-0 shadow-none
                  bg-muted hover:bg-muted/80 text-foreground font-semibold
                  dark:bg-[#21262d] dark:hover:bg-[#30363d] dark:text-[#e6edf3] dark:border-0
                  active:scale-[0.97] transition-transform
                "
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!canSave}
                                className="
                  flex-1 h-11 rounded-2xl border-0 shadow-none
                  bg-gradient-to-r from-sky-500 to-indigo-600
                  hover:from-sky-600 hover:to-indigo-700
                  dark:from-[#1f6feb] dark:to-[#58a6ff] dark:hover:from-[#388bfd] dark:hover:to-[#79c0ff]
                  text-white font-semibold
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-[0.97] transition-transform
                "
                            >
                                <KeyRound className="h-4 w-4 mr-2" />
                                Save password
                            </Button>
                        </div>

                        {/* Saving state */}
                        {isSaving && (
                            <div className="medrae-pw-saving mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-[#8b949e] animate-in fade-in duration-300">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Updating your password…
                            </div>
                        )}

                        {/* Footer */}
                        <p
                            className={`
                medrae-pw-footer
                mt-4 text-[10px] text-center text-slate-400/70 dark:text-[#484f58]
                transition-opacity duration-500
                ${isSaving ? "opacity-0" : "opacity-100"}
              `}
                        >
                            We never see your password — it's encrypted end-to-end.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}