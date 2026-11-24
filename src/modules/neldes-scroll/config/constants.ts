// ============================================================
// Neldes Scroll — tunable config
// Change behavior here, never in components.
// ============================================================

/** How many posts per RPC page. 10 = smooth scroll, low egress. */
export const FEED_PAGE_SIZE = 10;

/** How many pages ahead to prefetch (keeps scroll smooth). */
export const PREFETCH_THRESHOLD = 3;

/** Where Cloudinary stores memes. Change to 'neldes/test' for staging. */
export const CLOUDINARY_FOLDER = "neldes/posts";

/** Cloudinary transformations applied at render time (cheap, cached at CDN). */
export const CLOUDINARY_CARD_TRANSFORM = "f_auto,q_auto,w_720,c_limit";
export const CLOUDINARY_SHARE_TRANSFORM = "f_jpg,q_85,w_1080,c_limit";

/** Watermark text baked into share-to-status images. */
export const WATERMARK_TEXT = "Made by Medrae";
export const WATERMARK_URL = "https://medrae-nursing.vercel.app";

/** How long a card must be in view before we count it as "seen". */
export const SEEN_DELAY_MS = 1000;

/** Visual palette (matches existing Medrae app). */
export const NELDES_COLORS = {
    bg: "#000000",          // full-black feed background
    cardBg: "#0d1117",      // matches your dark surface
    textPrimary: "#f0f6fc",
    textSecondary: "#8b949e",
    accent: "#58a6ff",      // your existing blue
    heart: "#f85149",       // your existing red
    heartInactive: "#c9d1d9",
} as const;