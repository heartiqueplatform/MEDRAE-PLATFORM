// ============================================================
// Neldes Scroll — skeleton card shown while feed loads.
// Pulse-only. No sweep. Calm, premium, accessible.
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

            {/* Bottom caption skeleton */}
            <div className="absolute left-4 right-20 bottom-6 space-y-2 neldes-skeleton">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#252c36]" />
                    <div className="h-3 w-24 rounded bg-[#252c36]" />
                </div>
                <div className="h-4 w-3/4 rounded bg-[#252c36]" />
                <div className="h-3 w-full rounded bg-[#252c36]" />
                <div className="h-3 w-2/3 rounded bg-[#252c36]" />
            </div>

            {/* Right rail skeleton */}
            <div className="absolute right-2 bottom-24 space-y-4 neldes-skeleton">
                {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-11 h-11 rounded-full bg-[#252c36]" />
                        <div className="h-2 w-6 rounded bg-[#252c36]" />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes neldesSkeletonPulse {
                    0%, 100% { opacity: 0.45; }
                    50%      { opacity: 0.9; }
                }

                .neldes-skeleton {
                    animation: neldesSkeletonPulse 1.9s ease-in-out infinite;
                    will-change: opacity;
                }

                /* Stagger the two skeleton groups so they don't
                   breathe in perfect lockstep — feels more organic */
                .neldes-skeleton:nth-of-type(2) {
                    animation-delay: -0.6s;
                }

                @media (prefers-reduced-motion: reduce) {
                    .neldes-skeleton { animation: none; opacity: 0.7; }
                }
            `}</style>
        </div>
    );
}