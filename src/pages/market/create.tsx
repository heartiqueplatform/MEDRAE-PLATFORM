"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    FileText,
    Tag,
    CheckCircle2,
    DollarSign,
    MapPin,
    Truck,
    Image as ImageIcon,
    Loader2,
    CheckCircle,
    ArrowLeft,
    Phone
} from "lucide-react";

export default function CreateListingPage({ user, profile }: any) {
    const navigate = useNavigate();

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
    const [expiresAt, setExpiresAt] = useState(""); // NEW optional expiry
    const [whatsappNumber, setWhatsappNumber] = useState(profile?.phone || "+254");
    // --- UI state ---
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    // --- Redirect if not logged in ---
    useEffect(() => {
        if (!user || !profile) {
            toast.error("You must be logged in to create a listing!");
            navigate("/login");
        }
    }, [user, profile]);

    // --- Image upload ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setImages(Array.from(e.target.files));
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
        <div className="max-w-3xl mx-auto py-10 px-6">
            {/* Back Button */}
            <button
                onClick={() => navigate("/market")}
                className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm"
            >
                <ArrowLeft size={18} /> Back to NurseMart
            </button>

            <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">
                Create New Listing
            </h1>

            {/* Main Card */}
            <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <FileText className="text-blue-500 dark:text-blue-400" size={20} />
                        <label className="block font-medium text-black dark:text-white">Title</label>
                    </div>
                    <input
                        type="text"
                        className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    {/* WhatsApp / Contact Number */}
                    {/* WhatsApp / Contact Number */}
                    <div className="flex items-center gap-2 mt-2">
                        <Phone className="text-green-600 dark:text-green-400" size={20} />
                        <label className="font-medium text-black dark:text-white">WhatsApp Number</label>
                    </div>
                    <input
                        type="text"
                        className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                        value={whatsappNumber}
                        onChange={(e) => {
                            let val = e.target.value;
                            // always keep +254 prefix if user deletes
                            if (!val.startsWith("+254")) val = "+254" + val.replace(/^(\+?254)?/, "");
                            setWhatsappNumber(val);
                        }}
                        placeholder="+254712345678"
                        required
                    />
                    {/* Description */}
                    <div className="flex items-center gap-2 mt-4">
                        <FileText className="text-green-500 dark:text-green-400" size={20} />
                        <label className="block font-medium text-black dark:text-white">Description</label>
                    </div>
                    <textarea
                        className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />

                    {/* Grid Inputs */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* Category */}
                        <div className="flex items-center gap-2">
                            <Tag className="text-purple-600 dark:text-purple-400" size={20} />
                            <label className="font-medium text-black dark:text-white">Category</label>
                        </div>
                        <select
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            <option value="textbook">Textbook</option>
                            <option value="equipment">Equipment</option>
                            <option value="uniform">Uniform</option>
                            <option value="hostel_item">Hostel Item</option>
                            <option value="nck_material">NCK Material</option>
                        </select>

                        {/* Subcategory */}
                        <div className="flex items-center gap-2">
                            <Tag className="text-purple-400 dark:text-purple-300" size={20} />
                            <label className="font-medium text-black dark:text-white">Subcategory (Optional)</label>
                        </div>
                        <input
                            type="text"
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                        />

                        {/* Condition */}
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-orange-500 dark:text-orange-400" size={20} />
                            <label className="font-medium text-black dark:text-white">Condition</label>
                        </div>
                        <select
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                        >
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                        </select>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                            <DollarSign className="text-green-700 dark:text-green-400" size={20} />
                            <label className="font-medium text-black dark:text-white">Price (KES)</label>
                        </div>
                        <input
                            type="number"
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />

                        {/* Negotiable */}
                        <div className="flex items-center gap-2 mt-2 col-span-2">
                            <input
                                type="checkbox"
                                checked={negotiable}
                                onChange={(e) => setNegotiable(e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-black dark:text-white">Negotiable</span>
                        </div>

                        {/* Meeting Location */}
                        <div className="flex items-center gap-2 mt-2">
                            <MapPin className="text-red-600 dark:text-red-400" size={20} />
                            <label className="font-medium text-black dark:text-white">Meeting Location</label>
                        </div>
                        <input
                            type="text"
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={meetingLocation}
                            onChange={(e) => setMeetingLocation(e.target.value)}
                        />

                        {/* Delivery */}
                        <div className="flex items-center gap-2 mt-2 col-span-2">
                            <Truck className="text-blue-500 dark:text-blue-400" size={20} />
                            <span className="text-black dark:text-white">Delivery Available</span>
                            <input
                                type="checkbox"
                                checked={deliveryAvailable}
                                onChange={(e) => setDeliveryAvailable(e.target.checked)}
                                className="ml-2"
                            />
                        </div>

                        {/* Expiry Date */}
                        <div className="flex items-center gap-2 mt-2">
                            <CheckCircle className="text-gray-600 dark:text-gray-400" size={20} />
                            <label className="font-medium text-black dark:text-white">Expires At (Optional)</label>
                        </div>
                        <input
                            type="date"
                            className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>

                    {/* Images */}
                    <div className="flex items-center gap-2 mt-4">
                        <ImageIcon className="text-pink-600 dark:text-pink-400" size={20} />
                        <label className="font-medium text-black dark:text-white">Images (at least 1)</label>
                    </div>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        required
                        className="border rounded px-3 py-2 w-full bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-black dark:text-white"
                    />

                    {/* Upload Progress */}
                    {uploadProgress && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 mt-2">
                            <Loader2 className="animate-spin" size={18} /> {uploadProgress}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        className="bg-black dark:bg-white dark:text-black text-white px-6 py-3 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 mt-4"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} /> Posting...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} /> Post Listing
                            </>
                        )}
                    </button>
                </form>
            </div>

            <TermsButton />
        </div>
    );
}