// ============================================================
// Neldes Scroll — skeleton card shown while feed loads.
// Subtle shimmer sweep. No layout shift. One card per screen.
// ============================================================

import { NELDES_COLORS } from "../config/constants";

export function LoadingCard() {
    return (
        <div
            className="relative w-full h-full overflow-hidden"
            style={{ backgroundColor: NELDES_COLORS.cardBg }}
        >
            {/* Image placeholder — mid-tone so it reads against black */}
            <div className="absolute inset-0 bg-[#1a1f27]" />

            {/* Subtle shimmer sweep */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 80%)",
                    backgroundSize: "200% 100%",
                    animation: "neldesSkeletonShimmer 1.8s linear infinite",
                }}
            />

            {/* Bottom caption skeleton */}
            <div className="absolute left-4 right-20 bottom-6 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#2a313b]" />
                    <div className="h-3 w-24 rounded bg-[#2a313b]" />
                </div>
                <div className="h-4 w-3/4 rounded bg-[#2a313b]" />
                <div className="h-3 w-full rounded bg-[#2a313b]" />
                <div className="h-3 w-2/3 rounded bg-[#2a313b]" />
            </div>

            {/* Right rail skeleton */}
            <div className="absolute right-2 bottom-24 space-y-4">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-11 h-11 rounded-full bg-[#2a313b]" />
                        <div className="h-2 w-6 rounded bg-[#2a313b]" />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes neldesSkeletonShimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}