"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { ArrowLeft, CheckCircle, Heart, Info, Phone, ShieldAlert, X } from "lucide-react"; // Add at the top with other imports
import { GlobalLoader } from "@/components/GlobalLoader";
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

export default function ListingDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [reported, setReported] = useState(false);  // NEW: track if user reported
    const [saving, setSaving] = useState(false);       // NEW: show "Saving..."
    const [reporting, setReporting] = useState(false); // NEW: show "Reporting..."
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
            console.log("AUTH USER:", data.user);
        };

        getUser();
    }, []);
    useEffect(() => {
        const checkUserActions = async () => {
            if (!user?.id || !listing?.id) return;

            // Check if saved
            const { data: savedData } = await supabase
                .from("market_saves")
                .select("id")
                .eq("user_id", user.id)
                .eq("listing_id", listing.id)
                .maybeSingle();
            setSaved(!!savedData);

            // Check if reported
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
        if (!listing?.id) return;

        // Subscribe to market_saves and market_reports changes for this listing
        const saveSub = supabase
            .channel('public:market_saves')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'market_saves', filter: `listing_id=eq.${listing.id}` },
                (payload) => {
                    // If current user saved, setSaved
                    if (payload.new?.user_id === user?.id) setSaved(true);
                }
            )
            .subscribe();
        const reportSub = supabase
            .channel('public:market_reports')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'market_reports', filter: `listing_id=eq.${listing.id}` },
                (payload) => {
                    if (payload.new?.reporter_id === user?.id) setReported(true);
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(saveSub);
            supabase.removeChannel(reportSub);
        };
    }, [listing?.id, user?.id]);
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
            // Check expiry/status
            const expired = data.status !== "active" || (data.expires_at && new Date(data.expires_at) < new Date());
            if (expired) {
                toast.error("This listing has expired or been removed.");
                navigate("/market");
                return;
            }
            // Inside fetchListing after setListing(data)
            if (data.image_urls && data.image_urls.length > 0) {
                setActiveImage(data.image_urls[0]);
            } else {
                setActiveImage(data.thumbnail_url);
            }
            setListing(data);
            // NEW: check if user already saved/reported
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
            // Increment views_count
            await supabase
                .from("market_listings")
                .update({ views_count: (data.views_count || 0) + 1 })
                .eq("id", id);

            // Insert into activity
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
        setSaving(true);  // NEW
        try {
            const { data, error } = await supabase
                .from("market_saves")
                .insert({
                    user_id: user.id,
                    listing_id: listing.id,
                })
                .select();

            if (error) throw error;

            setSaved(true);  // NEW: mark as saved in UI
            toast.success("Saved to your wishlist!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save listing.");
        } finally {
            setSaving(false); // NEW
        }
    };

    const handleContact = async () => {
        console.log("CONTACT CLICKED");
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
            // Increment contact_clicks safely
            const { error } = await supabase
                .from("market_listings")
                .update({ contact_clicks: (listing.contact_clicks || 0) + 1 })
                .eq("id", listing.id);
            if (error) {
                toast.error("Failed to register contact");
                return;
            }
            // Track activity
            await supabase.from("market_activity").insert({
                listing_id: listing.id,
                user_id: user.id,
                action: "contact",
            });

            // Update UI counter
            setListing({
                ...listing,
                contact_clicks: (listing.contact_clicks || 0) + 1,
            });

            // Clean phone number (WhatsApp requires digits only)
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

        setReporting(true); // NEW
        try {
            await supabase.from("market_reports").insert({
                reporter_id: user.id,
                listing_id: listing.id,
                reason,
            });
            setReported(true); // NEW: mark as reported in UI
            toast.success("Report submitted!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to report.");
        } finally {
            setReporting(false); // NEW
        }
    };
    if (loading || !listing) return <GlobalLoader />;

    return (
        <div className="space-y-0 max-w-8xl mx-auto px-3 sm:px-6 lg:px-8  ">
            {/* Top Navigation Bar */}
            <div className="z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => navigate("/market")}
                        className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden md:inline">Back to NursMartt</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            className={`p-2 rounded-full transition ${saved ? "text-red-500" : "text-gray-400 hover:bg-gray-100"}`}
                        >
                            <Heart size={24} fill={saved ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-1">

                    {/* LEFT COLUMN: IMAGES & DESCRIPTION */}
                    <div className="lg:col-span-6 space-y-2">
                        {/* Main Image Gallery */}
                        {/* Main Image Gallery - FIXED LAYOUT */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col">
                                {/* Large Main Display */}
                                <div className="relative aspect-square md:aspect-[4/3] bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={activeImage || listing.thumbnail_url}
                                        alt={listing.title}
                                        onClick={() => setFullscreenImage(activeImage || listing.thumbnail_url)}
                                        className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 hover:scale-105"
                                    />
                                    {listing.is_featured && (
                                        <div className="absolute top-4 left-4 bg-yellow-400 text-black text-[10px] font-black px-3 py-1 rounded-lg shadow-lg uppercase z-10">
                                            Featured
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnails Row (Only shows if there's more than 1 image) */}
                                {listing.image_urls && listing.image_urls.length > 1 && (
                                    <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                                        {listing.image_urls.map((url, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(url)}
                                                className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${activeImage === url
                                                    ? "border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"
                                                    : "border-transparent opacity-70 hover:opacity-100"
                                                    }`}
                                            >
                                                <img src={url} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Description Box */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Description</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {listing.description}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: PRICING, SELLER & ACTIONS */}
                    <div className="lg:col-span-5 space-y-4 h-fit lg:sticky lg:top-24">
                        <div className="sticky top-24 space-y-2">

                            {/* Price Card */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                            {listing.category}
                                        </span>
                                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1 leading-tight">
                                            {listing.title}
                                        </h1>
                                    </div>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full border border-gray-200 dark:border-gray-700">
                                        {listing.condition}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white">
                                        {listing.currency} {Number(listing.price).toLocaleString()}
                                    </span>
                                    {listing.negotiable && (
                                        <span className="text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-1">
                                            <CheckCircle size={14} /> Negotiable
                                        </span>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleContact}
                                        className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-[0.98]"
                                    >
                                        <Phone size={20} />
                                        Contact Seller
                                    </button>

                                    <div className="grid grid-cols-2 gap-">
                                        <button
                                            onClick={handleSave}
                                            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold border transition-all ${saved
                                                ? "bg-gray-100 dark:bg-gray-800 border-gray-200 text-gray-500"
                                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50"
                                                }`}
                                        >
                                            <Heart size={18} fill={saved ? "currentColor" : "none"} />
                                            {saving ? "..." : saved ? "Saved" : "Save"}
                                        </button>

                                        <button
                                            onClick={handleReport}
                                            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold border transition-all ${reported
                                                ? "bg-red-50 text-red-400 border-red-100"
                                                : "bg-white dark:bg-gray-900 border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50"
                                                }`}
                                        >
                                            <ShieldAlert size={18} />
                                            {reporting ? "..." : reported ? "Reported" : "Report"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Seller Card */}
                            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Seller Information</h3>
                                <div className="flex items-center gap-4">
                                    {listing.seller_avatar ? (
                                        <img src={listing.seller_avatar} className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-50" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                            {listing.seller_name?.[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">{listing.seller_name}</div>
                                        <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">{listing.seller_role}</div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2 text-xs text-gray-500">
                                    <Info size={14} />
                                    Verified Student / Nurse Professional
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
                <div className="text-center">
                    <TermsButton />
                </div>
            </div>

            {/* FULLSCREEN IMAGE MODAL */}
            {
                fullscreenImage && (
                    <div
                        className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-10"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <button
                            onClick={() => setFullscreenImage(null)}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition p-2 bg-white/10 rounded-full"
                        >
                            <X size={32} />
                        </button>

                        <img
                            src={fullscreenImage}
                            alt="Full Screen View"
                            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )
            }
        </div >
    );
}
