// ============================================================
// Neldes Scroll — bake "Made by Medrae" watermark onto share image.
// Returns a Blob the client can download + attach to WhatsApp Status.
// ============================================================

import {
    WATERMARK_TEXT,
    WATERMARK_URL,
    NELDES_COLORS,
} from "../config/constants";

export async function watermarkImage(imageUrl: string): Promise<Blob> {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Watermark bar (bottom-right)
    const pad = Math.round(canvas.width * 0.025);
    const barH = Math.round(canvas.width * 0.075);
    const barW = Math.round(canvas.width * 0.42);
    const x = canvas.width - barW - pad;
    const y = canvas.height - barH - pad;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundedRect(ctx, x, y, barW, barH, Math.round(barH * 0.25));
    ctx.fill();

    ctx.fillStyle = NELDES_COLORS.textPrimary;
    ctx.font = `bold ${Math.round(barH * 0.38)}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(WATERMARK_TEXT, x + pad * 0.6, y + barH * 0.18);

    ctx.font = `${Math.round(barH * 0.26)}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = NELDES_COLORS.textSecondary;
    ctx.fillText(WATERMARK_URL, x + pad * 0.6, y + barH * 0.55);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
            "image/jpeg",
            0.9
        );
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/** Trigger a download in the browser. */
export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}