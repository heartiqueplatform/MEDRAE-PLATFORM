"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { ArrowLeft, CheckCircle, Heart, Info, Phone, ShieldAlert, X } from "lucide-react";

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

// Skeleton Components
const DetailSkeleton = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background animate-pulse">
            {/* Top Navigation Bar Skeleton */}
            <div className="sticky -top-4 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-3 md:px-4 py-3 md:py-3">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="h-8 w-20 md:h-9 md:w-28 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-0 md:px-4 pt-0 md:pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-6">

                    {/* LEFT COLUMN Skeleton */}
                    <div className="lg:col-span-7 space-y-0 md:space-y-4">
                        {/* Main Image Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl overflow-hidden shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col">
                                <div className="relative w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                    <div className="w-full aspect-square md:aspect-[4/3]">
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-300 dark:bg-gray-600" />
                                        </div>
                                    </div>
                                </div>
                                {/* Thumbnails Row Skeleton */}
                                <div className="flex gap-1.5 md:gap-2 p-2 md:p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Description Box Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl px-4 py-5 md:p-8 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b md:border-gray-100">
                            <div className="h-6 md:h-7 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2 md:mb-4" />
                            <div className="space-y-2">
                                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
                                <div className="h-3 w-3/6 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN Skeleton */}
                    <div className="lg:col-span-5 space-y-0 md:space-y-4">
                        {/* Price Card Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-2xl px-4 py-5 md:p-8 shadow-none md:shadow-xl border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b">
                            <div className="mb-3 md:mb-4">
                                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
                                <div className="h-7 md:h-9 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div className="flex items-baseline gap-1.5 md:gap-2 mb-3 md:mb-4">
                                <div className="h-8 md:h-10 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                            <div className="flex flex-col gap-1.5 md:gap-2">
                                <div className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl bg-gray-200 dark:bg-gray-700" />
                                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                    <div className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-10 md:h-12 rounded-xl md:rounded-2xl bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                        </div>

                        {/* Seller Card Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl px-4 py-5 md:p-6 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b">
                            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-3 md:mb-4" />
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gray-200 dark:bg-gray-700" />
                                <div>
                                    <div className="h-5 md:h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
                                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-50 dark:border-gray-800">
                                <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Skeleton */}
                <div className="text-center py-4 md:py-6 px-4 md:px-0">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
                </div>
            </div>
        </div>
    );
};

