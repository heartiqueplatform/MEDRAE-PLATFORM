"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import {
    ChevronLeft,
    Loader2,
    Package,
    Plus,
    Trash2,
    Pencil,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Listing {
    id: string;
    title: string;
    category: string;
    condition: string;
    price: number;
    currency?: string;
    thumbnail_url?: string;
    status: string;
    expires_at?: string | null;
    created_at: string;
}

type Tab = "active" | "sold" | "expired";

const PAGE_SIZE = 30;

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

function ListingCardSkeleton() {
    return (
        <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden animate-pulse">
            <div className="h-44 w-full bg-slate-100 dark:bg-white/[0.06]" />
            <div className="p-3 space-y-2.5">
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="h-5 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
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

export default function MyListings() {
    const user = useUser();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>("active");
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) {
            setListings([]);
            setLoading(false);
            setHasMore(false);
            return;
        }
        fetchListings(user.id, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, activeTab]);

    const fetchListings = async (userId: string, reset: boolean = false) => {
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const currentOffset = reset ? 0 : listings.length;
            const now = new Date().toISOString();

            let query = supabase
                .from("market_listings")
                .select(
                    `
                    id,
                    title,
                    category,
                    condition,
                    price,
                    currency,
                    thumbnail_url,
                    status,
                    expires_at,
                    created_at
                `
                )
                .eq("seller_id", userId)
                .order("created_at", { ascending: false })
                .range(currentOffset, currentOffset + PAGE_SIZE - 1);

            if (activeTab === "active") {
                query = query
                    .eq("status", "active")
                    .or(`expires_at.is.null,expires_at.gt.${now}`);
            }
            if (activeTab === "sold") {
                query = query.eq("status", "sold");
            }
            if (activeTab === "expired") {
                query = query.or(`status.neq.active,expires_at.lte.${now}`);
            }

            const { data, error } = await query;
            if (error) throw error;

            const newListings = (data ?? []) as Listing[];

            if (reset) {
                setListings(newListings);
            } else {
                setListings((current) => [...current, ...newListings]);
            }
            setHasMore(newListings.length === PAGE_SIZE);
        } catch (error) {
            console.error("fetchListings:", error);
            if (reset) setListings([]);
            toast.error("Failed to load your listings.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = async () => {
        if (!user?.id || loadingMore || !hasMore) return;
        tap();
        await fetchListings(user.id, false);
    };

    const goToListing = (id: string) => {
        tap();
        navigate(`/market/${id}`);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) {
            toast.error("You must be signed in.");
            return;
        }
        if (deletingId) return;

        tap("warning");
        if (!window.confirm("Delete this listing?")) return;

        const deletedListing = listings.find((l) => l.id === id);
        if (!deletedListing) return;

        setDeletingId(id);
        setListings((current) => current.filter((l) => l.id !== id));

        try {
            const { error } = await supabase
                .from("market_listings")
                .delete()
                .eq("id", id)
                .eq("seller_id", user.id);
            if (error) throw error;
            toast.success("Listing deleted");
        } catch (error) {
            console.error("deleteListing:", error);
            setListings((current) => {
                const alreadyExists = current.some((l) => l.id === id);
                if (alreadyExists) return current;
                return [...current, deletedListing].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
            });
            toast.error("Could not delete listing. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleRepost = (listing: Listing, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) {
            toast.error("You must be signed in.");
            return;
        }
        tap();
        navigate(`/market/edit/${listing.id}`);
    };

    const handleBack = () => {
        tap();
        navigate("/dashboard", { replace: true });
    };

    const TABS: Tab[] = ["active", "sold", "expired"];

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
                        My listings
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {listings.length} {activeTab} listing
                        {listings.length === 1 ? "" : "s"}
                    </p>
                </div>
                <button
                    onClick={() => {
                        tap("success");
                        navigate("/market/create");
                    }}
                    className="h-9 px-3 rounded-xl
                               bg-blue-600 text-white
                               text-[11px] font-bold shrink-0
                               active:scale-[0.97] transition-transform
                               flex items-center gap-1"
                    style={{ touchAction: "manipulation" }}
                >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    New
                </button>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 space-y-3 safe-bottom">
                    {/* Tabs */}
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl
                                    bg-slate-100 dark:bg-white/[0.06]">
                        {TABS.map((tab) => {
                            const active = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        tap();
                                        setActiveTab(tab);
                                    }}
                                    className={`h-8 rounded-lg
                                                text-[11px] font-bold
                                                transition-colors
                                                ${active
                                            ? "bg-white dark:bg-[#161b22] text-slate-900 dark:text-white"
                                            : "text-slate-500 dark:text-slate-400"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            );
                        })}
                    </div>

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
                                <Package className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    No {activeTab} listings
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] mx-auto leading-snug">
                                    You don't have any items currently marked as {activeTab}.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    tap("success");
                                    navigate("/market/create");
                                }}
                                className="h-10 px-4 rounded-xl
                                           bg-blue-600 text-white
                                           text-[12px] font-bold
                                           inline-flex items-center gap-1.5
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Create your first listing
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {listings.map((l) => {
                                    const isDeleting = deletingId === l.id;
                                    return (
                                        <div
                                            key={l.id}
                                            onClick={() => goToListing(l.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    goToListing(l.id);
                                                }
                                            }}
                                            className="rounded-2xl bg-white dark:bg-[#161b22]
                                                       overflow-hidden cursor-pointer
                                                       active:scale-[0.995] transition-transform
                                                       focus:outline-none"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            {/* Image */}
                                            <div className="relative aspect-[4/3] w-full
                                                            bg-slate-100 dark:bg-white/[0.06]
                                                            overflow-hidden">
                                                {l.thumbnail_url ? (
                                                    <img
                                                        src={l.thumbnail_url}
                                                        className="h-full w-full object-cover"
                                                        alt={l.title}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex flex-col items-center justify-center
                                                                    text-slate-400 dark:text-slate-500 gap-1.5">
                                                        <Package className="h-7 w-7" />
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">
                                                            No image
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Status badge */}
                                                <span
                                                    className={`absolute top-2 right-2
                                                                inline-flex items-center
                                                                text-[9px] font-bold uppercase tracking-wider
                                                                px-2 py-0.5 rounded-full
                                                                ${activeTab === "active"
                                                            ? "bg-emerald-600 text-white"
                                                            : activeTab === "sold"
                                                                ? "bg-slate-600 text-white"
                                                                : "bg-rose-600 text-white"
                                                        }`}
                                                >
                                                    {activeTab}
                                                </span>
                                            </div>

                                            {/* Details */}
                                            <div className="p-3 space-y-2.5">
                                                <div>
                                                    <h3 className="text-[14px] font-bold
                                                                   text-slate-900 dark:text-white
                                                                   leading-snug line-clamp-2">
                                                        {l.title}
                                                    </h3>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider
                                                                  text-slate-500 dark:text-slate-400 mt-1">
                                                        {l.category.replace(/_/g, " ")} ·{" "}
                                                        {l.condition.replace(/_/g, " ")}
                                                    </p>
                                                </div>

                                                <p className="text-[15px] font-bold
                                                              text-slate-900 dark:text-white tabular-nums">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider
                                                                     text-slate-500 dark:text-slate-400 mr-1">
                                                        {l.currency || "KES"}
                                                    </span>
                                                    {Number(l.price).toLocaleString()}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex gap-1.5 pt-1">
                                                    {activeTab !== "active" && (
                                                        <button
                                                            onClick={(e) => handleRepost(l, e)}
                                                            className="flex-1 h-10 rounded-xl
                                                                       bg-blue-50 dark:bg-blue-400/10
                                                                       text-blue-700 dark:text-blue-400
                                                                       text-[12px] font-bold
                                                                       flex items-center justify-center gap-1.5
                                                                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Repost
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={(e) => handleDelete(l.id, e)}
                                                        disabled={isDeleting}
                                                        className="h-10 px-3 rounded-xl
                                                                   bg-rose-50 dark:bg-rose-400/10
                                                                   text-rose-700 dark:text-rose-400
                                                                   text-[12px] font-bold
                                                                   flex items-center justify-center gap-1.5
                                                                   active:scale-[0.97] transition-transform
                                                                   disabled:opacity-60 disabled:cursor-wait"
                                                        style={{ touchAction: "manipulation" }}
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                        {isDeleting ? "Removing…" : "Delete"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Load more */}
                            {hasMore && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        className="h-10 px-4 rounded-xl
                                                   bg-slate-100 dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-[12px] font-bold
                                                   flex items-center justify-center gap-1.5
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-60"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Loading…
                                            </>
                                        ) : (
                                            "Load more"
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <div className="pt-2 flex justify-center">
                        <TermsButton />
                    </div>
                </div>
            </main>
        </div>
    );
}