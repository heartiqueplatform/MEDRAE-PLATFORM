// src/components/grouppay/SoloSubscriptionCard.tsx

import { useNavigate } from "react-router-dom";
import { CreditCard, ChevronRight, User } from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = () => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
    }
};

interface SoloSubscriptionCardProps {
    role?: string | null;
    priceLabel?: string;
}

export function SoloSubscriptionCard({
    role,
    priceLabel,
}: SoloSubscriptionCardProps) {
    const navigate = useNavigate();

    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4
                            flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Icon */}
            <div className="h-11 w-11 rounded-xl
                            bg-slate-100 dark:bg-white/[0.06]
                            flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Prefer to go solo?
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400
                              leading-relaxed mt-1">
                    No group, no ties, no sharing. Subscribe individually
                    {role ? ` as a ${role}` : ""} and unlock full premium access
                    on your own terms.
                    {priceLabel ? ` From ${priceLabel}.` : ""}
                </p>
            </div>

            {/* CTA */}
            <button
                type="button"
                onClick={() => {
                    tap();
                    navigate("/subscription");
                }}
                className="h-10 px-4 rounded-xl shrink-0
                           bg-slate-900 dark:bg-white
                           text-white dark:text-slate-900
                           text-[12px] font-bold
                           flex items-center justify-center gap-1.5
                           active:scale-[0.97] transition-transform"
                style={{ touchAction: "manipulation" }}
            >
                <CreditCard className="h-3.5 w-3.5" />
                Subscribe individually
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </section>
    );
}