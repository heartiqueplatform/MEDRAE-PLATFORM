// src/components/VerifiedBadge.tsx
import { memo } from "react";

type VerifiedBadgeProps = {
    /** Is the user currently a paid / premium subscriber */
    isPremium: boolean;
    /** Size variant */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    /** Show text label next to the heart-badge */
    showLabel?: boolean;
    /** Optional custom label override (e.g. "Pro", "Gold", "Verified Nurse") */
    label?: string;
    /** Optional tooltip / accessible title */
    title?: string;
};

const SIZE_MAP = {
    xs: { box: "h-4 w-4", text: "text-[9px]", gap: "gap-0.5", pad: "px-1.5 py-0" },
    sm: { box: "h-5 w-5", text: "text-[10px]", gap: "gap-1", pad: "px-2 py-0.5" },
    md: { box: "h-6 w-6", text: "text-[11px]", gap: "gap-1.5", pad: "px-2.5 py-0.5" },
    lg: { box: "h-7 w-7", text: "text-xs", gap: "gap-1.5", pad: "px-3 py-1" },
    xl: { box: "h-9 w-9", text: "text-sm", gap: "gap-2", pad: "px-3.5 py-1.5" },
};

/**
 * Premium "Nurse Verified" badge — pure, static, blue.
 *
 * Visual identity:
 *   - Solid blue heart (base shape)
 *   - White swoosh checkmark inside the heart
 *   - No animations, no shimmer, no halo
 */
export const VerifiedBadge = memo(function VerifiedBadge({
    isPremium,
    size = "sm",
    showLabel = false,
    label = "Verified",
    title,
}: VerifiedBadgeProps) {
    if (!isPremium) return null;

    const s = SIZE_MAP[size];

    const HeartCheck = (
        <span className={`inline-flex items-center justify-center ${s.box}`}>
            <svg
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full"
                aria-hidden="true"
            >
                {/* Solid blue heart */}
                <path
                    d="M16 28.5
                       C15.5 28 6.5 21.5 4.2 16.8
                       C2 12.2 4.3 7.8 8.4 6.8
                       C11.4 6.1 14.1 7.6 16 9.8
                       C17.9 7.6 20.6 6.1 23.6 6.8
                       C27.7 7.8 30 12.2 27.8 16.8
                       C25.5 21.5 16.5 28 16 28.5 Z"
                    fill="#2563EB"
                />

                {/* White swoosh checkmark inside the heart */}
                <path
                    d="M9.8 16.2 L14 20.4 L22.4 11.6"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );

    if (!showLabel) {
        return (
            <span title={title || "Verified premium nurse"} className="inline-flex shrink-0">
                {HeartCheck}
            </span>
        );
    }

    return (
        <span
            title={title || "Verified premium nurse"}
            className={`inline-flex items-center ${s.gap} rounded-full ${s.pad}
                        bg-blue-100 dark:bg-blue-950/60
                        text-blue-900 dark:text-blue-200
                        font-bold tracking-tight shrink-0`}
        >
            {HeartCheck}
            <span className={`${s.text} uppercase`}>{label}</span>
        </span>
    );
});

VerifiedBadge.displayName = "VerifiedBadge";