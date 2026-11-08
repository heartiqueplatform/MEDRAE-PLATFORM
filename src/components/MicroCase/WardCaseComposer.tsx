"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Loader2, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { playSound } from "@/lib/soundManager";
import TemplatePicker from "./TemplatePicker";
import { TEMPLATES, TemplateId, getTemplateDef } from "./wardCaseTypes";

const DRAFT_KEY = "ward_case_draft_v1";
const MAX_IMAGE_MB = 6;

interface Props {
    open: boolean;
    onClose: () => void;
    user: any;
    onPosted: () => void; // called after successful insert — parent refreshes feed
}

export default function WardCaseComposer({ open, onClose, user, onPosted }: Props) {
    const [template, setTemplate] = useState<TemplateId>("ward");
    const [title, setTitle] = useState("");
    const [fields, setFields] = useState<Record<string, string>>({});
    const [unit, setUnit] = useState("");
    const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [tagsText, setTagsText] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Restore draft on mount ──
    useEffect(() => {
        if (!open) return;
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d.template) setTemplate(d.template);
                if (d.title) setTitle(d.title);
                if (d.fields) setFields(d.fields);
                if (d.unit) setUnit(d.unit);
                if (d.difficulty) setDifficulty(d.difficulty);
                if (d.tagsText) setTagsText(d.tagsText);
            }
        } catch { }
    }, [open]);

    // ── Autosave draft every 4s + on change ──
    useEffect(() => {
        if (!open) return;
        const save = () => {
            try {
                localStorage.setItem(
                    DRAFT_KEY,
                    JSON.stringify({ template, title, fields, unit, difficulty, tagsText })
                );
            } catch { }
        };
        const t = setTimeout(save, 800);
        return () => clearTimeout(t);
    }, [open, template, title, fields, unit, difficulty, tagsText]);

    // ── Lock body scroll ──
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !posting) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, posting, onClose]);

    // Reset on close
    useEffect(() => {
        if (!open) {
            setError(null);
            setPosting(false);
        }
    }, [open]);

    const def = getTemplateDef(template);

    const isValid =
        title.trim().length >= 4 &&
        def.fields.every((f) => !f.required || (fields[f.key] ?? "").trim().length > 0);

    const handleFieldChange = (key: string, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    };

    const handlePickImage = (file: File | null) => {
        setError(null);
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }
        if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setError(`Image must be under ${MAX_IMAGE_MB}MB.`);
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return null;
        const form = new FormData();
        form.append("file", imageFile);
        form.append("upload_preset", "js1gxxdv");
        const res = await fetch(
            "https://api.cloudinary.com/v1_1/dpj5vprwf/image/upload",
            { method: "POST", body: form }
        );
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        return data.secure_url as string;
    };

    const handlePost = async () => {
        if (!user?.id) {
            setError("You must be signed in.");
            return;
        }
        if (!isValid) {
            setError("Please fill in all required fields.");
            return;
        }
        setPosting(true);
        setError(null);
        if (navigator.vibrate) navigator.vibrate(15);

        try {
            const imageUrl = await uploadImage();

            const tags = tagsText
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 6);

            const { error: insertErr } = await supabase
                .from("user_ward_cases")
                .insert({
                    user_id: user.id,
                    template,
                    title: title.trim(),
                    content: {
                        ...fields,
                        ...(imageUrl ? { image_url: imageUrl } : {}),
                    },
                    related_unit: unit.trim() || null,
                    difficulty,
                    tags,
                });

            if (insertErr) throw insertErr;

            playSound("tap-correct", false);
            localStorage.removeItem(DRAFT_KEY);

            // Reset
            setTitle("");
            setFields({});
            setUnit("");
            setTagsText("");
            setDifficulty("medium");
            setImageFile(null);
            setImagePreview(null);
            setTemplate("ward");

            onPosted();
            onClose();
        } catch (err: any) {
            console.warn("[Composer] post failed:", err);
            setError(err?.message ?? "Could not post. Please try again.");
        } finally {
            setPosting(false);
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[2147483647] bg-black/70 backdrop-blur-sm flex items-stretch sm:items-center sm:justify-center sm:p-6"
                >
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#0d1117] w-full sm:max-w-2xl sm:max-h-[92vh] sm:rounded-2xl flex flex-col overflow-hidden"
                    >
                        {/* ── Header ─────────────────────────────── */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-[#30363d] flex-shrink-0">
                            <button
                                onClick={onClose}
                                disabled={posting}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#161b22] active:scale-95 transition disabled:opacity-40"
                                aria-label="Close"
                            >
                                <X size={18} className="text-gray-700 dark:text-[#e6edf3]" />
                            </button>
                            <h2 className="text-[14px] font-bold text-gray-900 dark:text-[#e6edf3]">
                                Post a case
                            </h2>
                            <div className="w-9" /> {/* spacer */}
                        </div>

                        {/* ── Scrollable body ────────────────────── */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar"
                            style={{
                                WebkitOverflowScrolling: "touch",
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                            }}
                        >
                            {/* Template picker */}
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#8b949e] mb-2">
                                    Pick a template
                                </p>
                                <TemplatePicker selected={template} onSelect={setTemplate} />
                                <p className="text-[11px] text-gray-500 dark:text-[#8b949e] mt-2 italic">
                                    {def.description}
                                </p>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Give your case a clear title"
                                    maxLength={120}
                                    className="w-full bg-gray-50 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-[10px] text-gray-400 dark:text-[#8b949e] mt-1 text-right">
                                    {title.length}/120
                                </p>
                            </div>

                            {/* Dynamic template fields */}
                            {def.fields.map((f) => {
                                const val = fields[f.key] ?? "";
                                const isMCQAnswerField =
                                    template === "exam" && f.key === "correctAnswer";
                                return (
                                    <div key={f.key}>
                                        <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                            {f.label}
                                        </label>
                                        {isMCQAnswerField ? (
                                            <div className="flex gap-2">
                                                {["A", "B", "C", "D"].map((opt) => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => handleFieldChange(f.key, opt)}
                                                        className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition ${val === opt
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-gray-100 dark:bg-[#161b22] text-gray-700 dark:text-[#e6edf3]"
                                                            }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : f.multiline ? (
                                            <>
                                                <textarea
                                                    value={val}
                                                    onChange={(e) => handleFieldChange(f.key, e.target.value)}
                                                    placeholder={f.placeholder}
                                                    rows={3}
                                                    maxLength={f.maxLength}
                                                    className="w-full resize-y bg-gray-50 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                                />
                                                {f.maxLength && (
                                                    <p className="text-[10px] text-gray-400 dark:text-[#8b949e] mt-1 text-right">
                                                        {val.length}/{f.maxLength}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <input
                                                type="text"
                                                value={val}
                                                onChange={(e) => handleFieldChange(f.key, e.target.value)}
                                                placeholder={f.placeholder}
                                                maxLength={f.maxLength}
                                                className="w-full bg-gray-50 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Image upload */}
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                    Attach a photo (optional)
                                </label>
                                {imagePreview ? (
                                    <div className="relative rounded-xl overflow-hidden">
                                        <img
                                            src={imagePreview}
                                            alt="preview"
                                            className="w-full max-h-64 object-contain bg-black"
                                        />
                                        <button
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full transition"
                                            aria-label="Remove image"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-[#161b22] rounded-xl py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#21262d] transition">
                                        <ImageIcon size={16} className="text-blue-600" />
                                        <span className="text-[13px] font-medium text-gray-700 dark:text-[#e6edf3]">
                                            Add photo
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) =>
                                                handlePickImage(e.target.files?.[0] ?? null)
                                            }
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Unit */}
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                    Related unit (optional)
                                </label>
                                <input
                                    type="text"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    placeholder="Cardiology, ICU, Med-Surg…"
                                    maxLength={60}
                                    className="w-full bg-gray-50 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                    Difficulty
                                </label>
                                <div className="flex gap-2">
                                    {(["easy", "medium", "hard"] as const).map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            className={`flex-1 py-2 rounded-xl text-[12px] font-bold uppercase transition ${difficulty === d
                                                ? d === "easy"
                                                    ? "bg-green-500 text-white"
                                                    : d === "medium"
                                                        ? "bg-amber-500 text-white"
                                                        : "bg-red-500 text-white"
                                                : "bg-gray-100 dark:bg-[#161b22] text-gray-700 dark:text-[#e6edf3]"
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 dark:text-[#e6edf3] mb-1">
                                    Tags (optional, comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={tagsText}
                                    onChange={(e) => setTagsText(e.target.value)}
                                    placeholder="hypertension, post-op, cardiology"
                                    maxLength={100}
                                    className="w-full bg-gray-50 dark:bg-[#161b22] border-0 rounded-xl px-3 py-2.5 text-[14px] text-gray-900 dark:text-[#e6edf3] placeholder:text-gray-400 dark:placeholder:text-[#8b949e] outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {error && (
                                <p className="text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                                    {error}
                                </p>
                            )}

                            <div className="h-20" /> {/* spacer for sticky button */}
                        </div>

                        {/* ── Sticky bottom bar ──────────────────── */}
                        <div
                            className="border-t border-gray-100 dark:border-[#30363d] px-3 py-2.5 flex gap-2 flex-shrink-0 bg-white dark:bg-[#0d1117]"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
                        >
                            <button
                                onClick={onClose}
                                disabled={posting}
                                className="px-4 py-2.5 rounded-xl text-[13px] font-bold text-gray-700 dark:text-[#e6edf3] bg-gray-100 dark:bg-[#161b22] hover:bg-gray-200 dark:hover:bg-[#21262d] active:scale-95 transition disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePost}
                                disabled={!isValid || posting}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {posting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Posting…
                                    </>
                                ) : (
                                    "Post case"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}