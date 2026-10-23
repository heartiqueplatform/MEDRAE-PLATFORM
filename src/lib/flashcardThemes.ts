// lib/flashcardThemes.ts
export interface CardTheme {
    name: string;
    deep: string;
    primary: string;
    accent: string;
    paper: string;
    ink: string;
    paperDark: string;      // 🔥 new
    inkDark: string;        // 🔥 new
    gradient: string;
    chipBg: string;
    chipBgDark: string;     // 🔥 new
    tipBg: string;
    tipBgDark: string;      // 🔥 new
    tipBorder: string;
    tipText: string;
    tipTextDark: string;    // 🔥 new
}

const THEMES: Record<string, CardTheme> = {
    pharmacology: {
        name: "Apothecary",
        deep: "#3b0764", primary: "#7c3aed", accent: "#a78bfa",
        paper: "#f5f3ff", ink: "#1e1b4b",
        paperDark: "#1a1033", inkDark: "#e9e5ff",
        gradient: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 55%,#a78bfa 100%)",
        chipBg: "rgba(124,58,237,0.12)",
        chipBgDark: "rgba(167,139,250,0.18)",
        tipBg: "linear-gradient(90deg,#fef3c7,rgba(254,243,199,0))",
        tipBgDark: "linear-gradient(90deg,rgba(245,158,11,0.18),rgba(245,158,11,0))",
        tipBorder: "#f59e0b", tipText: "#78350f", tipTextDark: "#fde68a",
    },
    pediatric: {
        name: "Sunshine",
        deep: "#78350f", primary: "#f59e0b", accent: "#fcd34d",
        paper: "#fffbeb", ink: "#451a03",
        paperDark: "#241703", inkDark: "#fef3c7",
        gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 55%,#fcd34d 100%)",
        chipBg: "rgba(245,158,11,0.14)",
        chipBgDark: "rgba(252,211,77,0.18)",
        tipBg: "linear-gradient(90deg,#fef3c7,rgba(254,243,199,0))",
        tipBgDark: "linear-gradient(90deg,rgba(245,158,11,0.18),rgba(245,158,11,0))",
        tipBorder: "#d97706", tipText: "#78350f", tipTextDark: "#fde68a",
    },
    obstetric: {
        name: "Rose Quartz",
        deep: "#4c0519", primary: "#e11d48", accent: "#fda4af",
        paper: "#fff1f2", ink: "#4c0519",
        paperDark: "#2b0812", inkDark: "#ffe4e6",
        gradient: "linear-gradient(135deg,#881337 0%,#e11d48 55%,#fda4af 100%)",
        chipBg: "rgba(225,29,72,0.12)",
        chipBgDark: "rgba(253,164,175,0.18)",
        tipBg: "linear-gradient(90deg,#ffe4e6,rgba(255,228,230,0))",
        tipBgDark: "linear-gradient(90deg,rgba(225,29,72,0.18),rgba(225,29,72,0))",
        tipBorder: "#e11d48", tipText: "#881337", tipTextDark: "#fecdd3",
    },
    psychiatric: {
        name: "Deep Teal",
        deep: "#042f2e", primary: "#0d9488", accent: "#5eead4",
        paper: "#f0fdfa", ink: "#042f2e",
        paperDark: "#04211f", inkDark: "#ccfbf1",
        gradient: "linear-gradient(135deg,#115e59 0%,#0d9488 55%,#5eead4 100%)",
        chipBg: "rgba(13,148,136,0.12)",
        chipBgDark: "rgba(94,234,212,0.18)",
        tipBg: "linear-gradient(90deg,#ccfbf1,rgba(204,251,241,0))",
        tipBgDark: "linear-gradient(90deg,rgba(13,148,136,0.18),rgba(13,148,136,0))",
        tipBorder: "#0d9488", tipText: "#115e59", tipTextDark: "#99f6e4",
    },
    endocrine: {
        name: "Emerald",
        deep: "#022c22", primary: "#059669", accent: "#6ee7b7",
        paper: "#ecfdf5", ink: "#022c22",
        paperDark: "#052e1a", inkDark: "#d1fae5",
        gradient: "linear-gradient(135deg,#065f46 0%,#059669 55%,#6ee7b7 100%)",
        chipBg: "rgba(5,150,105,0.12)",
        chipBgDark: "rgba(110,231,183,0.18)",
        tipBg: "linear-gradient(90deg,#d1fae5,rgba(209,250,229,0))",
        tipBgDark: "linear-gradient(90deg,rgba(5,150,105,0.18),rgba(5,150,105,0))",
        tipBorder: "#059669", tipText: "#065f46", tipTextDark: "#a7f3d0",
    },
    respiratory: {
        name: "Sky",
        deep: "#082f49", primary: "#0284c7", accent: "#7dd3fc",
        paper: "#f0f9ff", ink: "#082f49",
        paperDark: "#08283d", inkDark: "#e0f2fe",
        gradient: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#7dd3fc 100%)",
        chipBg: "rgba(2,132,199,0.12)",
        chipBgDark: "rgba(125,211,252,0.18)",
        tipBg: "linear-gradient(90deg,#e0f2fe,rgba(224,242,254,0))",
        tipBgDark: "linear-gradient(90deg,rgba(2,132,199,0.18),rgba(2,132,199,0))",
        tipBorder: "#0284c7", tipText: "#0c4a6e", tipTextDark: "#bae6fd",
    },
    cardiovascular: {
        name: "Crimson",
        deep: "#450a0a", primary: "#dc2626", accent: "#fca5a5",
        paper: "#fef2f2", ink: "#450a0a",
        paperDark: "#2b0a0a", inkDark: "#fee2e2",
        gradient: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#fca5a5 100%)",
        chipBg: "rgba(220,38,38,0.12)",
        chipBgDark: "rgba(252,165,165,0.18)",
        tipBg: "linear-gradient(90deg,#fee2e2,rgba(254,226,226,0))",
        tipBgDark: "linear-gradient(90deg,rgba(220,38,38,0.18),rgba(220,38,38,0))",
        tipBorder: "#dc2626", tipText: "#7f1d1d", tipTextDark: "#fecaca",
    },
    leadership: {
        name: "Slate Pro",
        deep: "#0f172a", primary: "#475569", accent: "#cbd5e1",
        paper: "#f8fafc", ink: "#0f172a",
        paperDark: "#0f172a", inkDark: "#e2e8f0",
        gradient: "linear-gradient(135deg,#1e293b 0%,#475569 55%,#cbd5e1 100%)",
        chipBg: "rgba(71,85,105,0.14)",
        chipBgDark: "rgba(203,213,225,0.18)",
        tipBg: "linear-gradient(90deg,#e2e8f0,rgba(226,232,240,0))",
        tipBgDark: "linear-gradient(90deg,rgba(71,85,105,0.28),rgba(71,85,105,0))",
        tipBorder: "#475569", tipText: "#1e293b", tipTextDark: "#e2e8f0",
    },
    community: {
        name: "Savanna",
        deep: "#422006", primary: "#ca8a04", accent: "#fde047",
        paper: "#fefce8", ink: "#422006",
        paperDark: "#1f1a05", inkDark: "#fef9c3",
        gradient: "linear-gradient(135deg,#713f12 0%,#ca8a04 55%,#fde047 100%)",
        chipBg: "rgba(202,138,4,0.14)",
        chipBgDark: "rgba(253,224,71,0.18)",
        tipBg: "linear-gradient(90deg,#fef9c3,rgba(254,249,195,0))",
        tipBgDark: "linear-gradient(90deg,rgba(202,138,4,0.18),rgba(202,138,4,0))",
        tipBorder: "#ca8a04", tipText: "#713f12", tipTextDark: "#fef08a",
    },
    calculations: {
        name: "Indigo Ink",
        deep: "#1e1b4b", primary: "#4f46e5", accent: "#a5b4fc",
        paper: "#eef2ff", ink: "#1e1b4b",
        paperDark: "#151340", inkDark: "#e0e7ff",
        gradient: "linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#a5b4fc 100%)",
        chipBg: "rgba(79,70,229,0.12)",
        chipBgDark: "rgba(165,180,252,0.18)",
        tipBg: "linear-gradient(90deg,#e0e7ff,rgba(224,231,255,0))",
        tipBgDark: "linear-gradient(90deg,rgba(79,70,229,0.18),rgba(79,70,229,0))",
        tipBorder: "#4f46e5", tipText: "#312e81", tipTextDark: "#c7d2fe",
    },
    neurology: {
        name: "Neural Purple",
        deep: "#2e1065", primary: "#8b5cf6", accent: "#c4b5fd",
        paper: "#faf5ff", ink: "#2e1065",
        paperDark: "#1e1235", inkDark: "#ede9fe",
        gradient: "linear-gradient(135deg,#5b21b6 0%,#8b5cf6 55%,#c4b5fd 100%)",
        chipBg: "rgba(139,92,246,0.12)",
        chipBgDark: "rgba(196,181,253,0.18)",
        tipBg: "linear-gradient(90deg,#ede9fe,rgba(237,233,254,0))",
        tipBgDark: "linear-gradient(90deg,rgba(139,92,246,0.18),rgba(139,92,246,0))",
        tipBorder: "#8b5cf6", tipText: "#2e1065", tipTextDark: "#ddd6fe",
    },
    renal: {
        name: "Renal Aqua",
        deep: "#083344", primary: "#0891b2", accent: "#67e8f9",
        paper: "#ecfeff", ink: "#083344",
        paperDark: "#04262f", inkDark: "#cffafe",
        gradient: "linear-gradient(135deg,#155e75 0%,#0891b2 55%,#67e8f9 100%)",
        chipBg: "rgba(8,145,178,0.12)",
        chipBgDark: "rgba(103,232,249,0.18)",
        tipBg: "linear-gradient(90deg,#cffafe,rgba(207,250,254,0))",
        tipBgDark: "linear-gradient(90deg,rgba(8,145,178,0.18),rgba(8,145,178,0))",
        tipBorder: "#0891b2", tipText: "#155e75", tipTextDark: "#a5f3fc",
    },
    emergency: {
        name: "Code Red",
        deep: "#7c2d12", primary: "#ea580c", accent: "#fdba74",
        paper: "#fff7ed", ink: "#7c2d12",
        paperDark: "#2a1206", inkDark: "#ffedd5",
        gradient: "linear-gradient(135deg,#9a3412 0%,#ea580c 55%,#fdba74 100%)",
        chipBg: "rgba(234,88,12,0.12)",
        chipBgDark: "rgba(253,186,116,0.18)",
        tipBg: "linear-gradient(90deg,#ffedd5,rgba(255,237,213,0))",
        tipBgDark: "linear-gradient(90deg,rgba(234,88,12,0.18),rgba(234,88,12,0))",
        tipBorder: "#ea580c", tipText: "#7c2d12", tipTextDark: "#fed7aa",
    },
    hematology: {
        name: "Blood Maroon",
        deep: "#4a044e", primary: "#a21caf", accent: "#f0abfc",
        paper: "#fdf4ff", ink: "#4a044e",
        paperDark: "#2a0a2f", inkDark: "#fae8ff",
        gradient: "linear-gradient(135deg,#701a75 0%,#a21caf 55%,#f0abfc 100%)",
        chipBg: "rgba(162,28,175,0.12)",
        chipBgDark: "rgba(240,171,252,0.18)",
        tipBg: "linear-gradient(90deg,#fae8ff,rgba(250,232,255,0))",
        tipBgDark: "linear-gradient(90deg,rgba(162,28,175,0.18),rgba(162,28,175,0))",
        tipBorder: "#a21caf", tipText: "#701a75", tipTextDark: "#f5d0fe",
    },
    medsurg: {
        name: "Clinical Graphite",
        deep: "#1c1917", primary: "#57534e", accent: "#d6d3d1",
        paper: "#fafaf9", ink: "#1c1917",
        paperDark: "#1c1917", inkDark: "#e7e5e4",
        gradient: "linear-gradient(135deg,#292524 0%,#57534e 55%,#d6d3d1 100%)",
        chipBg: "rgba(87,83,78,0.14)",
        chipBgDark: "rgba(214,211,209,0.18)",
        tipBg: "linear-gradient(90deg,#e7e5e4,rgba(231,229,228,0))",
        tipBgDark: "linear-gradient(90deg,rgba(87,83,78,0.28),rgba(87,83,78,0))",
        tipBorder: "#57534e", tipText: "#292524", tipTextDark: "#e7e5e4",
    },
};

