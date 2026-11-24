// src/modules/neldes-scroll/components/PullToRefreshIndicator.tsx
import { Loader2, ArrowDown } from "lucide-react";

interface Props {
    pull: number;
    progress: number;      // 0..1
    refreshing: boolean;
    threshold: number;
}

export function PullToRefreshIndicator({
    pull,
    progress,
    refreshing,
    threshold,
}: Props) {
    // Hide entirely when idle
    if (pull <= 0 && !refreshing) return null;

    const active = refreshing || pull >= threshold;

    return (
        <div
            className="absolute left-0 right-0 top-0 z-30 flex items-center justify-center pointer-events-none"
            style={{
                height: refreshing ? threshold : pull,
                transition: refreshing ? "height 0.25s ease-out" : "none",
            }}
        >
            <div
                className="flex items-center justify-center rounded-full"
                style={{
                    width: 36,
                    height: 36,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    transform: `scale(${refreshing ? 1 : 0.6 + progress * 0.4}) rotate(${active ? 0 : 0
                        }deg)`,
                    opacity: refreshing ? 1 : 0.4 + progress * 0.6,
                    transition: refreshing ? "transform 0.2s ease-out" : "none",
                }}
            >
                {refreshing ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                    <ArrowDown
                        className="w-4 h-4 text-white"
                        style={{
                            transform: `rotate(${active ? 180 : 0}deg)`,
                            transition: "transform 0.2s ease-out",
                        }}
                    />
                )}
            </div>
        </div>
    );
}