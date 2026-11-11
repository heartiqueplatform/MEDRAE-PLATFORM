// src/components/ChangePasswordDialog.tsx
import { useState, useEffect, useMemo } from "react";
import { CenteredModal } from "@/components/ui/CenteredModal";
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
        muted: "bg-slate-200 dark:bg-white/[0.06]",
        rose: "bg-rose-500",
        amber: "bg-amber-500",
        sky: "bg-blue-500",
        emerald: "bg-emerald-500",
    }[strength.tone];

    const toneText = {
        muted: "text-slate-400 dark:text-slate-500",
        rose: "text-rose-600 dark:text-rose-400",
        amber: "text-amber-600 dark:text-amber-400",
        sky: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
    }[strength.tone];

    return (
        <CenteredModal
            open={open}
            onClose={() => onOpenChange(false)}
            title={isSaving ? "Updating…" : "Choose a new password"}
            subtitle={
                isSaving
                    ? "Saving your new password securely…"
                    : "Pick something strong that you'll remember"
            }
            maxWidthClass="max-w-md"
            maxHeight="90vh"
            locked={isSaving}
            footer={
                <div className="px-4 py-3 flex flex-col-reverse sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="w-full sm:flex-1 shrink-0 h-11 rounded-xl
               bg-slate-200 dark:bg-white/[0.08]
               text-slate-800 dark:text-slate-100
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] active:bg-slate-300 dark:active:bg-white/[0.12]
               transition-transform
               disabled:opacity-50 disabled:active:scale-100"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSave}
                        className="w-full sm:flex-1 shrink-0 h-11 rounded-xl bg-blue-600 text-white
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] active:bg-blue-700
               transition-transform
               disabled:opacity-40 disabled:cursor-not-allowed
               disabled:active:scale-100"
                        style={{ touchAction: "manipulation" }}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <KeyRound className="h-4 w-4" />
                                Save password
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="px-4 pb-4 space-y-4">
                {/* Trust banner */}
                <div className="flex items-start gap-2 rounded-xl
                                bg-emerald-50 dark:bg-emerald-400/10 p-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5
                                           text-emerald-600 dark:text-emerald-400" />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        Your old password stops working the moment you save.
                        We never see your new password — it's encrypted end-to-end.
                    </p>
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                    <Label
                        htmlFor="newPassword"
                        className="text-[10px] font-bold uppercase tracking-wider
                                   text-slate-500 dark:text-slate-400 ml-1"
                    >
                        New password
                    </Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            autoComplete="new-password"
                            className="h-10 rounded-xl pr-11 text-sm border-0
                                       bg-slate-50 dark:bg-[#0d1117]
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute inset-y-0 right-3 flex items-center
                                       text-slate-400 dark:text-slate-500
                                       active:text-slate-600 dark:active:text-slate-300
                                       transition-colors"
                            tabIndex={-1}
                            aria-label={showNew ? "Hide password" : "Show password"}
                            style={{ touchAction: "manipulation" }}
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
                        <div className="space-y-1.5 pt-1">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score
                                            ? toneBar
                                            : "bg-slate-200 dark:bg-white/[0.06]"
                                            }`}
                                    />
                                ))}
                            </div>
                            <p className={`text-[11px] font-bold ${toneText}`}>
                                Strength: {strength.label}
                            </p>
                        </div>
                    )}

                    {tooShort && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">
                            Password must be at least 6 characters.
                        </p>
                    )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                    <Label
                        htmlFor="confirmPassword"
                        className="text-[10px] font-bold uppercase tracking-wider
                                   text-slate-500 dark:text-slate-400 ml-1"
                    >
                        Confirm password
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                            className="h-10 rounded-xl pr-11 text-sm border-0
                                       bg-slate-50 dark:bg-[#0d1117]
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus-visible:ring-2 focus-visible:ring-blue-500/40"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute inset-y-0 right-3 flex items-center
                                       text-slate-400 dark:text-slate-500
                                       active:text-slate-600 dark:active:text-slate-300
                                       transition-colors"
                            tabIndex={-1}
                            aria-label={showConfirm ? "Hide password" : "Show password"}
                            style={{ touchAction: "manipulation" }}
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
                        <div className="flex items-center gap-1.5 pt-0.5">
                            {passwordsMatch ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                        Passwords match
                                    </span>
                                </>
                            ) : (
                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                    Passwords don't match yet
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </CenteredModal>
    );
}