// src/components/LogoutDialog.tsx
import { useState } from "react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { LogOut, ArrowLeft, Loader2, Flame } from "lucide-react";

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
                // 🔧 Reset theme to light BEFORE signing out.
                // Ensures the login page's loader starts in light mode,
                // even if the user had dark mode on during this session.
                try {
                    localStorage.removeItem("medrae_dark_mode");
                    document.documentElement.classList.remove("dark");
                    document.documentElement.classList.add("light");
                    document.documentElement.style.setProperty("--bg-color", "#ffffff");
                    if (document.body) {
                        document.body.style.backgroundColor = "#ffffff";
                    }
                } catch { /* never block logout */ }

                await onConfirm();
            } finally {
                setIsLeaving(false);
            }
        }, 900);
    };

    const firstName = userName?.trim().split(" ")[0] || "friend";

    return (
        <CenteredModal
            open={open}
            onClose={() => onOpenChange(false)}
            title={isLeaving ? "See you soon…" : `Leaving so soon, ${firstName}?`}
            subtitle={
                isLeaving
                    ? "Saving your progress and closing the door gently…"
                    : "Your progress, streaks, and everything you've worked on will be waiting"
            }
            maxWidthClass="max-w-md"
            maxHeight="90vh"
            locked={isLeaving}
            footer={
                <div className="px-4 py-3 flex flex-col-reverse sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isLeaving}
                        className="w-full sm:flex-1 shrink-0 h-12 rounded-xl
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
                        I'll stay
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLeaving}
                        className="w-full sm:flex-1 shrink-0 h-12 rounded-xl bg-rose-600 text-white
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] active:bg-rose-700
               transition-transform
               disabled:opacity-50 disabled:active:scale-100"
                        style={{ touchAction: "manipulation" }}
                    >
                        {isLeaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing out…
                            </>
                        ) : (
                            <>
                                <LogOut className="h-4 w-4" />
                                Log me out
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="px-4 pb-4 space-y-3">
                {/* Farewell message */}
                <div className="flex items-start gap-2 rounded-xl
                                bg-amber-50 dark:bg-amber-400/10 p-3">
                    <Flame className="h-4 w-4 shrink-0 mt-0.5
                                      text-amber-600 dark:text-amber-400" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                        We'll miss having you around. Your progress, streaks, and
                        everything you've worked on will be right here waiting when
                        you come back.
                    </p>
                </div>

                {/* Streak warning pill */}
                {!isLeaving && streakDays && streakDays > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full
                                    bg-amber-50 dark:bg-amber-400/10
                                    px-3 py-1.5
                                    text-[11px] font-bold
                                    text-amber-700 dark:text-amber-300">
                        <Flame className="h-3 w-3" />
                        {streakDays}-day streak on the line
                    </div>
                )}

                {/* Reassurance */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    You can log back in anytime — your account stays safe.
                </p>

                {/* Footer whisper */}
                <p className="text-[10px] text-center uppercase tracking-wider font-bold
                              text-slate-400 dark:text-slate-500 pt-1">
                    Made with care · Medrae
                </p>
            </div>
        </CenteredModal>
    );
}