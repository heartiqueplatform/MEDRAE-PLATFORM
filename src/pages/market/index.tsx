"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { TermsButton } from "@/components/ui/TermsButton";
import {
    Heart,
    Phone,
    CheckCircle,
    Trash2,
    Loader2,
    ImageIcon,
    Tag,
    Plus,
    Clock,
    ChevronLeft,
    RefreshCw,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useHomeRoute } from "@/hooks/useHomeRoute";
/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Listing {
    id: string;
    title: string;
    category: string;
    condition: string;
    price: number;
    negotiable: boolean;
    thumbnail_url: string;
    seller_name: string;
    seller_role: string;
    seller_id: string;
    seller_phone: string;
    status: string;
    is_featured: boolean;
    created_at: string;
    expires_at: string | null;
    saves_count: number;
    contact_clicks: number;
    report_count: number;
    views_count: number;
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
/*  Expiry helper                                                     */
/* ------------------------------------------------------------------ */

const getExpiryInfo = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return { label: "Expired", urgent: true, expired: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) {
        return { label: `${days}d ${hours}h left`, urgent: days <= 2, expired: false };
    }
    if (hours > 0) {
        return { label: `${hours}h ${minutes}m left`, urgent: true, expired: false };
    }
    return { label: `${minutes}m left`, urgent: true, expired: false };
};

/* ------------------------------------------------------------------ */
/*  Skeletons                                                         */
/* ------------------------------------------------------------------ */

function ListingCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden animate-pulse">
            <div className="h-44 w-full bg-slate-100 dark:bg-white/[0.06]" />
            <div className="p-3 space-y-2.5">
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-5 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex gap-2 pt-1">
                    <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export default function MarketFeed({ user }: any) {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [conditionFilter, setConditionFilter] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const home = useHomeRoute();
    useEffect(() => {
        if (user?.id) fetchSaved();
    }, [user]);

    useEffect(() => {
        fetchListings();
        if (user) fetchSaved();
    }, [categoryFilter, conditionFilter]);

    const fetchListings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("market_listings")
            .select("*");

        if (error) {
            console.error("Database Error:", error.message, error.details);
            toast.error("Failed to load listings");
            setLoading(false);
            return;
        }

        const now = new Date();
        let filtered = (data || []).filter((l) => {
            if (l.expires_at && new Date(l.expires_at) <= now) return false;
            return true;
        });

        if (categoryFilter) {
            filtered = filtered.filter((l) => l.category === categoryFilter);
        }
        if (conditionFilter) {
            filtered = filtered.filter((l) => l.condition === conditionFilter);
        }

        setListings(filtered);
        setLoading(false);
    };

    const fetchSaved = async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from("market_saves")
            .select("listing_id")
            .eq("user_id", user.id);
        setSavedIds(data?.map((s) => s.listing_id) || []);
    };

    const handleSave = async (listing: Listing, e: any) => {
        e.stopPropagation();
        if (!user?.id) {
            toast.error("Sign in to save a listing");
            return;
        }
        tap();
        const alreadySaved = savedIds.includes(listing.id);

        if (alreadySaved) {
            const { error } = await supabase
                .from("market_saves")
                .delete()
                .eq("user_id", user.id)
                .eq("listing_id", listing.id);
            if (error) return toast.error("Failed to remove from wishlist");
            await supabase
                .from("market_listings")
                .update({ saves_count: Math.max(0, listing.saves_count - 1) })
                .eq("id", listing.id);
            await supabase.from("market_activity").insert({
                listing_id: listing.id,
                user_id: user.id,
                action: "unsave",
            });
            setSavedIds(savedIds.filter((id) => id !== listing.id));
            toast.success("Removed from wishlist");
        } else {
            const { error } = await supabase
                .from("market_saves")
                .upsert(
                    { user_id: user.id, listing_id: listing.id },
                    { onConflict: ["user_id", "listing_id"], ignoreDuplicates: true }
                )
                .select();
            if (error) return toast.error("Failed to save listing");
            await supabase
                .from("market_listings")
                .update({ saves_count: listing.saves_count + 1 })
                .eq("id", listing.id);
            await supabase.from("market_activity").insert({
                listing_id: listing.id,
                user_id: user.id,
                action: "save",
            });
            setSavedIds([...savedIds, listing.id]);
            toast.success("Saved");
        }

        setListings((prev) =>
            prev.map((l) =>
                l.id === listing.id
                    ? {
                        ...l,
                        saves_count: alreadySaved
                            ? Math.max(0, l.saves_count - 1)
                            : l.saves_count + 1,
                    }
                    : l
            )
        );
    };

    const handleContact = async (listing: Listing, e: any) => {
        e.stopPropagation();
        if (!user?.id) {
            toast.error("Sign in to contact the seller");
            return;
        }
        tap();
        const { error } = await supabase
            .from("market_listings")
            .update({ contact_clicks: listing.contact_clicks + 1 })
            .eq("id", listing.id);
        if (error) return toast.error("Failed to register contact");
        await supabase.from("market_activity").insert({
            listing_id: listing.id,
            user_id: user.id,
            action: "contact",
        });
        setListings((prev) =>
            prev.map((l) =>
                l.id === listing.id
                    ? { ...l, contact_clicks: l.contact_clicks + 1 }
                    : l
            )
        );
        const phone = listing.seller_phone.replace(/\D/g, "");
        const message = encodeURIComponent(
            `Hi ${listing.seller_name}, I am interested in your "${listing.title}" listed on NursMartt. Could we discuss?`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    };

    const markSold = async (id: string, e: any, currentStatus: string) => {
        e.stopPropagation();
        tap();
        const newStatus = currentStatus === "sold" ? "active" : "sold";
        await supabase
            .from("market_listings")
            .update({ status: newStatus })
            .eq("id", id);
        toast.success(newStatus === "sold" ? "Marked as sold" : "Reverted to active");
        fetchListings();
    };

    const deleteListing = async (id: string, e: any) => {
        e.stopPropagation();
        if (!window.confirm("Delete this listing?")) return;
        tap("warning");

        const previousListings = listings;
        setListings((prev) => prev.filter((l) => l.id !== id));
        setDeletingIds((prev) => [...prev, id]);

        try {
            const { error } = await supabase
                .from("market_listings")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Supabase delete error:", error);
                toast.error("Failed to delete: " + error.message);
                setListings(previousListings);
                return;
            }
            toast.success("Listing deleted");
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("An unexpected error occurred");
            setListings(previousListings);
        } finally {
            setDeletingIds((prev) => prev.filter((d) => d !== id));
        }
    };

    const handleBack = useCallback(() => {
        tap();
        navigate(home, { replace: false });
    }, [navigate, home]);

    const hasActiveFilter = !!(categoryFilter || conditionFilter);

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
                        NursMartt
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {listings.length} active listing{listings.length === 1 ? "" : "s"}
                    </p>
                </div>
                <button
                    onClick={() => {
                        tap();
                        navigate("/market/my-listings");
                    }}
                    className="h-9 px-3 rounded-xl
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200
                               text-[11px] font-bold shrink-0
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    My listings
                </button>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Filter row */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-1">
                            <Select
                                value={categoryFilter || "all"}
                                onValueChange={(v) => {
                                    tap();
                                    setCategoryFilter(v === "all" ? null : v);
                                }}
                            >
                                <SelectTrigger className="h-10 rounded-xl border-0
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-[11px] font-bold
                                   text-slate-700 dark:text-slate-200
                                   px-2.5">
                                    <SelectValue placeholder="All categories" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl
                                  bg-white dark:bg-[#161b22]
                                  border-slate-200/70 dark:border-white/[0.06]">
                                    <SelectItem value="all" className="text-[12px] font-semibold">
                                        All categories
                                    </SelectItem>
                                    <SelectItem value="textbook" className="text-[12px] font-semibold">
                                        Textbook
                                    </SelectItem>
                                    <SelectItem value="equipment" className="text-[12px] font-semibold">
                                        Equipment
                                    </SelectItem>
                                    <SelectItem value="uniform" className="text-[12px] font-semibold">
                                        Uniform
                                    </SelectItem>
                                    <SelectItem value="hostel_item" className="text-[12px] font-semibold">
                                        Hostel item
                                    </SelectItem>
                                    <SelectItem value="nck_material" className="text-[12px] font-semibold">
                                        NCK material
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={conditionFilter || "all"}
                                onValueChange={(v) => {
                                    tap();
                                    setConditionFilter(v === "all" ? null : v);
                                }}
                            >
                                <SelectTrigger className="h-10 rounded-xl border-0
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-[11px] font-bold
                                   text-slate-700 dark:text-slate-200
                                   px-2.5">
                                    <SelectValue placeholder="Any condition" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl
                                  bg-white dark:bg-[#161b22]
                                  border-slate-200/70 dark:border-white/[0.06]">
                                    <SelectItem value="all" className="text-[12px] font-semibold">
                                        Any condition
                                    </SelectItem>
                                    <SelectItem value="new" className="text-[12px] font-semibold">
                                        New
                                    </SelectItem>
                                    <SelectItem value="like_new" className="text-[12px] font-semibold">
                                        Like new
                                    </SelectItem>
                                    <SelectItem value="good" className="text-[12px] font-semibold">
                                        Good
                                    </SelectItem>
                                    <SelectItem value="fair" className="text-[12px] font-semibold">
                                        Fair
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasActiveFilter && (
                            <button
                                onClick={() => {
                                    tap();
                                    setCategoryFilter(null);
                                    setConditionFilter(null);
                                }}
                                className="h-10 px-3 rounded-xl
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-600 dark:text-slate-300
                                           text-[11px] font-bold shrink-0
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Sell CTA */}
                    <button
                        onClick={() => {
                            tap("success");
                            navigate("/market/create");
                        }}
                        className="w-full h-11 rounded-xl
                                   bg-blue-600 text-white
                                   text-sm font-bold
                                   flex items-center justify-center gap-2
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Plus className="h-4 w-4" />
                        Sell an item
                    </button>

                    {/* Listings */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[...Array(4)].map((_, i) => (
                                <ListingCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center space-y-3">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto">
                                <Tag className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {hasActiveFilter
                                        ? "No matches"
                                        : "No listings yet"}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    {hasActiveFilter
                                        ? "Try adjusting your filters or clear them to see everything."
                                        : "Be the first to list something for sale."}
                                </p>
                            </div>
                            {!hasActiveFilter && (
                                <button
                                    onClick={() => {
                                        tap("success");
                                        navigate("/market/create");
                                    }}
                                    className="h-10 px-4 rounded-xl
                                               bg-blue-600 text-white
                                               text-[12px] font-bold
                                               active:scale-[0.97] transition-transform
                                               inline-flex items-center gap-1.5"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Post first listing
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {listings.map((l) => {
                                const isOwner = user?.id === l.seller_id;
                                const isSaved = savedIds.includes(l.id);
                                const expiry = getExpiryInfo(l.expires_at);
                                const isDeleting = deletingIds.includes(l.id);

                                return (
                                    <article
                                        key={l.id}
                                        className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                                    >
                                        {/* Image */}
                                        <button
                                            onClick={() => {
                                                tap();
                                                navigate(`/market/${l.id}`);
                                            }}
                                            className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-white/[0.06] block"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {l.thumbnail_url ? (
                                                <img
                                                    src={l.thumbnail_url}
                                                    className="h-full w-full object-cover"
                                                    alt={l.title}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1.5">
                                                    <ImageIcon className="h-7 w-7" />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">
                                                        No image
                                                    </span>
                                                </div>
                                            )}

                                            {/* Status badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                {l.is_featured && (
                                                    <span className="bg-amber-500 text-white
                                                                     text-[9px] font-bold uppercase tracking-wider
                                                                     px-2 py-0.5 rounded-full">
                                                        Featured
                                                    </span>
                                                )}
                                                {l.status === "sold" && (
                                                    <span className="bg-rose-600 text-white
                                                                     text-[9px] font-bold uppercase tracking-wider
                                                                     px-2 py-0.5 rounded-full">
                                                        Sold
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expiry */}
                                            {expiry && !expiry.expired && (
                                                <div className="absolute top-2 right-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1
                                                                    text-[9px] font-bold uppercase tracking-wider
                                                                    px-2 py-0.5 rounded-full
                                                                    ${expiry.urgent
                                                                ? "bg-rose-600/90 text-white"
                                                                : "bg-black/60 text-white"
                                                            }`}
                                                    >
                                                        <Clock className="h-2.5 w-2.5" />
                                                        {expiry.label}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Category */}
                                            <div className="absolute bottom-2 right-2">
                                                <span className="bg-black/60 text-white
                                                                 text-[9px] font-bold uppercase tracking-wider
                                                                 px-2 py-0.5 rounded-full">
                                                    {l.category.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Content */}
                                        <div className="p-3 space-y-2.5">
                                            {/* Title + condition */}
                                            <div>
                                                <button
                                                    onClick={() => {
                                                        tap();
                                                        navigate(`/market/${l.id}`);
                                                    }}
                                                    className="w-full text-left"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    <h3 className="text-[14px] font-bold
                                                                   text-slate-900 dark:text-white
                                                                   leading-snug line-clamp-2">
                                                        {l.title}
                                                    </h3>
                                                </button>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-[15px] font-bold
                                                                  text-slate-900 dark:text-white tabular-nums">
                                                        <span className="text-[10px] font-bold
                                                                         text-slate-500 dark:text-slate-400
                                                                         uppercase tracking-wider mr-1">
                                                            KES
                                                        </span>
                                                        {Number(l.price).toLocaleString()}
                                                        {l.negotiable && (
                                                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider
                                                                             text-emerald-600 dark:text-emerald-400">
                                                                Negotiable
                                                            </span>
                                                        )}
                                                    </p>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider
                                                                     bg-slate-100 dark:bg-white/[0.06]
                                                                     text-slate-600 dark:text-slate-300
                                                                     px-1.5 py-0.5 rounded-full">
                                                        {l.condition.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Seller */}
                                            <div className="flex items-center gap-2 p-2 rounded-xl
                                                            bg-slate-50 dark:bg-[#0d1117]">
                                                <div className="h-7 w-7 rounded-full
                                                                bg-blue-100 dark:bg-blue-400/10
                                                                flex items-center justify-center
                                                                text-blue-600 dark:text-blue-400
                                                                text-[10px] font-bold shrink-0">
                                                    {l.seller_name?.[0] || "?"}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                        {l.seller_name}
                                                    </p>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider
                                                                  text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        {l.seller_role}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stats strip */}
                                            <div className="grid grid-cols-4 gap-1
                                                            text-[9px] font-bold uppercase tracking-wider
                                                            text-slate-500 dark:text-slate-400">
                                                <Stat label="Views" value={l.views_count} />
                                                <Stat label="Saves" value={l.saves_count} />
                                                <Stat label="Contact" value={l.contact_clicks} />
                                                <Stat label="Reports" value={l.report_count} tone="rose" />
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1.5 pt-1">
                                                {!isOwner && (
                                                    <>
                                                        <button
                                                            onClick={(e) => handleSave(l, e)}
                                                            className={`flex-1 h-10 rounded-xl
                                                                        text-[12px] font-bold
                                                                        flex items-center justify-center gap-1.5
                                                                        active:scale-[0.97] transition-transform
                                                                        ${isSaved
                                                                    ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                                                                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200"
                                                                }`}
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <Heart
                                                                className="h-3.5 w-3.5"
                                                                fill={isSaved ? "currentColor" : "none"}
                                                                strokeWidth={2.25}
                                                            />
                                                            {isSaved ? "Saved" : "Save"}
                                                        </button>

                                                        <button
                                                            onClick={(e) => handleContact(l, e)}
                                                            className="flex-1 h-10 rounded-xl
                                                                       bg-emerald-600 text-white
                                                                       text-[12px] font-bold
                                                                       flex items-center justify-center gap-1.5
                                                                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <Phone className="h-3.5 w-3.5" />
                                                            Chat
                                                        </button>
                                                    </>
                                                )}

                                                {isOwner && (
                                                    <>
                                                        <button
                                                            onClick={(e) => markSold(l.id, e, l.status)}
                                                            className={`flex-1 h-10 rounded-xl
                                                                        text-[12px] font-bold text-white
                                                                        flex items-center justify-center gap-1.5
                                                                        active:scale-[0.97] transition-transform
                                                                        ${l.status === "sold"
                                                                    ? "bg-slate-600"
                                                                    : "bg-blue-600"
                                                                }`}
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                            {l.status === "sold" ? "Sold" : "Mark sold"}
                                                        </button>

                                                        <button
                                                            onClick={(e) => deleteListing(l.id, e)}
                                                            disabled={isDeleting}
                                                            className="h-10 w-10 rounded-xl
                                                                       bg-rose-50 dark:bg-rose-400/10
                                                                       text-rose-700 dark:text-rose-400
                                                                       flex items-center justify-center
                                                                       active:scale-[0.92] transition-transform
                                                                       disabled:opacity-60"
                                                            style={{ touchAction: "manipulation" }}
                                                            aria-label="Delete listing"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <div className="pt-2 flex justify-center">
                        <TermsButton />
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Stat                                                              */
/* ------------------------------------------------------------------ */

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: "rose";
}) {
    return (
        <div className="flex flex-col items-center text-center">
            <span
                className={`text-[12px] font-bold tabular-nums leading-none mb-0.5 ${tone === "rose"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-white"
                    }`}
            >
                {value}
            </span>
            <span className="leading-none">{label}</span>
        </div>
    );
}