import { memo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// QR Code display
// ─────────────────────────────────────────────────────────────
export const QRCodeDisplay = memo(
    ({ value, qrRef }: { value: string; qrRef?: React.RefObject<HTMLDivElement> }) => (
        <div
            ref={qrRef}
            className="bg-white dark:bg-slate-800 p-2 rounded-xl mb-4 mx-auto
                       flex items-center justify-center
                       w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]"
        >
            <QRCodeSVG
                value={value}
                size={200}
                level="H"
                style={{ width: "100%", height: "100%", display: "block" }}
                bgColor="#ffffff"
                fgColor="#1e293b"
            />
        </div>
    )
);
QRCodeDisplay.displayName = "QRCodeDisplay";

// ─────────────────────────────────────────────────────────────
// Loading state
// ─────────────────────────────────────────────────────────────
export const LoadingState = () => (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0d1117] z-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-sm font-bold text-slate-400">Loading your invite...</p>
    </div>
);

// ─────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────
export const ErrorState = ({ onBack }: { onBack: () => void }) => (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0d1117] p-4 text-center z-50">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Couldn't load your invite code
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            Please refresh the page. If this keeps happening, contact support.
        </p>
        <button
            onClick={onBack}
            className="mt-6 h-10 px-4 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-sm font-bold"
        >
            Go back
        </button>
    </div>
);

// ─────────────────────────────────────────────────────────────
// Stat tile
// ─────────────────────────────────────────────────────────────
export function StatBlock({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone: "blue" | "emerald" | "amber";
}) {
    const toneMap = {
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
    return (
        <div className={`rounded-xl p-3 text-center ${toneMap[tone]}`}>
            <div className="flex items-center justify-center mb-1">{icon}</div>
            <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">
                {label}
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// How-it-works step row
// ─────────────────────────────────────────────────────────────
export function HowItWorksRow({
    step,
    icon,
    title,
    body,
}: {
    step: string;
    icon: React.ReactNode;
    title: string;
    body: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">
                {step}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 dark:text-blue-400">{icon}</span>
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                        {title}
                    </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {body}
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Reward stack example tile
// ─────────────────────────────────────────────────────────────
export function StackExample({
    invites,
    days,
    highlight = false,
}: {
    invites: number;
    days: number;
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-lg p-2 ${highlight
                ? "bg-blue-600 text-white"
                : "bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200"
                }`}
        >
            <p className={`text-[10px] font-bold leading-none ${highlight ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
                {invites} invites
            </p>
            <p className={`text-sm font-bold tabular-nums leading-tight mt-0.5 ${highlight ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {days} days
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Rule row
// ─────────────────────────────────────────────────────────────
export function RuleRow({
    icon,
    tone,
    title,
    body,
}: {
    icon: React.ReactNode;
    tone: "emerald" | "amber" | "rose" | "blue";
    title: string;
    body: string;
}) {
    const toneMap = {
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
        rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
        blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };
    return (
        <div className="flex items-start gap-2.5">
            <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">
                    {title}
                </p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    {body}
                </p>
            </div>
        </div>
    );
}