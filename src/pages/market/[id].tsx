"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import {
    ChevronLeft,
    CheckCircle,
    Heart,
    Info,
    Phone,
    ShieldAlert,
    X,
} from "lucide-react";
import { CenteredModal } from "@/components/ui/CenteredModal";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Listing {
    id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    price: number;
    negotiable: boolean;
    currency: string;
    thumbnail_url: string;
    image_urls: string[];
    seller_name: string;
    seller_role: string;
    seller_phone: string;
    seller_avatar: string;
    status: string;
    is_featured: boolean;
    created_at: string;
    views_count?: number;
    saves_count?: number;
    contact_clicks?: number;
}

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function DetailSkeleton({ onBack }: { onBack: () => void }) {
    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            <Header onBack={onBack} title="Listing" subtitle="Loading…" />

            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom animate-pulse">
                    {/* Image */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        <div className="aspect-square w-full bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="flex gap-1.5 p-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-white/[0.06]"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Price card */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-5 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-7 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                        </div>
                    </div>

                    {/* Description card */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                        <div className="h-4 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3 w-full rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="h-3 w-4/6 rounded bg-slate-100 dark:bg-white/[0.06]" />
                    </div>

                    {/* Seller card */}
                    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                            <div className="space-y-1.5">
                                <div className="h-4 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                                <div className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function ListingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [reported, setReported] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);

    useEffect(() => {
        const checkUserActions = async () => {
            if (!user?.id || !listing?.id) return;
            const { data: savedData } = await supabase
                .from("market_saves")
                .select("id")
                .eq("user_id", user.id)
                .eq("listing_id", listing.id)
                .maybeSingle();
            setSaved(!!savedData);

            const { data: reportData } = await supabase
                .from("market_reports")
                .select("id")
                .eq("reporter_id", user.id)
                .eq("listing_id", listing.id)
                .maybeSingle();
            setReported(!!reportData);
        };
        checkUserActions();
    }, [user, listing]);

    useEffect(() => {
        if (id) fetchListing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchListing = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("market_listings")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data) {
                toast.error("Listing not found or expired.");
                navigate("/market");
                return;
            }

            const expired =
                data.status !== "active" ||
                (data.expires_at && new Date(data.expires_at) < new Date());
            if (expired) {
                toast.error("This listing has expired or been removed.");
                navigate("/market");
                return;
            }

            if (data.image_urls && data.image_urls.length > 0) {
                setActiveImage(data.image_urls[0]);
            } else {
                setActiveImage(data.thumbnail_url);
            }
            setListing(data);

            if (user?.id && data?.id) {
                const { data: savedData } = await supabase
                    .from("market_saves")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("listing_id", data.id)
                    .maybeSingle();
                if (savedData) setSaved(true);

                const { data: reportData } = await supabase
                    .from("market_reports")
                    .select("id")
                    .eq("reporter_id", user.id)
                    .eq("listing_id", data.id)
                    .maybeSingle();
                if (reportData) setReported(true);
            }

            await supabase
                .from("market_listings")
                .update({ views_count: (data.views_count || 0) + 1 })
                .eq("id", id);

            await supabase.from("market_activity").insert({
                listing_id: id,
                user_id: user?.id || null,
                action: "view",
            });
        } catch (err) {
            console.error(err);
            toast.error("Failed to load listing.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!listing || !user?.id) return;
        tap();
        setSaving(true);
        try {
            const { error } = await supabase
                .from("market_saves")
                .insert({ user_id: user.id, listing_id: listing.id })
                .select();

            if (error) throw error;
            setSaved(true);
            toast.success("Saved to your wishlist");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save listing.");
        } finally {
            setSaving(false);
        }
    };

    const handleContact = async () => {
        if (!listing) return;
        if (!user?.id) {
            toast.error("Sign in to contact the seller");
            return;
        }
        if (!listing.seller_phone) {
            toast.error("Seller has not provided a phone number.");
            return;
        }
        tap("success");

        try {
            const { error } = await supabase
                .from("market_listings")
                .update({ contact_clicks: (listing.contact_clicks || 0) + 1 })
                .eq("id", listing.id);
            if (error) {
                toast.error("Failed to register contact");
                return;
            }
            await supabase.from("market_activity").insert({
                listing_id: listing.id,
                user_id: user.id,
                action: "contact",
            });

            setListing({
                ...listing,
                contact_clicks: (listing.contact_clicks || 0) + 1,
            });

            const phone = listing.seller_phone.replace(/\D/g, "");
            const message = encodeURIComponent(
                `Hi ${listing.seller_name}, I am interested in your "${listing.title}" listed on NursMartt. Could we discuss?`
            );
            window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
        } catch (err) {
            console.error(err);
            toast.error("Failed to contact seller.");
        }
    };

    const handleReport = async () => {
        if (!listing || !user?.id) return;
        const reason = prompt("Why are you reporting this listing?");
        if (!reason) return;
        tap("warning");
        setReporting(true);
        try {
            await supabase.from("market_reports").insert({
                reporter_id: user.id,
                listing_id: listing.id,
                reason,
            });
            setReported(true);
            toast.success("Report submitted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to report.");
        } finally {
            setReporting(false);
        }
    };

    const handleBack = () => {
        tap();
        navigate("/dashboard", { replace: true });
    };

    if (loading || !listing) return <DetailSkeleton onBack={handleBack} />;

    const allImages =
        listing.image_urls && listing.image_urls.length > 0
            ? listing.image_urls
            : [listing.thumbnail_url].filter(Boolean);

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Back to dashboard"
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
                        {listing.title}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate tabular-nums">
                        {listing.currency} {Number(listing.price).toLocaleString()}
                        {listing.negotiable && " · Negotiable"}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    aria-label="Save listing"
                    className={`h-10 w-10 rounded-full flex items-center justify-center
                                active:scale-[0.92] transition-transform shrink-0
                                ${saved
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-300"}`}
                    style={{ touchAction: "manipulation" }}
                >
                    <Heart className="h-5 w-5" fill={saved ? "currentColor" : "none"} strokeWidth={2.25} />
                </button>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Image card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        <button
                            onClick={() => {
                                tap();
                                setFullscreenImage(activeImage || listing.thumbnail_url);
                            }}
                            className="relative w-full aspect-square
                                       bg-slate-100 dark:bg-white/[0.03]
                                       flex items-center justify-center"
                            style={{ touchAction: "manipulation" }}
                            aria-label="View full-size image"
                        >
                            <img
                                src={activeImage || listing.thumbnail_url}
                                alt={listing.title}
                                className="w-full h-full object-contain"
                            />

                            {listing.is_featured && (
                                <span className="absolute top-3 left-3
                                                 bg-amber-500 text-white
                                                 text-[9px] font-bold uppercase tracking-wider
                                                 px-2 py-0.5 rounded-full">
                                    Featured
                                </span>
                            )}
                        </button>

                        {allImages.length > 1 && (
                            <div className="flex gap-1.5 p-2 overflow-x-auto no-scrollbar">
                                {allImages.map((url, idx) => {
                                    const active = activeImage === url;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                tap();
                                                setActiveImage(url);
                                            }}
                                            className={`relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden
                                                        transition-all
                                                        ${active
                                                    ? "ring-2 ring-blue-600 dark:ring-blue-400"
                                                    : "opacity-70"}`}
                                            style={{ touchAction: "manipulation" }}
                                            aria-label={`View image ${idx + 1}`}
                                        >
                                            <img
                                                src={url}
                                                className="w-full h-full object-cover"
                                                alt={`Image ${idx + 1}`}
                                                loading="lazy"
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Price card */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400 leading-none mb-1">
                                    {listing.category.replace(/_/g, " ")}
                                </p>
                                <h2 className="text-[16px] font-bold
                                               text-slate-900 dark:text-white
                                               leading-snug">
                                    {listing.title}
                                </h2>
                            </div>
                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider
                                             bg-slate-100 dark:bg-white/[0.06]
                                             text-slate-600 dark:text-slate-300
                                             px-2 py-1 rounded-full">
                                {listing.condition.replace(/_/g, " ")}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold
                                             text-slate-900 dark:text-white tabular-nums">
                                <span className="text-[11px] font-bold uppercase tracking-wider
                                                 text-slate-500 dark:text-slate-400 mr-1">
                                    {listing.currency}
                                </span>
                                {Number(listing.price).toLocaleString()}
                            </span>
                            {listing.negotiable && (
                                <span className="inline-flex items-center gap-1
                                                 text-[10px] font-bold uppercase tracking-wider
                                                 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle className="h-3 w-3" />
                                    Negotiable
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleContact}
                            className="w-full h-11 rounded-xl
                                       bg-emerald-600 text-white
                                       text-sm font-bold
                                       flex items-center justify-center gap-2
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Phone className="h-4 w-4" />
                            Contact seller
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving || saved}
                                className={`h-10 rounded-xl
                                            text-[12px] font-bold
                                            flex items-center justify-center gap-1.5
                                            active:scale-[0.97] transition-transform
                                            disabled:cursor-default
                                            ${saved
                                        ? "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400"
                                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"}`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <Heart className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} strokeWidth={2.25} />
                                {saving ? "Saving…" : saved ? "Saved" : "Save"}
                            </button>

                            <button
                                onClick={handleReport}
                                disabled={reporting || reported}
                                className={`h-10 rounded-xl
                                            text-[12px] font-bold
                                            flex items-center justify-center gap-1.5
                                            active:scale-[0.97] transition-transform
                                            disabled:cursor-default
                                            ${reported
                                        ? "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500"
                                        : "bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400"}`}
                                style={{ touchAction: "manipulation" }}
                            >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                {reporting ? "…" : reported ? "Reported" : "Report"}
                            </button>
                        </div>
                    </section>

                    {/* Description */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400">
                            Description
                        </p>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300
                                      leading-relaxed whitespace-pre-wrap">
                            {listing.description}
                        </p>
                    </section>

                    {/* Seller */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-slate-500 dark:text-slate-400">
                            Seller
                        </p>

                        <div className="flex items-center gap-3">
                            {listing.seller_avatar ? (
                                <img
                                    src={listing.seller_avatar}
                                    className="h-12 w-12 rounded-xl object-cover shrink-0
                                               ring-2 ring-slate-200 dark:ring-white/[0.08]"
                                    alt={listing.seller_name}
                                />
                            ) : (
                                <div className="h-12 w-12 rounded-xl
                                                bg-blue-100 dark:bg-blue-400/10
                                                flex items-center justify-center
                                                text-blue-600 dark:text-blue-400
                                                text-base font-bold shrink-0">
                                    {listing.seller_name?.[0] || "?"}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                                    {listing.seller_name}
                                </p>
                                <p className="text-[11px] font-bold uppercase tracking-wider
                                              text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                    {listing.seller_role}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5
                                        text-[10px] font-bold uppercase tracking-wider
                                        text-slate-500 dark:text-slate-400">
                            <Info className="h-3 w-3" />
                            Verified student / nurse professional
                        </div>
                    </section>

                    <div className="pt-2 flex justify-center">
                        <TermsButton />
                    </div>
                </div>
            </main>

            {/* ── Fullscreen image viewer — CenteredModal ──────── */}
            <CenteredModal
                open={!!fullscreenImage}
                onClose={() => setFullscreenImage(null)}
                hideHeader
                noScrollBody
                maxWidthClass="max-w-2xl"
                maxHeight="92dvh"
                className="bg-black dark:bg-black"
            >
                <div className="relative flex-1 flex items-center justify-center p-2">
                    <button
                        onClick={() => {
                            tap();
                            setFullscreenImage(null);
                        }}
                        aria-label="Close image"
                        className="absolute top-2 right-2 z-10
                                   h-10 w-10 rounded-full
                                   bg-white/[0.12] text-white
                                   flex items-center justify-center
                                   active:scale-[0.92] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    {fullscreenImage && (
                        <img
                            src={fullscreenImage}
                            alt="Full size"
                            className="max-w-full max-h-[85dvh] object-contain rounded-lg"
                        />
                    )}
                </div>
            </CenteredModal>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

function Header({
    onBack,
    title,
    subtitle,
}: {
    onBack: () => void;
    title: string;
    subtitle: string;
}) {
    return (
        <header className="shrink-0 flex items-center gap-2 px-2 h-14
                           bg-white dark:bg-[#0d1117]
                           border-b border-slate-200/70 dark:border-white/[0.06]
                           z-30 safe-top">
            <button
                onClick={onBack}
                aria-label="Back to dashboard"
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
                    {subtitle}
                </p>
            </div>
        </header>
    );
}