// src/staff-cpd/components/CpdQuickRatingPopover.tsx
import { useState } from "react";
import { Star } from "lucide-react";
import type { CpdActivity } from "../lib";

export function CpdQuickRatingPopover({
    activity,
    currentRating,
    onClose,
    onRate,
}: {
    activity: CpdActivity;
    currentRating: number;
    onClose: () => void;
    onRate: (stars: number) => void;
}) {
    const [hover, setHover] = useState(0);
    const shown = hover || currentRating;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className="relative w-full sm:w-[340px] sm:mx-auto rounded-t-3xl sm:rounded-3xl
                           bg-white dark:bg-[#161b22] p-4 space-y-3
                           animate-in slide-in-from-bottom duration-200"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
                <div className="h-1 w-10 mx-auto rounded-full bg-slate-300 dark:bg-white/20 sm:hidden" />

                <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Quick rating
                    </p>
                    <h3 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                        {activity.title}
                    </h3>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-2">
                    {[1, 2, 3, 4, 5].map((n) => {
                        const filled = n <= shown;
                        return (
                            <button
                                key={n}
                                type="button"
                                onMouseEnter={() => setHover(n)}
                                onMouseLeave={() => setHover(0)}
                                onClick={() => onRate(n)}
                                className="h-11 w-11 flex items-center justify-center active:scale-90 transition-transform"
                                style={{ touchAction: "manipulation" }}
                                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                            >
                                <Star
                                    className={`h-8 w-8 ${filled ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-slate-600"}`}
                                    strokeWidth={1.8}
                                />
                            </button>
                        );
                    })}
                </div>

                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                    {currentRating > 0
                        ? `You rated ${currentRating}/5 — tap another star to change`
                        : "Tap a star to rate — takes 2 seconds"}
                </p>

                <button
                    onClick={onClose}
                    className="w-full h-10 rounded-xl
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200
                               text-[12px] font-bold
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    Close
                </button>
            </div>
        </div>
    );
}