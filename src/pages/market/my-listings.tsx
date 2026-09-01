"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { ArrowLeft, Loader2, Package, Plus, RefreshCw, Trash2 } from "lucide-react";

interface Listing {
    id: string;
    title: string;
    description?: string;
    category: string;
    condition: string;
    price: number;
    negotiable?: boolean;
    currency?: string;
    thumbnail_url?: string;
    image_urls?: string[];
    seller_name?: string;
    seller_role?: string;
    seller_phone?: string;
    seller_avatar?: string;
    status: string;
    expires_at?: string | null;
    created_at: string;
    views_count?: number;
    saves_count?: number;
    contact_clicks?: number;
    user_id?: string;
}

// Skeleton Card Component
const ListingCardSkeleton = () => {
    return (
        <div className="group bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 rounded-none md:rounded-2xl overflow-hidden shadow-none md:shadow-sm border-b md:border-b md:border-gray-200 dark:border-gray-800 animate-pulse">
            {/* Image Skeleton */}
            <div className="relative h-48 md:h-56 overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                {/* Status Tag Skeleton */}
                <div className="absolute top-2 md:top-3 right-2 md:right-3">
                    <div className="h-5 w-16 rounded-lg bg-gray-300 dark:bg-gray-600" />
                </div>
            </div>

            {/* Details Section Skeleton */}
            <div className="p-4 md:p-5">
                <div className="h-5 md:h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-3 md:mb-4" />

                <div className="flex items-end justify-between mb-4 md:mb-6">
                    <div className="h-6 md:h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Buttons Skeleton */}
                <div className="flex gap-1.5 md:gap-2 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    );
};

// Page Skeleton - shows while loading user or listings
const PageSkeleton = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background py-4 md:py-8 px-0 md:px-4 animate-pulse">
            <div className="max-w-6xl mx-auto">
                {/* TOP NAVIGATION & TITLE Skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 px-3 md:px-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
                    <div className="space-y-0.5 md:space-y-1">
                        <div className="h-8 md:h-10 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="h-9 md:h-10 w-28 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                        <div className="h-9 md:h-10 w-28 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>

                {/* TAB SWITCHER Skeleton */}
                <div className="flex justify-center px-3 md:px-0 pt-3 md:pt-4">
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl md:rounded-2xl w-full md:w-fit border border-gray-200 dark:border-gray-700">
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

                {/* GRID SKELETONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6 mt-4 md:mt-6">
                    {[...Array(6)].map((_, i) => (
                        <ListingCardSkeleton key={`skeleton-${i}`} />
                    ))}
                </div>

                {/* Footer Skeleton */}
                <div className="mt-12 md:mt-16 py-8 md:py-10 border-t border-gray-100 dark:border-gray-900 flex justify-center px-4 md:px-0">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    );
};

