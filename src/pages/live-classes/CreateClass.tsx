// src/pages/live-classes/CreateClass.tsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { liveClassService } from "@/services/liveClassService";
import { toast } from "sonner";
import {
    X,
    Upload,
    Calendar,
    Clock,
    Users,
    Award,
    Link as LinkIcon,
    BookOpen,
    Video,
    Loader2,
    CheckCircle,
    ChevronLeft,
    FileText,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { playSound } from "@/lib/soundManager";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: "light" | "success" | "warning" = "light") => {
    playSound("ui-tap");
    if (type === "success") vibrate([20, 30, 20]);
    else if (type === "warning") vibrate(60);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Cloudinary config                                                  */
/* ------------------------------------------------------------------ */

const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae-classes";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOPIC_CATEGORIES = [
    "Nursing Fundamentals",
    "Medical-Surgical Nursing",
    "Pediatric Nursing",
    "Maternal & Newborn Nursing",
    "Psychiatric Nursing",
    "Pharmacology",
    "Community Health Nursing",
    "Leadership & Management",
    "Research & Evidence-Based Practice",
    "Critical Care Nursing",
    "Emergency Nursing",
    "Oncology Nursing",
    "Geriatric Nursing",
    "Other",
];

const MEETING_PLATFORMS = [
    { value: "google_meet", label: "Google Meet" },
    { value: "zoom", label: "Zoom" },
    { value: "teams", label: "Microsoft Teams" },
    { value: "other", label: "Other" },
];

