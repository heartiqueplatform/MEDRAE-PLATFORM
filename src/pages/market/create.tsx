"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    ArrowLeft, FileText, Phone, Tag, CheckCircle2,
    DollarSign, MapPin, Truck, Calendar, Image as ImageIcon,
    Loader2, CheckCircle, Info, Lock, Sparkles, X
} from 'lucide-react'

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dpj5vprwf';
const CLOUDINARY_UPLOAD_PRESET = 'medrae-market';

export default function CreateListingPage({ user, profile }: any) {
    const navigate = useNavigate();

    // Subscription states
    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("textbook");
    const [subcategory, setSubcategory] = useState("");
    const [condition, setCondition] = useState("new");
    const [price, setPrice] = useState("");
    const [negotiable, setNegotiable] = useState(false);
    const [meetingLocation, setMeetingLocation] = useState("");
    const [deliveryAvailable, setDeliveryAvailable] = useState(false);

    // Image state - Store files for later upload
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [expiresAt, setExpiresAt] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState(profile?.phone || "+254");

    // UI state
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    // Cloudinary upload function
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'medrae/market');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    };

    // Check subscription
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

    // Redirect if not logged in
    useEffect(() => {
        if (!user || !profile) {
            toast.error("You must be logged in to create a listing!");
            navigate("/login");
        }
    }, [user, profile]);

    // Handle file selection - preview only, NO upload yet
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files);

        // Validate files
        const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
        if (invalidFiles.length > 0) {
            toast.error('Please upload only image files');
            return;
        }

        const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast.error('Images must be less than 5MB each');
            return;
        }

        // Limit to 5 images
        if (files.length + images.length > 5) {
            toast.error('Maximum 5 photos allowed');
            return;
        }

        // Store files for later upload
        setImages([...images, ...files]);

        // Create preview URLs (no upload yet)
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews([...imagePreviews, ...newPreviews]);

        toast.success(`${files.length} image(s) selected. Will upload when you post.`);
    };

    // Remove image
    const removeImage = (indexToRemove: number) => {
        const updatedImages = images.filter((_, index) => index !== indexToRemove);
        const updatedPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);

        setImages(updatedImages);
        setImagePreviews(updatedPreviews);
        setUploadedUrls(uploadedUrls.filter((_, index) => index !== indexToRemove));
    };

    // Form submit - upload images AND create listing
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
        setUploadProgress("Starting upload...");

        try {
            let imageUrls: string[] = [];

            // Upload images to Cloudinary NOW (during submit)
            if (images.length > 0) {
                setUploadingImage(true);
                setUploadProgress(`Uploading ${images.length} image(s)...`);

                try {
                    // Upload each image to Cloudinary
                    for (let i = 0; i < images.length; i++) {
                        setUploadProgress(`Uploading image ${i + 1} of ${images.length}...`);
                        const url = await uploadToCloudinary(images[i]);
                        imageUrls.push(url);
                    }
                    setUploadedUrls(imageUrls);
                    toast.success('Images uploaded successfully!');
                } catch (error) {
                    console.error('Upload error:', error);
                    toast.error('Failed to upload images. Please try again.');
                    setUploadingImage(false);
                    setLoading(false);
                    return;
                } finally {
                    setUploadingImage(false);
                }
            }

            setUploadProgress("Saving listing...");

            // Create listing in Supabase with Cloudinary URLs
            const { data: listingData, error: listingError } = await supabase
                .from("market_listings")
                .insert([
                    {
                        title,
                        description,
                        category,
                        subcategory: subcategory || null,
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
                        thumbnail_url: imageUrls[0] || null,
                        image_urls: imageUrls,
                        status: "active",
                        is_approved: true,
                        expires_at: expiresAt
                            ? new Date(expiresAt)
                            : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
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
            toast.success("Listing uploaded successfully! 🎉");
            navigate("/market/my-listings");

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Something went wrong while creating listing.");
        } finally {
            setLoading(false);
            setUploadProgress("");
            setUploadingImage(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background py-3 md:py-6 px-0 md:px-4">
            <div className="md:max-w-full md:px-4 lg:px-6 mx-auto">
                {/* Header Section - Mobile Native */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 px-3 md:px-0 pb-3 md:pb-4 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Create New Listing
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">
                            Provide clear details and quality photos to attract serious buyers.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/market")}
                        className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all font-medium text-sm"
                    >
                        <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" /> Back to NursMartt
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 px-0 md:px-0">
                    {/* Section 1: Basic Information - Mobile Native */}
                    <div className="bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 shadow-none md:shadow-sm rounded-none md:rounded-2xl overflow-hidden border-b md:border-b md:border-gray-100 dark:border-gray-800">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <FileText size={12} className="md:w-3.5 md:h-3.5" /> Basic Information
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Item Title</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Littmann Classic III Stethoscope"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">WhatsApp Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} className="md:w-[18px] md:h-[18px]" />
                                    <input
                                        type="text"
                                        className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 md:pl-12 pr-3.5 md:pr-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Description</label>
                                <textarea
                                    rows={4}
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide details about condition, size, or edition..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Pricing & Classification - Mobile Native */}
                    <div className="bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 shadow-none md:shadow-sm rounded-none md:rounded-2xl overflow-hidden border-b md:border-b md:border-gray-100 dark:border-gray-800">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <Tag size={12} className="md:w-3.5 md:h-3.5" /> Pricing & Category
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Category</label>
                                <select
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Subcategory (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={subcategory}
                                    onChange={(e) => setSubcategory(e.target.value)}
                                    placeholder="e.g. Midwifery, Surgery"
                                />
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Condition</label>
                                <select
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Price (KES)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} className="md:w-[18px] md:h-[18px]" />
                                    <input
                                        type="number"
                                        className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 md:pl-12 pr-3.5 md:pr-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="e.g. 1500"
                                        required
                                    />
                                </div>
                                <div className="mt-2.5 md:mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={negotiable}
                                        onChange={(e) => setNegotiable(e.target.checked)}
                                        className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Negotiable</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Logistics - Mobile Native */}
                    <div className="bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 shadow-none md:shadow-sm rounded-none md:rounded-2xl overflow-hidden border-b md:border-b md:border-gray-100 dark:border-gray-800">
                        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <MapPin size={12} className="md:w-3.5 md:h-3.5" /> Logistics
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Meeting Location</label>
                                <input
                                    type="text"
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={meetingLocation}
                                    onChange={(e) => setMeetingLocation(e.target.value)}
                                    placeholder="e.g. School Library, Main Gate"
                                />
                                <div className="mt-2.5 md:mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={deliveryAvailable}
                                        onChange={(e) => setDeliveryAvailable(e.target.checked)}
                                        className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Truck size={14} className="md:w-4 md:h-4 text-gray-400" />
                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Delivery Available</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">Expires At (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Media - Mobile Native */}
                    <div className="bg-white dark:bg-gray-900 border-0 md:border border-gray-200 dark:border-gray-800 shadow-none md:shadow-sm rounded-none md:rounded-2xl overflow-hidden border-b md:border-b md:border-gray-100 dark:border-gray-800 p-4 md:p-6">
                        <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                            <ImageIcon size={12} className="md:w-3.5 md:h-3.5" /> Photos (Max 5)
                        </h2>

                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg md:rounded-2xl p-6 md:p-10 bg-gray-50/50 dark:bg-gray-800/50 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                            <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mb-2 md:mb-3" />
                            <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload images</span>
                            <span className="text-[10px] md:text-xs text-gray-500 mt-1 text-center">Multiple high-quality photos help sell faster</span>
                            {images.length > 0 && (
                                <span className="text-[10px] md:text-xs text-blue-500 mt-1.5 md:mt-2">
                                    {images.length} image(s) selected. Will upload on post.
                                </span>
                            )}
                            <input type="file" multiple accept="image/*" onChange={handleFileChange} required className="hidden" />
                        </label>

                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4 md:mt-6">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group shadow-sm">
                                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                        {uploadedUrls[index] && (
                                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[7px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded">
                                                ✓ Uploaded
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 md:top-2 right-1 md:right-2 bg-black/70 text-white rounded-full p-1 md:p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} className="md:w-3.5 md:h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Mobile Native */}
                    <div className="space-y-3 md:space-y-4 px-3 md:px-0 pb-4 md:pb-0">
                        {uploadProgress && (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium animate-pulse">
                                <Loader2 className="animate-spin" size={14} className="md:w-4 md:h-4" /> {uploadProgress}
                            </div>
                        )}

                        {/* SECTION: POST / LOCK LOGIC */}
                        <div className="space-y-3 md:space-y-4 relative">
                            {/* FLOATING LOCK OVERLAY - Mobile Optimized */}
                            {showLockOverlay && (
                                <div className="absolute bottom-full left-0 right-0 mb-3 md:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                                    <div className="bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl mx-2 md:mx-0 max-w-sm md:max-w-md">
                                        <div className="flex justify-between items-start mb-2 md:mb-3">
                                            <div className="flex items-center gap-1.5 md:gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                                                <Sparkles size={12} className="md:w-3.5 md:h-3.5" /> NursMartt Verified Seller
                                            </div>
                                            <button type="button" onClick={() => setShowLockOverlay(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                                <X size={16} className="md:w-[18px] md:h-[18px] text-gray-400 hover:text-gray-600" />
                                            </button>
                                        </div>

                                        <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                                            Unlock Selling Privileges
                                        </h3>
                                        <p className="text-[10px] md:text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 md:mt-2 leading-relaxed">
                                            To maintain a safe marketplace and prevent scam listings, only <b>Medrae Pro</b> members can post items for sale.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => navigate('/subscription')}
                                            className="w-full mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-bold py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            Upgrade to Post Listings
                                        </button>
                                    </div>
                                    <div className="w-3 h-3 md:w-4 md:h-4 bg-white dark:bg-gray-900 border-r-2 border-b-2 border-blue-500 rotate-45 mx-auto -mt-1.5 md:-mt-2"></div>
                                </div>
                            )}

                            {/* THE MAIN ACTION BUTTON */}
                            <button
                                type={isPremium ? "submit" : "button"}
                                onClick={() => {
                                    if (!isPremium) setShowLockOverlay(true);
                                }}
                                className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm md:text-base
                                    ${isPremium
                                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none"
                                        : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default shadow-none"
                                    }`}
                                disabled={loading || checkingSub || uploadingImage}
                            >
                                {loading || uploadingImage ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} className="md:w-5 md:h-5" />
                                        <span>{uploadingImage ? 'Uploading Images...' : 'Posting Listing...'}</span>
                                    </>
                                ) : (
                                    <>
                                        {isPremium ? <CheckCircle size={18} className="md:w-5 md:h-5" /> : <Lock size={18} className="md:w-5 md:h-5" />}
                                        <span>{isPremium ? "Post Listing to Market" : "Unlock Selling Privileges"}</span>
                                    </>
                                )}
                            </button>

                            <div className="flex justify-center py-2">
                                <TermsButton />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}