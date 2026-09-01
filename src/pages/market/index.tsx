"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { TermsButton } from "@/components/ui/TermsButton";
import { Heart, Phone, CheckCircle, Trash2, Pencil, Loader2, ImageIcon, Tag, Plus, } from "lucide-react";

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
    saves_count: number;
    contact_clicks: number;
    report_count: number;
    views_count: number;
}

// Skeleton Card Component
const ListingCardSkeleton = () => {
    return (
        <div className="group bg-white dark:bg-gray-900 rounded-none md:rounded-2xl border-0 md:border border-gray-200 dark:border-gray-800 overflow-hidden border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50 animate-pulse">
            {/* Image Skeleton */}
            <div className="relative h-48 md:h-56 w-full bg-gray-200 dark:bg-gray-700">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                {/* Category Badge Skeleton */}
                <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3">
                    <div className="h-5 w-16 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-4 md:p-5">
                <div className="flex justify-between items-start mb-1 md:mb-2">
                    <div className="h-5 md:h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-5 w-12 rounded bg-gray-200 dark:bg-gray-700 shrink-0 ml-2" />
                </div>

                <div className="h-6 md:h-7 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2 md:mb-4" />

                {/* Seller Info Skeleton */}
                <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4 p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg md:rounded-xl">
                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-2 w-16 rounded bg-gray-200 dark:bg-gray-700 mt-1" />
                    </div>
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-4 gap-1 md:gap-2 py-2 md:py-3 border-t border-gray-100 dark:border-gray-800">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className="h-3 w-6 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))}
                </div>

                {/* Buttons Skeleton */}
                <div className="flex gap-1.5 md:gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 h-9 md:h-10 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
    );
};

// Page Skeleton - shows while checking subscription
const PageSkeleton = () => {
    return (
        <div className="max-w-5xl mx-auto py-4 md:py-6 px-0 md:px-4 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 px-3 md:px-0 pb-3 md:pb-0 border-b md:border-b-0 border-slate-100/50 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 md:h-10 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="h-9 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="w-px bg-gray-300 dark:bg-gray-600 my-1 md:my-2"></div>
                        <div className="h-9 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>

            {/* Grid Skeletons - 6 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 lg:gap-6 mt-4 md:mt-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 rounded-none md:rounded-2xl border-0 md:border border-gray-200 dark:border-gray-800 overflow-hidden border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50">
                        <div className="h-48 md:h-56 w-full bg-gray-200 dark:bg-gray-700" />
                        <div className="p-4 md:p-5 space-y-3">
                            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1">
                                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-2 w-16 rounded bg-gray-200 dark:bg-gray-700 mt-1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="flex flex-col items-center gap-1">
                                        <div className="h-3 w-6 rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Skeleton */}
            <div className="mt-12 md:mt-20 py-8 md:py-10 border-t border-gray-100 dark:border-gray-900 text-center px-4 md:px-0">
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
            </div>
        </div>
    );
};

