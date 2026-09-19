// src/components/HardResetButton.tsx
import { useState } from "react";
import {
    RefreshCw,
    AlertTriangle,
    Wifi,
    LogOut,
    ShieldCheck,
    HardDrive,
    Smartphone,
    Info,
    CheckCircle2,
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
};

export function HardResetButton({
    keepLoggedIn = false,
    label,
    asMenuItem = false,
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
            // Fallback in case the reset didn't navigate.
            setTimeout(() => {
                window.location.replace("/");
            }, 3000);
        }
    };

    const dialog = (
        <AlertDialog open={open} onOpenChange={(v) => !working && setOpen(v)}>
            <AlertDialogContent
                className="
                    z-[999999]
                    w-screen h-screen max-w-none max-h-none m-0 p-0
                    rounded-none border-0 shadow-none
                    flex flex-col
                    bg-white dark:bg-slate-950
                    overflow-y-auto
                "
            >
                {/* ---------- Header ---------- */}
                <div
                    className={`
                        sticky top-0 z-10
                        px-5 sm:px-8 pt-6 pb-5
                        ${keepLoggedIn
                            ? "bg-slate-50 dark:bg-slate-900"
                            : "bg-red-50 dark:bg-red-950/40"}
                    `}
                >
                    <div className="flex items-start gap-4 max-w-2xl mx-auto">
                        <div
                            className={`
                                shrink-0 p-3 rounded-2xl
                                ${keepLoggedIn
                                    ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"}
                            `}
                        >
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <AlertDialogTitle
                                className={`
                                    text-lg sm:text-xl font-bold
                                    ${keepLoggedIn
                                        ? "text-slate-900 dark:text-white"
                                        : "text-red-900 dark:text-red-100"}
                                `}
                            >
                                {keepLoggedIn
                                    ? "Clear saved data on this device?"
                                    : "Reset the app and sign out?"}
                            </AlertDialogTitle>
                            <p
                                className={`
                                    text-sm mt-1 leading-relaxed
                                    ${keepLoggedIn
                                        ? "text-slate-600 dark:text-slate-400"
                                        : "text-red-800/80 dark:text-red-200/80"}
                                `}
                            >
                                {keepLoggedIn
                                    ? "You'll stay signed in. This is helpful if the app is showing old content or behaving strangely."
                                    : "This signs you out and clears everything stored on this device. Only do this if nothing else has worked."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------- Body ---------- */}
                <div className="flex-1 px-5 sm:px-8 py-6 max-w-2xl mx-auto w-full space-y-5">

                    {/* What this does */}
                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <Info className="h-3.5 w-3.5" />
                            What this will do
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <ResetItem
                                icon={<HardDrive className="h-4 w-4" />}
                                title="Removes saved offline files"
                                desc="Clears everything the app stored on this device"
                                tone={keepLoggedIn ? "neutral" : "danger"}
                            />
                            <ResetItem
                                icon={<RefreshCw className="h-4 w-4" />}
                                title="Loads the latest version"
                                desc="Makes sure you're using the newest app code"
                                tone={keepLoggedIn ? "neutral" : "danger"}
                            />
                            <ResetItem
                                icon={<Wifi className="h-4 w-4" />}
                                title="Clears saved downloads"
                                desc="Images, fonts, and pages stored for offline use"
                                tone={keepLoggedIn ? "neutral" : "danger"}
                            />
                            <ResetItem
                                icon={<Smartphone className="h-4 w-4" />}
                                title="Clears app data on this device"
                                desc="Removes offline quizzes and notes saved here"
                                tone={keepLoggedIn ? "neutral" : "danger"}
                            />
                        </div>
                    </section>

                    {/* What stays */}
                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            What will stay
                        </h3>
                        {keepLoggedIn ? (
                            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                                        <p className="font-semibold">Your account and login</p>
                                        <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                                            You won't need to sign in again. Everything saved on our servers stays exactly as it is.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30">
                                <div className="flex items-start gap-3">
                                    <LogOut className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                                    <div className="text-sm text-red-900 dark:text-red-100 leading-relaxed">
                                        <p className="font-semibold">Nothing — you'll be signed out</p>
                                        <p className="text-xs text-red-800/80 dark:text-red-200/80 mt-0.5">
                                            Your quizzes, results, and notes are safe on our servers. You'll just need to sign in again.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* When to use */}
                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <Info className="h-3.5 w-3.5" />
                            When to use this
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {keepLoggedIn ? (
                                <>
                                    <BulletItem>The app is showing old content after an update</BulletItem>
                                    <BulletItem>Pages load slowly or show information that's out of date</BulletItem>
                                    <BulletItem>You want a fresh start without signing out</BulletItem>
                                </>
                            ) : (
                                <>
                                    <BulletItem>The app is stuck on a loading screen</BulletItem>
                                    <BulletItem>Something isn't working and a normal refresh doesn't help</BulletItem>
                                    <BulletItem>You're switching to a different account</BulletItem>
                                    <BulletItem>Support has asked you to do a full reset</BulletItem>
                                </>
                            )}
                        </ul>
                    </section>

                    {/* Safety note */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">This is safe to use.</span>{" "}
                            Your account, quiz results, and notes are stored on our servers — not on this device.
                            This only clears what's saved locally. You can use it any time.
                        </p>
                    </div>
                </div>

                {/* ---------- Footer ---------- */}
                <AlertDialogFooter
                    className="
                        sticky bottom-0 z-10
                        px-5 sm:px-8 py-4
                        bg-white dark:bg-slate-950
                        flex-col-reverse sm:flex-row gap-2 sm:gap-3
                    "
                >
                    <AlertDialogCancel
                        disabled={working}
                        className="w-full sm:w-auto h-12 sm:h-11 text-sm font-semibold rounded-xl border-0 shadow-none"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={working}
                        className={`
                            w-full sm:w-auto h-12 sm:h-11 text-sm font-bold rounded-xl border-0 shadow-none
                            ${keepLoggedIn
                                ? "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                                : "bg-red-600 hover:bg-red-700 text-white"}
                        `}
                    >
                        {working ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            <>
                                {keepLoggedIn ? "Clear Saved Data" : "Sign Out & Reset"}
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    if (asMenuItem) {
        return (
            <>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setOpen(true);
                    }}
                    className="flex items-center gap-3 py-3 px-3 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
                >
                    <div
                        className={`p-1.5 rounded-md ${keepLoggedIn
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            }`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {finalLabel}
                        </span>
                        <span
                            className={`text-[10px] font-medium ${keepLoggedIn
                                ? "text-slate-500 dark:text-slate-400"
                                : "text-red-600/70 dark:text-red-400/60"
                                }`}
                        >
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
                flex items-start gap-3 p-3 rounded-xl
                ${tone === "danger"
                    ? "bg-red-50/50 dark:bg-red-950/20"
                    : "bg-slate-50 dark:bg-slate-900/40"}
            `}
        >
            <div
                className={`
                    shrink-0 p-1.5 rounded-lg
                    ${tone === "danger"
                        ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}
                `}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {desc}
                </p>
            </div>
        </div>
    );
}

function BulletItem({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2.5">
            <span
                className="
                    shrink-0 mt-1.5
                    w-1.5 h-1.5 rounded-full
                    bg-slate-400 dark:bg-slate-500
                "
            />
            <span className="leading-relaxed">{children}</span>
        </li>
    );
}