/* ------------------------------------------------------------------ */
/*  Reusable field wrapper                                             */
/* ------------------------------------------------------------------ */

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
        <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                {label}
                {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    "w-full h-10 rounded-lg bg-slate-50 dark:bg-[#0d1117] px-3 " +
    "text-sm text-slate-900 dark:text-white " +
    "placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/40 border-0";

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export const CreateClass = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string>("");
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        topic_category: "",
        meeting_link: "",
        meeting_platform: "google_meet",
        meeting_id: "",
        meeting_password: "",
        class_date: "",
        start_time: "",
        end_time: "",
        host_name: profile?.name || "",
        max_students: 50,
        is_cpd_eligible: false,
        cpd_points: 0,
        cpd_accreditation_number: "",
        prerequisites: "",
        learning_objectives: "",
    });

    /* Check if the form has any user data — to warn on back */
    const hasUnsavedData =
        formData.title.trim() ||
        formData.description.trim() ||
        formData.meeting_link.trim() ||
        formData.class_date ||
        formData.start_time ||
        formData.end_time ||
        imageFile;

    const handleBack = useCallback(() => {
        tap();
        if (hasUnsavedData) {
            const confirmLeave = window.confirm(
                "You have unsaved changes. Discard and go back?"
            );
            if (!confirmLeave) return;
        }
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/live-classes", { replace: true });
        }
    }, [navigate, hasUnsavedData]);

    /* ── Cloudinary upload ── */
    const uploadToCloudinary = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        fd.append("folder", "medrae/classes");

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be less than 5MB");
            return;
        }
        tap();
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        tap("warning");
        setImageFile(null);
        setCoverPreview("");
        setUploadedImageUrl("");
    };

    const handleInputChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        if (!formData.title.trim()) {
            toast.error("Title is required");
            return;
        }
        if (!formData.class_date) {
            toast.error("Class date is required");
            return;
        }
        if (!formData.start_time || !formData.end_time) {
            toast.error("Start and end times are required");
            return;
        }
        if (!formData.host_name) {
            toast.error("Host name is required");
            return;
        }
        if (formData.start_time >= formData.end_time) {
            toast.error("End time must be after start time");
            return;
        }
        if (!formData.meeting_link.trim()) {
            toast.error("Meeting link is required");
            return;
        }

        setLoading(true);
        tap("success");

        try {
            let imageUrl = uploadedImageUrl;

            if (imageFile && !uploadedImageUrl) {
                setUploadingImage(true);
                try {
                    imageUrl = await uploadToCloudinary(imageFile);
                    setUploadedImageUrl(imageUrl);
                } catch {
                    toast.error("Image upload failed. Class created without image.");
                    imageUrl = "";
                } finally {
                    setUploadingImage(false);
                }
            }

            const submitData = {
                title: formData.title,
                description: formData.description,
                topic_category: formData.topic_category,
                meeting_link: formData.meeting_link,
                meeting_platform: formData.meeting_platform,
                meeting_id: formData.meeting_id,
                meeting_password: formData.meeting_password,
                class_date: formData.class_date,
                start_time: formData.start_time + ":00",
                end_time: formData.end_time + ":00",
                host_name: formData.host_name,
                host_user_id: user?.id,
                max_students: parseInt(formData.max_students.toString()),
                is_cpd_eligible: formData.is_cpd_eligible,
                cpd_points: parseFloat(formData.cpd_points.toString()),
                cpd_accreditation_number: formData.cpd_accreditation_number,
                prerequisites: formData.prerequisites,
                learning_objectives: formData.learning_objectives
                    .split("\n")
                    .filter((obj) => obj.trim()),
                cover_image_url: imageUrl || null,
            };

            await liveClassService.createClass(submitData);
            toast.success("Class created");
            navigate("/live-classes", { replace: true });
        } catch (error) {
            console.error("Error creating class:", error);
            toast.error("Failed to create class");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* ── HEADER ── */}
            <header className="shrink-0 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] z-30">
                <div className="flex items-center gap-2 px-2 h-14">
                    <button
                        onClick={handleBack}
                        aria-label="Back"
                        className="h-10 w-10 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors shrink-0"
                        style={{ touchAction: "manipulation" }}
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold leading-tight truncate">
                            Create class
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            Share a live session with the community
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                                    bg-blue-100 text-blue-700
                                    dark:bg-blue-400/10 dark:text-blue-300">
                        <Video className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            New
                        </span>
                    </div>
                </div>
            </header>

            {/* ── SCROLLABLE FORM ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[880px] mx-auto pb-32"
                    style={{
                        paddingBottom:
                            "calc(96px + env(safe-area-inset-bottom, 0px))",
                    }}
                >
                    {/* Cover image */}
                    <section className="px-4 pt-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
                            <Field label="Cover image">
                                {coverPreview ? (
                                    <div className="relative rounded-xl overflow-hidden">
                                        <img
                                            src={coverPreview}
                                            alt="Preview"
                                            className="w-full h-40 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            aria-label="Remove image"
                                            className="absolute top-2 right-2 h-8 w-8 rounded-full
                                                       bg-black/60 text-white
                                                       flex items-center justify-center
                                                       active:scale-95 transition-transform"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                                            </div>
                                        )}
                                        {uploadedImageUrl && !uploadingImage && (
                                            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1
                                                            rounded-full bg-emerald-600 text-white px-2 py-0.5">
                                                <CheckCircle className="h-3 w-3" />
                                                <span className="text-[10px] font-bold">Uploaded</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <label
                                        className="cursor-pointer block"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        <div className="w-full h-32 rounded-xl
                                                        border-2 border-dashed border-slate-300 dark:border-white/[0.1]
                                                        bg-slate-50 dark:bg-[#0d1117]
                                                        flex flex-col items-center justify-center gap-1
                                                        active:bg-slate-100 dark:active:bg-white/[0.04]
                                                        transition-colors">
                                            <Upload className="h-6 w-6 text-slate-400" />
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                Tap to upload
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                16:9 · max 5MB
                                            </span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </Field>
                        </div>
                    </section>

                    {/* Basic info */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Basic info
                                </h2>
                            </div>

                            <Field label="Title" required>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Cardiac emergencies"
                                    className={inputClass}
                                    required
                                    autoComplete="off"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <Field label="Description">
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder="What will students learn?"
                                    className={`${inputClass} h-auto py-2 resize-none`}
                                    style={{
                                        touchAction: "manipulation",
                                        WebkitAppearance: "none",
                                    }}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Category">
                                    <Select
                                        value={formData.topic_category}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                topic_category: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full h-10 rounded-lg border-0
                                                       bg-slate-50 dark:bg-[#0d1117]
                                                       px-3 text-sm text-slate-900 dark:text-white
                                                       focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                                        >
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22] max-h-72">
                                            {TOPIC_CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <Field label="Host name" required>
                                    <input
                                        type="text"
                                        name="host_name"
                                        value={formData.host_name}
                                        onChange={handleInputChange}
                                        placeholder="Your name"
                                        className={inputClass}
                                        required
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    {/* Date & time */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Date & time
                                </h2>
                            </div>

                            <Field label="Class date" required>
                                <input
                                    type="date"
                                    name="class_date"
                                    value={formData.class_date}
                                    onChange={handleInputChange}
                                    className={inputClass}
                                    required
                                    min={new Date().toISOString().split("T")[0]}
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Start time" required>
                                    <input
                                        type="time"
                                        name="start_time"
                                        value={formData.start_time}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </Field>

                                <Field label="End time" required>
                                    <input
                                        type="time"
                                        name="end_time"
                                        value={formData.end_time}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                        required
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    {/* Meeting */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <LinkIcon className="h-4 w-4 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Meeting details
                                </h2>
                            </div>

                            <Field label="Platform">
                                <Select
                                    value={formData.meeting_platform}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            meeting_platform: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full h-10 rounded-lg border-0
                                                   bg-slate-50 dark:bg-[#0d1117]
                                                   px-3 text-sm text-slate-900 dark:text-white
                                                   focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-0 shadow-lg bg-white dark:bg-[#161b22]">
                                        {MEETING_PLATFORMS.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Meeting link" required>
                                <input
                                    type="url"
                                    name="meeting_link"
                                    value={formData.meeting_link}
                                    onChange={handleInputChange}
                                    placeholder="https://meet.google.com/..."
                                    className={inputClass}
                                    required
                                    autoComplete="off"
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Meeting ID">
                                    <input
                                        type="text"
                                        name="meeting_id"
                                        value={formData.meeting_id}
                                        onChange={handleInputChange}
                                        placeholder="Optional"
                                        className={inputClass}
                                        autoComplete="off"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </Field>

                                <Field label="Password">
                                    <input
                                        type="text"
                                        name="meeting_password"
                                        value={formData.meeting_password}
                                        onChange={handleInputChange}
                                        placeholder="Optional"
                                        className={inputClass}
                                        autoComplete="off"
                                        style={{ touchAction: "manipulation" }}
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    {/* Capacity & CPD */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Capacity & CPD
                                </h2>
                            </div>

                            <Field label="Max students">
                                <input
                                    type="number"
                                    name="max_students"
                                    value={formData.max_students}
                                    onChange={handleInputChange}
                                    min={1}
                                    max={500}
                                    className={inputClass}
                                    style={{ touchAction: "manipulation" }}
                                />
                            </Field>

                            <button
                                type="button"
                                onClick={() => {
                                    tap();
                                    setFormData((prev) => ({
                                        ...prev,
                                        is_cpd_eligible: !prev.is_cpd_eligible,
                                    }));
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-xl
                                           bg-slate-50 dark:bg-[#0d1117]
                                           active:scale-[0.99] transition-transform"
                                style={{ touchAction: "manipulation" }}
                            >
                                <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                        This class offers CPD points
                                    </span>
                                </div>
                                <div
                                    className={`relative w-10 h-6 rounded-full transition-colors ${formData.is_cpd_eligible
                                        ? "bg-emerald-600"
                                        : "bg-slate-300 dark:bg-white/[0.15]"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.is_cpd_eligible
                                            ? "translate-x-4"
                                            : "translate-x-0"
                                            }`}
                                    />
                                </div>
                            </button>

                            {formData.is_cpd_eligible && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="CPD points">
                                        <input
                                            type="number"
                                            name="cpd_points"
                                            value={formData.cpd_points}
                                            onChange={handleInputChange}
                                            min={0}
                                            step={0.5}
                                            className={inputClass}
                                            style={{ touchAction: "manipulation" }}
                                        />
                                    </Field>

                                    <Field label="Accreditation">
                                        <input
                                            type="text"
                                            name="cpd_accreditation_number"
                                            value={formData.cpd_accreditation_number}
                                            onChange={handleInputChange}
                                            placeholder="CPD-2024-001"
                                            className={inputClass}
                                            autoComplete="off"
                                            style={{ touchAction: "manipulation" }}
                                        />
                                    </Field>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Learning */}
                    <section className="px-4 pb-3">
                        <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="h-4 w-4 text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Learning
                                </h2>
                            </div>

                            <Field label="Prerequisites">
                                <textarea
                                    name="prerequisites"
                                    value={formData.prerequisites}
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="What should students know?"
                                    className={`${inputClass} h-auto py-2 resize-none`}
                                    style={{
                                        touchAction: "manipulation",
                                        WebkitAppearance: "none",
                                    }}
                                />
                            </Field>

                            <Field label="Learning objectives (one per line)">
                                <textarea
                                    name="learning_objectives"
                                    value={formData.learning_objectives}
                                    onChange={handleInputChange}
                                    rows={3}
                                    placeholder={"By the end of this class, students will be able to:\n..."}
                                    className={`${inputClass} h-auto py-2 resize-none`}
                                    style={{
                                        touchAction: "manipulation",
                                        WebkitAppearance: "none",
                                    }}
                                />
                            </Field>
                        </div>
                    </section>
                </form>
            </main>

            {/* ── STICKY BOTTOM BAR ── */}
            <div
                className="shrink-0 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur
                           border-t border-slate-200/70 dark:border-white/[0.06]
                           px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
            >
                <div className="w-full max-w-[880px] mx-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={loading}
                        className="h-12 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ touchAction: "manipulation" }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-class-form"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-12 rounded-xl bg-blue-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.98] transition-transform
                                   flex items-center justify-center gap-2
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ touchAction: "manipulation" }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadingImage ? "Uploading…" : "Creating…"}
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                Create class
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};