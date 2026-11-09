"use client";

import { AlertCircle, ChevronRight } from "lucide-react";
import { playSound } from "@/lib/soundManager";
import { cn } from "@/lib/utils";
import { CenteredModal } from "@/components/ui/CenteredModal";

type Props = {
    open: boolean;
    missingIdxs: number[];
    total: number;
    onJump: (idx: number) => void;
    onFinishAnyway: () => void;
    onClose: () => void;
    busy?: boolean;
};

export default function FinishGateModal({
    open,
    missingIdxs,
    total,
    onJump,
    onFinishAnyway,
    onClose,
    busy = false,
}: Props) {
    const missingCount = missingIdxs.length;

    return (
        <CenteredModal
            open={open}
            onClose={onClose}
            title={`${missingCount} question${missingCount === 1 ? "" : "s"} left`}
            subtitle="Unanswered questions count as wrong."
            maxWidthClass="max-w-md"
            maxHeight="80dvh"
        >
            <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3 mb-4">
                    <div className="shrink-0 h-11 w-11 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="flex-1 text-[12px] sm:text-sm text-muted-foreground leading-relaxed">
                        Finish now, or jump back and answer the missing ones first.
                    </p>
                </div>

                {missingIdxs.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                            Jump to missing
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                            {missingIdxs.map((i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        playSound("tap");
                                        if (navigator.vibrate) navigator.vibrate(15);
                                        onJump(i);
                                    }}
                                    className={cn(
                                        "min-w-[36px] h-9 px-2 rounded-lg text-[12px] font-bold tabular-nums",
                                        "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                                        "hover:bg-amber-500/20 active:scale-95 transition-all"
                                    )}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            playSound("tap");
                            if (navigator.vibrate) navigator.vibrate(20);
                            onFinishAnyway();
                        }}
                        disabled={busy}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                    >
                        {busy ? "Saving result…" : `Finish anyway (${missingCount} missing)`}
                        {!busy && <ChevronRight className="h-4 w-4" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full h-10 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
                    >
                        Keep answering
                    </button>
                </div>
            </div>
        </CenteredModal>
    );
}