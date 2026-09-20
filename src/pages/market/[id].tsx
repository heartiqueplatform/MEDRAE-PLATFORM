"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { ChevronLeft, CheckCircle, Heart, Info, Phone, ShieldAlert, X } from "lucide-react";

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

// Skeleton Component
const DetailSkeleton = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background animate-pulse">
            {/* Top Navigation Bar Skeleton */}
            <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 px-3 md:px-4 py-3">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="h-8 w-20 md:h-9 md:w-28 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 md:px-4 pt-3 md:pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6">

                    {/* LEFT COLUMN Skeleton */}
                    <div className="lg:col-span-7 space-y-3 md:space-y-4">
                        {/* Main Image Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                            <div className="relative w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                <div className="w-full aspect-square md:aspect-[4/3]">
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    </div>
                                </div>
                            </div>
                            {/* Thumbnails Row Skeleton */}
                            <div className="flex gap-1.5 md:gap-2 p-2 md:p-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gray-700" />
                                ))}
                            </div>
                        </div>

                        {/* Description Box Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-8">
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
                    <div className="lg:col-span-5 space-y-3 md:space-y-4">
                        {/* Price Card Skeleton */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-8">
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
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6">
                            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-3 md:mb-4" />
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gray-200 dark:bg-gray-700" />
                                <div>
                                    <div className="h-5 md:h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
                                    <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                            <div className="mt-3 md:mt-4 pt-3 md:pt-4">
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

    if (loading) return <DetailSkeleton />;
    if (!listing) return <DetailSkeleton />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background">

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 px-3 md:px-4 py-3">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => navigate("/market")}
                        aria-label="Go back"
                        className="inline-flex w-fit items-center justify-center p-1.5 -ml-1.5 text-gray-700 dark:text-gray-300 active:opacity-60 transition"
                    >
                        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={handleSave}
                        aria-label="Save listing"
                        className={`p-1.5 md:p-2 rounded-full transition ${saved ? "text-red-500" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                        <Heart size={20} className="md:w-6 md:h-6" fill={saved ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 md:px-4 pt-3 md:pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-7 space-y-3 md:space-y-4">
                        {/* Main Image Gallery */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                            <div className="flex flex-col">
                                <div className="relative w-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                    <div className="w-full aspect-square md:aspect-[4/3]">
                                        <img
                                            src={activeImage || listing.thumbnail_url}
                                            alt={listing.title}
                                            onClick={() => setFullscreenImage(activeImage || listing.thumbnail_url)}
                                            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 hover:md:scale-105"
                                        />
                                    </div>
                                    {listing.is_featured && (
                                        <div className="absolute top-3 md:top-4 left-3 md:left-4 bg-yellow-400 text-black text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 rounded-lg uppercase z-10">
                                            Featured
                                        </div>
                                    )}
                                </div>

                                {listing.image_urls && listing.image_urls.length > 1 && (
                                    <div className="flex gap-1.5 md:gap-2 p-2 md:p-3 overflow-x-auto no-scrollbar">
                                        {listing.image_urls.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(url)}
                                                className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden transition-all ${activeImage === url
                                                    ? "ring-2 ring-blue-500"
                                                    : "opacity-70 hover:opacity-100"
                                                    }`}
                                            >
                                                <img src={url} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description Box */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-8">
                            <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">Description</h2>
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {listing.description}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-5 space-y-3 md:space-y-4">

                        {/* Price Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-8">
                            <div className="flex justify-between items-start mb-3 md:mb-4">
                                <div>
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                        {listing.category}
                                    </span>
                                    <h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white mt-0.5 md:mt-1 leading-tight">
                                        {listing.title}
                                    </h1>
                                </div>
                                <span className="px-2 md:px-3 py-0.5 md:py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] md:text-xs font-bold rounded-full shrink-0 ml-2">
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

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-1.5 md:gap-2">
                                <button
                                    onClick={handleContact}
                                    className="w-full flex items-center justify-center gap-2 md:gap-3 bg-green-600 hover:bg-green-700 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg transition-all active:scale-[0.98]"
                                >
                                    <Phone size={16} className="md:w-5 md:h-5" />
                                    Contact Seller
                                </button>

                                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                    <button
                                        onClick={handleSave}
                                        className={`flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold transition-all text-xs md:text-sm ${saved
                                            ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                                            }`}
                                    >
                                        <Heart size={14} className="md:w-[18px] md:h-[18px]" fill={saved ? "currentColor" : "none"} />
                                        {saving ? "..." : saved ? "Saved" : "Save"}
                                    </button>

                                    <button
                                        onClick={handleReport}
                                        className={`flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold transition-all text-xs md:text-sm ${reported
                                            ? "bg-red-50 text-red-400"
                                            : "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                            }`}
                                    >
                                        <ShieldAlert size={14} className="md:w-[18px] md:h-[18px]" />
                                        {reporting ? "..." : reported ? "Reported" : "Report"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Seller Card */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6">
                            <h3 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 md:mb-4">Seller Information</h3>
                            <div className="flex items-center gap-3 md:gap-4">
                                {listing.seller_avatar ? (
                                    <img src={listing.seller_avatar} className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl object-cover" alt={listing.seller_name} />
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
                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500">
                                <Info size={12} className="md:w-3.5 md:h-3.5" />
                                Verified Student / Nurse Professional
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center py-4 md:py-6 px-4 md:px-0">
                    <TermsButton />
                </div>
            </div>

            {/* FULLSCREEN IMAGE MODAL */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 md:p-10"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button
                        onClick={() => setFullscreenImage(null)}
                        aria-label="Close image"
                        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/50 hover:text-white transition p-1.5 md:p-2 bg-white/10 rounded-full"
                    >
                        <X size={24} className="md:w-8 md:h-8" />
                    </button>

                    <img
                        src={fullscreenImage}
                        alt="Full Screen View"
                        className="max-h-[90vh] md:max-h-full max-w-full object-contain rounded-lg transition-transform duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}