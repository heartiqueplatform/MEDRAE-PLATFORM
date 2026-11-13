// src/staff-cpd/admin/editor/NewContentForm.tsx
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { CONTENT_LABEL, validateContentItem } from "../../lib";
import type { ContentType, ExternalProvider } from "../../lib";
import { tap } from "./editor-helpers";
import SelectField from "@/components/ui/SelectField";

const InputBase =
    "w-full h-10 rounded-xl bg-white dark:bg-[#161b22] px-3 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none";
const TextareaBase =
    "w-full rounded-xl bg-white dark:bg-[#161b22] px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-y";
const PrimaryBtn =
    "h-10 px-4 rounded-xl bg-blue-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";
const SecondaryBtn =
    "h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-[13px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50";

/* Options for the Content type SelectField */
const CONTENT_TYPE_OPTIONS = (
    Object.keys(CONTENT_LABEL) as ContentType[]
).map((k) => ({
    value: k,
    label: CONTENT_LABEL[k],
}));

/* All provider options */
const PROVIDER_OPTIONS: { value: ExternalProvider; label: string }[] = [
    { value: "youtube", label: "YouTube" },
    { value: "apple_podcasts", label: "Apple Podcasts" },
    { value: "external", label: "External URL" },
    { value: "internal", label: "Internal (text)" },
];

/* Which provider each content type maps to by default */
const DEFAULT_PROVIDER_FOR_TYPE: Record<ContentType, ExternalProvider> = {
    video: "youtube",
    podcast: "apple_podcasts",
    article: "internal",
    text: "internal",
    case_study: "internal",
    quiz: "internal",
    assessment: "internal",
    pdf: "external",
    external_resource: "external",
    webinar: "external",
};

/* Which providers are valid for each type */
const VALID_PROVIDERS_FOR_TYPE: Record<ContentType, ExternalProvider[]> = {
    video: ["youtube", "external"],
    podcast: ["apple_podcasts", "external"],
    article: ["internal"],
    text: ["internal"],
    case_study: ["internal"],
    quiz: ["internal"],
    assessment: ["internal"],
    pdf: ["external"],
    external_resource: ["external"],
    webinar: ["external"],
};

/* True for types that use a rich-text body instead of a URL */
const isTextLikeType = (t: ContentType) =>
    t === "text" || t === "article" || t === "case_study";

interface NewContentFormProps {
    activityId: string;
    onSubmit: (v: any) => void;
    onCancel: () => void;
    initialItem?: {
        id: string;
        title?: string;
        content_type?: ContentType;
        external_provider?: ExternalProvider;
        external_url?: string | null;
        duration_seconds?: number | null;
        is_required?: boolean;
        body?: string | null;
    };
    submitLabel?: string;
}

