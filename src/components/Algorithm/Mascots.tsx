// src/components/Algorithm/Mascots.tsx
// Real cartoon SVG mascots for MEDRAE — no emojis, fully animatable.
// Each character is self-contained and can be used anywhere.

import { motion } from "framer-motion";

/* ============================================================
   CHAMPION — a happy student holding a trophy
   Used when the user has strong units.
   ============================================================ */
export function ChampionMascot({ size = 48 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
        >
            {/* Soft golden glow behind */}
            <circle cx="32" cy="34" r="26" fill="#FEF3C7" opacity="0.55" />

            {/* Body — emerald shirt */}
            <path
                d="M20 44 Q32 38 44 44 L46 56 Q32 60 18 56 Z"
                fill="#10B981"
                stroke="#047857"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />

            {/* Head */}
            <circle cx="32" cy="28" r="12" fill="#FDE68A" stroke="#B45309" strokeWidth="1.2" />

            {/* Hair cap */}
            <path
                d="M20 26 Q22 16 32 16 Q42 16 44 26 Q38 22 32 22 Q26 22 20 26 Z"
                fill="#7C3AED"
                stroke="#5B21B6"
                strokeWidth="1"
                strokeLinejoin="round"
            />

            {/* Eyes — closed happy arcs */}
            <path d="M27 28 Q28.5 25 30 28" stroke="#1F2937" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M34 28 Q35.5 25 37 28" stroke="#1F2937" strokeWidth="1.6" strokeLinecap="round" fill="none" />

            {/* Smile */}
            <path d="M28 33 Q32 36 36 33" stroke="#1F2937" strokeWidth="1.6" strokeLinecap="round" fill="none" />

            {/* Cheeks */}
            <circle cx="25" cy="32" r="1.4" fill="#FB7185" opacity="0.6" />
            <circle cx="39" cy="32" r="1.4" fill="#FB7185" opacity="0.6" />

            {/* Left arm holding trophy — animates up */}
            <motion.g
                animate={{ rotate: [0, -8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "20px 46px" }}
            >
                <path
                    d="M20 46 Q16 44 14 40"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Trophy */}
                <g>
                    <path d="M8 30 L16 30 L14 36 L10 36 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="0.9" />
                    <path d="M8 30 Q6 30 6 32 Q6 34 8 34" stroke="#B45309" strokeWidth="0.9" fill="none" />
                    <path d="M16 30 Q18 30 18 32 Q18 34 16 34" stroke="#B45309" strokeWidth="0.9" fill="none" />
                    <rect x="10" y="36" width="4" height="3" fill="#B45309" />
                    <rect x="8" y="39" width="8" height="2" rx="1" fill="#FBBF24" stroke="#B45309" strokeWidth="0.7" />
                    {/* Star on trophy */}
                    <path d="M12 31.2 L12.6 32.4 L13.9 32.5 L12.9 33.3 L13.2 34.6 L12 33.9 L10.8 34.6 L11.1 33.3 L10.1 32.5 L11.4 32.4 Z" fill="#FEF3C7" />
                </g>
            </motion.g>

            {/* Right arm — waving */}
            <motion.g
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                style={{ transformOrigin: "44px 46px" }}
            >
                <path
                    d="M44 46 Q48 44 50 40"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />
                <circle cx="50" cy="39" r="2.2" fill="#FDE68A" stroke="#B45309" strokeWidth="0.9" />
            </motion.g>
        </motion.svg>
    );
}

/* ============================================================
   COACH — a friendly coach with a whistle & clipboard
   Used when a unit needs practice.
   ============================================================ */
