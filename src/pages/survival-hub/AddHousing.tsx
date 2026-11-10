import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import { supabase } from "@/lib/supabaseClient";
import {
    ChevronLeft,
    Save,
    Phone,
    Wifi,
    Droplets,
    ShieldCheck,
    Loader2,
    Camera,
    X,
    Lock,
    Sparkles,
    Wallet,
    Link2,
    Image as ImageIcon,
} from "lucide-react";
import SmartSelect from "@/components/ui/SmartSelect";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";

const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae-housing";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const AddHousingPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [options, setOptions] = useState<{ id: string; name: string }[]>([]);

    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const [category, setCategory] = useState<"exam" | "hospital" | "placement">("exam");

    const [formData, setFormData] = useState({
        name: "",
        price_per_night: "",
        distance_to_center: "",
        contact_phone: "",
        contact_name: "",
        has_wifi: false,
        has_water: true,
        has_security: true,
        notes: "",
        exam_center_id: null as string | null,
        nearby_hospital_id: null as string | null,
        placement_site_id: null as string | null,
    });

    /* ── Cloudinary upload ─────────────────────────────── */
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        fd.append("folder", "medrae/housing");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: "POST", body: fd }
        );
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Upload failed");
        }
        const data = await response.json();
        return data.secure_url;
    };

    /* ── File picker ───────────────────────────────────── */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        const invalidFiles = files.filter((f) => !f.type.startsWith("image/"));
        if (invalidFiles.length > 0) {
            toast.error("Please upload only image files");
            e.target.value = "";
            return;
        }

        const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
        if (oversized.length > 0) {
            toast.error("Images must be less than 5MB each");
            e.target.value = "";
            return;
        }

        if (files.length + selectedFiles.length > 3) {
            toast.error("Maximum 3 photos allowed");
            e.target.value = "";
            return;
        }

        tap();
        setSelectedFiles([...selectedFiles, ...files]);
        setPreviews([
            ...previews,
            ...files.map((f) => URL.createObjectURL(f)),
        ]);
        toast.success(`${files.length} image(s) selected`);
        e.target.value = "";
    };

    const removePhoto = (index: number) => {
        tap();
        const previewToRemove = previews[index];
        if (previewToRemove) URL.revokeObjectURL(previewToRemove);
        setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
        setPreviews(previews.filter((_, i) => i !== index));
        setUploadedUrls(uploadedUrls.filter((_, i) => i !== index));
    };

    /* ── Subscription check ────────────────────────────── */
    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                    setCheckingSub(false);
                    return;
                }

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
                console.error("Sub check error:", err);
            } finally {
                setCheckingSub(false);
            }
        };
        checkSubscription();
    }, []);

    /* ── Load anchor options ──────────────────────────── */
    useEffect(() => {
        const loadData = async () => {
            setOptions([]);
            try {
                if (category === "exam") {
                    const data = await survivalApi.getExamCenters();
                    setOptions(data.map((i: any) => ({ id: i.id, name: i.name })));
                } else if (category === "hospital") {
                    const { data } = await supabase
                        .from("oriented_nearby_hospitals")
                        .select("id, hospital_name");
                    setOptions(
                        data?.map((i: any) => ({ id: i.id, name: i.hospital_name })) || []
                    );
                } else {
                    const data = await survivalApi.getPlacements();
                    setOptions(
                        data.map((i: any) => ({ id: i.id, name: i.hospital_name }))
                    );
                }
            } catch (err) {
                console.error("Link error:", err);
            }
        };
        loadData();
    }, [category]);

    /* ── Submit ────────────────────────────────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const hasSelectedAnchor =
            formData.exam_center_id ||
            formData.nearby_hospital_id ||
            formData.placement_site_id;

        if (!hasSelectedAnchor) {
            toast.error("Select where this housing belongs first");
            return;
        }

        tap("success");
        setLoading(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in first");

            let imageUrls: string[] = [];

            if (selectedFiles.length > 0) {
                setUploadingImage(true);
                toast.info(`Uploading ${selectedFiles.length} image(s)…`);
                try {
                    for (const file of selectedFiles) {
                        const url = await uploadToCloudinary(file);
                        imageUrls.push(url);
                    }
                    setUploadedUrls(imageUrls);
                } catch (error) {
                    console.error("Upload error:", error);
                    toast.error(
                        "Failed to upload images. Housing will be created without images."
                    );
                    imageUrls = [];
                } finally {
                    setUploadingImage(false);
                }
            }

            await survivalApi.createHousing({
                ...formData,
                price_per_night: parseInt(formData.price_per_night),
                created_by: user.id,
                images: imageUrls,
            });

            toast.success("Housing submitted for verification");
            navigate("/survival-hub/housing");
        } catch (error: any) {
            console.error("Error creating housing:", error);
            toast.error(error.message || "Failed to create housing listing");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub/housing", { replace: true });
    };

    const selectedAnchorId =
        formData.exam_center_id ||
        formData.nearby_hospital_id ||
        formData.placement_site_id;

    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0d1117]">
            {/* ── Header ──────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
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
                        Add housing
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Help fellow students
                    </p>
                </div>
                {isPremium && (
                    <span className="shrink-0 inline-flex items-center gap-1
                                     bg-amber-50 dark:bg-amber-400/10
                                     text-amber-700 dark:text-amber-400
                                     text-[10px] font-bold uppercase tracking-wider
                                     px-2 py-1 rounded-full">
                        <Sparkles className="h-2.5 w-2.5" />
                        Pro
                    </span>
                )}
            </header>

            {/* ── Body ────────────────────────────────────────── */}
            <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-2xl mx-auto px-4 py-4 pb-32 space-y-3 safe-bottom"
                >
                    {/* Anchor section */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader icon={Link2} label="Step 1 · Location" tone="blue" />

                        {/* Category tabs */}
                        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl
                                        bg-slate-100 dark:bg-white/[0.06]">
                            {(["exam", "hospital", "placement"] as const).map((type) => {
                                const active = category === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            tap();
                                            setCategory(type);
                                            setFormData({
                                                ...formData,
                                                exam_center_id: null,
                                                nearby_hospital_id: null,
                                                placement_site_id: null,
                                            });
                                        }}
                                        className={`h-8 rounded-lg
                                                    text-[10px] font-bold uppercase tracking-wider
                                                    transition-colors
                                                    ${active
                                                ? "bg-white dark:bg-[#161b22] text-slate-900 dark:text-white"
                                                : "text-slate-500 dark:text-slate-400"
                                            }`}
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>

                        <SmartSelect
                            label=""
                            categoryName={category}
                            placeholder={`Choose ${category}…`}
                            options={options}
                            value={selectedAnchorId || ""}
                            onChange={(id) => {
                                tap();
                                if (category === "exam")
                                    setFormData({ ...formData, exam_center_id: id });
                                if (category === "hospital")
                                    setFormData({ ...formData, nearby_hospital_id: id });
                                if (category === "placement")
                                    setFormData({ ...formData, placement_site_id: id });
                            }}
                        />
                    </section>

                    {/* Photos section */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader
                            icon={Camera}
                            label={`Step 2 · Photos (${selectedFiles.length}/3)`}
                            tone="blue"
                        />

                        <div className="grid grid-cols-3 gap-1.5">
                            {previews.map((src, index) => (
                                <div
                                    key={index}
                                    className="relative aspect-square rounded-xl overflow-hidden
                                               bg-slate-100 dark:bg-white/[0.06]"
                                >
                                    <img
                                        src={src}
                                        className="h-full w-full object-cover"
                                        alt={`Preview ${index + 1}`}
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
                                        onClick={() => removePhoto(index)}
                                        aria-label="Remove photo"
                                        className="absolute top-1 right-1
                                                   h-6 w-6 rounded-full
                                                   bg-black/60 text-white
                                                   flex items-center justify-center
                                                   active:scale-[0.92] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <X className="h-3 w-3" strokeWidth={2.75} />
                                    </button>
                                </div>
                            ))}

                            {selectedFiles.length < 3 && (
                                <label
                                    className="flex flex-col items-center justify-center aspect-square
                                               rounded-xl
                                               bg-slate-50 dark:bg-[#0d1117]
                                               border border-dashed
                                               border-slate-200 dark:border-white/[0.1]
                                               active:scale-[0.97] transition-transform
                                               cursor-pointer"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <ImageIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider
                                                     text-slate-500 dark:text-slate-400 mt-1">
                                        Add
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            )}
                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug text-center">
                            Up to 3 photos · PNG, JPG, WEBP · Max 5MB each
                            {uploadingImage && (
                                <span className="flex items-center justify-center gap-1 mt-1
                                                 text-amber-600 dark:text-amber-400 font-bold">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Uploading…
                                </span>
                            )}
                        </p>
                    </section>

                    {/* House details section */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader icon={Wallet} label="Step 3 · House details" tone="emerald" />

                        <Field label="Hostel or building name" required>
                            <input
                                required
                                placeholder="e.g. Riverside Hostels"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Price / night (KSh)" required>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 500"
                                    value={formData.price_per_night}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            price_per_night: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 rounded-xl border-0 outline-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               px-3.5 text-sm tabular-nums
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <Field label="Distance from anchor" required>
                                <input
                                    required
                                    placeholder="e.g. 5 mins"
                                    value={formData.distance_to_center}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            distance_to_center: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 rounded-xl border-0 outline-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               px-3.5 text-sm
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-blue-500/40"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>
                        </div>

                        {/* Amenities */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider
                                          text-slate-500 dark:text-slate-400 mb-2">
                                Amenities
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <AmenityCheck
                                    label="WiFi"
                                    icon={<Wifi className="h-3.5 w-3.5" />}
                                    checked={formData.has_wifi}
                                    onChange={(v) =>
                                        setFormData({ ...formData, has_wifi: v })
                                    }
                                />
                                <AmenityCheck
                                    label="Water"
                                    icon={<Droplets className="h-3.5 w-3.5" />}
                                    checked={formData.has_water}
                                    onChange={(v) =>
                                        setFormData({ ...formData, has_water: v })
                                    }
                                />
                                <AmenityCheck
                                    label="Security"
                                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                                    checked={formData.has_security}
                                    onChange={(v) =>
                                        setFormData({ ...formData, has_security: v })
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* Contact section */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader icon={Phone} label="Step 4 · Contact info" tone="rose" />

                        <Field label="Host / owner name" required>
                            <input
                                required
                                placeholder="e.g. Jane Mwangi"
                                value={formData.contact_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contact_name: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <Field label="Phone number" required>
                            <input
                                required
                                type="tel"
                                placeholder="0712345678"
                                value={formData.contact_phone}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        contact_phone: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm tabular-nums
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-blue-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>
                    </section>
                </form>
            </main>

            {/* ── Pinned footer ────────────────────────────────── */}
            <footer className="shrink-0 px-4 py-3
                               bg-white dark:bg-[#0d1117]
                               border-t border-slate-200/70 dark:border-white/[0.06]
                               safe-bottom">
                <div className="w-full max-w-2xl mx-auto">
                    {showLockOverlay && (
                        <div className="mb-2 rounded-xl bg-amber-50 dark:bg-amber-400/10 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider
                                                     text-amber-700 dark:text-amber-400">
                                        Medrae Pro required
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        tap();
                                        setShowLockOverlay(false);
                                    }}
                                    aria-label="Close"
                                    className="h-6 w-6 rounded-full
                                               text-amber-700 dark:text-amber-400
                                               flex items-center justify-center
                                               active:bg-amber-100 dark:active:bg-amber-400/20"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <X className="h-3 w-3" strokeWidth={2.5} />
                                </button>
                            </div>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                                To keep listings spam-free, only Pro members can
                                publish housing.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    tap("success");
                                    navigate("/subscription");
                                }}
                                className="w-full h-9 rounded-lg
                                           bg-amber-500 text-white
                                           text-[11px] font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                Upgrade to publish
                            </button>
                        </div>
                    )}

                    <button
                        disabled={loading || uploadingImage || checkingSub}
                        type={isPremium ? "submit" : "button"}
                        onClick={() => {
                            if (!isPremium) {
                                tap("warning");
                                setShowLockOverlay(true);
                            }
                        }}
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
                                {uploadingImage ? "Uploading images…" : "Publishing…"}
                            </>
                        ) : (
                            <>
                                {isPremium ? (
                                    <Save className="h-4 w-4" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                {isPremium ? "Publish listing" : "Upgrade to publish"}
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
    icon: Icon,
    label,
    tone,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    tone: "blue" | "emerald" | "rose";
}) {
    const toneMap = {
        blue: "bg-blue-50 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
        emerald:
            "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
        rose: "bg-rose-50 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400",
    }[tone];

    return (
        <div className="flex items-center gap-2">
            <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneMap}`}
            >
                <Icon className="h-4 w-4" />
            </div>
            <p
                className={`text-[10px] font-bold uppercase tracking-wider ${toneMap.split(" ").slice(2).join(" ")}`}
            >
                {label}
            </p>
        </div>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
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
        </div>
    );
}

function AmenityCheck({
    label,
    icon,
    checked,
    onChange,
}: {
    label: string;
    icon: React.ReactNode;
    checked: boolean;
    onChange: (v: boolean) => void;
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
            className={`h-9 px-3 rounded-lg
                        flex items-center gap-1.5
                        text-[11px] font-bold uppercase tracking-wider
                        active:scale-[0.97] transition-all
                        ${checked
                    ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400"
                    : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                }`}
            style={{ touchAction: "manipulation" }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

export default AddHousingPage;