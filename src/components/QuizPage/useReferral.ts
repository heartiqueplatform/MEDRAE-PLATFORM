// src/components/QuizPage/useReferral.ts
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import {
    getMyReferralCode,
    buildReferralLink,
    buildWhatsAppMessage,
} from "@/lib/referrals";
import { playSound } from "@/lib/soundManager";

const FALLBACK_LINK = "https://medrae.vercel.app/";

export function useReferral() {
    const user = useUser();
    const [code, setCode] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        getMyReferralCode(user.id).then((c) => {
            if (!cancelled) setCode(c);
        });
        return () => { cancelled = true; };
    }, [user?.id]);

    const referralLink = code ? buildReferralLink(code) : FALLBACK_LINK;

    const shareToWhatsApp = () => {
        const message = code
            ? buildWhatsAppMessage(code)
            : `Join me on Medrae — the nursing study platform. ${referralLink}`;
        if (navigator.vibrate) navigator.vibrate(15);
        playSound("ui-tap");
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    };

    const shareToTelegram = () => {
        const text = code
            ? `Join me on Medrae — nursing quizzes, past papers, and a full NCK curriculum. You get 1 day of Premium when you sign up:`
            : `Ready to level up your nursing knowledge? Join Medrae.`;
        if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
        playSound("ui-tap");
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
            "_blank"
        );
    };

    return { code, referralLink, shareToWhatsApp, shareToTelegram };
}