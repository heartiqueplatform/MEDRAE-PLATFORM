"use client";

import { useMemo } from "react";

/**
 * Weighted doodle pool — heavy on the MEDRAE heart + cap,
 * with nursing tools and cartoon characters mixed in.
 */
const WEIGHTED_POOL = [
    // ── Brand (dominant) ──
    "logo", "logo", "logo", "logo", "logo", "logo", "logo", "logo",

    // ── Core nursing accents ──
    "check", "trophy", "shield", "stethoscope", "syringe", "pill",
    "cross", "bandage", "heartPulse",

    // ── Cartoon characters & scene items ──
    "nurse", "bed", "ambulance", "ivDrip", "clipboard", "microscope",
] as const;

type DoodleType = typeof WEIGHTED_POOL[number];

function getRandom(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function pickDoodle(): DoodleType {
    return WEIGHTED_POOL[Math.floor(Math.random() * WEIGHTED_POOL.length)];
}

export function MedicalDoodles() {
    const doodles = useMemo(() => {
        // ── Reduced density: 11×11 = 121 doodles (~50% of previous 256) ──
        const COLS = 11;
        const ROWS = 11;
        const total = COLS * ROWS;

        const cellW = 100 / COLS;
        const cellH = 100 / ROWS;

        return Array.from({ length: total }).map((_, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);

            const jitterX = getRandom(-cellW * 0.3, cellW * 0.3);
            const jitterY = getRandom(-cellH * 0.3, cellH * 0.3);

            const left = col * cellW + cellW / 2 + jitterX;
            const top = row * cellH + cellH / 2 + jitterY;

            return {
                type: pickDoodle(),
                top: `${top}%`,
                left: `${left}%`,
                rotate: `rotate(${getRandom(-25, 25)}deg)`,
                size: `${getRandom(18, 30)}px`,
                opacity: getRandom(0.55, 1),
            };
        });
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden">

            {/* ───────── Doodle layer ───────── */}
            <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]">
                {doodles.map((item, i) => (
                    <svg
                        key={i}
                        className="absolute text-muted-foreground pointer-events-none"
                        style={{
                            top: item.top,
                            left: item.left,
                            transform: `translate(-50%, -50%) ${item.rotate}`,
                            width: item.size,
                            height: item.size,
                            opacity: item.opacity,
                        }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.4}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {/* ══════ BRAND — MEDRAE heart + cap ══════ */}
                        {item.type === "logo" && (
                            <>
                                <path d="M12 20.5 C10.8 19.6 4 14.8 2.5 11.8 C1 8.9 2.9 4.9 6.1 4.1 C8.5 3.5 10.6 4.6 12 6.3 C13.4 4.6 15.5 3.5 17.9 4.1 C21.1 4.9 23 8.9 21.5 11.8 C20 14.8 13.2 19.6 12 20.5 Z" />
                                <path d="M5.5 10.2 L12 7.6 L18.5 10.2 L12 12.8 Z" />
                                <path d="M7.7 11 V13.3 C7.7 14 9.6 14.9 12 15.2 C14.4 14.9 16.3 14 16.3 13.3 V11" />
                                <circle cx="12" cy="7.6" r="0.5" />
                                <path d="M12 7.6 V12.8" />
                                <path d="M12 7.6 C10.7 8.2 9.2 8.5 7.7 8.7" />
                                <path d="M7.7 8.7 C7.4 9.4 7.4 10 7.4 10.7" />
                                <circle cx="7.4" cy="11.1" r="0.55" />
                                <path d="M6.9 11.8 L7.9 11.8 L8.1 13.6 C7.6 13.9 7.1 13.9 6.6 13.6 Z" />
                            </>
                        )}

                        {/* ══════ ACHIEVEMENT ══════ */}
                        {item.type === "check" && <path d="m4.5 12.75 6 6 9-13.5" />}

                        {item.type === "trophy" && (
                            <>
                                <path d="M8 4 H16 V8 A4 4 0 0 1 8 8 Z" />
                                <path d="M8 5 H5.5 A1.5 1.5 0 0 0 4 6.5 V7 A2 2 0 0 0 6 9 H8" />
                                <path d="M16 5 H18.5 A1.5 1.5 0 0 1 20 6.5 V7 A2 2 0 0 1 18 9 H16" />
                                <path d="M12 12 V15" />
                                <path d="M9 19 H15" />
                                <path d="M10 15 H14 V19 H10 Z" />
                            </>
                        )}

                        {item.type === "shield" && (
                            <>
                                <path d="M12 3 L19 6 V11 C19 15.5 15.8 19.3 12 21 C8.2 19.3 5 15.5 5 11 V6 Z" />
                                <path d="m9.5 11.5 2 2 4-4.5" />
                            </>
                        )}

                        {/* ══════ NURSING TOOLS ══════ */}
                        {item.type === "stethoscope" && (
                            <>
                                <path d="M6 3 V9 A3 3 0 0 0 12 9 V3" />
                                <path d="M6 3 H4.5" />
                                <path d="M12 3 H13.5" />
                                <path d="M12 12 V15 A4 4 0 0 0 16 19 H17.5" />
                                <circle cx="19" cy="19" r="2" />
                            </>
                        )}

                        {item.type === "syringe" && (
                            <>
                                <path d="M17 3 L21 7" />
                                <path d="M18 4 L20 6" />
                                <path d="M4 20 L8 16" />
                                <path d="M8 16 L14 10" />
                                <path d="M9 9 L15 15" />
                                <path d="M12 12 L17 7" />
                                <path d="M6 14 L10 18" />
                                <path d="M3 21 L5 19" />
                            </>
                        )}

                        {item.type === "pill" && (
                            <>
                                <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-30 12 12)" />
                                <path d="M9 8.5 L14.5 15.5" />
                            </>
                        )}

                        {item.type === "cross" && (
                            <path d="M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z" />
                        )}

                        {item.type === "bandage" && (
                            <>
                                <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-20 12 12)" />
                                <circle cx="8.5" cy="11" r="0.6" />
                                <circle cx="11" cy="13" r="0.6" />
                                <circle cx="13.5" cy="10.5" r="0.6" />
                                <circle cx="15.5" cy="13" r="0.6" />
                            </>
                        )}

                        {item.type === "heartPulse" && (
                            <>
                                <path d="M12 20 C10.8 19 4.5 14.5 3 11.7 C1.6 9.1 3.4 5.5 6.4 4.8 C8.6 4.3 10.5 5.3 12 6.9 C13.5 5.3 15.4 4.3 17.6 4.8 C20.6 5.5 22.4 9.1 21 11.7 C19.5 14.5 13.2 19 12 20 Z" />
                                <path d="M4 12 H8 L10 8 L13 16 L15 12 H20" />
                            </>
                        )}

                        {item.type === "ivDrip" && (
                            <>
                                <path d="M8 3 H16 V13 A4 4 0 0 1 12 17 A4 4 0 0 1 8 13 Z" />
                                <path d="M12 2 V3" />
                                <path d="M12 17 V20" />
                                <path d="M9 21 H15" />
                                <path d="M8 8 H16" />
                            </>
                        )}

                        {item.type === "clipboard" && (
                            <>
                                <rect x="5" y="4" width="14" height="18" rx="1.5" />
                                <rect x="9" y="2.5" width="6" height="3" rx="1" />
                                <path d="M8 11 H16" />
                                <path d="M8 14 H16" />
                                <path d="M8 17 H13" />
                            </>
                        )}

                        {item.type === "microscope" && (
                            <>
                                <path d="M9 8 L13 4" />
                                <path d="M11 6 L15 10" />
                                <path d="M8 20 H18" />
                                <path d="M13 20 V16" />
                                <path d="M10 16 H16" />
                                <circle cx="13" cy="13" r="2.5" />
                                <path d="M6 20 C6 15 9 12 13 11" />
                            </>
                        )}

                        {/* ══════ CARTOON SCENES ══════ */}
                        {item.type === "nurse" && (
                            <>
                                <path d="M7 3 L12 1.5 L17 3 L12 4.5 Z" />
                                <path d="M9 4 V6" />
                                <circle cx="12" cy="8" r="2.6" />
                                <path d="M11 8.5 Q12 9.3 13 8.5" />
                                <path d="M12 10.6 V11.5" />
                                <path d="M7.5 18 C7.5 14.5 10 12 12 12 C14 12 16.5 14.5 16.5 18 Z" />
                                <path d="M12 14 V16" />
                                <path d="M11 15 H13" />
                                <path d="M16 14 L19 11" />
                                <path d="M19 11 L20 9.5" />
                                <path d="M19 11 L20.5 12" />
                            </>
                        )}

                        {item.type === "bed" && (
                            <>
                                <path d="M3 13 H21 V20" />
                                <path d="M3 10 V20" />
                                <path d="M21 20 H22" />
                                <path d="M3 10 H9 V13" />
                                <rect x="5" y="11" width="4" height="2" rx="0.6" />
                                <circle cx="12.5" cy="9" r="1.6" />
                                <path d="M11 13 V10.5" />
                                <path d="M11 10.5 H14" />
                                <path d="M11 13 H20" />
                                <path d="M11 15 H20" />
                                <path d="M5 20 V17" />
                                <path d="M19 20 V17" />
                            </>
                        )}

                        {item.type === "ambulance" && (
                            <>
                                <rect x="2" y="8" width="13" height="8" rx="1.5" />
                                <path d="M15 11 H19 L22 14 V16 H15 Z" />
                                <path d="M15.5 12 H18" />
                                <path d="M7.5 10 V14" />
                                <path d="M5.5 12 H9.5" />
                                <circle cx="6.5" cy="17.5" r="2" />
                                <circle cx="17" cy="17.5" r="2" />
                                <path d="M2 19 H22" />
                            </>
                        )}
                    </svg>
                ))}
            </div>

            {/* ───────── Centered public/cutee.png logo ───────── */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                    src="/cutee.png"
                    alt="MEDRAE"
                    className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64
                     opacity-[0.12] dark:opacity-[0.18]
                     object-contain select-none"
                    loading="lazy"
                    draggable={false}
                />
            </div>

        </div>
    );
}