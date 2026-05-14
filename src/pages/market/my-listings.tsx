"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { ArrowLeft, Loader2, Package, Plus, RefreshCw, Trash2 } from "lucide-react"; // Add at the top with other imports
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

    // Show loading until user is available
    if (!user) return <div className="text-center py-20">Loading user info...</div>;

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
        <div className={`min-h-screen bg-gray-50 dark:bg-background py-8 px-4 ${theme === "dark" ? "text-white" : "text-black"}`}>
            <div className="max-w-6xl mx-auto">

                {/* TOP NAVIGATION & TITLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold tracking-tight">My Listings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track your items on NursMartt</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/market")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-sm"
                        >
                            <ArrowLeft size={18} />
                            Back to Market
                        </button>
                        <button
                            onClick={() => navigate("/market/create")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all font-bold text-sm"
                        >
                            <Plus size={18} />
                            New Listing
                        </button>
                    </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex justify-center mb-1">
                    <div className="flex p-1.5 bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl w-full md:w-fit border border-gray-200 dark:border-gray-700">
                        {["active", "sold", "expired"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === tab
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT SECTION */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                        <p className="text-gray-500 font-medium animate-pulse">Retrieving your listings...</p>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl py-20 px-6 text-center">
                        <div className="bg-gray-50 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package size={30} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No {activeTab} listings found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">
                            You don't have any items currently marked as {activeTab}.
                        </p>
                        <button
                            onClick={() => navigate("/market/create")}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-bold hover:scale-105 transition-all"
                        >
                            Create your first listing
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((l) => (
                            <div
                                key={l.id}
                                className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                            >
                                {/* Image Section */}
                                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    {l.thumbnail_url ? (
                                        <img
                                            src={l.thumbnail_url}
                                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-gray-400 italic text-sm">
                                            No image available
                                        </div>
                                    )}

                                    {/* Status Tag */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${activeTab === 'active' ? 'bg-green-500 text-white' :
                                            activeTab === 'sold' ? 'bg-gray-600 text-white' : 'bg-red-500 text-white'
                                            }`}>
                                            {activeTab}
                                        </span>
                                    </div>
                                </div>

                                {/* Details Section */}
                                <div className="p-5">
                                    <h2 className="font-bold text-lg truncate mb-1 text-gray-900 dark:text-white">
                                        {l.title}
                                    </h2>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-tighter mb-4">
                                        {l.category} • {l.condition}
                                    </p>

                                    <div className="flex items-end justify-between mb-6">
                                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                            <span className="text-xs font-bold mr-1">{l.currency || "KES"}</span>
                                            {Number(l.price).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Dashboard Buttons */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        {activeTab !== "active" && (
                                            <button
                                                onClick={() => handleRepost(l)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                <RefreshCw size={16} />
                                                Repost
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(l.id)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            <Trash2 size={16} />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-16 py-10 border-t border-gray-100 dark:border-gray-900 flex justify-center">
                    <TermsButton />
                </div>
            </div>
        </div>
    );
}