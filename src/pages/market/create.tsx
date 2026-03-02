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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-0 px-2 bg-white/0 dark:bg-gray-900/0">
            <div className="max-w-4xl mx-auto ">
                {/* Back Button */}

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-10 hover:shadow-2xl transition-all duration-300">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-between items-center mb-8">
                            {/* Heading on the left */}
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                Create New Listing
                            </h1>

                            {/* Back Button on the right */}
                            <button
                                onClick={() => navigate("/market")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900"
                            >
                                <ArrowLeft size={18} /> Back to NursMartt
                            </button>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            Provide clear details and quality photos to attract serious buyers.
                        </p>
                        {/* Basic Information Section */}
                        <div className="pt-2">
                            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-4">
                                Basic Information
                            </h2>
                            <div className="space-y-4"></div>
                            {/* Title */}
                            <div className="flex items-center gap-2">
                                <FileText className="" size={20} />
                                <label className="block font-medium text-black dark:text-white">Item title</label>
                            </div>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter the name of the item"
                                required
                            />
                            {/* WhatsApp / Contact Number */}
                            {/* WhatsApp / Contact Number */}
                            <div className="flex items-center gap-2 mt-2">
                                <Phone className="" size={20} />
                                <label className="font-medium text-black dark:text-white">WhatsApp Number</label>
                            </div>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                <FileText className="" size={20} />
                                <label className="block font-medium text-black dark:text-white">Item description</label>
                            </div>
                            <textarea
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide details about the item, condition, and any special features"
                                required
                            />
                        </div>
                        {/* Pricing & Details Section */}
                        <div className="pt-12 border-t border-gray-200 dark:border-gray-800 border-gray-200 dark:border-gray-800">
                            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-400 dark:text-gray-400 mb-6">
                                Pricing & Details
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6"></div>
                            {/* Grid Inputs */}
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                {/* Category */}
                                <div className="flex items-center gap-2">
                                    <Tag className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Category</label>
                                </div>
                                <select
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    <Tag className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Subcategory (Optional)</label>
                                </div>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={subcategory}
                                    onChange={(e) => setSubcategory(e.target.value)}
                                />

                                {/* Condition */}
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Condition</label>
                                </div>
                                <select
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    onChange={(e) => setCondition(e.target.value)}
                                >
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                </select>

                                {/* Price */}
                                <div className="flex items-center gap-2">
                                    <DollarSign className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Price (KES)</label>
                                </div>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="Enter the price in KES, e.g., 1500"
                                    required
                                />

                                {/* Negotiable */}
                                <div className="flex items-center gap-2 mt-2 col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={negotiable}
                                        onChange={(e) => setNegotiable(e.target.checked)}
                                        className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition"
                                    />
                                    <span className="text-black dark:text-white">Negotiable</span>
                                </div>

                                {/* Meeting Location */}
                                <div className="flex items-center gap-2 mt-2">
                                    <MapPin className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Meeting Location</label>
                                </div>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={meetingLocation}
                                    onChange={(e) => setMeetingLocation(e.target.value)}
                                    placeholder="Enter the location where buyers can meet"
                                />

                                {/* Delivery */}
                                <div className="flex items-center gap-2 mt-2 col-span-2">


                                    <input
                                        type="checkbox"
                                        checked={deliveryAvailable}
                                        onChange={(e) => setDeliveryAvailable(e.target.checked)}
                                        className="h-5 w-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition"
                                    />
                                    <Truck className="" size={20} />
                                    <span className="text-black dark:text-white">Delivery Available</span>
                                </div>

                                {/* Expiry Date */}
                                <div className="flex items-center gap-2 mt-2">
                                    <CheckCircle className="" size={20} />
                                    <label className="font-medium text-black dark:text-white">Expires At (Optional)</label>
                                </div>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>
                        {/* Photos Section */}
                        <div className="pt-12 border-t border-gray-200 dark:border-gray-800">
                            <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-400 mb-6">
                                Photos
                            </h2>

                            <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:border-blue-500 transition-all duration-200">

                                <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />

                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Click to upload images
                                </span>

                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    You can upload multiple high-quality photos
                                </span>

                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    required
                                    className="hidden"
                                />
                            </label>
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                                    {imagePreviews.map((src, index) => (
                                        <div
                                            key={index}
                                            className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group"
                                        >
                                            <img
                                                src={src}
                                                alt={`Preview ${index}`}
                                                className="w-full h-40 object-cover"
                                            />

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}


                        </div>
                        {/* Upload Progress */}
                        {uploadProgress && (
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 mt-2">
                                <Loader2 className="animate-spin" size={18} /> {uploadProgress}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
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
                    <TermsButton />
                </div>

            </div >

        </div >
    );
}