export default function ListingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [reported, setReported] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    // Preserve theme from localStorage
    useEffect(() => {
        const storedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
        setTheme(storedTheme);
    }, []);

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

            const expired = data.status !== "active" || (data.expires_at && new Date(data.expires_at) < new Date());
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
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from("market_saves")
                .insert({
                    user_id: user.id,
                    listing_id: listing.id,
                })
                .select();

            if (error) throw error;
            setSaved(true);
            toast.success("Saved to your wishlist!");
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
            toast.error("You must be logged in to contact the seller");
            return;
        }

        if (!listing.seller_phone) {
            toast.error("Seller has not provided a phone number.");
            return;
        }

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

        setReporting(true);
        try {
            await supabase.from("market_reports").insert({
                reporter_id: user.id,
                listing_id: listing.id,
                reason,
            });
            setReported(true);
            toast.success("Report submitted!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to report.");
        } finally {
            setReporting(false);
        }
    };

    // ✅ Show skeleton instead of GlobalLoader
    if (loading) return <DetailSkeleton />;
    if (!listing) return <DetailSkeleton />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background">
            {/* Top Navigation Bar - Mobile Native */}
            <div className="sticky -top-4 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-3 md:px-4 py-3 md:py-3">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => navigate("/market")}
                        className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium text-sm md:text-base"
                    >
                        <ArrowLeft size={18} className="md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Back to NursMartt</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <button
                            onClick={handleSave}
                            className={`p-1.5 md:p-2 rounded-full transition ${saved ? "text-red-500" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                        >
                            <Heart size={20} className="md:w-6 md:h-6" fill={saved ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-0 md:px-4 pt-0 md:pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-6">

                    {/* LEFT COLUMN: IMAGES & DESCRIPTION - Mobile Native */}
                    <div className="lg:col-span-7 space-y-0 md:space-y-4">
                        {/* Main Image Gallery - Mobile Native */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl overflow-hidden shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col">
                                {/* Large Main Display - EDGE TO EDGE ON MOBILE */}
                                <div className="relative w-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                    {/* Mobile: Full width, square aspect ratio. Desktop: 4:3 aspect ratio */}
                                    <div className="w-full aspect-square md:aspect-[4/3]">
                                        <img
                                            src={activeImage || listing.thumbnail_url}
                                            alt={listing.title}
                                            onClick={() => setFullscreenImage(activeImage || listing.thumbnail_url)}
                                            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 hover:md:scale-105"
                                        />
                                    </div>
                                    {listing.is_featured && (
                                        <div className="absolute top-3 md:top-4 left-3 md:left-4 bg-yellow-400 text-black text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-lg shadow-lg uppercase z-10">
                                            Featured
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnails Row */}
                                {listing.image_urls && listing.image_urls.length > 1 && (
                                    <div className="flex gap-1.5 md:gap-2 p-2 md:p-3 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                        {listing.image_urls.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(url)}
                                                className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${activeImage === url
                                                    ? "border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"
                                                    : "border-transparent opacity-70 hover:opacity-100"
                                                    }`}
                                            >
                                                <img src={url} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description Box - Mobile Native */}
                        <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl px-4 py-5 md:p-8 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b md:border-gray-100">
                            <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">Description</h2>
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {listing.description}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PRICING, SELLER & ACTIONS - Mobile Native */}
                    <div className="lg:col-span-5 space-y-0 md:space-y-4">
                        <div className="space-y-0 md:space-y-4">

                            {/* Price Card - Mobile Native */}
                            <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-2xl px-4 py-5 md:p-8 shadow-none md:shadow-xl border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div>
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                            {listing.category}
                                        </span>
                                        <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white mt-0.5 md:mt-1 leading-tight">
                                            {listing.title}
                                        </h1>
                                    </div>
                                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] md:text-xs font-bold rounded-full border border-gray-200 dark:border-gray-700 shrink-0 ml-2">
                                        {listing.condition}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-1.5 md:gap-2 mb-3 md:mb-4">
                                    <span className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white">
                                        {listing.currency} {Number(listing.price).toLocaleString()}
                                    </span>
                                    {listing.negotiable && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs md:text-sm flex items-center gap-0.5 md:gap-1">
                                            <CheckCircle size={12} className="md:w-3.5 md:h-3.5" /> Negotiable
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons - Mobile Optimized */}
                                <div className="flex flex-col gap-1.5 md:gap-2">
                                    <button
                                        onClick={handleContact}
                                        className="w-full flex items-center justify-center gap-2 md:gap-3 bg-green-600 hover:bg-green-700 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-[0.98]"
                                    >
                                        <Phone size={16} className="md:w-5 md:h-5" />
                                        Contact Seller
                                    </button>

                                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                        <button
                                            onClick={handleSave}
                                            className={`flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold border transition-all text-xs md:text-sm ${saved
                                                ? "bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-500"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50"
                                                }`}
                                        >
                                            <Heart size={14} className="md:w-[18px] md:h-[18px]" fill={saved ? "currentColor" : "none"} />
                                            {saving ? "..." : saved ? "Saved" : "Save"}
                                        </button>

                                        <button
                                            onClick={handleReport}
                                            className={`flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold border transition-all text-xs md:text-sm ${reported
                                                ? "bg-red-50 text-red-400 border-red-100"
                                                : "bg-white dark:bg-gray-900 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50"
                                                }`}
                                        >
                                            <ShieldAlert size={14} className="md:w-[18px] md:h-[18px]" />
                                            {reporting ? "..." : reported ? "Reported" : "Report"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Seller Card - Mobile Native */}
                            <div className="bg-white dark:bg-gray-900 rounded-none md:rounded-xl px-4 py-5 md:p-6 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-800 border-b md:border-b">
                                <h3 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 md:mb-4">Seller Information</h3>
                                <div className="flex items-center gap-3 md:gap-4">
                                    {listing.seller_avatar ? (
                                        <img src={listing.seller_avatar} className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl object-cover border-2 border-blue-50" alt={listing.seller_name} />
                                    ) : (
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-600 flex items-center justify-center text-white text-base md:text-xl font-bold">
                                            {listing.seller_name?.[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-base md:text-lg">{listing.seller_name}</div>
                                        <div className="text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium">{listing.seller_role}</div>
                                    </div>
                                </div>
                                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500">
                                    <Info size={12} className="md:w-3.5 md:h-3.5" />
                                    Verified Student / Nurse Professional
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center py-4 md:py-6 px-4 md:px-0">
                    <TermsButton />
                </div>
            </div>

            {/* FULLSCREEN IMAGE MODAL - z-index updated to z-[9999] */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 md:p-10"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/50 hover:text-white transition p-1.5 md:p-2 bg-white/10 rounded-full"
                    >
                        <X size={24} className="md:w-8 md:h-8" />
                    </button>

                    <img
                        src={fullscreenImage}
                        alt="Full Screen View"
                        className="max-h-[90vh] md:max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}