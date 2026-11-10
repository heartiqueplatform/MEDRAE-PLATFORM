import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { survivalApi } from "../../lib/survivalApi";
import { supabase } from "@/lib/supabaseClient";
import {
    ChevronLeft,
    Save,
    Hospital,
    Stethoscope,
    Phone,
    Loader2,
    Camera,
    X,
    Lock,
    Sparkles,
    Image as ImageIcon,
    MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { playSound } from "@/lib/soundManager";

const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae-placements";

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else if (type === "warning") navigator.vibrate(40);
        else navigator.vibrate(12);
    }
};

const AddPlacementPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [checkingSub, setCheckingSub] = useState(true);
    const [showLockOverlay, setShowLockOverlay] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        hospital_name: "",
        location: "",
        county: "",
        ward_specialties: "",
        student_friendly: true,
        supervisor_contact: "",
        intake_notes: "",
    });

    /* ── Cloudinary ─────────────────────────────────────── */
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        fd.append("folder", "medrae/placements");

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

    /* ── Subscription check ───────────────────────────── */
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
                    const isPaid =
                        sub.plan_type === "pro" || sub.plan_type === "premium";
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

    /* ── Submit ────────────────────────────────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.hospital_name.trim()) {
                toast.error("Hospital name is required");
                setLoading(false);
                return;
            }

            if (!formData.county.trim() || !formData.location.trim()) {
                toast.error("County and location are required");
                setLoading(false);
                return;
            }

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
                        "Failed to upload images. Placement will be created without images."
                    );
                    imageUrls = [];
                } finally {
                    setUploadingImage(false);
                }
            }

            await survivalApi.createPlacementSite({
                ...formData,
                images: imageUrls,
            });

            tap("success");
            toast.success("Hospital added to placement directory");
            navigate("/survival-hub/placements");
        } catch (error: any) {
            console.error("Error creating placement:", error);
            toast.error(error.message || "Failed to create placement site");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        tap();
        navigate("/survival-hub/placements", { replace: true });
    };

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
                        Add placement site
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Contribute to the NCK directory
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
                    {/* Hospital info */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader
                            icon={Hospital}
                            label="Step 1 · Hospital info"
                            tone="amber"
                        />

                        <Field label="Hospital name" required>
                            <input
                                required
                                placeholder="e.g. Kenyatta National Hospital"
                                value={formData.hospital_name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        hospital_name: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-amber-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-2">
                            <Field label="County" required>
                                <input
                                    required
                                    placeholder="e.g. Nairobi"
                                    value={formData.county}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            county: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 rounded-xl border-0 outline-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               px-3.5 text-sm
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-amber-500/40"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <Field label="Town / location" required>
                                <input
                                    required
                                    placeholder="e.g. Upper Hill"
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            location: e.target.value,
                                        })
                                    }
                                    className="w-full h-11 rounded-xl border-0 outline-none
                                               bg-slate-50 dark:bg-[#0d1117]
                                               px-3.5 text-sm
                                               text-slate-900 dark:text-white
                                               placeholder:text-slate-400 dark:placeholder:text-slate-500
                                               focus:ring-2 focus:ring-amber-500/40"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>
                        </div>
                    </section>

                    {/* Photos */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader
                            icon={Camera}
                            label={`Step 2 · Site photos (${selectedFiles.length}/3)`}
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

                    {/* Ward details */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader
                            icon={Stethoscope}
                            label="Step 3 · Ward details"
                            tone="emerald"
                        />

                        <Field label="Ward specialties" required>
                            <input
                                required
                                placeholder="e.g. Med/Surg, Paeds, ICU"
                                value={formData.ward_specialties}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        ward_specialties: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-amber-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>

                        <Field label="Intake notes">
                            <textarea
                                placeholder="e.g. Bring own scrubs and logbook"
                                rows={3}
                                value={formData.intake_notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        intake_notes: e.target.value,
                                    })
                                }
                                className="w-full rounded-xl border-0 outline-none resize-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 py-2.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-amber-500/40"
                                style={{ touchAction: "manipulation" }}
                            />
                        </Field>
                    </section>

                    {/* Contact */}
                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-3">
                        <SectionHeader
                            icon={Phone}
                            label="Step 4 · Contact info"
                            tone="rose"
                        />

                        <Field label="Supervisor contact">
                            <input
                                type="text"
                                placeholder="WhatsApp number or email"
                                value={formData.supervisor_contact}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        supervisor_contact: e.target.value,
                                    })
                                }
                                className="w-full h-11 rounded-xl border-0 outline-none
                                           bg-slate-50 dark:bg-[#0d1117]
                                           px-3.5 text-sm
                                           text-slate-900 dark:text-white
                                           placeholder:text-slate-400 dark:placeholder:text-slate-500
                                           focus:ring-2 focus:ring-amber-500/40"
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
                                        Contributor verification
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
                                Placement data is vital for students. Only{" "}
                                <strong>Medrae Pro</strong> members can contribute
                                to this directory.
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
                                Upgrade to unlock
                            </button>
                        </div>
                    )}

                    <button
                        disabled={loading || checkingSub || uploadingImage}
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
                                ? "bg-amber-500 text-white active:scale-[0.97]"
                                : "bg-slate-200 dark:bg-white/[0.08] text-slate-400 dark:text-slate-500"
                            }
                                    disabled:opacity-60 disabled:cursor-not-allowed`}
                        style={{ touchAction: "manipulation" }}
                    >
                        {loading || uploadingImage ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadingImage ? "Uploading images…" : "Saving site…"}
                            </>
                        ) : (
                            <>
                                {isPremium ? (
                                    <Save className="h-4 w-4" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                {isPremium ? "Save placement site" : "Upgrade to publish"}
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
    tone: "amber" | "blue" | "emerald" | "rose";
}) {
    const toneMap = {
        amber:
            "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
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

export default AddPlacementPage;