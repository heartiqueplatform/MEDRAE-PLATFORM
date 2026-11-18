// src/lib/isStandalone.ts

/**
 * Returns true if the app is running as an INSTALLED app
 * (PWA / home-screen icon), false if it's running in a normal
 * browser tab.
 *
 * Covers:
 *  - Chrome / Edge / Android: display-mode media query
 *  - Safari iOS: navigator.standalone
 *  - Desktop PWAs: window-controls-overlay / minimal-ui
 */
export function isStandalone(): boolean {
    if (typeof window === "undefined") return false;

    // iOS Safari — the ONLY reliable signal there
    if ((navigator as any).standalone === true) return true;

    // Everything else — check the display mode
    try {
        if (window.matchMedia("(display-mode: standalone)").matches) return true;
        if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
        if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
        if (window.matchMedia("(display-mode: window-controls-overlay)").matches) return true;
    } catch {
        // Very old browser — fall through
    }

    return false;
}