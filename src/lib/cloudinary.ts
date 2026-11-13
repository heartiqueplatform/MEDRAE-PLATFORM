// src/lib/cloudinary.ts
const CLOUDINARY_CLOUD_NAME = "dpj5vprwf";
const CLOUDINARY_UPLOAD_PRESET = "js1gxxdv";

export interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}

export async function uploadToCloudinary(
    file: File,
    opts?: { folder?: string; resourceType?: "image" | "video" | "raw" | "auto"; }
): Promise<CloudinaryUploadResult> {
    const resourceType = opts?.resourceType ?? "image";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    if (opts?.folder) formData.append("folder", opts.folder);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        { method: "POST", body: formData }
    );

    if (!res.ok) {
        let msg = "Cloudinary upload failed";
        try {
            const err = await res.json();
            msg = err?.error?.message || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
    }

    return (await res.json()) as CloudinaryUploadResult;
}

export async function uploadImageGetUrl(file: File, folder = "cpd/content"): Promise<string> {
    const result = await uploadToCloudinary(file, { folder, resourceType: "image" });
    return result.secure_url;
}