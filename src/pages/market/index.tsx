"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { GlobalLoader } from "@/components/GlobalLoader";
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
    report_count: number;   // <-- new
    views_count: number;    // <-- new
}

export default function MarketFeed({ user }: any) {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [conditionFilter, setConditionFilter] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<string[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null while checking
    useEffect(() => {
        const channel = supabase
            .channel("market-realtime")
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "market_listings",
                },
                (payload) => {
                    const deletedId = payload.old.id;

                    setListings((prev) =>
                        prev.filter((item) => item.id !== deletedId)
                    );
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    useEffect(() => {
        const checkSubscription = async () => {
            if (!user?.id) {
                setHasAccess(false);
                return;
            }

            const { data, error } = await supabase
                .from("subscriptions")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true)
                .gt("expires_at", new Date().toISOString()) // active and not expired
                .limit(1)
                .maybeSingle();

            if (error || !data) {
                setHasAccess(false);
            } else {
                setHasAccess(true);
            }
        };
        checkSubscription();
    }, [user]);

    useEffect(() => {
        if (user?.id) {
            fetchSaved(); // fetch saved listings for this user
        }
    }, [user]);
    useEffect(() => {
        fetchListings();
        if (user) fetchSaved();
    }, [categoryFilter, conditionFilter]);

    const fetchListings = async () => {
        setLoading(true);

        let query = supabase
            .from("market_listings")
            .select("*, saves_count, contact_clicks, report_count, views_count")
            .eq("is_approved", true)
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) {
            toast.error("Failed to load listings.");
            setLoading(false);
            return;
        }

        let filtered = data || [];

        if (categoryFilter)
            filtered = filtered.filter((l) => l.category === categoryFilter);

        if (conditionFilter)
            filtered = filtered.filter((l) => l.condition === conditionFilter);

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
        // Increment contact_clicks
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
        // Construct WhatsApp URL with prefilled message
        const phone = listing.seller_phone.replace(/\D/g, ""); // remove non-numeric chars
        const message = encodeURIComponent(
            `Hi ${listing.seller_name}, I am interested in your "${listing.title}" listed on NursMartt. Could we discuss?`
        );
        // Open WhatsApp Web / App
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
            setDeletingIds((prev) => [...prev, id]); // start indicator
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

    if (hasAccess === null) return <GlobalLoader />; // optional loader while checking
    { /*   if (hasAccess === false) {
        return (
           <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 text-white p-6 ">
            < div className = "fixed inset-0 bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center z-50 p-6 overflow-y-auto" >
                <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl p-8 text-center">
                    <div className="flex flex-col items-center mb-8">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4">
                            <img
                                src="/Nurvia_logo.png"
                                alt="Nurvia Logo"
                                className="h-16 w-16 object-contain"
                            />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">NursMartt</h1>
                        <div className="h-1 w-12 bg-blue-600 rounded-full mt-2"></div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Access Restricted</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        This specialized market for nursing students is currently under clinical development. We'll be live soon!
                    </p>

                    <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 mb-8 space-y-4 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">What to Expect</h3>
                        <ul className="space-y-3">
                            {[
                                "Second-hand nursing gear & textbooks",
                                "NCK study materials & uniforms",
                                "Real-time item availability updates",
                                "Safe contact options for buyers"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <CheckCircle className="text-blue-500 mt-0.5" size={16} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                    >
                        Go Back
                    </button>
                </div>
                </div >
            </div >
        );
    }
    */
    }

    return (
        <div className="max-w-5xl mx-auto py-6 px-4">
            {/* HEADER SECTION */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-3">
                    <img src="/Nurvia_logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">NursMartt</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Dropdowns */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <select
                            className="bg-transparent text-sm dark:bg-gray-800 font-semibold px-3 py-2 outline-none rounded-xl text-gray-700 dark:text-gray-200 cursor-pointer"
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
                        <div className="w-[1px] bg-gray-300 dark:bg-gray-600 my-2"></div>
                        <select
                            className="bg-transparent text-sm dark:bg-gray-800 font-semibold px-3 py-2 outline-none text-gray-700 dark:text-gray-200 cursor-pointer"
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
                    {/* Action Buttons */}
                    <button
                        onClick={() => navigate("/market/create")}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                        <Plus size={20} /> Sell Item
                    </button>
                    <button
                        onClick={() => navigate("/market/my-listings")}
                        className="px-5 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                        My Listings
                    </button>
                </div>
            </div>

            {/* GRID SECTION */}
            {listings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                        <Tag size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">No listings found</h3>
                    <p className="text-gray-500">Try adjusting your filters or be the first to post!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                    {listings.map((l) => {
                        const isOwner = user?.id === l.seller_id;
                        const isSaved = savedIds.includes(l.id);

                        return (
                            <div
                                key={l.id}
                                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-2xl transition-all duration-300"
                            >
                                {/* Image Container */}
                                <div className="relative h-56 w-full overflow-hidden">
                                    {l.thumbnail_url ? (
                                        <img
                                            src={l.thumbnail_url}
                                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                                            onClick={() => navigate(`/market/${l.id}`)}
                                        />
                                    ) : (
                                        <div
                                            className="h-full w-full bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400 gap-2 cursor-pointer"
                                            onClick={() => navigate(`/market/${l.id}`)}
                                        >
                                            <ImageIcon size={32} />
                                            <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
                                        </div>
                                    )}

                                    {/* Status Badges */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                        {l.is_featured && (
                                            <span className="bg-yellow-400 text-black text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">
                                                Featured
                                            </span>
                                        )}
                                        {l.status === "sold" && (
                                            <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">
                                                Sold Out
                                            </span>
                                        )}
                                    </div>

                                    {/* Category Badge Over Image */}
                                    <div className="absolute bottom-3 right-3">
                                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/20 uppercase">
                                            {l.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2
                                            className="font-bold text-xl text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                            onClick={() => navigate(`/market/${l.id}`)}
                                        >
                                            {l.title}
                                        </h2>
                                        <span className="text-xs font-bold px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                                            {l.condition}
                                        </span>
                                    </div>

                                    <div className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                                        <span className="text-sm font-normal text-gray-500 mr-1">KES</span>
                                        {Number(l.price).toLocaleString()}
                                    </div>

                                    {/* Seller Info */}
                                    <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                            {l.seller_name?.[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{l.seller_name}</span>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{l.seller_role}</span>
                                        </div>
                                    </div>

                                    {/* Dashboard Stats */}
                                    <div className="grid grid-cols-4 gap-2 py-3 border-t border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-900 dark:text-gray-200 text-xs">{l.views_count}</span>
                                            <span>Views</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-900 dark:text-gray-200 text-xs">{l.saves_count}</span>
                                            <span>Saves</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-900 dark:text-gray-200 text-xs">{l.contact_clicks}</span>
                                            <span>Inquiry</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-900 dark:text-gray-200 text-xs text-red-500">{l.report_count}</span>
                                            <span>Reports</span>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        {!isOwner && (
                                            <>
                                                <button
                                                    onClick={(e) => handleSave(l, e)}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all border ${isSaved
                                                        ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                                                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        }`}
                                                >
                                                    <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                                                    {isSaved ? "Saved" : "Save"}
                                                </button>

                                                <button
                                                    onClick={(e) => handleContact(l, e)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-100 dark:shadow-none transition-all"
                                                >
                                                    <Phone size={18} />
                                                    Chat
                                                </button>
                                            </>
                                        )}

                                        {isOwner && (
                                            <>
                                                <button
                                                    onClick={(e) => markSold(l.id, e, l.status)}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-white transition-all ${l.status === "sold" ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none"
                                                        }`}
                                                >
                                                    <CheckCircle size={18} />
                                                    {l.status === "sold" ? "Sold" : "Mark Sold"}
                                                </button>

                                                <button
                                                    onClick={(e) => deleteListing(l.id, e)}
                                                    className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                                    disabled={deletingIds.includes(l.id)}
                                                >
                                                    {deletingIds.includes(l.id) ? (
                                                        <Loader2 className="animate-spin" size={18} />
                                                    ) : (
                                                        <Trash2 size={18} />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-20 py-10 border-t border-gray-100 dark:border-gray-900 text-center">
                <TermsButton />
            </div>
        </div>
    );
}