const FALLBACK: CardTheme = {
    name: "Clinical Blue",
    deep: "#1e3a8a", primary: "#2563eb", accent: "#93c5fd",
    paper: "#eff6ff", ink: "#1e3a8a",
    paperDark: "#0c1a3d", inkDark: "#dbeafe",
    gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#93c5fd 100%)",
    chipBg: "rgba(37,99,235,0.12)",
    chipBgDark: "rgba(147,197,253,0.18)",
    tipBg: "linear-gradient(90deg,#dbeafe,rgba(219,234,254,0))",
    tipBgDark: "linear-gradient(90deg,rgba(37,99,235,0.18),rgba(37,99,235,0))",
    tipBorder: "#2563eb", tipText: "#1e3a8a", tipTextDark: "#bfdbfe",
};

/**
 * Match a related_unit string to a theme key.
 * Order matters: check the most specific keywords first.
 */
export function getCardTheme(relatedUnit?: string | null): CardTheme {
    const u = (relatedUnit || "").toLowerCase().trim();
    if (!u) return FALLBACK;

    if (u.includes("calc") || u.includes("dosage")) return THEMES.calculations;
    if (u.includes("neurol")) return THEMES.neurology;
    if (u.includes("renal") || u.includes("nephro") || u.includes("kidney")) return THEMES.renal;
    if (u.includes("emergency") || u.includes("critical care") || u.includes("trauma")) return THEMES.emergency;
    if (u.includes("hematol") || u.includes("blood") || u.includes("coag")) return THEMES.hematology;
    if (u.includes("medical-surgical") || u.includes("med-surg") || u.includes("medsurg") || u.includes("med surg")) return THEMES.medsurg;
    if (u.includes("pharm") || u.includes("drug")) return THEMES.pharmacology;
    if (u.includes("pediatric") || u.includes("paediatric") || u.includes("child")) return THEMES.pediatric;
    if (u.includes("obstetric") || u.includes("maternal") || u.includes("newborn") || u.includes("midwif") || u.includes("labor")) return THEMES.obstetric;
    if (u.includes("psych") || u.includes("mental")) return THEMES.psychiatric;
    if (u.includes("endocrine") || u.includes("diabet") || u.includes("thyroid")) return THEMES.endocrine;
    if (u.includes("respir") || u.includes("pulmon")) return THEMES.respiratory;
    if (u.includes("cardio") || u.includes("cardiac") || u.includes("heart")) return THEMES.cardiovascular;
    if (u.includes("leader") || u.includes("delegat") || u.includes("manag")) return THEMES.leadership;
    if (u.includes("communit") || u.includes("kenya") || u.includes("public")) return THEMES.community;

    return FALLBACK;
}