export default function MyListings() {
    const user = useUser();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"active" | "sold" | "expired">("active");
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    // Preserve theme from localStorage safely
    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
    }, []);

    // ✅ Show page skeleton instead of text while loading user
    if (!user) return <PageSkeleton />;

    // Fetch listings when tab or user changes
    useEffect(() => {
        if (!user?.id) return;
        fetchListings();
    }, [activeTab, user?.id]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("market_listings")
                .select("*")
                .eq("seller_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const now = new Date();
            let filtered: Listing[] = [];

            if (activeTab === "active") {
                filtered = data.filter(
                    (l) => l.status === "active" && (!l.expires_at || new Date(l.expires_at) > now)
                );
            } else if (activeTab === "sold") {
                filtered = data.filter((l) => l.status === "sold");
            } else if (activeTab === "expired") {
                filtered = data.filter(
                    (l) => l.status !== "active" || (l.expires_at && new Date(l.expires_at) <= now)
                );
            }

            setListings(filtered);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load your listings.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        try {
            await supabase.from("market_listings").delete().eq("id", id);
            toast.success("Listing deleted!");
            fetchListings();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete listing.");
        }
    };

    const handleRepost = async (listing: Listing) => {
        try {
            const { error } = await supabase
                .from("market_listings")
                .update({ status: "active", expires_at: null, updated_at: new Date() })
                .eq("id", listing.id);

            if (error) throw error;
            toast.success("Listing reposted!");
            fetchListings();
        } catch (err) {
            console.error(err);
            toast.error("Failed to repost.");
        }
    };

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-background py-4 md:py-8 px-0 md:px-4 ${theme === "dark" ? "text-white" : "text-black"}`}>
            <div className="max-w-6xl mx-auto">

                {/* TOP NAVIGATION & TITLE - Mobile Native */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 px-3 md:px-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
                    <div className="space-y-0.5 md:space-y-1">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">My Listings</h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Manage and track your items on NursMartt</p>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => navigate("/market")}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-xs md:text-sm"
                        >
                            <ArrowLeft size={14} className="md:w-[18px] md:h-[18px]" />
                            <span className="hidden xs:inline">Back to</span> Market
                        </button>
                        <button
                            onClick={() => navigate("/market/create")}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 text-white rounded-lg md:rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all font-bold text-xs md:text-sm"
                        >
                            <Plus size={14} className="md:w-[18px] md:h-[18px]" />
                            <span className="hidden xs:inline">New</span> Listing
                        </button>
                    </div>
                </div>

                {/* TAB SWITCHER - Mobile Native */}
                <div className="flex justify-center px-3 md:px-0 pt-3 md:pt-4">
                    <div className="flex p-1 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl md:rounded-2xl w-full md:w-fit border border-gray-200 dark:border-gray-700">
                        {["active", "sold", "expired"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold transition-all duration-200 ${activeTab === tab
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT SECTION - Mobile Native */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6 mt-4 md:mt-6">
                        {[...Array(6)].map((_, i) => (
                            <ListingCardSkeleton key={`loading-skeleton-${i}`} />
                        ))}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl md:rounded-3xl py-12 md:py-20 px-4 md:px-6 text-center mx-3 md:mx-0 mt-4 md:mt-6">
                        <div className="bg-gray-50 dark:bg-gray-800 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <Package size={24} className="md:w-8 md:h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">No {activeTab} listings found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4 md:mb-6">
                            You don't have any items currently marked as {activeTab}.
                        </p>
                        <button
                            onClick={() => navigate("/market/create")}
                            className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg md:rounded-xl font-bold hover:scale-105 transition-all text-sm"
                        >
                            Create your first listing
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-6 mt-4 md:mt-6">
                        {listings.map((l, index) => (
                            <div key={l.id}>
                                <div className="group bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 rounded-none md:rounded-2xl overflow-hidden shadow-none md:shadow-sm hover:md:shadow-xl transition-all duration-300 border-b md:border-b md:border-gray-200 dark:border-gray-800">
                                    {/* Image Section */}
                                    <div className="relative h-48 md:h-56 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                        {l.thumbnail_url ? (
                                            <img
                                                src={l.thumbnail_url}
                                                className="h-full w-full object-cover group-hover:md:scale-110 transition-transform duration-500"
                                                alt={l.title}
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-xs md:text-sm">
                                                No image available
                                            </div>
                                        )}

                                        {/* Status Tag */}
                                        <div className="absolute top-2 md:top-3 right-2 md:right-3">
                                            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest shadow-sm ${activeTab === 'active' ? 'bg-green-500 text-white' :
                                                activeTab === 'sold' ? 'bg-gray-600 text-white' : 'bg-red-500 text-white'
                                                }`}>
                                                {activeTab}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Details Section - Mobile Optimized */}
                                    <div className="p-4 md:p-5">
                                        <h2 className="font-bold text-base md:text-lg truncate mb-0.5 md:mb-1 text-gray-900 dark:text-white">
                                            {l.title}
                                        </h2>
                                        <p className="text-[10px] md:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tighter mb-3 md:mb-4">
                                            {l.category} • {l.condition}
                                        </p>

                                        <div className="flex items-end justify-between mb-4 md:mb-6">
                                            <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">
                                                <span className="text-[10px] md:text-xs font-bold mr-0.5 md:mr-1">{l.currency || "KES"}</span>
                                                {Number(l.price).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* Dashboard Buttons - Mobile Optimized */}
                                        <div className="flex gap-1.5 md:gap-2 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-800">
                                            {activeTab !== "active" && (
                                                <button
                                                    onClick={() => handleRepost(l)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-blue-600 hover:text-white transition-all"
                                                >
                                                    <RefreshCw size={12} className="md:w-4 md:h-4" />
                                                    Repost
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(l.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                <Trash2 size={12} className="md:w-4 md:h-4" />
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Mobile Separator */}
                                {index < listings.length - 1 && (
                                    <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-12 md:mt-16 py-8 md:py-10 border-t border-gray-100 dark:border-gray-900 flex justify-center px-4 md:px-0">
                    <TermsButton />
                </div>
            </div>
        </div>
    );
}