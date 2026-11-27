// ============================================================
// Neldes Scroll — Cloudinary helpers.
// Compression happens BEFORE upload (browser-image-compression).
// Cloudinary then re-compresses at render via URL transforms.
//
// - uploadMemeImage(file)        → single upload (kept for back-compat)
// - uploadMemeImages(files, opts) → bulk, parallel, retried, with progress
// ============================================================

import imageCompression from "browser-image-compression";
import {
    CLOUDINARY_FOLDER,
    CLOUDINARY_CARD_TRANSFORM,
    CLOUDINARY_SHARE_TRANSFORM,
} from "../config/constants";

const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "medrae_uploads";

export interface UploadedImage {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    bytes: number;
}

/* ------------------------------------------------------------------ */
/*  SINGLE UPLOAD — unchanged (kept for back-compat)                   */
/* ------------------------------------------------------------------ */
export async function uploadMemeImage(file: File): Promise<UploadedImage> {
    const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        initialQuality: 0.9,
        useWebWorker: true,
        fileType: "image/jpeg",
    });

    const form = new FormData();
    form.append("file", compressed);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    form.append("folder", CLOUDINARY_FOLDER);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
    );
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloudinary upload failed: ${err}`);
    }
    return (await res.json()) as UploadedImage;
}

/* ------------------------------------------------------------------ */
/*  BULK UPLOAD — parallel + retried + byte-level progress            */
/* ------------------------------------------------------------------ */

export interface UploadProgress {
    index: number;
    total: number;
    loaded: number;
    size: number;
    percent: number;   // 0..100
    status: "queued" | "compressing" | "uploading" | "done" | "error";
    error?: string;
}

export interface BulkUploadOptions {
    /** Called every time any file's state changes */
    onProgress?: (progress: UploadProgress[]) => void;
    /** How many files upload in parallel. 3 is a good default. */
    concurrency?: number;
    /** Retries per file before giving up */
    retries?: number;
}

/* XHR — the only way to get real byte-level upload progress.
   fetch() has no progress events. */
function uploadViaXHR(
    blob: Blob,
    onLoaded: (loaded: number) => void
): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
        );
        // 2 minutes per file — generous for slow mobile networks
        xhr.timeout = 120_000;

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onLoaded(e.loaded);
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText) as UploadedImage);
                } catch {
                    reject(new Error("Bad Cloudinary response"));
                }
            } else {
                let msg = `Upload failed (${xhr.status})`;
                try {
                    const err = JSON.parse(xhr.responseText);
                    if (err?.error?.message) msg = err.error.message;
                } catch { /* ignore */ }
                reject(new Error(msg));
            }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));

        const form = new FormData();
        form.append("file", blob);
        form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        form.append("folder", CLOUDINARY_FOLDER);
        xhr.send(form);
    });
}

async function uploadOneWithRetry(
    file: File,
    index: number,
    total: number,
    report: (p: UploadProgress) => void,
    retries: number
): Promise<UploadedImage> {
    report({
        index, total,
        loaded: 0, size: file.size, percent: 0,
        status: "compressing",
    });

    let compressed: Blob;
    try {
        compressed = await imageCompression(file, {   // ✅ no `const` — assigns outer
            maxWidthOrHeight: 1600,
            initialQuality: 0.9,
            useWebWorker: true,
            fileType: "image/jpeg",
        });
    } catch {
        compressed = file;
    }
    const size = compressed.size;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        report({ index, total, loaded: 0, size, percent: 0, status: "uploading" });
        try {
            const result = await uploadViaXHR(compressed, (loaded) => {
                report({
                    index, total, loaded, size,
                    percent: Math.min(100, Math.round((loaded / size) * 100)),
                    status: "uploading",
                });
            });
            report({ index, total, loaded: size, size, percent: 100, status: "done" });
            return result;
        } catch (e: any) {
            lastErr = e;
            if (attempt < retries) {
                // exponential backoff: 1s, 2s, 4s
                await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    report({
        index, total,
        loaded: 0, size, percent: 0,
        status: "error",
        error: lastErr?.message ?? "Upload failed",
    });
    throw lastErr ?? new Error("Upload failed");
}

/**
 * Upload many files in parallel with per-file progress and retries.
 * One file failing does NOT kill the batch.
 *
 * Returns both successes and failures — caller decides whether to insert
 * rows for the succeeded ones.
 */
export async function uploadMemeImages(
    files: File[],
    opts: BulkUploadOptions = {}
): Promise<{
    uploaded: UploadedImage[];
    failed: { file: File; error: string }[];
}> {
    const { onProgress, concurrency = 3, retries = 3 } = opts;

    const total = files.length;
    const state: UploadProgress[] = files.map((f, i) => ({
        index: i,
        total,
        loaded: 0,
        size: f.size,
        percent: 0,
        status: "queued",
    }));

    const emit = () => onProgress?.(state.map((s) => ({ ...s })));

    const uploaded: UploadedImage[] = new Array(total);
    const failed: { file: File; error: string }[] = [];

    // Simple worker pool — `concurrency` workers pull from a shared cursor.
    let cursor = 0;
    const workers = Array.from(
        { length: Math.min(concurrency, total) },
        async () => {
            while (true) {
                const i = cursor++;
                if (i >= total) return;
                try {
                    uploaded[i] = await uploadOneWithRetry(
                        files[i],
                        i,
                        total,
                        (p) => { state[i] = p; emit(); },
                        retries
                    );
                } catch (e: any) {
                    failed.push({
                        file: files[i],
                        error: e?.message ?? "Upload failed",
                    });
                }
            }
        }
    );

    emit();
    await Promise.all(workers);

    return {
        uploaded: uploaded.filter(Boolean),
        failed,
    };
}

/* ------------------------------------------------------------------ */
/*  RENDER HELPERS — unchanged                                        */
/* ------------------------------------------------------------------ */
export function cardImageUrl(secureUrl: string | null): string {
    if (!secureUrl) return "";
    return secureUrl.replace("/upload/", `/upload/${CLOUDINARY_CARD_TRANSFORM}/`);
}

export function shareImageUrl(secureUrl: string): string {
    return secureUrl.replace("/upload/", `/upload/${CLOUDINARY_SHARE_TRANSFORM}/`);
}