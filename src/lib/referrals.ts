// src/lib/referrals.ts
// ─────────────────────────────────────────────────────────────
// Referral helpers — read the current user's code, build the
// share link, open WhatsApp / copy to clipboard.
// ─────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";

const APP_ORIGIN =
    typeof window !== "undefined"
        ? window.location.origin
        : "https://medrae.app"; // fallback for SSR

// ─────────────────────────────────────────────────────────────
// Fetch the current user's referral code from profiles.
// Returns null if the user has no code yet (shouldn't happen
// after Part 1c backfill, but we guard anyway).
// ─────────────────────────────────────────────────────────────
export async function getMyReferralCode(userId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("referral_code")
            .eq("user_id", userId)
            .maybeSingle();

        if (error || !data) return null;
        return data.referral_code ?? null;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// Build a full share link from a referral code.
// ─────────────────────────────────────────────────────────────
export function buildReferralLink(code: string): string {
    return `${APP_ORIGIN}/register?ref=${encodeURIComponent(code)}`;
}

// ─────────────────────────────────────────────────────────────
// WhatsApp share text — warm, personal, non-spammy.
// ─────────────────────────────────────────────────────────────
export function buildWhatsAppMessage(code: string): string {
    const link = buildReferralLink(code);
    return (
        `Hey! I'm using Medrae for my nursing studies — it has past papers, ` +
        `quizzes, and a full NCK curriculum. Try it free (you'll get 1 day of ` +
        `Premium when you sign up): ${link}`
    );
}

// ─────────────────────────────────────────────────────────────
// Open WhatsApp with a prefilled message.
// ─────────────────────────────────────────────────────────────
export function shareOnWhatsApp(code: string) {
    const msg = encodeURIComponent(buildWhatsAppMessage(code));
    const url = `https://wa.me/?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

// ─────────────────────────────────────────────────────────────
// Copy text to clipboard, return true on success.
// ─────────────────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// Stats: how many friends has the user referred, and how many
// days they've earned.
//   - completed/rewarded → counted
//   - pending → not counted yet
//   - rejected → never counted
// ─────────────────────────────────────────────────────────────
export type ReferralStats = {
    invites: number;      // confirmed rewarded referrals
    pending: number;      // signups that haven't been rewarded yet
    daysEarned: number;   // invites * 2 (referrer reward)
};

export async function getMyReferralStats(userId: string): Promise<ReferralStats> {
    try {
        const { data, error } = await supabase
            .from("referrals")
            .select("status, reward_days_referrer")
            .eq("referrer_user_id", userId);

        if (error || !data) {
            return { invites: 0, pending: 0, daysEarned: 0 };
        }

        let invites = 0;
        let pending = 0;
        let daysEarned = 0;

        for (const row of data) {
            if (row.status === "rewarded") {
                invites += 1;
                daysEarned += row.reward_days_referrer ?? 2;
            } else if (row.status === "pending" || row.status === "completed") {
                pending += 1;
            }
            // rejected → ignore
        }

        return { invites, pending, daysEarned };
    } catch {
        return { invites: 0, pending: 0, daysEarned: 0 };
    }
}