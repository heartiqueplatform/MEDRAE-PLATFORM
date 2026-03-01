"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { TermsButton } from "@/components/ui/TermsButton";
import {
    Heart,
    Phone,
    CheckCircle,
    Trash2,
    Pencil,
} from "lucide-react";

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
                .single();

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

    if (hasAccess === false) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-start z-50 text-white p-6">
                {/* HEADER — Logo + Page Title */}
                <div className="flex items-center gap-8 mb-6">
                    <img
                        src="/Nurvia_logo.png"
                        alt="Nurvia Logo"
                        className="h-10 w-10 object-contain"
                    />
                    <h1 className="text-4xl font-bold">NursMartt</h1>
                </div>

                {/* OVERLAY CONTENT */}
                <div className="flex flex-col items-center justify-center flex-1 w-full text-center space-y-4">
                    <h2 className="text-3xl font-bold">Access Restricted</h2>
                    <p className="text-md text-gray-300 max-w-md">
                        This page is currently under construction and available only for premium nursing students.
                    </p>

                    {/* INFO SECTION */}
                    <div className="bg-gray-900 bg-opacity-70 p-5 rounded-xl max-w-md space-y-2 text-left">
                        <h3 className="text-xl font-semibold mb-2">What’s Coming</h3>
                        <ul className="list-disc list-inside text-gray-200 space-y-1">
                            <li>Listings from fellow nursing students and nurses selling second-hand items.</li>
                            <li>Textbooks, uniforms, NCK materials, and hostel essentials for your studies.</li>
                            <li>Real-time updates so you never miss newly added items.</li>
                            <li>Save your favorite listings for easy access later.</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:opacity-90 transition mt-4"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div className="max-w-8xl py-10 px-4">
            {/* HEADER — PRESERVED */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="flex items-center gap-2 text-4xl font-bold text-gray-900 dark:text-white">
                    <img
                        src="/Nurvia_logo.png"
                        alt="Nurvia Logo"
                        className="h-8 w-8 object-contain"
                    />
                    NursMartt
                </h1>

                <div className="flex gap-3 flex-wrap">
                    <select
                        className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-xl border-0"
                        value={categoryFilter || ""}
                        onChange={(e) =>
                            setCategoryFilter(e.target.value || null)
                        }
                    >
                        <option value="">All Categories</option>
                        <option value="textbook">Textbook</option>
                        <option value="equipment">Equipment</option>
                        <option value="uniform">Uniform</option>
                        <option value="hostel_item">Hostel Item</option>
                        <option value="nck_material">NCK Material</option>
                    </select>

                    <select
                        className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-white rounded-xl border-0"
                        value={conditionFilter || ""}
                        onChange={(e) =>
                            setConditionFilter(e.target.value || null)
                        }
                    >
                        <option value="">All Conditions</option>
                        <option value="new">New</option>
                        <option value="like_new">Like New</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                    </select>

                    <button
                        onClick={() => navigate("/market/create")}
                        className="px-4 py-2 bg-black text-white rounded-xl hover:opacity-90 transition dark:bg-gray-800 dark:text-white"
                    >
                        + Sell Item
                    </button>

                    <button
                        onClick={() => navigate("/market/my-listings")}
                        className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                    >
                        My Listings
                    </button>
                </div>
            </div>

            {/* GRID — PRESERVED */}
            {listings.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-20">
                    No listings found.
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-2">
                    {listings.map((l) => {
                        const isOwner = user?.id === l.seller_id;
                        const isSaved = savedIds.includes(l.id);

                        return (

                            <div
                                key={l.id}
                                className="bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden hover:shadow-lg transition"
                            >
                                {l.thumbnail_url ? (
                                    <img
                                        src={l.thumbnail_url}
                                        className="h-48 w-full object-cover cursor-pointer"
                                        onClick={() => navigate(`/market/${l.id}`)} // only image clickable
                                    />
                                ) : (
                                    <div
                                        className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-300 cursor-pointer"
                                        onClick={() => navigate(`/market/${l.id}`)} // only placeholder clickable
                                    >
                                        No Image
                                    </div>
                                )}

                                <div className="p-4 space-y-2">
                                    <div className="space-y-1">
                                        {l.is_featured && (
                                            <div className="bg-yellow-300 text-black px-3 py-1 rounded-xl inline-block font-bold">
                                                Featured
                                            </div>
                                        )}

                                        {l.status === "sold" && (
                                            <div className="bg-red-500 text-white px-3 py-1 rounded-xl inline-block font-bold">
                                                SOLD
                                            </div>
                                        )}
                                    </div>

                                    <h2
                                        className="font-semibold text-lg truncate text-gray-900 dark:text-white cursor-pointer"
                                        onClick={() => navigate(`/market/${l.id}`)} // only title clickable
                                    >
                                        {l.title}
                                    </h2>

                                    <p className="text-gray-500 dark:text-gray-300">
                                        {l.category} • {l.condition}
                                    </p>

                                    <div className="font-bold text-xl text-gray-900 dark:text-white">
                                        KES {l.price}
                                    </div>

                                    <div className="text-gray-500 text-sm dark:text-gray-300">
                                        Seller: {l.seller_name} ({l.seller_role})
                                    </div>
                                    <div className="text-gray-500 text-sm dark:text-gray-300 flex gap-4 mt-2">
                                        <div>{l.views_count} views</div>
                                        <div>{l.saves_count} saves</div>
                                        <div>{l.report_count} reports</div>
                                        <div>{l.contact_clicks} contacts</div>
                                    </div>
                                    {/* BUTTONS — PRESERVED */}
                                    <div className="flex gap-2 mt-4 flex-wrap">
                                        {!isOwner && (
                                            <>
                                                <button
                                                    onClick={(e) => handleSave(l, e)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded-xl"
                                                >
                                                    <Heart size={16} fill={isSaved ? "white" : "none"} />
                                                    {isSaved ? "Saved" : "Save"}
                                                </button>

                                                <button
                                                    onClick={(e) => handleContact(l, e)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-xl"
                                                >
                                                    <Phone size={16} />
                                                    Contact
                                                </button>
                                            </>
                                        )}

                                        {isOwner && (
                                            <>
                                                <button
                                                    onClick={(e) => markSold(l.id, e, l.status)}
                                                    className={`flex items-center gap-1 px-3 py-1 rounded-xl text-white ${l.status === "sold" ? "bg-gray-700" : "bg-green-600"
                                                        }`}
                                                >
                                                    <CheckCircle size={16} />
                                                    {l.status === "sold" ? "Sold" : "Mark Sold"}
                                                </button>

                                                <button
                                                    onClick={(e) => deleteListing(l.id, e)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-xl"
                                                    disabled={deletingIds.includes(l.id)}
                                                >
                                                    {deletingIds.includes(l.id) ? "Remove..." : <><Trash2 size={16} /> Remove</>}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            <TermsButton />
        </div >
    );
}