export function NewContentForm({
    activityId,
    onSubmit,
    onCancel,
    initialItem,
    submitLabel,
}: NewContentFormProps) {
    const editing = !!initialItem;

    const [type, setType] = useState<ContentType>(
        initialItem?.content_type ?? "text"
    );
    const [provider, setProvider] = useState<ExternalProvider>(
        initialItem?.external_provider ?? "internal"
    );
    const [title, setTitle] = useState(initialItem?.title ?? "");
    const [url, setUrl] = useState(initialItem?.external_url ?? "");
    const [body, setBody] = useState(initialItem?.body ?? "");
    const [duration, setDuration] = useState<number | "">(
        typeof initialItem?.duration_seconds === "number"
            ? initialItem.duration_seconds
            : ""
    );
    const [required, setRequired] = useState(
        initialItem?.is_required ?? true
    );
    const [err, setErr] = useState<string | null>(null);
    const [preview, setPreview] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!initialItem) return;
        setType(initialItem.content_type ?? "text");
        setProvider(initialItem.external_provider ?? "internal");
        setTitle(initialItem.title ?? "");
        setUrl(initialItem.external_url ?? "");
        setBody(initialItem.body ?? "");
        setDuration(
            typeof initialItem.duration_seconds === "number"
                ? initialItem.duration_seconds
                : ""
        );
        setRequired(initialItem.is_required ?? true);
    }, [initialItem?.id]);

    /* Type drives everything: provider, URL vs body */
    const handleTypeChange = (newType: ContentType) => {
        setType(newType);
        const defaultProvider = DEFAULT_PROVIDER_FOR_TYPE[newType];
        setProvider(defaultProvider);
        if (isTextLikeType(newType)) {
            setUrl("");
        } else {
            setBody("");
        }
    };

    /* Only show providers valid for the current type */
    const validProvidersForThisType =
        VALID_PROVIDERS_FOR_TYPE[type] ?? ["external", "internal"];
    const providerOptions = PROVIDER_OPTIONS.filter((o) =>
        validProvidersForThisType.includes(o.value)
    );

    const insertAtCursor = (before: string, after = "") => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const sel = body.slice(start, end);
        const next =
            body.slice(0, start) + before + sel + after + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + before.length + sel.length + after.length;
            el.setSelectionRange(pos, pos);
        });
    };

    const handleImagePick = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
        ];
        if (!allowed.includes(file.type)) {
            setErr("Image must be JPG, PNG, GIF, or WEBP.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErr("Image must be under 10 MB.");
            return;
        }

        setErr(null);
        setUploadingImage(true);
        try {
            const { uploadImageGetUrl } = await import("@/lib/cloudinary");
            const cloudUrl = await uploadImageGetUrl(
                file,
                `cpd/activities/${activityId}`
            );
            insertAtCursor(`\n![image](${cloudUrl})\n`);
        } catch (uploadErr: any) {
            setErr(uploadErr?.message ?? "Image upload failed.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handle = () => {
        setErr(null);
        const payload: any = {
            content_type: type,
            external_provider: provider,
            title,
            external_url: url || null,
            duration_seconds:
                typeof duration === "number" ? duration : null,
            is_required: required,
            body: body.trim() || null,
            body_format: "markdown",
        };
        const check = validateContentItem(payload);
        if (!check.ok) {
            setErr(check.reason ?? "Invalid");
            return;
        }
        tap("success");
        onSubmit({ ...payload, ...(check.normalized ?? {}) });
    };

    const isTextLike = isTextLikeType(type);

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
            {/* Custom SelectField — Content type + Provider */}
            <div className="grid grid-cols-2 gap-2">
                <SelectField
                    value={type}
                    onValueChange={(v) => handleTypeChange(v as ContentType)}
                    options={CONTENT_TYPE_OPTIONS}
                    placeholder="Content type"
                />
                <SelectField
                    value={provider}
                    onValueChange={(v) => setProvider(v as ExternalProvider)}
                    options={providerOptions}
                    placeholder="Provider"
                    disabled={providerOptions.length <= 1}
                />
            </div>

            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
                className={InputBase + " !h-9"}
            />

            {!isTextLike && (
                <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://…"
                    className={InputBase + " !h-9"}
                />
            )}

            {isTextLike && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1 flex-wrap bg-white dark:bg-[#161b22] rounded-lg p-1.5 border border-slate-200/60 dark:border-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => insertAtCursor("**", "**")}
                            title="Bold"
                            className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] font-bold text-[13px]"
                            style={{ touchAction: "manipulation" }}
                        >
                            B
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("*", "*")}
                            title="Italic"
                            className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] italic text-[13px]"
                            style={{ touchAction: "manipulation" }}
                        >
                            I
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("## ")}
                            title="Heading"
                            className="h-7 px-2 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] font-bold text-[11px]"
                            style={{ touchAction: "manipulation" }}
                        >
                            H2
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("\n- ")}
                            title="Bullet list"
                            className="h-7 px-2 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[11px] font-bold"
                            style={{ touchAction: "manipulation" }}
                        >
                            •
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("\n1. ")}
                            title="Numbered list"
                            className="h-7 px-2 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[11px] font-bold"
                            style={{ touchAction: "manipulation" }}
                        >
                            1.
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const u = prompt("URL:");
                                if (u) insertAtCursor("[", `](${u})`);
                            }}
                            title="Link"
                            className="h-7 px-2 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[10px] font-bold"
                            style={{ touchAction: "manipulation" }}
                        >
                            link
                        </button>

                        <div className="w-px h-5 bg-slate-200 dark:bg-white/[0.06] mx-1" />
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImagePick}
                        />
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploadingImage}
                            title="Insert image (uploads to Cloudinary)"
                            className="h-7 px-2 rounded flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-[10px] font-bold disabled:opacity-50"
                            style={{ touchAction: "manipulation" }}
                        >
                            {uploadingImage ? "Uploading…" : "Image"}
                        </button>

                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={() => setPreview(!preview)}
                            title="Preview"
                            className="h-7 px-2 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                            style={{ touchAction: "manipulation" }}
                        >
                            {preview ? "Edit" : "Preview"}
                        </button>
                    </div>

                    {preview ? (
                        <div className="rounded-xl bg-white dark:bg-[#161b22] p-3 text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 min-h-[240px]">
                            {body || (
                                <span className="text-slate-400">
                                    Nothing to preview yet.
                                </span>
                            )}
                        </div>
                    ) : (
                        <textarea
                            ref={textareaRef}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={`Paste or write the lesson content here…\n\nUse the toolbar to add **bold**, *italic*, ## headings, bullets, numbered lists, links, and images.`}
                            rows={14}
                            className={
                                TextareaBase + " !text-[13px] leading-relaxed"
                            }
                        />
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 items-center">
                <input
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) =>
                        setDuration(
                            e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                        )
                    }
                    placeholder="Duration (s, optional)"
                    className={InputBase + " !h-9"}
                />
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer px-1">
                    <input
                        type="checkbox"
                        checked={required}
                        onChange={(e) => setRequired(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                    />
                    Required
                </label>
            </div>

            {err && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" /> {err}
                </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className={SecondaryBtn + " !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handle}
                    disabled={!title}
                    className={PrimaryBtn + " !h-9"}
                    style={{ touchAction: "manipulation" }}
                >
                    {submitLabel ?? (editing ? "Save changes" : "Add")}
                </button>
            </div>
        </div>
    );
}