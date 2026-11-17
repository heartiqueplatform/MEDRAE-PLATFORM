export function fmtTime(seconds?: number) {
    if (!seconds || !isFinite(seconds)) return "--:--";
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function fmtDate(iso?: string) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
        });
    } catch { return ""; }
}

export function fmtBytes(n: number) {
    if (!n) return "—";
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
    return `${n} B`;
}