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
    RefreshCw,
    Trash2,
    Pencil,
} from "lucide-react";

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

// ---------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------

const ListingCardSkeleton = () => {
    return (
        <div className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden animate-pulse">
            <div className="relative h-48 md:h-56 overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>

                <div className="absolute top-2 md:top-3 right-2 md:right-3">
                    <div className="h-5 w-16 rounded-lg bg-gray-300 dark:bg-gray-600" />
                </div>
            </div>

            <div className="p-4 md:p-5">
                <div className="h-5 md:h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-1" />

                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-3 md:mb-4" />

                <div className="flex items-end justify-between mb-4 md:mb-6">
                    <div className="h-6 md:h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="flex gap-1.5 md:gap-2 pt-3 md:pt-4">
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------
// Page Skeleton
// ---------------------------------------------------------

const PageSkeleton = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background py-4 md:py-8 px-3 md:px-4 animate-pulse">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 pb-3 md:pb-0">
                    <div className="space-y-0.5 md:space-y-1">
                        <div className="h-8 md:h-10 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-9 md:h-10 w-28 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                        <div className="h-9 md:h-10 w-28 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>

                <div className="flex justify-center pt-3 md:pt-4">
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl md:rounded-2xl w-full md:w-fit">
                        {["active", "sold", "expired"].map((tab) => (
                            <div
                                key={tab}
                                className="flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700 mx-0.5"
                            >
                                <div className="h-3 w-12 rounded bg-gray-300 dark:bg-gray-600 mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-6">
                    {[...Array(6)].map((_, i) => (
                        <ListingCardSkeleton key={`skeleton-${i}`} />
                    ))}
                </div>

                <div className="mt-12 md:mt-16 py-8 md:py-10 flex justify-center px-4 md:px-0">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------
// Main Component
// ---------------------------------------------------------

export default function MyListings() {
    const user = useUser();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>("active");

    const [listings, setListings] = useState<Listing[]>([]);

    const [loading, setLoading] = useState(true);

    const [loadingMore, setLoadingMore] = useState(false);

    const [hasMore, setHasMore] = useState(true);

    const [theme, setTheme] = useState<"light" | "dark">("light");

    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ---------------------------------------------------------
    // Theme
    // ---------------------------------------------------------

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");

        if (storedTheme === "light" || storedTheme === "dark") {
            setTheme(storedTheme);
        }
    }, []);

    // ---------------------------------------------------------
    // Load listings whenever user or tab changes
    // ---------------------------------------------------------

    useEffect(() => {
        if (!user?.id) {
            setListings([]);
            setLoading(false);
            setHasMore(false);
            return;
        }

        fetchListings(user.id, true);
    }, [user?.id, activeTab]);

    // ---------------------------------------------------------
    // Fetch listings
    // ---------------------------------------------------------

    const fetchListings = async (
        userId: string,
        reset: boolean = false
    ) => {
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
                .range(
                    currentOffset,
                    currentOffset + PAGE_SIZE - 1
                );

            if (activeTab === "active") {
                query = query
                    .eq("status", "active")
                    .or(
                        `expires_at.is.null,expires_at.gt.${now}`
                    );
            }

            if (activeTab === "sold") {
                query = query.eq("status", "sold");
            }

            if (activeTab === "expired") {
                query = query.or(
                    `status.neq.active,expires_at.lte.${now}`
                );
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            const newListings = (data ?? []) as Listing[];

            if (reset) {
                setListings(newListings);
            } else {
                setListings((current) => [
                    ...current,
                    ...newListings,
                ]);
            }

            setHasMore(newListings.length === PAGE_SIZE);
        } catch (error) {
            console.error("fetchListings:", error);

            if (reset) {
                setListings([]);
            }

            toast.error("Failed to load your listings.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // ---------------------------------------------------------
    // Load more
    // ---------------------------------------------------------

    const handleLoadMore = async () => {
        if (!user?.id || loadingMore || !hasMore) {
            return;
        }

        await fetchListings(user.id, false);
    };

    // ---------------------------------------------------------
    // Navigation helpers
    // ---------------------------------------------------------

    /**
     * Tap on the card (anywhere except the action buttons) -> go to
     * the listing detail / index page.
     */
    const goToListing = (id: string) => {
        navigate(`/market/${id}`);
    };

    // ---------------------------------------------------------
    // Delete listing
    // ---------------------------------------------------------

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user?.id) {
            toast.error("You must be signed in.");
            return;
        }

        if (deletingId) {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete this listing?"
        );

        if (!confirmed) {
            return;
        }

        const deletedListing = listings.find(
            (listing) => listing.id === id
        );

        if (!deletedListing) {
            return;
        }

        setDeletingId(id);

        // Optimistic UI: remove immediately
        setListings((current) =>
            current.filter((listing) => listing.id !== id)
        );

        try {
            const { error } = await supabase
                .from("market_listings")
                .delete()
                .eq("id", id)
                .eq("seller_id", user.id);

            if (error) {
                throw error;
            }

            toast.success("Listing deleted!");
        } catch (error) {
            console.error("deleteListing:", error);

            // Roll back
            setListings((current) => {
                const alreadyExists = current.some(
                    (listing) => listing.id === id
                );

                if (alreadyExists) {
                    return current;
                }

                return [...current, deletedListing].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
            });

            toast.error(
                "Could not delete listing. Please try again."
            );
        } finally {
            setDeletingId(null);
        }
    };

    // ---------------------------------------------------------
    // Repost -> opens the listing edit/update page
    // ---------------------------------------------------------

    const handleRepost = (listing: Listing, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user?.id) {
            toast.error("You must be signed in.");
            return;
        }

        /*
         * Send the seller to the edit page so they can:
         *   - update price, title, images, expiry
         *   - then repost (which sets status back to active)
         *
         * The edit page should save status = "active" and
         * clear expires_at when the seller confirms.
         */
        navigate(`/market/edit/${listing.id}`);
    };

    // ---------------------------------------------------------
    // Not logged in
    // ---------------------------------------------------------

    if (!user) {
        return <PageSkeleton />;
    }

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------

    return (
        <div
            className={`min-h-screen bg-gray-50 dark:bg-background py-4 md:py-8 px-3 md:px-4 ${theme === "dark"
                ? "text-white"
                : "text-black"
                }`}
        >
            <div className="max-w-6xl mx-auto">

                {/* TOP NAVIGATION & TITLE */}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 pb-3 md:pb-0">
                    <div className="space-y-0.5 md:space-y-1">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            My Listings
                        </h1>

                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            Manage and track your items on NursMartt
                        </p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">

                        <button
                            onClick={() => navigate("/market")}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium text-xs md:text-sm"
                        >
                            <ChevronLeft
                                size={14}
                                className="md:w-[18px] md:h-[18px]"
                                strokeWidth={2.5}
                            />

                            <span className="hidden xs:inline">
                                Back to
                            </span>{" "}
                            Market
                        </button>

                        <button
                            onClick={() =>
                                navigate("/market/create")
                            }
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg md:rounded-xl hover:bg-blue-700 transition-all font-bold text-xs md:text-sm"
                        >
                            <Plus
                                size={14}
                                className="md:w-[18px] md:h-[18px]"
                            />

                            <span className="hidden xs:inline">
                                New
                            </span>{" "}
                            Listing
                        </button>
                    </div>
                </div>

                {/* TAB SWITCHER */}

                <div className="flex justify-center pt-3 md:pt-4">
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl md:rounded-2xl w-full md:w-fit">

                        {(
                            [
                                "active",
                                "sold",
                                "expired",
                            ] as Tab[]
                        ).map((tab) => (
                            <button
                                key={tab}
                                onClick={() =>
                                    setActiveTab(tab)
                                }
                                className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold transition-all duration-200 ${activeTab === tab
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                            >
                                {tab
                                    .charAt(0)
                                    .toUpperCase() +
                                    tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT */}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-6">
                        {[...Array(6)].map((_, i) => (
                            <ListingCardSkeleton
                                key={`loading-skeleton-${i}`}
                            />
                        ))}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl py-12 md:py-20 px-4 md:px-6 text-center mt-4 md:mt-6">

                        <div className="bg-gray-50 dark:bg-gray-800 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <Package
                                size={24}
                                className="md:w-8 md:h-8 text-gray-400"
                            />
                        </div>

                        <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
                            No {activeTab} listings found
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4 md:mb-6">
                            You don't have any items currently
                            marked as {activeTab}.
                        </p>

                        <button
                            onClick={() =>
                                navigate("/market/create")
                            }
                            className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg md:rounded-xl font-bold hover:scale-105 transition-all text-sm"
                        >
                            Create your first listing
                        </button>
                    </div>
                ) : (
                    <>
                        {/* LISTING GRID */}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-6">

                            {listings.map((l) => (
                                <div
                                    key={l.id}
                                    onClick={() => goToListing(l.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                        ) {
                                            e.preventDefault();
                                            goToListing(l.id);
                                        }
                                    }}
                                    className="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden transition-all duration-300 md:hover:shadow-xl cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >

                                    {/* IMAGE */}

                                    <div className="relative h-48 md:h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">

                                        {l.thumbnail_url ? (
                                            <img
                                                src={
                                                    l.thumbnail_url
                                                }
                                                className="h-full w-full object-cover group-hover:md:scale-110 transition-transform duration-500"
                                                alt={l.title}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-xs md:text-sm">
                                                No image available
                                            </div>
                                        )}

                                        {/* STATUS */}

                                        <div className="absolute top-2 md:top-3 right-2 md:right-3">

                                            <span
                                                className={`px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest ${activeTab ===
                                                    "active"
                                                    ? "bg-green-500 text-white"
                                                    : activeTab ===
                                                        "sold"
                                                        ? "bg-gray-600 text-white"
                                                        : "bg-red-500 text-white"
                                                    }`}
                                            >
                                                {activeTab}
                                            </span>
                                        </div>
                                    </div>

                                    {/* DETAILS */}

                                    <div className="p-4 md:p-5">

                                        <h2 className="font-bold text-base md:text-lg truncate mb-0.5 md:mb-1 text-gray-900 dark:text-white">
                                            {l.title}
                                        </h2>

                                        <p className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tighter mb-3 md:mb-4">
                                            {l.category} •{" "}
                                            {l.condition}
                                        </p>

                                        <div className="flex items-end justify-between mb-4 md:mb-6">

                                            <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">

                                                <span className="text-[10px] md:text-xs font-bold mr-0.5 md:mr-1">
                                                    {l.currency ||
                                                        "KES"}
                                                </span>

                                                {Number(
                                                    l.price
                                                ).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* BUTTONS */}

                                        <div className="flex gap-1.5 md:gap-2 pt-3 md:pt-4">

                                            {activeTab !==
                                                "active" && (
                                                    <button
                                                        onClick={(e) =>
                                                            handleRepost(
                                                                l,
                                                                e
                                                            )
                                                        }
                                                        className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-blue-600 hover:text-white transition-all"
                                                    >
                                                        <Pencil
                                                            size={12}
                                                            className="md:w-4 md:h-4"
                                                        />

                                                        Update & Repost
                                                    </button>
                                                )}

                                            <button
                                                onClick={(e) =>
                                                    handleDelete(
                                                        l.id,
                                                        e
                                                    )
                                                }
                                                disabled={
                                                    deletingId ===
                                                    l.id
                                                }
                                                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deletingId ===
                                                    l.id ? (
                                                    <Loader2
                                                        size={12}
                                                        className="md:w-4 md:h-4 animate-spin"
                                                    />
                                                ) : (
                                                    <Trash2
                                                        size={12}
                                                        className="md:w-4 md:h-4"
                                                    />
                                                )}

                                                {deletingId ===
                                                    l.id
                                                    ? "Removing..."
                                                    : "Remove"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* LOAD MORE */}

                        {hasMore && (
                            <div className="flex justify-center mt-6 md:mt-8">

                                <button
                                    onClick={
                                        handleLoadMore
                                    }
                                    disabled={loadingMore}
                                    className="inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2
                                                size={16}
                                                className="animate-spin"
                                            />
                                            Loading...
                                        </>
                                    ) : (
                                        "Load more"
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* FOOTER */}

                <div className="mt-12 md:mt-16 py-8 md:py-10 flex justify-center px-4 md:px-0">
                    <TermsButton />
                </div>
            </div>
        </div>
    );
}