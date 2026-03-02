"use client";
import { TermsButton } from "@/components/ui/TermsButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { ArrowLeft } from "lucide-react"; // Add at the top with other imports
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
        <div className={`max-w-8xl   py-0 px-3 ${theme === "dark" ? "text-white" : "text-black"}`}>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                {/* Title */}
                <h1 className="text-3xl font-bold">My Listings</h1>

                {/* Tabs / Buttons */}
                <div className="flex gap-2 flex-wrap">
                    {["active", "sold", "expired"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-xl font-semibold ${activeTab === tab
                                ? "bg-black text-white"
                                : "bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>

                    ))}
                </div>
                <button
                    onClick={() => navigate("/market")}
                    className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
                >
                    <ArrowLeft size={18} />
                    Back to NursMartt
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20">Loading...</div>
            ) : listings.length === 0 ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                    No {activeTab} listings. <br />
                    <button
                        onClick={() => navigate("/market/create")}
                        className="mt-4 px-4 py-2 bg-black text-white rounded-xl hover:opacity-90 transition"
                    >
                        Add a Listing
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-3 gap-2">
                    {listings.map((l) => (
                        <div key={l.id} className="bg-white dark:bg-gray-900 shadow rounded-xl overflow-hidden">
                            {l.thumbnail_url ? (
                                <img src={l.thumbnail_url} className="h-48 w-full object-cover" />
                            ) : (
                                <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-300">
                                    No Image
                                </div>
                            )}
                            <div className="p-4 space-y-2">
                                <h2 className="font-semibold text-lg truncate">{l.title}</h2>
                                <p className="text-gray-500 dark:text-gray-400">{l.category} • {l.condition}</p>
                                <div className="font-bold text-xl">{l.currency || "KES"} {l.price}</div>

                                <div className="flex gap-2 mt-4 flex-wrap">
                                    {activeTab !== "active" && (
                                        <button
                                            onClick={() => handleRepost(l)}
                                            className="px-3 py-1 bg-green-600 text-white rounded-xl hover:opacity-90 transition"
                                        >
                                            Repost
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(l.id)}
                                        className="px-3 py-1 bg-red-600 text-white rounded-xl hover:opacity-90 transition"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <TermsButton />
        </div>
    );
}