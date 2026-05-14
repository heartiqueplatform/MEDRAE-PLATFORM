"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
// --- NEW ---
import {
    ArrowLeft, FileText, Phone, Tag, CheckCircle2,
    DollarSign, MapPin, Truck, Calendar, Image as ImageIcon,
    Loader2, CheckCircle, Info, Lock, Sparkles, X // Added Lock, Sparkles, X
} from 'lucide-react'

export default function CreateListingPage({ user, profile }: any) {
    const navigate = useNavigate();
    // NEW states for subscription logic
    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);
    // --- Form state ---
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("textbook");
    const [subcategory, setSubcategory] = useState(""); // NEW
    const [condition, setCondition] = useState("new");
    const [price, setPrice] = useState("");
    const [negotiable, setNegotiable] = useState(false);
    const [meetingLocation, setMeetingLocation] = useState("");
    const [deliveryAvailable, setDeliveryAvailable] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const removeImage = (indexToRemove: number) => {
        const updatedImages = images.filter((_, index) => index !== indexToRemove);
        const updatedPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);

        setImages(updatedImages);
        setImagePreviews(updatedPreviews);
    };
    const [expiresAt, setExpiresAt] = useState(""); // NEW optional expiry
    const [whatsappNumber, setWhatsappNumber] = useState(profile?.phone || "+254");
    // --- UI state ---
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    useEffect(() => {
        const checkSubscription = async () => {
            if (!user?.id) return;
            try {
                const { data: sub, error } = await supabase
                    .from("subscriptions")
                    .select("plan_type, is_active, expires_at")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (sub && !error) {
                    const now = new Date();
                    const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
                    const isPaid = sub.plan_type === 'pro' || sub.plan_type === 'premium';
                    const isActive = sub.is_active === true;
                    const notExpired = expiry ? expiry > now : true;

                    if (isPaid && isActive && notExpired) {
                        setIsPremium(true);
                    }
                }
            } catch (err) {
                console.error("Subscription check failed", err);
            } finally {
                setCheckingSub(false);
            }
        };
        checkSubscription();
    }, [user]);
    // --- Redirect if not logged in ---
    useEffect(() => {
        if (!user || !profile) {
            toast.error("You must be logged in to create a listing!");
            navigate("/login");
        }
    }, [user, profile]);

    // --- Image upload ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files);
        setImages(files);

        // Create preview URLs
        const previewUrls = files.map((file) => URL.createObjectURL(file));
        setImagePreviews(previewUrls);
    };
    const uploadImages = async (files: File[]) => {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress(`Uploading image ${i + 1} of ${files.length}...`);
            const fileName = `${user.id}/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage
                .from("market-images")
                .upload(fileName, file);
            if (error) throw error;

            const { data } = supabase.storage
                .from("market-images")
                .getPublicUrl(fileName);

            urls.push(data.publicUrl);
        }
        return urls;
    };

    // --- Form submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !profile?.name) {
            toast.error("User or profile data missing!");
            return;
        }
        if (!title || !description || !price || images.length === 0) {
            toast.error("Please fill all required fields and upload at least 1 image.");
            return;
        }

        setLoading(true);
        try {
            const imageUrls = await uploadImages(images);

            setUploadProgress("Saving listing...");
            const { data: listingData, error: listingError } = await supabase
                .from("market_listings")
                .insert([
                    {
                        title,
                        description,
                        category,
                        subcategory: subcategory || null, // NEW
                        condition,
                        price: parseFloat(price),
                        negotiable,
                        seller_id: user.id,
                        seller_name: profile.name,
                        seller_username: profile.username || null,
                        seller_phone: whatsappNumber,
                        seller_role: profile.role,
                        seller_institution: profile.institution || null,
                        seller_county: profile.county || null,
                        seller_avatar: profile.avatar_url || null,
                        meeting_location: meetingLocation,
                        delivery_available: deliveryAvailable,
                        thumbnail_url: imageUrls[0],
                        image_urls: imageUrls,
                        status: "active",
                        is_approved: true,
                        expires_at: expiresAt
                            ? new Date(expiresAt)
                            : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // default 30 days
                    },
                ])
                .select()
                .single();

            if (listingError) throw listingError;

            setUploadProgress("Logging activity...");
            await supabase.from("market_activity").insert({
                listing_id: listingData.id,
                user_id: user.id,
                action: "create",
            });

            setUploadProgress("");
            toast.success("Listing uploaded successfully!");
            navigate("/market/my-listings");
        } catch (err: any) {
            console.error(err);
            toast.error("Something went wrong while creating listing.");
        } finally {
            setLoading(false);
            setUploadProgress("");
        }
    };

    return (

        <div className="min-h-screen bg-gray-50 dark:bg-background py-2 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Create New Listing
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Provide clear details and quality photos to attract serious buyers.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/market")}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all font-medium"
                    >
                        <ArrowLeft size={18} /> Back to NursMartt
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2">
                    {/* Section 1: Basic Information */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <FileText size={14} /> Basic Information
                            </h2>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Item Title</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Littmann Classic III Stethoscope"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">WhatsApp Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={whatsappNumber}
                                        onChange={(e) => {
                                            let val = e.target.value;
                                            if (!val.startsWith("+254")) val = "+254" + val.replace(/^(\+?254)?/, "");
                                            setWhatsappNumber(val);
                                        }}
                                        placeholder="+254712345678"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Description</label>
                                <textarea
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide details about condition, size, or edition..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Pricing & Classification */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Tag size={14} /> Pricing & Category
                            </h2>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Category</label>
                                <select
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="textbook">Textbook</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="uniform">Uniform</option>
                                    <option value="hostel_item">Hostel Item</option>
                                    <option value="nck_material">NCK Material</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Subcategory (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={subcategory}
                                    onChange={(e) => setSubcategory(e.target.value)}
                                    placeholder="e.g. Midwifery, Surgery"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Condition</label>
                                <select
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                >
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Price (KES)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="e.g. 1500"
                                        required
                                    />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={negotiable}
                                        onChange={(e) => setNegotiable(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Negotiable</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Logistics */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <MapPin size={14} /> Logistics
                            </h2>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Meeting Location</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={meetingLocation}
                                    onChange={(e) => setMeetingLocation(e.target.value)}
                                    placeholder="e.g. School Library, Main Gate"
                                />
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={deliveryAvailable}
                                        onChange={(e) => setDeliveryAvailable(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Truck size={16} className="text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Delivery Available</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Expires At (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Media */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl p-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-4">
                            <ImageIcon size={14} /> Photos
                        </h2>

                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                            <ImageIcon className="w-10 h-10 text-gray-400 mb-3" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload images</span>
                            <span className="text-xs text-gray-500 mt-1 text-center">Multiple high-quality photos help sell faster</span>
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} required className="hidden" />
                        </label>

                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group shadow-sm">
                                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        {uploadProgress && (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium animate-pulse">
                                <Loader2 className="animate-spin" size={16} /> {uploadProgress}
                            </div>
                        )}
                        {/* SECTION: POST / LOCK LOGIC */}
                        <div className="space-y-4 relative">
                            {/* 1. FLOATING LOCK OVERLAY */}
                            {showLockOverlay && (
                                <div className="absolute bottom-full left-0 right-0 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                                    <div className="bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-2xl p-6 shadow-2xl mx-auto max-w-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px] tracking-widest">
                                                <Sparkles size={14} /> NursMartt Verified Seller
                                            </div>
                                            <button type="button" onClick={() => setShowLockOverlay(false)}>
                                                <X size={18} className="text-gray-400 hover:text-gray-600" />
                                            </button>
                                        </div>

                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                            Unlock Selling Privileges
                                        </h3>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                            To maintain a safe marketplace and prevent scam listings, only <b>Medrae Pro</b> members can post items for sale.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => navigate('/subscription')}
                                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            Upgrade to Post Listings
                                        </button>
                                    </div>
                                    {/* Arrow pointing down */}
                                    <div className="w-4 h-4 bg-white dark:bg-gray-900 border-r-2 border-b-2 border-blue-500 rotate-45 mx-auto -mt-2"></div>
                                </div>
                            )}

                            {uploadProgress && (
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium animate-pulse">
                                    <Loader2 className="animate-spin" size={16} /> {uploadProgress}
                                </div>
                            )}

                            {/* 2. THE MAIN ACTION BUTTON */}
                            <button
                                type={isPremium ? "submit" : "button"}
                                onClick={() => {
                                    if (!isPremium) setShowLockOverlay(true);
                                }}
                                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]
            ${isPremium
                                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none"
                                        : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default shadow-none"
                                    }`}
                                disabled={loading || checkingSub}
                            >
                                {loading ? (
                                    <> <Loader2 className="animate-spin" size={20} /> Posting Listing... </>
                                ) : (
                                    <>
                                        {isPremium ? <CheckCircle size={20} /> : <Lock size={20} />}
                                        {isPremium ? "Post Listing to Market" : " Unlock Selling Privileges"}
                                    </>
                                )}
                            </button>

                            <div className="flex justify-center">
                                <TermsButton />
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <TermsButton />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}