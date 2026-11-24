// ============================================================
// Neldes Scroll — Cloudinary helpers.
// Compression happens BEFORE upload (browser-image-compression).
// Cloudinary then re-compresses at render via URL transforms.
// ============================================================

import imageCompression from "browser-image-compression";
import {
    CLOUDINARY_FOLDER,
    CLOUDINARY_CARD_TRANSFORM,
    CLOUDINARY_SHARE_TRANSFORM,
} from "../config/constants";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
    .VITE_CLOUDINARY_UPLOAD_PRESET as string;

export interface UploadedImage {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    bytes: number;
}

/**
 * Compress a File in-browser, then upload to Cloudinary unsigned.
 * Typical meme (1.8 MB JPEG) → ~180 KB before upload, ~120 KB delivered.
 */
export async function uploadMemeImage(file: File): Promise<UploadedImage> {
    const compressed = await imageCompression(file, {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        initialQuality: 0.85,
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

/**
 * Build a render-ready URL with Cloudinary transforms applied.
 * No upload — just a string replace. CDN caches each variant.
 */
export function cardImageUrl(secureUrl: string | null): string {
    if (!secureUrl) return "";
    return secureUrl.replace("/upload/", `/upload/${CLOUDINARY_CARD_TRANSFORM}/`);
}

export function shareImageUrl(secureUrl: string): string {
    return secureUrl.replace("/upload/", `/upload/${CLOUDINARY_SHARE_TRANSFORM}/`);
}