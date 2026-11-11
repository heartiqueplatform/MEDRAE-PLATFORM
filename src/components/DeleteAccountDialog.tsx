// src/components/DeleteAccountDialog.tsx
import { useState, useEffect } from "react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { Input } from "@/components/ui/input";
import {
    Trash2,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    X,
} from "lucide-react";

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

    const title =
        isDeleting
            ? "Erasing everything…"
            : stage === "warn"
                ? `Before you go, ${firstName}…`
                : "This cannot be undone.";

    const subtitle =
        isDeleting
            ? "Removing your account, progress, and everything you built."
            : stage === "warn"
                ? "Deleting your account is permanent — please review what's affected"
                : "All of your data will be gone forever";

    return (
        <CenteredModal
            open={open}
            onClose={() => onOpenChange(false)}
            title={title}
            subtitle={subtitle}
            maxWidthClass="max-w-md"
            maxHeight="90vh"
            locked={isDeleting}
            footer={
                <div className="px-4 py-3 flex flex-col-reverse sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
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
                        {stage === "warn" ? "Never mind" : "Cancel"}
                    </button>

                    {stage === "warn" ? (
                        <button
                            type="button"
                            onClick={() => setStage("confirm")}
                            disabled={isDeleting}
                            className="w-full sm:flex-1 shrink-0 h-11 rounded-xl bg-rose-600 text-white
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] active:bg-rose-700
               transition-transform
               disabled:opacity-50 disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            I understand
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!canDelete || isDeleting}
                            className="w-full sm:flex-1 shrink-0 h-11 rounded-xl bg-rose-600 text-white
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] active:bg-rose-700
               transition-transform
               disabled:opacity-40 disabled:cursor-not-allowed
               disabled:active:scale-100"
                            style={{ touchAction: "manipulation" }}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" />
                                    Delete forever
                                </>
                            )}
                        </button>
                    )}
                </div>
            }
        >
            <div className="px-4 pb-4 space-y-3">
                {/* Warning banner */}
                <div className="flex items-start gap-2 rounded-xl
                                bg-rose-50 dark:bg-rose-400/10 p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5
                                              text-rose-600 dark:text-rose-400" />
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                        {isDeleting
                            ? "Removing your account, progress, and everything you built."
                            : stage === "warn"
                                ? "Deleting your account will permanently erase your progress, streaks, saved questions, notes, and every memory you've made here. Nothing can be recovered."
                                : "All of your data will be gone forever. There is no undo, no recovery, no second chance."}
                    </p>
                </div>

                {/* Stage 1 — warning list */}
                {!isDeleting && stage === "warn" && (
                    <div className="space-y-2">
                        {[
                            "Your streak and XP will be reset",
                            "All saved questions and mistakes will be lost",
                            "Notes, certificates, and progress disappear",
                            "Your account cannot be restored",
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <X className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400
                                              shrink-0 mt-0.5" />
                                <span className="text-[11px] text-slate-600 dark:text-slate-300
                                                 leading-relaxed">
                                    {item}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stage 2 — confirm input */}
                {!isDeleting && stage === "confirm" && (
                    <div className="space-y-1.5">
                        <label
                            htmlFor="confirm-delete"
                            className="text-[10px] font-bold uppercase tracking-wider
                                       text-slate-500 dark:text-slate-400 ml-1"
                        >
                            Type{" "}
                            <span className="text-rose-600 dark:text-rose-400">
                                {requiredWord}
                            </span>{" "}
                            to confirm
                        </label>
                        <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={requiredWord}
                            autoFocus
                            disabled={isDeleting}
                            className="h-10 rounded-xl text-sm border-0
                                       bg-slate-50 dark:bg-[#0d1117]
                                       text-slate-900 dark:text-white
                                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                                       focus-visible:ring-2 focus-visible:ring-rose-500/40"
                        />
                    </div>
                )}

                {/* Footer note */}
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500
                              uppercase tracking-wider font-bold pt-1">
                    This action is permanent and cannot be reversed
                </p>
            </div>
        </CenteredModal>
    );
}