import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import {
    ChevronLeft,
    FileText,
    AlertTriangle,
    ShieldCheck,
    Mail,
    MessageSquare,
    MapPin,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function PlacementDetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <Header onBack={onBack} title="Loading…" />

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom animate-pulse">
                    {/* Identity card */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-center space-y-3">
                        <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/[0.06] mx-auto" />
                        <div className="h-4 w-40 rounded bg-slate-100 dark:bg-white/[0.06] mx-auto" />
                        <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/[0.06] mx-auto" />
                    </div>

                    {/* Rules card */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-3 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-3 w-4/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                        <div className="h-20 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04] space-y-1">
                            <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-4 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

const PlacementDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [site, setSite] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            survivalApi
                .getPlacementById(id)
                .then(setSite)
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleBack = () => {
        tap();
        navigate(-1);
    };

    if (loading) {
        return <PlacementDetailSkeleton onBack={handleBack} />;
    }

    const contact = site?.supervisor_contact || "";
    const isEmail = contact.includes("@");
    const contactLink = isEmail
        ? `mailto:${contact}`
        : `https://wa.me/${contact.replace(/\s/g, "")}`;

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <Header onBack={handleBack} title="Clinical intake rules" />

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Hospital identity */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-center space-y-3">
                        <div className="h-14 w-14 rounded-full
                                        bg-blue-50 dark:bg-blue-400/10
                                        flex items-center justify-center mx-auto">
                            <ShieldCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-blue-600 dark:text-blue-400 leading-none mb-1">
                                Placement site
                            </p>
                            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white
                                           leading-snug">
                                {site?.hospital_name}
                            </h2>
                            <p className="inline-flex items-center gap-1 mt-1.5
                                          text-[11px] text-slate-500 dark:text-slate-400
                                          tabular-nums">
                                <MapPin className="h-3 w-3" />
                                {site?.county} · {site?.location}
                            </p>
                        </div>
                    </section>

                    {/* Rules */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg
                                            bg-amber-50 dark:bg-amber-400/10
                                            flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-amber-700 dark:text-amber-400 leading-none mb-1">
                                    Intake
                                </p>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    Requirements & rules
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400
                                                     shrink-0 mt-0.5" strokeWidth={2.25} />
                            <p className="text-[12px] text-slate-600 dark:text-slate-400
                                          leading-relaxed">
                                The following information has been provided for
                                students planning to rotate at this facility:
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                            <p className="text-[12px] text-slate-700 dark:text-slate-300
                                          italic leading-relaxed whitespace-pre-wrap">
                                {site?.intake_notes ||
                                    "No specific rules provided. Please contact the supervisor for clinical induction details."}
                            </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 leading-none mb-1.5">
                                Wards & specialties
                            </p>
                            <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400
                                          leading-snug">
                                {site?.ward_specialties}
                            </p>
                        </div>
                    </section>

                    {/* CTA */}
                    <div className="space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400 text-center">
                            Contact supervisor to confirm
                        </p>
                        <a
                            href={contactLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => tap()}
                            className="w-full h-11 rounded-xl
                                       bg-blue-600 text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-2
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            {isEmail ? (
                                <Mail className="h-4 w-4" strokeWidth={2.25} />
                            ) : (
                                <MessageSquare className="h-4 w-4" strokeWidth={2.25} />
                            )}
                            Send official inquiry
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PlacementDetailPage;

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

function Header({
    onBack,
    title,
}: {
    onBack: () => void;
    title: string;
}) {
    return (
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30 safe-top">
            <button
                onClick={onBack}
                aria-label="Go back"
                className="h-10 w-10 rounded-full flex items-center justify-center
                           text-slate-700 dark:text-slate-200
                           active:bg-slate-100 dark:active:bg-white/5"
                style={{ touchAction: "manipulation" }}
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold leading-tight truncate
                               text-slate-900 dark:text-white">
                    {title}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                    Placement site details
                </p>
            </div>
        </header>
    );
}