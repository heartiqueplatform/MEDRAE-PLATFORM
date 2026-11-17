"use client";
import React, { useRef, useState } from "react";

export const VlcVolumeSlider = React.memo(function VlcVolumeSlider({
    value,
    onChange,
    onInteract,
}: {
    value: number;
    onChange: (v: number) => void;
    onInteract?: () => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const clamp = (n: number) => Math.max(0, Math.min(1, n));

    const setFromClientY = (clientY: number) => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const ratio = 1 - (clientY - rect.top) / rect.height;
        onChange(clamp(ratio));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        onInteract?.();
        setFromClientY(e.clientY);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging) return;
        setFromClientY(e.clientY);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        setDragging(false);
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(clamp(value + 0.05));
            onInteract?.();
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(clamp(value - 0.05));
            onInteract?.();
        }
    };

    const pct = Math.round(value * 100);

    return (
        <div
            ref={trackRef}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative w-2.5 h-32 rounded-full cursor-pointer select-none bg-gradient-to-b from-slate-300 to-slate-200 dark:from-gh-border dark:to-gh-hover touch-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
            <div className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400" style={{ height: `${value * 100}%` }} />
            {[25, 50, 75].map((t) => (
                <span key={t} className="absolute left-1/2 -translate-x-1/2 h-px w-1.5 bg-black/20 dark:bg-white/20" style={{ bottom: `${t}%` }} />
            ))}
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-blue-600 transition-transform" style={{ bottom: `calc(${value * 100}% - 0px)`, transform: "translate(-50%, 50%)" }} />
        </div>
    );
});