export default function MarketFeed({ user }: any) {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [conditionFilter, setConditionFilter] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);

    useEffect(() => {
        const checkSubscription = async () => {
            if (!user?.id) {
                setHasAccess(true);
                return;
            }

            const { data, error } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

            // Always allow access
            setHasAccess(true);
        };
        checkSubscription();
    }, [user]);

    useEffect(() => {
        if (user?.id) {
            fetchSaved();
        }
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
            toast.error("DB Error: Check console");
            setLoading(false);
            return;
        }

        let filtered = data || [];

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
        const { data } = await supabase
            .from("market_saves")
            .select("listing_id")
            .eq("user_id", user.id);

        setSavedIds(data?.map((s) => s.listing_id) || []);
    };

    const handleSave = async (listing: Listing, e: any) => {
        e.stopPropagation();

        if (!user?.id) {
            toast.error("You must be logged in to save a listing");
            return;
        }

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
                .update({ saves_count: listing.saves_count - 1 })
                .eq("id", listing.id);

            await supabase.from("market_activity").insert({
                listing_id: listing.id,
                user_id: user.id,
                action: "unsave",
            });

            setSavedIds(savedIds.filter((id) => id !== listing.id));
            toast.success("Removed from wishlist");
        } else {
            const { data, error } = await supabase
                .from("market_saves")
                .upsert(
                    { user_id: user.id, listing_id: listing.id },
                    { onConflict: ['user_id', 'listing_id'], ignoreDuplicates: true }
                )
                .select();
            if (error) {
                return toast.error("Failed to save listing");
            }
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
                            ? l.saves_count - 1
                            : l.saves_count + 1,
                    }
                    : l
            )
        );
    };

    const handleContact = async (listing: Listing, e: any) => {
        e.stopPropagation();
        if (!user?.id) {
            toast.error("You must be logged in to contact the seller");
            return;
        }
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
        const newStatus = currentStatus === "sold" ? "active" : "sold";
        await supabase
            .from("market_listings")
            .update({ status: newStatus })
            .eq("id", id);
        toast.success(
            newStatus === "sold" ? "Marked as sold" : "Reverted to active"
        );
        fetchListings();
    };

    const deleteListing = async (id: string, e: any) => {
        e.stopPropagation();
        const confirmDelete = window.confirm("Are you sure you want to delete this listing?");
        if (!confirmDelete) return;
        try {
            setDeletingIds((prev) => [...prev, id]);
            const { data, error } = await supabase
                .from("market_listings")
                .delete()
                .eq("id", id);
            if (error) {
                console.error("Supabase delete error:", error);
                toast.error("Failed to delete listing: " + error.message);
                setDeletingIds((prev) => prev.filter((d) => d !== id));
                return;
            }
            if (!data || data.length === 0) {
                toast.error("Listing not found or already deleted");
                setDeletingIds((prev) => prev.filter((d) => d !== id));
                return;
            }
            setListings((prev) => prev.filter((l) => l.id !== id));
            toast.success("Listing deleted successfully");
            setDeletingIds((prev) => prev.filter((d) => d !== id));
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("An unexpected error occurred while deleting.");
            setDeletingIds((prev) => prev.filter((d) => d !== id));
        }
    };

    // Render skeleton cards for loading state
    const renderSkeletons = () => {
        return Array(6).fill(0).map((_, index) => (
            <ListingCardSkeleton key={`skeleton-${index}`} />
        ));
    };

    // ✅ REPLACED: Show page skeleton instead of GlobalLoader
    if (hasAccess === null) return <PageSkeleton />;

    return (
        <div className="max-w-5xl mx-auto py-4 md:py-6 px-0 md:px-4">
            {/* HEADER SECTION - Mobile Native */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-2 px-3 md:px-0 pb-3 md:pb-0 border-b md:border-b-0 border-slate-100/50 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                    <img src="/Nurvia_logo.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">NursMartt</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {/* Filter Dropdowns - Mobile Optimized */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-700 flex-1 md:flex-none">
                        <select
                            className="bg-transparent text-[10px] md:text-sm dark:bg-gray-800 font-semibold px-2 md:px-3 py-1.5 md:py-2 outline-none rounded-lg md:rounded-xl text-gray-700 dark:text-gray-200 cursor-pointer flex-1"
                            value={categoryFilter || ""}
                            onChange={(e) => setCategoryFilter(e.target.value || null)}
                        >
                            <option value="">All Categories</option>
                            <option value="textbook">Textbook</option>
                            <option value="equipment">Equipment</option>
                            <option value="uniform">Uniform</option>
                            <option value="hostel_item">Hostel Item</option>
                            <option value="nck_material">NCK Material</option>
                        </select>
                        <div className="w-px bg-gray-300 dark:bg-gray-600 my-1 md:my-2"></div>
                        <select
                            className="bg-transparent text-[10px] md:text-sm dark:bg-gray-800 font-semibold px-2 md:px-3 py-1.5 md:py-2 outline-none text-gray-700 dark:text-gray-200 cursor-pointer flex-1"
                            value={conditionFilter || ""}
                            onChange={(e) => setConditionFilter(e.target.value || null)}
                        >
                            <option value="">All Conditions</option>
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                        </select>
                    </div>
                    {/* Action Buttons - Mobile Optimized */}
                    <button
                        onClick={() => navigate("/market/create")}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-blue-600 text-white font-bold rounded-lg md:rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 text-[10px] md:text-sm"
                    >
                        <Plus size={16} className="md:w-5 md:h-5" /> <span className="hidden xs:inline">Sell</span> Item
                    </button>
                    <button
                        onClick={() => navigate("/market/my-listings")}
                        className="px-3 md:px-5 py-2 md:py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg md:rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-[10px] md:text-sm"
                    >
                        <span className="hidden xs:inline">My </span>Listings
                    </button>
                </div>
            </div>

            {/* GRID SECTION - Mobile Feed Style */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 lg:gap-6 mt-4 md:mt-6">
                    {renderSkeletons()}
                </div>
            ) : listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 md:py-32 bg-gray-50 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 mx-3 md:mx-0 mt-4 md:mt-6">
                    <div className="p-3 md:p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 md:mb-4">
                        <Tag size={32} className="md:w-10 md:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">No listings found</h3>
                    <p className="text-sm text-gray-500">Try adjusting your filters or be the first to post!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 lg:gap-6 mt-4 md:mt-6">
                    {listings.map((l, index) => {
                        const isOwner = user?.id === l.seller_id;
                        const isSaved = savedIds.includes(l.id);

                        return (
                            <div key={l.id}>
                                <div className="group bg-white dark:bg-gray-900 rounded-none md:rounded-2xl border-0 md:border border-gray-200 dark:border-gray-800 overflow-hidden hover:md:shadow-2xl transition-all duration-300 border-b md:border-b md:border-slate-100/50 dark:border-slate-800/50">
                                    {/* Image Container */}
                                    <div className="relative h-48 md:h-56 w-full overflow-hidden">
                                        {l.thumbnail_url ? (
                                            <img
                                                src={l.thumbnail_url}
                                                className="h-full w-full object-cover group-hover:md:scale-110 transition-transform duration-500 cursor-pointer"
                                                onClick={() => navigate(`/market/${l.id}`)}
                                            />
                                        ) : (
                                            <div
                                                className="h-full w-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer"
                                                onClick={() => navigate(`/market/${l.id}`)}
                                            >
                                                <ImageIcon size={28} className="md:w-8 md:h-8" />
                                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">No Image</span>
                                            </div>
                                        )}

                                        {/* Status Badges */}
                                        <div className="absolute top-2 md:top-3 left-2 md:left-3 flex flex-col gap-1.5 md:gap-2">
                                            {l.is_featured && (
                                                <span className="bg-yellow-400 text-black text-[8px] md:text-[10px] font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg uppercase shadow-sm">
                                                    Featured
                                                </span>
                                            )}
                                            {l.status === "sold" && (
                                                <span className="bg-red-600 text-white text-[8px] md:text-[10px] font-black px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg uppercase shadow-sm">
                                                    Sold Out
                                                </span>
                                            )}
                                        </div>

                                        {/* Category Badge Over Image */}
                                        <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3">
                                            <span className="bg-black/60 backdrop-blur-md text-white text-[8px] md:text-[10px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-white/20 uppercase">
                                                {l.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content - Mobile Optimized */}
                                    <div className="p-4 md:p-5">
                                        <div className="flex justify-between items-start mb-1 md:mb-2">
                                            <h2
                                                className="font-bold text-base md:text-xl text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                                onClick={() => navigate(`/market/${l.id}`)}
                                            >
                                                {l.title}
                                            </h2>
                                            <span className="text-[9px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md shrink-0 ml-2">
                                                {l.condition}
                                            </span>
                                        </div>

                                        <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2 md:mb-4">
                                            <span className="text-xs md:text-sm font-normal text-gray-500 mr-0.5 md:mr-1">KES</span>
                                            {Number(l.price).toLocaleString()}
                                        </div>

                                        {/* Seller Info - Mobile Optimized */}
                                        <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4 p-1.5 md:p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg md:rounded-xl">
                                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] md:text-xs">
                                                {l.seller_name?.[0]}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[10px] md:text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{l.seller_name}</span>
                                                <span className="text-[8px] md:text-[10px] text-gray-500 uppercase tracking-tighter truncate">{l.seller_role}</span>
                                            </div>
                                        </div>

                                        {/* Dashboard Stats - Mobile Optimized */}
                                        <div className="grid grid-cols-4 gap-1 md:gap-2 py-2 md:py-3 border-t border-gray-100 dark:border-gray-800 text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-900 dark:text-gray-200 text-xs md:text-sm">{l.views_count}</span>
                                                <span>Views</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-900 dark:text-gray-200 text-xs md:text-sm">{l.saves_count}</span>
                                                <span>Saves</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-900 dark:text-gray-200 text-xs md:text-sm">{l.contact_clicks}</span>
                                                <span>Inquiry</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-gray-900 dark:text-gray-200 text-xs md:text-sm text-red-500">{l.report_count}</span>
                                                <span>Reports</span>
                                            </div>
                                        </div>

                                        {/* Buttons - Mobile Optimized */}
                                        <div className="flex gap-1.5 md:gap-2 mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-800">
                                            {!isOwner && (
                                                <>
                                                    <button
                                                        onClick={(e) => handleSave(l, e)}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all border text-[9px] md:text-sm ${isSaved
                                                            ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                                                            : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                            }`}
                                                    >
                                                        <Heart size={14} className="md:w-[18px] md:h-[18px]" fill={isSaved ? "currentColor" : "none"} />
                                                        {isSaved ? "Saved" : "Save"}
                                                    </button>

                                                    <button
                                                        onClick={(e) => handleContact(l, e)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg md:rounded-xl font-bold shadow-lg shadow-green-100 dark:shadow-none transition-all text-[9px] md:text-sm"
                                                    >
                                                        <Phone size={14} className="md:w-[18px] md:h-[18px]" />
                                                        Chat
                                                    </button>
                                                </>
                                            )}

                                            {isOwner && (
                                                <>
                                                    <button
                                                        onClick={(e) => markSold(l.id, e, l.status)}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold text-white transition-all text-[9px] md:text-sm ${l.status === "sold" ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none"
                                                            }`}
                                                    >
                                                        <CheckCircle size={14} className="md:w-[18px] md:h-[18px]" />
                                                        {l.status === "sold" ? "Sold" : "Mark Sold"}
                                                    </button>

                                                    <button
                                                        onClick={(e) => deleteListing(l.id, e)}
                                                        className="px-2.5 md:px-3 py-2 md:py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg md:rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 text-[9px] md:text-sm"
                                                        disabled={deletingIds.includes(l.id)}
                                                    >
                                                        {deletingIds.includes(l.id) ? (
                                                            <Loader2 className="animate-spin md:w-[18px] md:h-[18px]" size={14} />
                                                        ) : (
                                                            <Trash2 size={14} className="md:w-[18px] md:h-[18px]" />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Mobile Separator */}
                                {index < listings.length - 1 && (
                                    <div className="block md:hidden h-px bg-slate-200/50 dark:bg-slate-800/50" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-12 md:mt-20 py-8 md:py-10 border-t border-gray-100 dark:border-gray-900 text-center px-4 md:px-0">
                <TermsButton />
            </div>
        </div>
    );
}