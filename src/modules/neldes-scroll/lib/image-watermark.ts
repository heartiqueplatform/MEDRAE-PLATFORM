// ============================================================
// Neldes Scroll — bake "Made by Medrae" watermark + caption onto image.
// ============================================================

import {
    WATERMARK_TEXT,
    WATERMARK_URL,
    NELDES_COLORS,
} from "../config/constants";

interface WatermarkOpts {
    title?: string | null;
    caption?: string | null;
    linkUrl?: string | null;
}

export async function watermarkImage(
    imageUrl: string,
    opts: WatermarkOpts = {}
): Promise<Blob> {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(img, 0, 0);

    // ── Caption block (bottom overlay) ─────────────────────────
    const hasText = !!(opts.title || opts.caption || opts.linkUrl);
    let captionBlockH = 0;

    if (hasText) {
        const padX = Math.round(canvas.width * 0.05);
        const fontTitle = Math.round(canvas.width * 0.032);
        const fontBody = Math.round(canvas.width * 0.026);
        const fontLink = Math.round(canvas.width * 0.022);
        const lineGap = Math.round(canvas.width * 0.012);
        const blockPadY = Math.round(canvas.width * 0.03);

        // measure wrapped caption
        ctx.font = `600 ${fontBody}px system-ui, -apple-system, sans-serif`;
        const maxW = canvas.width - padX * 2;
        const captionLines = opts.caption
            ? wrapText(ctx, opts.caption, maxW).slice(0, 4)
            : [];

        const titleH = opts.title ? fontTitle + lineGap : 0;
        const captionH =
            captionLines.length > 0
                ? captionLines.length * (fontBody + lineGap * 0.5)
                : 0;
        const linkH = opts.linkUrl ? fontLink + lineGap : 0;

        captionBlockH =
            blockPadY * 2 + titleH + captionH + linkH;

        // gradient scrim behind caption
        const scrim = ctx.createLinearGradient(
            0,
            canvas.height - captionBlockH - canvas.height * 0.15,
            0,
            canvas.height
        );
        scrim.addColorStop(0, "rgba(0,0,0,0)");
        scrim.addColorStop(0.4, "rgba(0,0,0,0.55)");
        scrim.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = scrim;
        ctx.fillRect(
            0,
            canvas.height - captionBlockH - canvas.height * 0.15,
            canvas.width,
            captionBlockH + canvas.height * 0.15
        );

        let y = canvas.height - captionBlockH + blockPadY;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ffffff";

        if (opts.title) {
            ctx.font = `700 ${fontTitle}px system-ui, -apple-system, sans-serif`;
            ctx.fillText(opts.title, padX, y);
            y += titleH;
        }

        if (captionLines.length > 0) {
            ctx.font = `500 ${fontBody}px system-ui, -apple-system, sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.92)";
            for (const line of captionLines) {
                ctx.fillText(line, padX, y);
                y += fontBody + lineGap * 0.5;
            }
        }

        if (opts.linkUrl) {
            ctx.font = `500 ${fontLink}px system-ui, -apple-system, sans-serif`;
            ctx.fillStyle = NELDES_COLORS.accent;
            ctx.fillText(opts.linkUrl, padX, y);
        }
    }

    // ── Existing bottom-right watermark bar ────────────────────
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

/** Word-wrap helper — splits text into lines that fit `maxWidth`. */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
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