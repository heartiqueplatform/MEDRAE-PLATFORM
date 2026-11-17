// src/components/HardResetButton.tsx
import { useState } from "react";
import {
    RefreshCw,
    LogOut,
    ShieldCheck,
    HardDrive,
    Smartphone,
    Wifi,
    Info,
    CheckCircle2,
    X,
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { hardResetApp } from "@/lib/hardReset";

type Props = {
    keepLoggedIn?: boolean;
    label?: string;
    asMenuItem?: boolean;
    asRow?: boolean;
};

export function HardResetButton({
    keepLoggedIn = false,
    label,
    asMenuItem = false,
    asRow = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const [working, setWorking] = useState(false);

    const finalLabel =
        label ?? (keepLoggedIn ? "Clear Cached Data" : "Reset the App");

    const handleConfirm = async () => {
        setWorking(true);
        try {
            await hardResetApp({ keepLoggedIn });
        } finally {
            setTimeout(() => {
                window.location.replace("/");
            }, 3000);
        }
    };

    /** Ask any open sheet/dropdown to close before we show the dialog. */
    const closeAnyOverlay = () => {
        try {
            document.body.classList.remove("settings-open");
            window.dispatchEvent(new CustomEvent("close-settings-sheet"));
        } catch { /* silent */ }
    };

    /* ---------- palette ---------- */
    const accent = keepLoggedIn
        ? {
            titleText: "text-slate-900 dark:text-slate-50",
            bodyText: "text-slate-600 dark:text-slate-400",
            chipBg: "bg-slate-100 dark:bg-[#21262d]",
            chipIcon: "text-slate-700 dark:text-slate-300",
            primaryBtn:
                "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900",
        }
        : {
            titleText: "text-slate-900 dark:text-slate-50",
            bodyText: "text-slate-600 dark:text-slate-400",
            chipBg: "bg-red-50 dark:bg-red-500/10",
            chipIcon: "text-red-600 dark:text-[#f85149]",
            primaryBtn:
                "bg-red-600 hover:bg-red-700 dark:bg-[#f85149] dark:hover:bg-[#e63a35] text-white",
        };

    const dialog = (
        <AlertDialog
            open={open}
            onOpenChange={(v) => {
                if (working) return;
                setOpen(v);
            }}
        >
            <AlertDialogContent
                className="
                    z-[1000000]
                    w-screen h-screen max-w-none max-h-none m-0 p-0
                    rounded-none border-0 shadow-none
                    flex flex-col
                    bg-white dark:bg-[#0d1117]
                    overflow-hidden
                "
            >
                {/* ---------- Sticky header (full-bleed bg, centered content) ---------- */}
                <AlertDialogHeader
                    className="
                        shrink-0 px-5 pt-4 pb-3
                        border-b border-slate-100 dark:border-[#21262d]
                        bg-white dark:bg-[#0d1117]
                        space-y-0
                    "
                >
                    <div className="mx-auto w-full max-w-2xl flex items-start gap-3">
                        <div
                            className={`
                                flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                                ${accent.chipBg}
                            `}
                        >
                            {keepLoggedIn ? (
                                <RefreshCw className={`h-5 w-5 ${accent.chipIcon}`} />
                            ) : (
                                <LogOut className={`h-5 w-5 ${accent.chipIcon}`} />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <AlertDialogTitle
                                className={`text-[15px] sm:text-base font-bold leading-tight ${accent.titleText}`}
                            >
                                {keepLoggedIn
                                    ? "Clear saved data on this device?"
                                    : "Reset the app and sign out?"}
                            </AlertDialogTitle>
                            <p className={`text-[12px] leading-snug mt-1 ${accent.bodyText}`}>
                                {keepLoggedIn
                                    ? "You'll stay signed in. Use this if the app is showing old content."
                                    : "This signs you out and clears everything stored on this device."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => !working && setOpen(false)}
                            disabled={working}
                            aria-label="Close"
                            className="
                                shrink-0 p-1.5 rounded-full
                                text-slate-400 hover:text-slate-700
                                dark:text-[#6e7681] dark:hover:text-slate-200
                                hover:bg-slate-100 dark:hover:bg-[#21262d]
                                transition-colors
                                disabled:opacity-40
                            "
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </AlertDialogHeader>

                {/* ---------- Scrollable body (full-bleed bg, centered content) ---------- */}
                <div
                    className="
                        flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar
                        px-5 py-4
                        bg-white dark:bg-[#0d1117]
                    "
                    style={{ WebkitOverflowScrolling: "touch" }}
                >
                    <div className="mx-auto w-full max-w-2xl space-y-4">
                        {/* What this does */}
                        <section>
                            <SectionLabel icon={<Info className="h-3 w-3" />}>
                                What this will do
                            </SectionLabel>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <ResetItem
                                    icon={<HardDrive className="h-4 w-4" />}
                                    title="Removes saved offline files"
                                    desc="Clears everything the app stored here"
                                    tone={keepLoggedIn ? "neutral" : "danger"}
                                />
                                <ResetItem
                                    icon={<RefreshCw className="h-4 w-4" />}
                                    title="Loads the latest version"
                                    desc="Ensures you're using the newest code"
                                    tone={keepLoggedIn ? "neutral" : "danger"}
                                />
                                <ResetItem
                                    icon={<Wifi className="h-4 w-4" />}
                                    title="Clears saved downloads"
                                    desc="Images, fonts, cached pages"
                                    tone={keepLoggedIn ? "neutral" : "danger"}
                                />
                                <ResetItem
                                    icon={<Smartphone className="h-4 w-4" />}
                                    title="Clears app data on this device"
                                    desc="Offline quizzes and notes saved here"
                                    tone={keepLoggedIn ? "neutral" : "danger"}
                                />
                            </div>
                        </section>

                        {/* What stays */}
                        <section>
                            <SectionLabel icon={<CheckCircle2 className="h-3 w-3" />}>
                                What will stay
                            </SectionLabel>
                            {keepLoggedIn ? (
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
                                    <div className="flex items-start gap-2.5">
                                        <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-emerald-900 dark:text-emerald-100">
                                                Your account and login
                                            </p>
                                            <p className="text-[11px] leading-snug text-emerald-800/80 dark:text-emerald-200/70 mt-0.5">
                                                You won't need to sign in again. Everything on our servers stays as it is.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl bg-red-50 dark:bg-[#f85149]/10 p-3">
                                    <div className="flex items-start gap-2.5">
                                        <LogOut className="h-4 w-4 mt-0.5 text-red-600 dark:text-[#f85149] shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-red-900 dark:text-red-100">
                                                Nothing — you'll be signed out
                                            </p>
                                            <p className="text-[11px] leading-snug text-red-800/80 dark:text-red-200/70 mt-0.5">
                                                Your quizzes, results and notes are safe on our servers.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* When to use */}
                        <section>
                            <SectionLabel icon={<Info className="h-3 w-3" />}>
                                When to use this
                            </SectionLabel>
                            <ul className="space-y-1.5 text-[13px] leading-snug text-slate-700 dark:text-slate-300">
                                {keepLoggedIn ? (
                                    <>
                                        <BulletItem>The app shows old content after an update</BulletItem>
                                        <BulletItem>Pages load slowly or show stale information</BulletItem>
                                        <BulletItem>You want a fresh start without signing out</BulletItem>
                                    </>
                                ) : (
                                    <>
                                        <BulletItem>The app is stuck on a loading screen</BulletItem>
                                        <BulletItem>A normal refresh doesn't fix a problem</BulletItem>
                                        <BulletItem>You're switching to a different account</BulletItem>
                                        <BulletItem>Support asked you to do a full reset</BulletItem>
                                    </>
                                )}
                            </ul>
                        </section>

                        {/* Safety note */}
                        <div className="rounded-xl bg-slate-50 dark:bg-[#161b22] p-3 ring-1 ring-slate-100 dark:ring-[#21262d]">
                            <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    This is safe to use.
                                </span>{" "}
                                Your account, quiz results and notes are stored on our servers — not
                                on this device. Only local data is cleared.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------- Sticky footer (full-bleed bg, centered content) ---------- */}
                <AlertDialogFooter
                    className="
                        shrink-0 px-5 pt-3 pb-4
                        border-t border-slate-100 dark:border-[#21262d]
                        bg-white dark:bg-[#0d1117]
                    "
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                    <div className="mx-auto w-full max-w-2xl flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <AlertDialogCancel
                            disabled={working}
                            className="
                                w-full sm:w-auto sm:min-w-[110px]
                                h-11 sm:h-10
                                text-[13px] sm:text-sm font-semibold
                                rounded-xl border-0 shadow-none
                                bg-slate-100 hover:bg-slate-200
                                dark:bg-[#21262d] dark:hover:bg-[#30363d]
                                text-slate-700 dark:text-slate-200
                                m-0
                            "
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleConfirm();
                            }}
                            disabled={working}
                            className={`
                                w-full sm:w-auto sm:min-w-[150px]
                                h-11 sm:h-10
                                text-[13px] sm:text-sm font-bold
                                rounded-xl border-0 shadow-none
                                ${accent.primaryBtn}
                                m-0
                            `}
                        >
                            {working ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>{keepLoggedIn ? "Clear Saved Data" : "Sign Out & Reset"}</>
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    /* ---------- asRow: plain button for portals (SettingsSheet) ---------- */
    if (asRow) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => {
                        closeAnyOverlay();
                        setTimeout(() => setOpen(true), 0);
                    }}
                    className="
                        w-full min-h-[52px] flex items-center gap-3 px-3 py-3
                        rounded-xl text-left transition-colors cursor-pointer
                        hover:bg-gray-50 dark:hover:bg-[#21262d]
                    "
                >
                    <div
                        className={`
                            flex items-center justify-center h-9 w-9 shrink-0 rounded-lg
                            ${keepLoggedIn
                                ? "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-300"
                                : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-[#f85149]"}
                        `}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span
                            className={`
                                text-sm font-semibold truncate
                                ${keepLoggedIn
                                    ? "text-gray-800 dark:text-gray-200"
                                    : "text-slate-800 dark:text-slate-200"}
                            `}
                        >
                            {finalLabel}
                        </span>
                        <span className="text-[10px] font-medium truncate text-gray-500 dark:text-[#8b949e]">
                            {keepLoggedIn
                                ? "Clears saved data on this device"
                                : "Signs you out and clears everything"}
                        </span>
                    </div>
                </button>
                {dialog}
            </>
        );
    }

    /* ---------- asMenuItem: for real dropdowns (Header) ---------- */
    if (asMenuItem) {
        return (
            <>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        closeAnyOverlay();
                        setTimeout(() => setOpen(true), 0);
                    }}
                    className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-[#21262d] focus:bg-slate-50 dark:focus:bg-[#21262d]"
                >
                    <div
                        className={`
                            p-1.5 rounded-md
                            ${keepLoggedIn
                                ? "bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300"
                                : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-[#f85149]"}
                        `}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {finalLabel}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-[#8b949e]">
                            {keepLoggedIn
                                ? "Clears saved data on this device"
                                : "Signs you out and clears everything"}
                        </span>
                    </div>
                </DropdownMenuItem>
                {dialog}
            </>
        );
    }

    /* ---------- Default: standalone Button ---------- */
    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="text-xs md:text-sm h-9 md:h-10 border-0 shadow-none"
            >
                <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                {finalLabel}
            </Button>
            {dialog}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-[#6e7681] mb-2 flex items-center gap-1.5">
            {icon}
            {children}
        </h3>
    );
}

function ResetItem({
    icon,
    title,
    desc,
    tone,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    tone: "neutral" | "danger";
}) {
    return (
        <div
            className={`
                flex items-start gap-2.5 p-2.5 rounded-xl
                ${tone === "danger"
                    ? "bg-red-50/70 dark:bg-[#f85149]/5"
                    : "bg-slate-50 dark:bg-[#161b22]"}
            `}
        >
            <div
                className={`
                    shrink-0 p-1.5 rounded-lg
                    ${tone === "danger"
                        ? "bg-red-100 dark:bg-[#f85149]/15 text-red-600 dark:text-[#f85149]"
                        : "bg-slate-200 dark:bg-[#21262d] text-slate-600 dark:text-slate-300"}
                `}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#8b949e] leading-snug mt-0.5">
                    {desc}
                </p>
            </div>
        </div>
    );
}

function BulletItem({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5">
            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-[#6e7681]" />
            <span className="leading-relaxed">{children}</span>
        </li>
    );
}