"use client";

import React from "react";

/* ────────────────────────────────────────────────
   MedraeFace — custom SVG faces for emotional states
   Usage: <MedraeFace name="confident" size={16} />
   ──────────────────────────────────────────────── */

export type MedraeFaceName =
    | "confident"      // High confidence / in the zone
    | "thinking"       // Medium / getting there
    | "unsure"         // Low / worth a second look
    | "overconfident"  // Fast & wrong
    | "eye"            // Misread question
    | "book"           // Concept gap
    | "clock"          // Rushed
    | "target"         // Guess
    | "neutral";       // fallback

type Props = {
    name: MedraeFaceName;
    size?: number;
    className?: string;
    /** stroke color override — defaults to currentColor */
    color?: string;
};

/**
 * All faces share the same 24×24 viewBox and stroke rhythm
 * so they feel like one family, not a random grab-bag.
 */
export function MedraeFace({
    name,
    size = 16,
    className = "",
    color = "currentColor",
}: Props) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: 1.75,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        className,
    };

    switch (name) {
        /* ── IN THE ZONE — glowing smile ── */
        case "confident":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    {/* eyes */}
                    <path d="M9 10.5c0-.6.5-1 1-1s1 .4 1 1" />
                    <path d="M13 10.5c0-.6.5-1 1-1s1 .4 1 1" />
                    {/* smile */}
                    <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
                    {/* sparkle */}
                    <path d="M18.5 6.5l.4-.9.9-.4-.9-.4-.4-.9-.4.9-.9.4.9.4z" fill={color} stroke="none" />
                </svg>
            );

        /* ── GETTING THERE — raised brow ── */
        case "thinking":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    {/* one brow up */}
                    <path d="M8.2 8.8c.6-.5 1.5-.6 2.1-.2" />
                    <path d="M13.8 9.6c.5-.3 1.2-.3 1.8 0" />
                    {/* eyes */}
                    <circle cx="9.5" cy="11" r=".55" fill={color} stroke="none" />
                    <circle cx="14.5" cy="11" r=".55" fill={color} stroke="none" />
                    {/* small flat mouth */}
                    <path d="M10 15h4" />
                </svg>
            );

        /* ── WORTH A SECOND LOOK — small frown ── */
        case "unsure":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    {/* eyes */}
                    <circle cx="9.5" cy="11" r=".55" fill={color} stroke="none" />
                    <circle cx="14.5" cy="11" r=".55" fill={color} stroke="none" />
                    {/* gentle frown */}
                    <path d="M9.2 15.4c.9-.8 2-.9 3-.3" />
                    <path d="M14.8 15.4c-.3-.3-.7-.5-1.1-.5" />
                </svg>
            );

        /* ── FAST AND WRONG — speed‑lines + oops mouth ── */
        case "overconfident":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    {/* eyes wide */}
                    <circle cx="9.5" cy="11" r=".7" fill={color} stroke="none" />
                    <circle cx="14.5" cy="11" r=".7" fill={color} stroke="none" />
                    {/* small round mouth */}
                    <circle cx="12" cy="15" r="1" />
                    {/* speed lines */}
                    <path d="M3.5 9h1.5" />
                    <path d="M3 12h1.5" />
                    <path d="M3.5 15h1.5" />
                </svg>
            );

        /* ── EYE — misread ── */
        case "eye":
            return (
                <svg {...common}>
                    <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z" />
                    <circle cx="12" cy="12" r="2.6" />
                    <circle cx="12" cy="12" r=".8" fill={color} stroke="none" />
                </svg>
            );

        /* ── BOOK — concept gap ── */
        case "book":
            return (
                <svg {...common}>
                    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11a1 1 0 0 1 1 1v14a1 1 0 0 0-1-1H5.5C4.7 18 4 17.3 4 16.5z" />
                    <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13a1 1 0 0 0-1 1v14a1 1 0 0 1 1-1h5.5c.8 0 1.5-.7 1.5-1.5z" />
                    <path d="M12 5v14" />
                </svg>
            );

        /* ── CLOCK — rushed ── */
        case "clock":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    <path d="M12 7v5l3 2" />
                </svg>
            );

        /* ── TARGET — guess ── */
        case "target":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    <circle cx="12" cy="12" r="5.5" />
                    <circle cx="12" cy="12" r="1.8" />
                </svg>
            );

        /* ── NEUTRAL fallback ── */
        default:
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="9.25" />
                    <circle cx="9.5" cy="11" r=".55" fill={color} stroke="none" />
                    <circle cx="14.5" cy="11" r=".55" fill={color} stroke="none" />
                    <path d="M9.5 15h5" />
                </svg>
            );
    }
}