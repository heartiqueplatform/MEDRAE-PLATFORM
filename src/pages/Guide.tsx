import { useSearchParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { HELP_GUIDES } from "@/data/helpGuides";

/* ============================================================
   HERO IMAGES — one per guide, hardcoded from Unsplash.
   Swap any URL later without touching the layout.
   ============================================================ */
const GUIDE_IMAGES: Record<string, { url: string; alt: string }> = {
    HELP01: {
        url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80&auto=format&fit=crop",
        alt: "Student studying with books and notes",
    },
    HELP02: {
        url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80&auto=format&fit=crop",
        alt: "Person using a laptop to study online",
    },
    HELP03: {
        url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80&auto=format&fit=crop",
        alt: "Student writing an exam at a desk",
    },
    HELP04: {
        url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop",
        alt: "Nurse in scrubs preparing for NCLEX",
    },
    HELP05: {
        url: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=1200&q=80&auto=format&fit=crop",
        alt: "Clock and notebook — exam day timing",
    },
};

const FALLBACK_IMAGE = {
    url: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=1200&q=80&auto=format&fit=crop",
    alt: "Open book on a desk",
};

export default function Guide() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const code = params.get("unit") ?? "";
    const guide = HELP_GUIDES[code];

    if (!guide) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
                <p className="text-gray-500">Guide not found.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-3 text-blue-600 font-medium hover:underline"
                >
                    Go back
                </button>
            </div>
        );
    }

    const hero = GUIDE_IMAGES[guide.code] ?? FALLBACK_IMAGE;

    return (
        <div className="min-h-screen w-full bg-white dark:bg-transparent">
            {/* ============================================
          HERO — image with overlaid title
          ============================================ */}
            <div className="relative w-full h-56 sm:h-72 overflow-hidden">
                <img
                    src={hero.url}
                    alt={hero.alt}
                    loading="eager"
                    className="h-full w-full object-cover"
                />
                {/* dark gradient so text is readable on any image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Back"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 max-w-2xl mx-auto">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        {guide.code}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                        {guide.title}
                    </h1>
                    {guide.subtitle && (
                        <p className="text-sm text-white/80 mt-1.5 leading-snug">
                            {guide.subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* ============================================
          BODY — the written content
          ============================================ */}
            <article className="max-w-2xl mx-auto px-4 py-6 space-y-8 bg-white dark:bg-muted/40">
                {guide.sections.map((section, i) => (
                    <section key={i} className="space-y-3">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            {section.heading}
                        </h2>

                        {section.paragraphs?.map((p, j) => (
                            <p
                                key={j}
                                className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300"
                            >
                                {p}
                            </p>
                        ))}

                        {section.bullets && (
                            <ul className="space-y-1.5 pl-5 list-disc text-[15px] text-gray-700 dark:text-gray-300">
                                {section.bullets.map((b, j) => (
                                    <li key={j}>{b}</li>
                                ))}
                            </ul>
                        )}

                        {section.numbered && (
                            <ol className="space-y-1.5 pl-5 list-decimal text-[15px] text-gray-700 dark:text-gray-300">
                                {section.numbered.map((n, j) => (
                                    <li key={j}>{n}</li>
                                ))}
                            </ol>
                        )}

                        {section.tip && (
                            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-200">
                                <span className="font-bold">Tip: </span>
                                {section.tip}
                            </div>
                        )}
                    </section>
                ))}

                <div className="pt-6 pb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        Back to Help
                    </button>
                </div>
            </article>
        </div>
    );
}