export function CoachMascot({ size = 48 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ rotate: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
        >
            {/* Soft rose glow */}
            <circle cx="32" cy="34" r="26" fill="#FFE4E6" opacity="0.55" />

            {/* Body — rose shirt */}
            <path
                d="M20 44 Q32 38 44 44 L46 56 Q32 60 18 56 Z"
                fill="#F43F5E"
                stroke="#9F1239"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />

            {/* Collar / whistle strap */}
            <path d="M28 44 L32 50 L36 44" stroke="#FDE68A" strokeWidth="1.2" fill="none" strokeLinejoin="round" />

            {/* Whistle */}
            <motion.g
                animate={{ rotate: [0, -6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "32px 50px" }}
            >
                <rect x="30" y="50" width="5" height="3.5" rx="1" fill="#FBBF24" stroke="#B45309" strokeWidth="0.8" />
                <circle cx="36" cy="51.5" r="1.4" fill="#FBBF24" stroke="#B45309" strokeWidth="0.8" />
            </motion.g>

            {/* Head */}
            <circle cx="32" cy="28" r="12" fill="#FDE68A" stroke="#B45309" strokeWidth="1.2" />

            {/* Cap */}
            <path
                d="M20 24 Q22 15 32 15 Q42 15 44 24 Z"
                fill="#E11D48"
                stroke="#9F1239"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
            <path d="M44 24 L50 25 Q50 27 48 27 L44 27 Z" fill="#E11D48" stroke="#9F1239" strokeWidth="1" strokeLinejoin="round" />

            {/* Eyes — determined look */}
            <circle cx="28" cy="28" r="1.5" fill="#1F2937" />
            <circle cx="36" cy="28" r="1.5" fill="#1F2937" />

            {/* Eyebrows — focused */}
            <path d="M25 25 L30 26" stroke="#1F2937" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M39 25 L34 26" stroke="#1F2937" strokeWidth="1.3" strokeLinecap="round" />

            {/* Smile — encouraging */}
            <path d="M28 33 Q32 35 36 33" stroke="#1F2937" strokeWidth="1.6" strokeLinecap="round" fill="none" />

            {/* Left arm — holding clipboard */}
            <path
                d="M20 46 Q17 48 15 52"
                stroke="#F43F5E"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
            />
            {/* Clipboard */}
            <g>
                <rect x="8" y="46" width="10" height="12" rx="1.5" fill="#FFFFFF" stroke="#9F1239" strokeWidth="1" />
                <rect x="10.5" y="44.5" width="5" height="2.5" rx="1" fill="#475569" />
                <path d="M10 50 L16 50 M10 52 L16 52 M10 54 L14 54" stroke="#94A3B8" strokeWidth="0.9" strokeLinecap="round" />
            </g>

            {/* Right arm — pointing */}
            <motion.g
                animate={{ rotate: [-4, 4, -4] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "44px 46px" }}
            >
                <path
                    d="M44 46 Q50 44 54 42"
                    stroke="#F43F5E"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />
                <circle cx="54" cy="42" r="2" fill="#FDE68A" stroke="#B45309" strokeWidth="0.8" />
            </motion.g>
        </motion.svg>
    );
}

/* ============================================================
   SPROUT — a growing plant for empty states
   Used when the user has no data yet.
   ============================================================ */
export function SproutMascot({ size = 56 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Soft green glow */}
            <circle cx="32" cy="40" r="22" fill="#D1FAE5" opacity="0.6" />

            {/* Soil */}
            <ellipse cx="32" cy="52" rx="14" ry="3" fill="#78350F" opacity="0.85" />
            <ellipse cx="32" cy="51" rx="11" ry="2" fill="#92400E" opacity="0.5" />

            {/* Stem */}
            <motion.path
                d="M32 52 Q32 42 32 34"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                animate={{ scaleY: [0.85, 1, 0.85] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "32px 52px" }}
            />

            {/* Left leaf — sways */}
            <motion.path
                d="M32 40 Q24 36 22 30 Q28 32 32 38 Z"
                fill="#10B981"
                stroke="#047857"
                strokeWidth="1"
                strokeLinejoin="round"
                animate={{ rotate: [0, -8, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "32px 40px" }}
            />

            {/* Right leaf — sways opposite */}
            <motion.path
                d="M32 36 Q40 32 42 26 Q36 28 32 34 Z"
                fill="#34D399"
                stroke="#047857"
                strokeWidth="1"
                strokeLinejoin="round"
                animate={{ rotate: [0, 8, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                style={{ transformOrigin: "32px 36px" }}
            />

            {/* Small sparkles */}
            <motion.circle
                cx="22" cy="26" r="1.5"
                fill="#FBBF24"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle
                cx="44" cy="22" r="1.5"
                fill="#FBBF24"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            />
        </motion.svg>
    );
}
/* ============================================================
   MINI MASCOTS — simplified for 16–20px inline usage
   These strip away fine details that become invisible at small size.
   Use when you need a tiny avatar in a row.
   ============================================================ */

export function MiniChampion({ size = 20 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ y: [0, -1.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
        >
            <circle cx="16" cy="17" r="14" fill="#FEF3C7" opacity="0.6" />
            {/* Body */}
            <path
                d="M10 22 Q16 19 22 22 L23 29 Q16 31 9 29 Z"
                fill="#10B981"
                stroke="#047857"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            {/* Head */}
            <circle cx="16" cy="14" r="6.5" fill="#FDE68A" stroke="#B45309" strokeWidth="1" />
            {/* Hair */}
            <path d="M10 13 Q11 8 16 8 Q21 8 22 13 Q19 11 16 11 Q13 11 10 13 Z" fill="#7C3AED" />
            {/* Eyes */}
            <circle cx="14" cy="14" r="0.9" fill="#1F2937" />
            <circle cx="18" cy="14" r="0.9" fill="#1F2937" />
            {/* Smile */}
            <path d="M14 16.5 Q16 18 18 16.5" stroke="#1F2937" strokeWidth="1" strokeLinecap="round" fill="none" />
        </motion.svg>
    );
}

export function MiniCoach({ size = 20 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
        >
            <circle cx="16" cy="17" r="14" fill="#FFE4E6" opacity="0.6" />
            {/* Body */}
            <path
                d="M10 22 Q16 19 22 22 L23 29 Q16 31 9 29 Z"
                fill="#F43F5E"
                stroke="#9F1239"
                strokeWidth="1"
                strokeLinejoin="round"
            />
            {/* Head */}
            <circle cx="16" cy="14" r="6.5" fill="#FDE68A" stroke="#B45309" strokeWidth="1" />
            {/* Cap */}
            <path d="M10 12 Q11 7 16 7 Q21 7 22 12 Z" fill="#E11D48" />
            {/* Eyes */}
            <circle cx="14" cy="14" r="0.9" fill="#1F2937" />
            <circle cx="18" cy="14" r="0.9" fill="#1F2937" />
            {/* Smile */}
            <path d="M14 16.5 Q16 18 18 16.5" stroke="#1F2937" strokeWidth="1" strokeLinecap="round" fill="none" />
        </motion.svg>
    );
}