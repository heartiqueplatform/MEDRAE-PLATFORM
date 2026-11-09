// src/components/chatroom/ResizeHandle.tsx
"use client";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
    width: number;
    onResize: (nextWidth: number) => void;
    min?: number;
    max?: number;
    className?: string;
}

/**
 * Thin vertical drag handle.
 *
 * Direction:
 *   • Handle sits on the LEFT edge of the right pane.
 *   • Drag LEFT  → widen the right pane (width increases).
 *   • Drag RIGHT → narrow the right pane (width decreases).
 *
 * Uses clientX deltas (not `movementX`, which is unreliable on some touchpads),
 * and schedules updates through rAF for 60fps max.
 */
export default function ResizeHandle({
    width,
    onResize,
    min = 180,
    max = 400,
    className,
}: Props) {
    const startXRef = useRef(0);
    const startWidthRef = useRef(width);
    const lastXRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const draggingRef = useRef(false);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        startXRef.current = e.clientX;
        lastXRef.current = e.clientX;
        startWidthRef.current = width;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, [width]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current) return;
        lastXRef.current = e.clientX;
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (!draggingRef.current) return;
            // Dragging LEFT (startX > currentX) → dx is negative → subtract → width INCREASES.
            // Dragging RIGHT (startX < currentX) → dx positive → width DECREASES.
            const dx = lastXRef.current - startXRef.current;
            const next = startWidthRef.current - dx;
            const clamped = Math.min(max, Math.max(min, next));
            onResize(clamped);
        });
    }, [min, max, onResize]);

    const stop = useCallback((e: React.PointerEvent) => {
        draggingRef.current = false;
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch { }
    }, []);

    return (
        <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stop}
            onPointerCancel={stop}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            className={cn(
                "group absolute left-0 top-0 bottom-0 w-2 -translate-x-1 z-20",
                "cursor-col-resize",
                "touch-none",
                "hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors",
                className
            )}
        >
            {/* Thin divider line — always visible, thin, subtle */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gray-100 dark:bg-white/[0.04]" />
            {/* Hover grip — small centered pill */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[3px] rounded-full bg-gray-300 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}