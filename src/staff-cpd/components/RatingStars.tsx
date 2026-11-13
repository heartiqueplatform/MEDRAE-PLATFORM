// src/staff-cpd/components/RatingStars.tsx
import { Star } from "lucide-react";

export function RatingStars({ value, onChange, size = "md" }: {
    value: number; onChange?: (v: number) => void; size?: "sm" | "md" | "lg";
}) {
    const dims = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
    const interactive = !!onChange;
    return (
        <div className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= Math.round(value);
                return (
                    <button
                        key={n}
                        type="button"
                        disabled={!interactive}
                        onClick={() => onChange?.(n)}
                        className={`${interactive ? "active:scale-[0.9] transition-transform cursor-pointer" : "cursor-default"}`}
                        style={{ touchAction: "manipulation" }}
                    >
                        <Star className={`${dims} ${filled ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-slate-600"}`} strokeWidth={2} />
                    </button>
                );
            })}
        </div>
    );
}