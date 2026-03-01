"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { ArrowLeft } from "lucide-react"; // Add at the top with other imports
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
                `Hi ${listing.seller_name}, I am interested in your "${listing.title}" listed on NurseMart. Could we discuss?`
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
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-3xl bg-white dark:bg-gray-900 shadow-lg rounded-2xl px-6 py-8 space-y-6 text-center">
                {/* Featured badge */}
                {listing.is_featured && (
                    <div className="bg-yellow-300 text-black px-3 py-1 rounded-xl inline-block font-bold">
                        Featured
                    </div>
                )}
                <button
                    onClick={() => navigate("/market")}
                    className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
                >
                    <ArrowLeft size={18} />
                    Back to NurseMart
                </button>

                <h1 className="text-3xl font-bold">{listing.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{listing.category} • {listing.condition}</p>

                {/* Image carousel */}
                <div><div className="flex flex-wrap justify-center gap-4 mt-4">
                    {listing.image_urls?.map((url, idx) => (
                        <div key={idx} className="flex justify-center w-full">
                            <img
                                src={url}
                                alt={`Image ${idx + 1}`}
                                onClick={() => setFullscreenImage(url)}
                                className="w-full md:w-[600px] lg:w-[700px] xl:w-[400px] h-80 md:h-80 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
                            />
                        </div>
                    ))}
                </div>

                    <p className="mt-4">{listing.description}</p>
                    <div className="mt-2 text-2xl font-bold">{listing.currency} {listing.price}</div>
                    {listing.negotiable && <div className="text-green-600 font-semibold">Negotiable</div>}

                    {/* Seller info */}
                    <div className="mt-6 flex flex-col items-center gap-2">
                        {listing.seller_avatar && (
                            <img src={listing.seller_avatar} className="w-12 h-12 rounded-full" />
                        )}

                        <div className="font-semibold">{listing.seller_name}</div>
                        <div className="text-gray-500 dark:text-gray-400">{listing.seller_role}</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-4 flex-wrap justify-center">
                    <button
                        onClick={handleSave}
                        className={`px-6 py-3 rounded-xl ${saved ? "bg-gray-400 text-white" : "bg-black text-white"} hover:opacity-90 transition`}
                    >
                        {saving ? "Saving..." : saved ? "Saved" : "Save"}
                    </button>

                    <button
                        onClick={handleReport}
                        className={`px-6 py-3 rounded-xl ${reported ? "bg-gray-400 text-white" : "bg-red-600 text-white"} hover:opacity-90 transition`}
                    >
                        {reporting ? "Reporting..." : reported ? "Reported" : "Report"}
                    </button>
                    <button
                        onClick={handleContact}
                        className="px-6 py-3 rounded-xl text-white bg-green-600 hover:opacity-90 transition"
                    >
                        Contact Seller
                    </button>

                </div>
                {fullscreenImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
                        onClick={() => setFullscreenImage(null)}
                    >
                        <img
                            src={fullscreenImage}
                            alt="Full Screen"
                            className="max-h-[90%] max-w-[90%] rounded-xl shadow-lg"
                            onClick={(e) => e.stopPropagation()} // prevent closing when clicking image
                        />

                        {/* Close Button */}
                        <button
                            onClick={() => setFullscreenImage(null)}
                            className="absolute top-6 right-6 text-white text-3xl font-bold"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <TermsButton />
            </div>

        </div>

    );
}
