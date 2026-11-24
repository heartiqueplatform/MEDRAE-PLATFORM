// ============================================================
// Neldes Scroll — skeleton card shown while feed loads.
// Pure shimmer on black. No layout shift when real card arrives.
// ============================================================

import { NELDES_COLORS } from "../config/constants";

export function LoadingCard() {
    return (
        <div
            className="relative w-full h-full overflow-hidden animate-pulse"
            style={{ backgroundColor: NELDES_COLORS.cardBg }}
        >
            {/* Image placeholder */}
            <div className="absolute inset-0 bg-[#161b22]" />

            {/* Bottom caption skeleton */}
            <div className="absolute left-4 right-20 bottom-6 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#21262d]" />
                    <div className="h-3 w-24 rounded bg-[#21262d]" />
                </div>
                <div className="h-4 w-3/4 rounded bg-[#21262d]" />
                <div className="h-3 w-full rounded bg-[#21262d]" />
                <div className="h-3 w-2/3 rounded bg-[#21262d]" />
            </div>

            {/* Right rail skeleton */}
            <div className="absolute right-2 bottom-24 space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-11 h-11 rounded-full bg-[#21262d]" />
                        <div className="h-2 w-6 rounded bg-[#21262d]" />
                    </div>
                ))}
            </div>
        </div>
    );
}