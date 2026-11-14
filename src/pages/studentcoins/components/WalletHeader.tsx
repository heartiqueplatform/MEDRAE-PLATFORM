// src/pages/studentcoins/components/WalletHeader.tsx

import { ChevronLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/soundManager";

interface Props {
    refreshing: boolean;
    onRefresh: () => void;
}

export function WalletHeader({ refreshing, onRefresh }: Props) {
    const navigate = useNavigate();

    return (
        <header
            className="shrink-0 flex items-center gap-2 px-2 h-14
                       bg-white dark:bg-[#0d1117]
                       border-b border-slate-200/70 dark:border-white/[0.06]
                       z-30 safe-top"
        >
            <button
                onClick={() => {
                    playSound("ui-tap");
                    navigate(-1);
                }}
                aria-label="Go back"
                className="h-10 w-10 rounded-full flex items-center justify-center
                           text-slate-700 dark:text-slate-200
                           active:bg-slate-100 dark:active:bg-white/5
                           transition-colors"
                style={{ touchAction: "manipulation" }}
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>

            <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold leading-tight truncate text-slate-900 dark:text-white">
                    Medrae Wallet
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                    Earn coins · Redeem rewards
                </p>
            </div>

            <button
                onClick={() => {
                    playSound("ui-tap");
                    onRefresh();
                }}
                disabled={refreshing}
                aria-label="Refresh"
                className="h-10 w-10 rounded-full flex items-center justify-center
                           text-slate-700 dark:text-slate-200
                           active:bg-slate-100 dark:active:bg-white/5
                           transition-colors disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
            >
                <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    strokeWidth={2.5}
                />
            </button>
        </header>
    );
}