"use client";

import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    ChevronLeft,
    FileText,
    Phone,
    Tag,
    CheckCircle,
    DollarSign,
    MapPin,
    Truck,
    Image as ImageIcon,
    Loader2,
    Lock,
    Sparkles,
    X,
} from "lucide-react";

const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae-market";

export default function CreateListingPage({ user, profile }: any) {
    const navigate = useNavigate();

    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("textbook");
    const [subcategory, setSubcategory] = useState("");
    const [condition, setCondition] = useState("new");
    const [price, setPrice] = useState("");
    const [negotiable, setNegotiable] = useState(false);
    const [meetingLocation, setMeetingLocation] = useState("");
    const [deliveryAvailable, setDeliveryAvailable] = useState(false);

    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [expiresAt, setExpiresAt] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState(
        profile?.phone || "+254"
    );

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    // Tracks fields that have validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Refs so we can automatically scroll to the first invalid field
    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const whatsappRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const imagesRef = useRef<HTMLLabelElement>(null);
    const expiresAtRef = useRef<HTMLInputElement>(null);

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", "medrae/market");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            let errorMessage = "Image upload failed.";

            try {
                const error = await response.json();
                errorMessage =
                    error?.error?.message || "Image upload failed.";
            } catch {
                // Keep default message
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!data?.secure_url) {
            throw new Error("Image uploaded but no image URL was returned.");
        }

        return data.secure_url;
    };

    useEffect(() => {
        const checkSubscription = async () => {
            if (!user?.id) {
                setCheckingSub(false);
                return;
            }

            try {
                const { data: sub, error } = await supabase
                    .from("subscriptions")
                    .select("plan_type, is_active, expires_at")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (sub && !error) {
                    const now = new Date();
                    const expiry = sub.expires_at
                        ? new Date(sub.expires_at)
                        : null;

                    const isPaid =
                        sub.plan_type === "pro" ||
                        sub.plan_type === "premium";

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

    useEffect(() => {
        if (!user || !profile) {
            toast.error("You must be logged in to create a listing!");
            navigate("/login");
        }
    }, [user, profile, navigate]);

    /*
     * Remove a specific validation error as the user fixes the field.
     */
    const clearError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;

            const updated = { ...prev };
            delete updated[field];
            return updated;
        });
    };

    /*
     * Validation helper.
     * Gives the user a specific message instead of silently failing.
     */
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanWhatsapp = whatsappNumber.trim();
        const cleanPrice = price.trim();

        if (!cleanTitle) {
            newErrors.title = "Please enter a title for your item.";
        } else if (cleanTitle.length < 3) {
            newErrors.title = "The item title must be at least 3 characters.";
        }

        if (!cleanWhatsapp || cleanWhatsapp === "+254") {
            newErrors.whatsapp =
                "Please enter your WhatsApp number so buyers can contact you.";
        } else if (!/^\+254\d{9}$/.test(cleanWhatsapp)) {
            newErrors.whatsapp =
                "Please enter a valid Kenyan number, e.g. +254712345678.";
        }

        if (!cleanDescription) {
            newErrors.description =
                "Please describe the item you are selling.";
        } else if (cleanDescription.length < 10) {
            newErrors.description =
                "Please provide a little more detail about the item.";
        }

        if (!cleanPrice) {
            newErrors.price = "Please enter a price for your item.";
        } else {
            const numericPrice = Number(cleanPrice);

            if (!Number.isFinite(numericPrice)) {
                newErrors.price = "Please enter a valid price.";
            } else if (numericPrice <= 0) {
                newErrors.price = "Price must be greater than KES 0.";
            }
        }

        if (images.length === 0) {
            newErrors.images =
                "Please add at least one photo of the item before posting.";
        }

        if (expiresAt) {
            const selectedDate = new Date(expiresAt);
            const today = new Date();

            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                newErrors.expiresAt =
                    "The expiry date cannot be in the past.";
            }
        }

        setErrors(newErrors);

        return newErrors;
    };

    /*
     * Scroll to the first invalid field and show its specific message.
     */
    const focusFirstError = (validationErrors: Record<string, string>) => {
        const errorOrder = [
            "title",
            "whatsapp",
            "description",
            "price",
            "images",
            "expiresAt",
        ];

        const firstError = errorOrder.find(
            (field) => validationErrors[field]
        );

        if (!firstError) return;

        const refs: Record<string, React.RefObject<any>> = {
            title: titleRef,
            whatsapp: whatsappRef,
            description: descriptionRef,
            price: priceRef,
            images: imagesRef,
            expiresAt: expiresAtRef,
        };

        const element = refs[firstError]?.current;

        if (element) {
            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            setTimeout(() => {
                if (typeof element.focus === "function") {
                    element.focus();
                }
            }, 400);
        }
    };

    /*
     * Display all validation errors as individual toast messages.
     */
    const showValidationErrors = (validationErrors: Record<string, string>) => {
        const messages = Object.values(validationErrors);

        if (messages.length === 0) return;

        // Show the first error immediately
        toast.error(messages[0]);

        // If there are multiple errors, show the rest shortly after
        messages.slice(1, 4).forEach((message, index) => {
            setTimeout(() => {
                toast.error(message);
            }, (index + 1) * 700);
        });
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (!e.target.files) return;

        const files = Array.from(e.target.files);

        if (files.length === 0) return;

        const invalidFiles = files.filter(
            (file) => !file.type.startsWith("image/")
        );

        if (invalidFiles.length > 0) {
            toast.error(
                `${invalidFiles.length} file(s) are not images. Please select image files only.`
            );

            e.target.value = "";
            return;
        }

        const oversizedFiles = files.filter(
            (file) => file.size > 5 * 1024 * 1024
        );

        if (oversizedFiles.length > 0) {
            toast.error(
                `${oversizedFiles.length} image(s) exceed 5MB. Please choose smaller images.`
            );

            e.target.value = "";
            return;
        }

        if (files.length + images.length > 5) {
            const remaining = 5 - images.length;

            toast.error(
                remaining > 0
                    ? `You can only add ${remaining} more photo(s). Maximum is 5 photos.`
                    : "Maximum 5 photos allowed."
            );

            e.target.value = "";
            return;
        }

        setImages((prev) => [...prev, ...files]);

        const newPreviews = files.map((file) =>
            URL.createObjectURL(file)
        );

        setImagePreviews((prev) => [...prev, ...newPreviews]);

        clearError("images");

        toast.success(
            `${files.length} image${files.length > 1 ? "s" : ""} selected.`
        );

        // Allow selecting the same file again later
        e.target.value = "";
    };

    const removeImage = (indexToRemove: number) => {
        const previewToRemove = imagePreviews[indexToRemove];

        if (previewToRemove) {
            URL.revokeObjectURL(previewToRemove);
        }

        const updatedImages = images.filter(
            (_, index) => index !== indexToRemove
        );

        const updatedPreviews = imagePreviews.filter(
            (_, index) => index !== indexToRemove
        );

        setImages(updatedImages);
        setImagePreviews(updatedPreviews);

        setUploadedUrls((prev) =>
            prev.filter((_, index) => index !== indexToRemove)
        );

        if (updatedImages.length === 0) {
            setErrors((prev) => ({
                ...prev,
                images:
                    "Please add at least one photo of the item before posting.",
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        /*
         * Check authentication first.
         */
        if (!user?.id || !profile?.name) {
            toast.error(
                "Your account information is missing. Please log in again."
            );
            return;
        }

        /*
         * Run detailed validation.
         */
        const validationErrors = validateForm();

        if (Object.keys(validationErrors).length > 0) {
            showValidationErrors(validationErrors);
            focusFirstError(validationErrors);
            return;
        }

        /*
         * Extra protection for price parsing.
         */
        const parsedPrice = Number(price);

        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            const priceError = {
                price: "Please enter a valid price greater than KES 0.",
            };

            setErrors(priceError);
            toast.error(priceError.price);
            focusFirstError(priceError);
            return;
        }

        setLoading(true);
        setUploadProgress("Starting upload...");

        try {
            let imageUrls: string[] = [];

            /*
             * Upload images one by one.
             */
            if (images.length > 0) {
                setUploadingImage(true);
                setUploadProgress(
                    `Preparing ${images.length} image${images.length > 1 ? "s" : ""
                    }...`
                );

                try {
                    for (let i = 0; i < images.length; i++) {
                        setUploadProgress(
                            `Uploading image ${i + 1} of ${images.length}...`
                        );

                        const url = await uploadToCloudinary(images[i]);

                        imageUrls.push(url);

                        /*
                         * Update uploaded image state immediately
                         * so the user can see progress.
                         */
                        setUploadedUrls([...imageUrls]);
                    }

                    toast.success("All images uploaded successfully!");
                } catch (error: any) {
                    console.error("Upload error:", error);

                    const uploadMessage =
                        error?.message ||
                        "Failed to upload one or more images.";

                    toast.error(
                        `Image upload failed: ${uploadMessage}`
                    );

                    setUploadProgress("");
                    setUploadingImage(false);
                    setLoading(false);

                    return;
                } finally {
                    setUploadingImage(false);
                }
            }

            /*
             * Make absolutely sure we have an image URL before
             * attempting to create the listing.
             */
            if (imageUrls.length === 0) {
                const imageError = {
                    images:
                        "Your photos were not uploaded. Please add at least one image and try again.",
                };

                setErrors(imageError);
                toast.error(imageError.images);

                setLoading(false);
                setUploadProgress("");

                focusFirstError(imageError);

                return;
            }

            setUploadProgress("Saving listing...");

            const finalExpiry = expiresAt
                ? new Date(`${expiresAt}T23:59:59`)
                : null;

            const { data: listingData, error: listingError } =
                await supabase
                    .from("market_listings")
                    .insert([
                        {
                            title: title.trim(),
                            description: description.trim(),
                            category,
                            subcategory: subcategory.trim() || null,
                            condition,
                            price: parsedPrice,
                            negotiable,
                            seller_id: user.id,
                            seller_name: profile.name,
                            seller_username: profile.username || null,
                            seller_phone: whatsappNumber.trim(),
                            seller_role: profile.role,
                            seller_institution:
                                profile.institution || null,
                            seller_county: profile.county || null,
                            seller_avatar:
                                profile.avatar_url || null,
                            meeting_location:
                                meetingLocation.trim(),
                            delivery_available: deliveryAvailable,
                            thumbnail_url: imageUrls[0],
                            image_urls: imageUrls,
                            status: "active",
                            is_approved: true,
                            expires_at: finalExpiry,
                        },
                    ])
                    .select()
                    .single();

            if (listingError) {
                console.error("Listing creation error:", listingError);

                throw new Error(
                    listingError.message ||
                    "We couldn't save your listing."
                );
            }

            /*
             * Log activity.
             */
            setUploadProgress("Logging activity...");

            const { error: activityError } = await supabase
                .from("market_activity")
                .insert({
                    listing_id: listingData.id,
                    user_id: user.id,
                    action: "create",
                });

            /*
             * Activity logging failure should not make the user
             * think the listing itself failed.
             */
            if (activityError) {
                console.warn(
                    "Activity logging failed:",
                    activityError
                );
            }

            setUploadProgress("");

            toast.success(
                "Listing uploaded successfully! 🎉"
            );

            navigate("/market/my-listings");
        } catch (err: any) {
            console.error("Create listing error:", err);

            const message =
                err?.message ||
                "Something went wrong while creating your listing.";

            toast.error(
                `Couldn't create listing: ${message}`
            );
        } finally {
            setLoading(false);
            setUploadProgress("");
            setUploadingImage(false);
        }
    };

    const inputErrorClass = (field: string) =>
        errors[field]
            ? "ring-2 ring-red-500 border-red-500 bg-red-50 dark:bg-red-950/20"
            : "";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background py-3 md:py-6 px-3 md:px-4">
            <div className="md:max-w-full md:px-4 lg:px-6 mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 pb-3 md:pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Create New Listing
                        </h1>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">
                            Provide clear details and quality photos to attract serious buyers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/market")}
                        className="inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg md:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium text-sm"
                    >
                        <ChevronLeft
                            size={16}
                            className="md:w-[18px] md:h-[18px]"
                            strokeWidth={2.5}
                        />
                        Back to NursMartt
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-3 md:space-y-4"
                    noValidate
                >

                    {/* BASIC INFORMATION */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                        <div className="px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <FileText
                                    size={12}
                                    className="md:w-3.5 md:h-3.5"
                                />
                                Basic Information
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 pt-0 space-y-4 md:space-y-5">

                            {/* TITLE */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Item Title
                                    <span className="text-red-500 ml-1">*</span>
                                </label>

                                <input
                                    ref={titleRef}
                                    type="text"
                                    className={`w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputErrorClass(
                                        "title"
                                    )}`}
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        clearError("title");
                                    }}
                                    placeholder="e.g. Littmann Classic III Stethoscope"
                                    aria-invalid={!!errors.title}
                                />

                                {errors.title && (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            {/* WHATSAPP */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    WhatsApp Number
                                    <span className="text-red-500 ml-1">*</span>
                                </label>

                                <div className="relative">
                                    <Phone
                                        className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 md:w-[18px] md:h-[18px]"
                                        size={16}
                                    />

                                    <input
                                        ref={whatsappRef}
                                        type="tel"
                                        className={`w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 pl-10 md:pl-12 pr-3.5 md:pr-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputErrorClass(
                                            "whatsapp"
                                        )}`}
                                        value={whatsappNumber}
                                        onChange={(e) => {
                                            let val =
                                                e.target.value.replace(
                                                    /[^\d+]/g,
                                                    ""
                                                );

                                            if (
                                                !val.startsWith(
                                                    "+254"
                                                )
                                            ) {
                                                val =
                                                    "+254" +
                                                    val.replace(
                                                        /^(\+?254)?/,
                                                        ""
                                                    );
                                            }

                                            // Kenya numbers after +254 = 9 digits
                                            val = val.slice(0, 13);

                                            setWhatsappNumber(val);
                                            clearError("whatsapp");
                                        }}
                                        placeholder="+254712345678"
                                        aria-invalid={!!errors.whatsapp}
                                    />
                                </div>

                                {errors.whatsapp && (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                        {errors.whatsapp}
                                    </p>
                                )}
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Description
                                    <span className="text-red-500 ml-1">*</span>
                                </label>

                                <textarea
                                    ref={descriptionRef}
                                    rows={4}
                                    className={`w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputErrorClass(
                                        "description"
                                    )}`}
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        clearError("description");
                                    }}
                                    placeholder="Provide details about condition, size, or edition..."
                                    aria-invalid={!!errors.description}
                                />

                                <div className="flex justify-between mt-1.5">
                                    {errors.description ? (
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            {errors.description}
                                        </p>
                                    ) : (
                                        <span />
                                    )}

                                    <span className="text-[10px] text-gray-400">
                                        {description.length} characters
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRICING */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                        <div className="px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <Tag
                                    size={12}
                                    className="md:w-3.5 md:h-3.5"
                                />
                                Pricing & Category
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Category
                                </label>

                                <select
                                    className="w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(e.target.value)
                                    }
                                >
                                    <option value="textbook">
                                        Textbook
                                    </option>
                                    <option value="equipment">
                                        Equipment
                                    </option>
                                    <option value="uniform">
                                        Uniform
                                    </option>
                                    <option value="hostel_item">
                                        Hostel Item
                                    </option>
                                    <option value="nck_material">
                                        NCK Material
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Subcategory (Optional)
                                </label>

                                <input
                                    type="text"
                                    className="w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={subcategory}
                                    onChange={(e) =>
                                        setSubcategory(e.target.value)
                                    }
                                    placeholder="e.g. Midwifery, Surgery"
                                />
                            </div>

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Condition
                                </label>

                                <select
                                    className="w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={condition}
                                    onChange={(e) =>
                                        setCondition(e.target.value)
                                    }
                                >
                                    <option value="new">New</option>
                                    <option value="like_new">
                                        Like New
                                    </option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                </select>
                            </div>

                            {/* PRICE */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Price (KES)
                                    <span className="text-red-500 ml-1">*</span>
                                </label>

                                <div className="relative">
                                    <DollarSign
                                        className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 md:w-[18px] md:h-[18px]"
                                        size={16}
                                    />

                                    <input
                                        ref={priceRef}
                                        type="number"
                                        min="1"
                                        step="1"
                                        className={`w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 pl-10 md:pl-12 pr-3.5 md:pr-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${inputErrorClass(
                                            "price"
                                        )}`}
                                        value={price}
                                        onChange={(e) => {
                                            setPrice(e.target.value);
                                            clearError("price");
                                        }}
                                        placeholder="e.g. 1500"
                                        aria-invalid={!!errors.price}
                                    />
                                </div>

                                {errors.price && (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                        {errors.price}
                                    </p>
                                )}

                                <div className="mt-2.5 md:mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={negotiable}
                                        onChange={(e) =>
                                            setNegotiable(
                                                e.target.checked
                                            )
                                        }
                                        className="h-3.5 w-3.5 md:h-4 md:w-4 rounded text-blue-600 focus:ring-blue-500"
                                    />

                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        Negotiable
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LOGISTICS */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
                        <div className="px-4 md:px-6 py-3 md:py-4">
                            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2">
                                <MapPin
                                    size={12}
                                    className="md:w-3.5 md:h-3.5"
                                />
                                Logistics
                            </h2>
                        </div>

                        <div className="p-4 md:p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Meeting Location
                                </label>

                                <input
                                    type="text"
                                    className="w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={meetingLocation}
                                    onChange={(e) =>
                                        setMeetingLocation(
                                            e.target.value
                                        )
                                    }
                                    placeholder="e.g. School Library, Main Gate"
                                />

                                <div className="mt-2.5 md:mt-3 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={deliveryAvailable}
                                        onChange={(e) =>
                                            setDeliveryAvailable(
                                                e.target.checked
                                            )
                                        }
                                        className="h-3.5 w-3.5 md:h-4 md:w-4 rounded text-blue-600 focus:ring-blue-500"
                                    />

                                    <Truck
                                        size={14}
                                        className="md:w-4 md:h-4 text-gray-400"
                                    />

                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        Delivery Available
                                    </span>
                                </div>
                            </div>

                            {/* EXPIRY */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 md:mb-1.5">
                                    Expires At (Optional)
                                </label>

                                <input
                                    ref={expiresAtRef}
                                    type="date"
                                    min={
                                        new Date()
                                            .toISOString()
                                            .split("T")[0]
                                    }
                                    className={`w-full rounded-lg md:rounded-xl bg-gray-50 dark:bg-gray-800 px-3.5 md:px-4 py-2.5 md:py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${inputErrorClass(
                                        "expiresAt"
                                    )}`}
                                    value={expiresAt}
                                    onChange={(e) => {
                                        setExpiresAt(e.target.value);
                                        clearError("expiresAt");
                                    }}
                                    aria-invalid={!!errors.expiresAt}
                                />

                                {errors.expiresAt && (
                                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                                        {errors.expiresAt}
                                    </p>
                                )}

                                {!errors.expiresAt && (
                                    <p className="mt-1.5 text-[10px] text-gray-400">
                                        Leave empty to keep the listing active indefinitely.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MEDIA */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6">
                        <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
                            <ImageIcon
                                size={12}
                                className="md:w-3.5 md:h-3.5"
                            />
                            Photos (Max 5)
                            <span className="text-red-500">*</span>
                        </h2>

                        <label
                            ref={imagesRef}
                            className={`flex flex-col items-center justify-center w-full rounded-lg md:rounded-2xl p-6 md:p-10 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${errors.images
                                ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20"
                                : ""
                                }`}
                        >
                            <ImageIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400 mb-2 md:mb-3" />

                            <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Click to upload images
                            </span>

                            <span className="text-[10px] md:text-xs text-gray-500 mt-1 text-center">
                                Multiple high-quality photos help sell faster
                            </span>

                            <span className="text-[10px] md:text-xs text-gray-400 mt-1 text-center">
                                PNG, JPG or WEBP • Max 5MB each
                            </span>

                            {images.length > 0 && (
                                <span className="text-[10px] md:text-xs text-blue-500 mt-1.5 md:mt-2 font-medium">
                                    {images.length}/5 image
                                    {images.length > 1 ? "s" : ""} selected
                                </span>
                            )}

                            <input
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>

                        {errors.images && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                                {errors.images}
                            </p>
                        )}

                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-4 md:mt-6">
                                {imagePreviews.map((src, index) => (
                                    <div
                                        key={`${src}-${index}`}
                                        className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden group"
                                    >
                                        <img
                                            src={src}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />

                                        {uploadedUrls[index] && (
                                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[7px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded">
                                                ✓ Uploaded
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeImage(index)
                                            }
                                            className="absolute top-1 md:top-2 right-1 md:right-2 bg-black/70 text-white rounded-full p-1 md:p-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label={`Remove image ${index + 1
                                                }`}
                                        >
                                            <X
                                                size={12}
                                                className="md:w-3.5 md:h-3.5"
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="space-y-3 md:space-y-4 pb-4 md:pb-0">

                        {uploadProgress && (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium animate-pulse">
                                <Loader2
                                    className="animate-spin md:w-4 md:h-4"
                                    size={14}
                                />
                                {uploadProgress}
                            </div>
                        )}

                        <div className="space-y-3 md:space-y-4 relative">

                            {showLockOverlay && (
                                <div className="absolute bottom-full left-0 right-0 mb-3 md:mb-6 z-50">
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 shadow-2xl max-w-sm md:max-w-md mx-auto">
                                        <div className="flex justify-between items-start mb-2 md:mb-3">
                                            <div className="flex items-center gap-1.5 md:gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                                                <Sparkles
                                                    size={12}
                                                    className="md:w-3.5 md:h-3.5"
                                                />
                                                NursMartt Verified Seller
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowLockOverlay(
                                                        false
                                                    )
                                                }
                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                                            >
                                                <X
                                                    size={16}
                                                    className="md:w-[18px] md:h-[18px] text-gray-400 hover:text-gray-600"
                                                />
                                            </button>
                                        </div>

                                        <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">
                                            Unlock Selling Privileges
                                        </h3>

                                        <p className="text-[10px] md:text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 md:mt-2 leading-relaxed">
                                            To maintain a safe marketplace and prevent scam listings, only{" "}
                                            <b>Medrae Pro</b> members can post items for sale.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate("/subscription")
                                            }
                                            className="w-full mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-bold py-2.5 md:py-3 rounded-lg md:rounded-xl transition-all active:scale-95"
                                        >
                                            Upgrade to Post Listings
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type={isPremium ? "submit" : "button"}
                                onClick={() => {
                                    if (!isPremium) {
                                        setShowLockOverlay(true);
                                    }
                                }}
                                className={`w-full py-3 md:py-4 rounded-lg md:rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm md:text-base
                                    ${isPremium
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-default"
                                    }`}
                                disabled={
                                    loading ||
                                    checkingSub ||
                                    uploadingImage
                                }
                            >
                                {loading || uploadingImage ? (
                                    <>
                                        <Loader2
                                            className="animate-spin md:w-5 md:h-5"
                                            size={18}
                                        />

                                        <span>
                                            {uploadingImage
                                                ? "Uploading Images..."
                                                : "Posting Listing..."}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {isPremium ? (
                                            <CheckCircle
                                                size={18}
                                                className="md:w-5 md:h-5"
                                            />
                                        ) : (
                                            <Lock
                                                size={18}
                                                className="md:w-5 md:h-5"
                                            />
                                        )}

                                        <span>
                                            {isPremium
                                                ? "Post Listing to Market"
                                                : "Unlock Selling Privileges"}
                                        </span>
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
