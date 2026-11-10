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
import { playSound } from "@/lib/soundManager";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae-market";

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (p: number | number[] = 12) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([15, 30, 15]);
    else if (type === "warning") vibrate(40);
    else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

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
    const [errors, setErrors] = useState<Record<string, string>>({});

    const titleRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const whatsappRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const imagesRef = useRef<HTMLLabelElement>(null);
    const expiresAtRef = useRef<HTMLInputElement>(null);

    /* Cloudinary upload */
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", "medrae/market");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: "POST", body: formData }
        );

        if (!response.ok) {
            let errorMessage = "Image upload failed.";
            try {
                const error = await response.json();
                errorMessage = error?.error?.message || "Image upload failed.";
            } catch { }
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
                    const expiry = sub.expires_at ? new Date(sub.expires_at) : null;
                    const isPaid = sub.plan_type === "pro" || sub.plan_type === "premium";
                    const isActive = sub.is_active === true;
                    const notExpired = expiry ? expiry > now : true;
                    if (isPaid && isActive && notExpired) setIsPremium(true);
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

    const clearError = (field: string) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const updated = { ...prev };
            delete updated[field];
            return updated;
        });
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        const cleanTitle = title.trim();
        const cleanDescription = description.trim();
        const cleanWhatsapp = whatsappNumber.trim();
        const cleanPrice = price.trim();

        if (!cleanTitle) newErrors.title = "Please enter a title for your item.";
        else if (cleanTitle.length < 3)
            newErrors.title = "The item title must be at least 3 characters.";

        if (!cleanWhatsapp || cleanWhatsapp === "+254")
            newErrors.whatsapp =
                "Please enter your WhatsApp number so buyers can contact you.";
        else if (!/^\+254\d{9}$/.test(cleanWhatsapp))
            newErrors.whatsapp =
                "Please enter a valid Kenyan number, e.g. +254712345678.";

        if (!cleanDescription)
            newErrors.description = "Please describe the item you are selling.";
        else if (cleanDescription.length < 10)
            newErrors.description =
                "Please provide a little more detail about the item.";

        if (!cleanPrice) newErrors.price = "Please enter a price for your item.";
        else {
            const numericPrice = Number(cleanPrice);
            if (!Number.isFinite(numericPrice)) newErrors.price = "Please enter a valid price.";
            else if (numericPrice <= 0) newErrors.price = "Price must be greater than KES 0.";
        }

        if (images.length === 0)
            newErrors.images = "Please add at least one photo of the item before posting.";

        if (expiresAt) {
            const selectedDate = new Date(expiresAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) newErrors.expiresAt = "The expiry date cannot be in the past.";
        }

        setErrors(newErrors);
        return newErrors;
    };

    const focusFirstError = (validationErrors: Record<string, string>) => {
        const errorOrder = ["title", "whatsapp", "description", "price", "images", "expiresAt"];
        const firstError = errorOrder.find((field) => validationErrors[field]);
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
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => {
                if (typeof element.focus === "function") element.focus();
            }, 400);
        }
    };

    const showValidationErrors = (validationErrors: Record<string, string>) => {
        const messages = Object.values(validationErrors);
        if (messages.length === 0) return;
        toast.error(messages[0]);
        messages.slice(1, 4).forEach((message, index) => {
            setTimeout(() => toast.error(message), (index + 1) * 700);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const invalidFiles = files.filter((file) => !file.type.startsWith("image/"));
        if (invalidFiles.length > 0) {
            toast.error(`${invalidFiles.length} file(s) are not images. Please select image files only.`);
            e.target.value = "";
            return;
        }

        const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast.error(`${oversizedFiles.length} image(s) exceed 5MB. Please choose smaller images.`);
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

        tap();
        setImages((prev) => [...prev, ...files]);
        const newPreviews = files.map((file) => URL.createObjectURL(file));
        setImagePreviews((prev) => [...prev, ...newPreviews]);
        clearError("images");
        toast.success(`${files.length} image${files.length > 1 ? "s" : ""} selected.`);
        e.target.value = "";
    };

    const removeImage = (indexToRemove: number) => {
        tap();
        const previewToRemove = imagePreviews[indexToRemove];
        if (previewToRemove) URL.revokeObjectURL(previewToRemove);

        const updatedImages = images.filter((_, i) => i !== indexToRemove);
        const updatedPreviews = imagePreviews.filter((_, i) => i !== indexToRemove);

        setImages(updatedImages);
        setImagePreviews(updatedPreviews);
        setUploadedUrls((prev) => prev.filter((_, i) => i !== indexToRemove));

        if (updatedImages.length === 0) {
            setErrors((prev) => ({
                ...prev,
                images: "Please add at least one photo of the item before posting.",
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id || !profile?.name) {
            toast.error("Your account information is missing. Please log in again.");
            return;
        }

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            showValidationErrors(validationErrors);
            focusFirstError(validationErrors);
            return;
        }

        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            const priceError = { price: "Please enter a valid price greater than KES 0." };
            setErrors(priceError);
            toast.error(priceError.price);
            focusFirstError(priceError);
            return;
        }

        tap("success");
        setLoading(true);
        setUploadProgress("Starting upload…");

        try {
            let imageUrls: string[] = [];

            if (images.length > 0) {
                setUploadingImage(true);
                setUploadProgress(`Preparing ${images.length} image${images.length > 1 ? "s" : ""}…`);
                try {
                    for (let i = 0; i < images.length; i++) {
                        setUploadProgress(`Uploading image ${i + 1} of ${images.length}…`);
                        const url = await uploadToCloudinary(images[i]);
                        imageUrls.push(url);
                        setUploadedUrls([...imageUrls]);
                    }
                    toast.success("All images uploaded successfully!");
                } catch (error: any) {
                    console.error("Upload error:", error);
                    const uploadMessage = error?.message || "Failed to upload one or more images.";
                    toast.error(`Image upload failed: ${uploadMessage}`);
                    setUploadProgress("");
                    setUploadingImage(false);
                    setLoading(false);
                    return;
                } finally {
                    setUploadingImage(false);
                }
            }

            if (imageUrls.length === 0) {
                const imageError = {
                    images: "Your photos were not uploaded. Please add at least one image and try again.",
                };
                setErrors(imageError);
                toast.error(imageError.images);
                setLoading(false);
                setUploadProgress("");
                focusFirstError(imageError);
                return;
            }

            setUploadProgress("Saving listing…");

            const finalExpiry = expiresAt ? new Date(`${expiresAt}T23:59:59`) : null;

            const { data: listingData, error: listingError } = await supabase
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
                        seller_institution: profile.institution || null,
                        seller_county: profile.county || null,
                        seller_avatar: profile.avatar_url || null,
                        meeting_location: meetingLocation.trim(),
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
                throw new Error(listingError.message || "We couldn't save your listing.");
            }

            setUploadProgress("Logging activity…");
            const { error: activityError } = await supabase
                .from("market_activity")
                .insert({
                    listing_id: listingData.id,
                    user_id: user.id,
                    action: "create",
                });

            if (activityError) {
                console.warn("Activity logging failed:", activityError);
            }

            setUploadProgress("");
            toast.success("Listing uploaded successfully!");
            navigate("/market/my-listings");
        } catch (err: any) {
            console.error("Create listing error:", err);
            const message = err?.message || "Something went wrong while creating your listing.";
            toast.error(`Couldn't create listing: ${message}`);
        } finally {
            setLoading(false);
            setUploadProgress("");
            setUploadingImage(false);
        }
    };

    const handleBack = () => {
        tap();
        navigate("/dashboard", { replace: true });
    };

    const inputErrorClass = (field: string) =>
        errors[field]
            ? "ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-400/10"
            : "";

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Back to dashboard"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: "manipulation" }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        New listing
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Sell an item on NursMartt
                    </p>
                </div>
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-2xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom"
                    noValidate
                >
                    {/* Basic info */}
                    <FormSection icon={FileText} label="Basic info">
                        <Field
                            label="Item title"
                            required
                            error={errors.title}
                        >
                            <input
                                ref={titleRef}
                                type="text"
                                className={`w-full h-11 rounded-xl border-0 outline-none
                                            bg-slate-50 dark:bg-[#0d1117]
                                            px-3.5 text-sm
                                            text-slate-900 dark:text-white
                                            placeholder:text-slate-400 dark:placeholder:text-slate-500
                                            focus:ring-2 focus:ring-blue-500/40
                                            ${inputErrorClass("title")}`}
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    clearError("title");
                                }}
                                placeholder="e.g. Littmann Classic III Stethoscope"
                                aria-invalid={!!errors.title}
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <Field
                            label="WhatsApp number"
                            required
                            error={errors.whatsapp}
                        >
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2
                                                  h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                <input
                                    ref={whatsappRef}
                                    type="tel"
                                    className={`w-full h-11 rounded-xl border-0 outline-none
                                                bg-slate-50 dark:bg-[#0d1117]
                                                pl-10 pr-3.5 text-sm
                                                text-slate-900 dark:text-white
                                                placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                focus:ring-2 focus:ring-blue-500/40
                                                ${inputErrorClass("whatsapp")}`}
                                    value={whatsappNumber}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^\d+]/g, "");
                                        if (!val.startsWith("+254")) {
                                            val = "+254" + val.replace(/^(\+?254)?/, "");
                                        }
                                        val = val.slice(0, 13);
                                        setWhatsappNumber(val);
                                        clearError("whatsapp");
                                    }}
                                    placeholder="+254712345678"
                                    aria-invalid={!!errors.whatsapp}
                                    style={{ touchAction: "manipulation" }}
                                />
                            </div>
                        </Field>

                        <Field
                            label="Description"
                            required
                            error={errors.description}
                            hint={`${description.length} characters`}
                        >
                            <textarea
                                ref={descriptionRef}
                                rows={4}
                                className={`w-full rounded-xl border-0 outline-none resize-none
                                            bg-slate-50 dark:bg-[#0d1117]
                                            px-3.5 py-2.5 text-sm
                                            text-slate-900 dark:text-white
                                            placeholder:text-slate-400 dark:placeholder:text-slate-500
                                            focus:ring-2 focus:ring-blue-500/40
                                            ${inputErrorClass("description")}`}
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    clearError("description");
                                }}
                                placeholder="Provide details about condition, size, or edition…"
                                aria-invalid={!!errors.description}
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>
                    </FormSection>

                    {/* Pricing */}
                    <FormSection icon={Tag} label="Pricing & category">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Category">
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger
                                        className="h-11 rounded-xl border-0
                       bg-slate-50 dark:bg-[#0d1117]
                       text-sm font-semibold
                       text-slate-900 dark:text-white
                       px-3
                       focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        <SelectValue placeholder="Choose a category" />
                                    </SelectTrigger>
                                    <SelectContent
                                        className="rounded-xl
                       bg-white dark:bg-[#161b22]
                       border-slate-200/70 dark:border-white/[0.06]"
                                    >
                                        <SelectItem value="textbook" className="text-[13px] font-semibold">
                                            Textbook
                                        </SelectItem>
                                        <SelectItem value="equipment" className="text-[13px] font-semibold">
                                            Equipment
                                        </SelectItem>
                                        <SelectItem value="uniform" className="text-[13px] font-semibold">
                                            Uniform
                                        </SelectItem>
                                        <SelectItem value="hostel_item" className="text-[13px] font-semibold">
                                            Hostel item
                                        </SelectItem>
                                        <SelectItem value="nck_material" className="text-[13px] font-semibold">
                                            NCK material
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Subcategory (optional)">
                                <input
                                    type="text"
                                    className="w-full h-11 rounded-xl border-0 outline-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               px-3.5 text-sm
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40"
                                    value={subcategory}
                                    onChange={(e) => setSubcategory(e.target.value)}
                                    placeholder="e.g. Midwifery, Surgery"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <Field label="Condition">
                                <Select value={condition} onValueChange={setCondition}>
                                    <SelectTrigger
                                        className="h-11 rounded-xl border-0
                       bg-slate-50 dark:bg-[#0d1117]
                       text-sm font-semibold
                       text-slate-900 dark:text-white
                       px-3
                       focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        <SelectValue placeholder="Choose a condition" />
                                    </SelectTrigger>
                                    <SelectContent
                                        className="rounded-xl
                       bg-white dark:bg-[#161b22]
                       border-slate-200/70 dark:border-white/[0.06]"
                                    >
                                        <SelectItem value="new" className="text-[13px] font-semibold">
                                            New
                                        </SelectItem>
                                        <SelectItem value="like_new" className="text-[13px] font-semibold">
                                            Like new
                                        </SelectItem>
                                        <SelectItem value="good" className="text-[13px] font-semibold">
                                            Good
                                        </SelectItem>
                                        <SelectItem value="fair" className="text-[13px] font-semibold">
                                            Fair
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field
                                label="Price (KES)"
                                required
                                error={errors.price}
                            >
                                <div className="relative">
                                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2
                                                          h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                                    <input
                                        ref={priceRef}
                                        type="number"
                                        min="1"
                                        step="1"
                                        className={`w-full h-11 rounded-xl border-0 outline-none
                                                    bg-slate-50 dark:bg-[#0d1117]
                                                    pl-10 pr-3.5 text-sm tabular-nums
                                                    text-slate-900 dark:text-white
                                                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                                                    focus:ring-2 focus:ring-blue-500/40
                                                    ${inputErrorClass("price")}`}
                                        value={price}
                                        onChange={(e) => {
                                            setPrice(e.target.value);
                                            clearError("price");
                                        }}
                                        placeholder="e.g. 1500"
                                        aria-invalid={!!errors.price}
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </div>
                            </Field>
                        </div>

                        <Toggle
                            checked={negotiable}
                            onChange={setNegotiable}
                            label="Price is negotiable"
                        />
                    </FormSection>

                    {/* Logistics */}
                    <FormSection icon={MapPin} label="Logistics">
                        <Field label="Meeting location">
                            <input
                                type="text"
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                value={meetingLocation}
                                onChange={(e) => setMeetingLocation(e.target.value)}
                                placeholder="e.g. School Library, Main Gate"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <Toggle
                            checked={deliveryAvailable}
                            onChange={setDeliveryAvailable}
                            label="Delivery available"
                            icon={<Truck className="h-3.5 w-3.5" />}
                        />

                        <Field
                            label="Expiry date (optional)"
                            error={errors.expiresAt}
                            hint={!errors.expiresAt ? "Leave empty to keep active indefinitely" : undefined}
                        >
                            <input
                                ref={expiresAtRef}
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                className={`w-full h-11 rounded-xl border-0 outline-none
                                            bg-slate-50 dark:bg-[#0d1117]
                                            px-3 text-sm
                                            text-slate-900 dark:text-white
                                            focus:ring-2 focus:ring-blue-500/40
                                            ${inputErrorClass("expiresAt")}`}
                                value={expiresAt}
                                onChange={(e) => {
                                    setExpiresAt(e.target.value);
                                    clearError("expiresAt");
                                }}
                                aria-invalid={!!errors.expiresAt}
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>
                    </FormSection>

                    {/* Media */}
                    <FormSection icon={ImageIcon} label="Photos (max 5)">
                        <label
                            ref={imagesRef}
                            className={`flex flex-col items-center justify-center
                                        w-full rounded-xl p-6 min-h-[110px]
                                        bg-slate-50 dark:bg-[#0d1117]
                                        cursor-pointer
                                        active:scale-[0.99] transition-transform
                                        ${errors.images ? "ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-400/10" : ""}`}
                            style={{ touchAction: "manipulation" }}
                        >
                            <div className="h-10 w-10 rounded-full
                                            bg-blue-50 dark:bg-blue-400/10
                                            flex items-center justify-center mb-2">
                                <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                                {images.length > 0 ? "Add more photos" : "Tap to select photos"}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                PNG · JPG · WEBP · Max 5MB each
                            </span>
                            {images.length > 0 && (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                                    {images.length}/5 selected
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
                            <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                                {errors.images}
                            </p>
                        )}

                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {imagePreviews.map((src, index) => (
                                    <div
                                        key={`${src}-${index}`}
                                        className="relative aspect-square rounded-xl overflow-hidden
                                                   bg-slate-100 dark:bg-white/[0.06]"
                                    >
                                        <img
                                            src={src}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {uploadedUrls[index] && (
                                            <div className="absolute bottom-1 left-1
                                                            bg-emerald-600 text-white
                                                            text-[8px] font-bold uppercase tracking-wider
                                                            px-1.5 py-0.5 rounded">
                                                Uploaded
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1
                                                       h-6 w-6 rounded-full
                                                       bg-black/60 text-white
                                                       flex items-center justify-center
                                                       active:scale-[0.92] transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                            aria-label={`Remove image ${index + 1}`}
                                        >
                                            <X className="h-3 w-3" strokeWidth={2.75} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormSection>

                    <div className="pt-2 flex justify-center">
                        <TermsButton />
                    </div>
                </form>
            </main>

            {/* ── Pinned footer ────────────────────────────────── */}
            <footer className="shrink-0 px-4 py-3
                               bg-white dark:bg-[#0d1117]
                               border-t border-slate-200/70 dark:border-white/[0.06]
                               safe-bottom">
                <div className="w-full max-w-2xl mx-auto">
                    {uploadProgress && (
                        <div className="flex items-center justify-center gap-1.5 mb-2">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider
                                             text-blue-600 dark:text-blue-400">
                                {uploadProgress}
                            </span>
                        </div>
                    )}

                    {showLockOverlay && (
                        <div className="mb-2 rounded-xl bg-blue-50 dark:bg-blue-400/10 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider
                                                     text-blue-700 dark:text-blue-400">
                                        Verified sellers only
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        tap();
                                        setShowLockOverlay(false);
                                    }}
                                    className="h-6 w-6 rounded-full flex items-center justify-center
                                               text-blue-700 dark:text-blue-400
                                               active:bg-blue-100 dark:active:bg-blue-400/20"
                                    style={{ touchAction: "manipulation" }}
                                    aria-label="Close"
                                >
                                    <X className="h-3 w-3" strokeWidth={2.5} />
                                </button>
                            </div>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-snug">
                                To keep NursMartt safe, only Medrae Pro members can post listings.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    tap("success");
                                    navigate("/subscription");
                                }}
                                className="w-full h-9 rounded-lg
                                           bg-blue-600 text-white
                                           text-[11px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Upgrade to post listings
                            </button>
                        </div>
                    )}

                    <button
                        type={isPremium ? "submit" : "button"}
                        onClick={() => {
                            if (!isPremium) {
                                tap("warning");
                                setShowLockOverlay(true);
                            }
                        }}
                        disabled={loading || checkingSub || uploadingImage}
                        className={`w-full h-11 rounded-xl
                                    text-sm font-bold
                                    flex items-center justify-center gap-2
                                    transition-transform
                                    ${isPremium
                                ? "bg-blue-600 text-white active:scale-[0.97]"
                                : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500"
                            }
                                    disabled:opacity-60 disabled:cursor-not-allowed`}
                        style={{ touchAction: "manipulation" }}
                    >
                        {loading || uploadingImage ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadingImage ? "Uploading images…" : "Posting listing…"}
                            </>
                        ) : (
                            <>
                                {isPremium ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                {isPremium ? "Post listing to market" : "Unlock selling privileges"}
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function FormSection({
    icon: Icon,
    label,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg
                                bg-blue-50 dark:bg-blue-400/10
                                flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider
                              text-blue-600 dark:text-blue-400">
                    {label}
                </p>
            </div>
            {children}
        </section>
    );
}

function Field({
    label,
    required,
    error,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-1
                              text-[10px] font-bold uppercase tracking-wider
                              text-slate-500 dark:text-slate-400">
                {label}
                {required && (
                    <span className="text-rose-500 dark:text-rose-400 normal-case tracking-normal">
                        *
                    </span>
                )}
            </label>
            {children}
            {error ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    icon,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    icon?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => {
                tap();
                onChange(!checked);
            }}
            className="w-full flex items-center justify-between gap-3
                        p-2.5 rounded-xl
                        bg-slate-50 dark:bg-[#0d1117]
                        active:scale-[0.99] transition-transform"
            style={{ touchAction: "manipulation" }}
        >
            <div className="flex items-center gap-2 min-w-0">
                {icon && (
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">
                        {icon}
                    </span>
                )}
                <span className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                    {label}
                </span>
            </div>
            <span
                className={`relative inline-flex shrink-0 items-center
                            h-6 w-11 rounded-full transition-colors
                            ${checked ? "bg-blue-600" : "bg-slate-200 dark:bg-white/[0.12]"}`}
            >
                <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm
                                transform transition-transform duration-200 ease-out
                                ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`}
                />
            </span>
        </button>
    );
}