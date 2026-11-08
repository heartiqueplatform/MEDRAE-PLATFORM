// src/components/VerifiedBadge.tsx
import { memo } from "react";
import { BadgeCheck } from "lucide-react";

type VerifiedBadgeProps = {
    /** Is the user currently a paid / premium subscriber */
    isPremium: boolean;
    /** Size variant */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    /** Show text label next to the badge */
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
 * Instagram / Facebook style "Verified" badge — powered by Lucide's BadgeCheck.
 *
 * Visual identity:
 *   - Lucide BadgeCheck (scalloped circle + check)
 *   - Filled with Meta blue (#0095F6) + white checkmark
 *   - Scales cleanly at every size
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

    const VerifiedIcon = (
        <span className={`inline-flex items-center justify-center ${s.box}`}>
            <BadgeCheck
                className="h-full w-full"
                strokeWidth={2.4}
                fill="#0095F6"
                color="#FFFFFF"
                aria-hidden="true"
            />
        </span>
    );

    if (!showLabel) {
        return (
            <span title={title || "Verified premium nurse"} className="inline-flex shrink-0">
                {VerifiedIcon}
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
            {VerifiedIcon}
            <span className={`${s.text} uppercase`}>{label}</span>
        </span>
    );
});

VerifiedBadge.displayName = "VerifiedBadge";