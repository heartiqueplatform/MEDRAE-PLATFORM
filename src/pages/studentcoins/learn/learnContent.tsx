// src/pages/studentcoins/learn/learnContent.tsx

import {
    Coins,
    Sparkles,
    TrendingUp,
    ShieldCheck,
    Gift,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    Wallet,
    Swords,
    Trophy,
    Flame,
    Heart,
    MessageCircle,
    Bookmark,
    Star,
    Share2,
    Lock,
    Clock,
    Crown,
} from "lucide-react";
import { ACTION_META, EARN_CATEGORIES } from "../constants";

/* ------------------------------------------------------------------ */
/*  Shared section wrappers                                           */
/* ------------------------------------------------------------------ */

export function Section({
    icon: Icon,
    tone,
    eyebrow,
    title,
    children,
}: {
    icon: any;
    tone: string;
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
            <div className="flex items-center gap-2">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider
                                  text-slate-500 dark:text-slate-400 leading-none mb-1">
                        {eyebrow}
                    </p>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {title}
                    </h2>
                </div>
            </div>
            <div className="space-y-2.5 text-[12px] leading-relaxed
                            text-slate-700 dark:text-slate-300">
                {children}
            </div>
        </section>
    );
}

function Bullet({
    icon: Icon,
    tone,
    children,
}: {
    icon: any;
    tone: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tone}`}>
                <Icon className="w-3 h-3" />
            </div>
            <p className="flex-1 min-w-0 break-words">{children}</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                          */
/* ------------------------------------------------------------------ */

export function WhatAreCoinsSection() {
    return (
        <Section
            icon={Coins}
            tone="text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400"
            eyebrow="Getting started"
            title="What are Medrae Coins?"
        >
            <p>
                Medrae Coins are the reward currency for our student community.
                You earn them by contributing to Medrae — liking, commenting,
                completing quizzes, and winning peer challenges.
            </p>
            <p>
                Each coin has a real cash value:{" "}
                <strong className="text-slate-900 dark:text-white">
                    1 coin = KSh 0.01
                </strong>
                . Redeem them for cash to MPesa, premium access, or bonus content.
            </p>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 border border-blue-100 dark:border-blue-500/20">
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-snug">
                    💡 <strong>Example:</strong> 10,000 coins = KSh 100.
                    Redeemable instantly once you're approved.
                </p>
            </div>
        </Section>
    );
}

export function HowToEarnSection() {
    return (
        <Section
            icon={Sparkles}
            tone="text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
            eyebrow="Earning"
            title="How do you earn coins?"
        >
            <p>
                Every meaningful action in the Medrae community pays coins to
                someone — usually <strong>you</strong>, sometimes{" "}
                <strong>another student</strong> whose content you engage with.
            </p>

            {EARN_CATEGORIES.map((cat) => {
                const entries = Object.entries(ACTION_META).filter(
                    ([action, meta]) =>
                        meta.category === cat.id && action !== "redeem"
                );
                if (entries.length === 0) return null;

                return (
                    <div key={cat.id} className="space-y-2">
                        <div className="pt-1">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider
                                           text-slate-500 dark:text-slate-400">
                                {cat.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {cat.subtitle}
                            </p>
                        </div>
                        <div className="space-y-1">
                            {entries.map(([action, meta]) => (
                                <div
                                    key={action}
                                    className="flex items-center gap-2 p-2 rounded-xl
                                               bg-slate-50 dark:bg-[#0d1117]"
                                >
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${meta.tone}`}>
                                        <meta.icon className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="flex-1 min-w-0 text-[11.5px] font-semibold
                                                  text-slate-800 dark:text-slate-200 truncate">
                                        {meta.label}
                                    </p>
                                    <span className="shrink-0 text-[11px] font-bold tabular-nums
                                                     text-emerald-600 dark:text-emerald-400
                                                     bg-emerald-50 dark:bg-emerald-500/10
                                                     px-2 py-0.5 rounded-full whitespace-nowrap">
                                        +{meta.coins}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </Section>
    );
}

export function DailyLimitsSection() {
    return (
        <Section
            icon={Clock}
            tone="text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400"
            eyebrow="Fair usage"
            title="Daily limits"
        >
            <p>
                To keep the economy fair, most actions have a daily cap. You
                can't farm unlimited coins by spamming likes or repeating the
                same action over and over.
            </p>
            <Bullet
                icon={Heart}
                tone="text-rose-500 bg-rose-50 dark:bg-rose-500/10"
            >
                <strong>Likes:</strong> up to 60 coins per day (~30 likes).
            </Bullet>
            <Bullet
                icon={MessageCircle}
                tone="text-blue-500 bg-blue-50 dark:bg-blue-500/10"
            >
                <strong>Comments:</strong> up to 100 coins per day (~20 comments).
            </Bullet>
            <Bullet
                icon={Swords}
                tone="text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
            >
                <strong>Challenges:</strong> no daily cap — each one pays a
                fresh bonus.
            </Bullet>
            <Bullet
                icon={Trophy}
                tone="text-amber-500 bg-amber-50 dark:bg-amber-500/10"
            >
                <strong>Quiz completions:</strong> uncapped, but each unique
                quiz pays once.
            </Bullet>
        </Section>
    );
}

export function ApprovalSection() {
    return (
        <Section
            icon={ShieldCheck}
            tone="text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400"
            eyebrow="Getting approved"
            title="How approval works"
        >
            <p>
                To keep the community spam-free and real, the coin program is
                invite-only. You apply once, our team reviews it, and you're
                approved within 24 hours.
            </p>
            <Bullet
                icon={CheckCircle2}
                tone="text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
            >
                <strong>Step 1 — Apply:</strong> On the wallet page, tap{" "}
                <em>"Apply to earn coins."</em> You can add a short note about
                your nursing journey (optional).
            </Bullet>
            <Bullet
                icon={Clock}
                tone="text-amber-500 bg-amber-50 dark:bg-amber-500/10"
            >
                <strong>Step 2 — Wait:</strong> An admin reviews your
                application. You'll get a notification once it's decided.
            </Bullet>
            <Bullet
                icon={Sparkles}
                tone="text-blue-500 bg-blue-50 dark:bg-blue-500/10"
            >
                <strong>Step 3 — Earn:</strong> Once approved, every
                qualifying action starts paying out immediately.
            </Bullet>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 border border-amber-100 dark:border-amber-500/20">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    ⚠️ If your application is <strong>declined</strong>, you
                    can re-apply after 7 days. Repeated declines may result in
                    a permanent block.
                </p>
            </div>
        </Section>
    );
}

export function RedemptionSection() {
    return (
        <Section
            icon={Gift}
            tone="text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
            eyebrow="Cash-out"
            title="Redeeming your coins"
        >
            <p>
                When you're ready to cash out, open the <strong>Redeem</strong>{" "}
                tab and choose a reward. Coins are deducted instantly from your
                balance, and the reward is processed within 24 hours.
            </p>
            <Bullet
                icon={Wallet}
                tone="text-teal-500 bg-teal-50 dark:bg-teal-500/10"
            >
                <strong>Cash to MPesa:</strong> 10,000 coins → KSh 100.
                Processed via MPesa B2C.
            </Bullet>
            <Bullet
                icon={Crown}
                tone="text-amber-500 bg-amber-50 dark:bg-amber-500/10"
            >
                <strong>Premium access:</strong> Unlock premium quizzes and
                content without paying cash.
            </Bullet>
            <Bullet
                icon={Star}
                tone="text-violet-500 bg-violet-50 dark:bg-violet-500/10"
            >
                <strong>Bonus content:</strong> Exclusive quiz packs and
                study material.
            </Bullet>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 border border-emerald-100 dark:border-emerald-500/20">
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                    ✓ Redemptions are <strong>irreversible</strong> once
                    approved. Your balance updates instantly, and a receipt
                    (MPesa code or voucher) appears in your history.
                </p>
            </div>
        </Section>
    );
}

export function AntiAbuseSection() {
    return (
        <Section
            icon={Lock}
            tone="text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
            eyebrow="Ground rules"
            title="Anti-abuse policy"
        >
            <p>
                We monitor for the following. Breaking any of these will result
                in suspension of earning privileges, forfeiture of coins, and
                potentially account-level action:
            </p>
            <Bullet
                icon={AlertCircle}
                tone="text-rose-500 bg-rose-50 dark:bg-rose-500/10"
            >
                <strong>Self-engagement:</strong> Liking, commenting, or
                bookmarking your own content does <em>not</em> pay coins.
            </Bullet>
            <Bullet
                icon={AlertCircle}
                tone="text-rose-500 bg-rose-50 dark:bg-rose-500/10"
            >
                <strong>Bot activity:</strong> Automated liking, commenting,
                or quiz attempts are detected and blocked.
            </Bullet>
            <Bullet
                icon={AlertCircle}
                tone="text-rose-500 bg-rose-50 dark:bg-rose-500/10"
            >
                <strong>Multi-accounting:</strong> One account per student.
                Using multiple accounts to farm coins = permanent ban.
            </Bullet>
            <Bullet
                icon={AlertCircle}
                tone="text-rose-500 bg-rose-50 dark:bg-rose-500/10"
            >
                <strong>Reciprocal rings:</strong> Artificially liking or
                commenting in groups to game the system is not allowed.
            </Bullet>
            <p className="text-[11px] italic text-slate-500 dark:text-slate-400 pt-1">
                If you feel you were flagged in error, contact{" "}
                <a href="/feedback" className="text-blue-600 dark:text-blue-400 underline">
                    support
                </a>
                .
            </p>
        </Section>
    );
}

export function FaqSection() {
    const faqs: { q: string; a: string }[] = [
        {
            q: "When do I get my coins?",
            a: "Instantly. The moment an admin-approved action happens, your balance updates. No waiting.",
        },
        {
            q: "Do coins expire?",
            a: "No. Your balance is permanent until you spend it. Even if you take a break from Medrae, your coins are safe.",
        },
        {
            q: "What happens if I delete a post that earned coins?",
            a: "You keep the coins. The ledger records the original earning event — deleting content doesn't reverse past payouts.",
        },
        {
            q: "Can I send coins to a friend?",
            a: "Not yet. Peer-to-peer transfers are planned for a future release. For now, coins are only earned → redeemed.",
        },
        {
            q: "Can I lose coins I already have?",
            a: "Only by redeeming them. Your balance is safe as long as your account is in good standing.",
        },
        {
            q: "How is 1 coin worth KSh 0.01 calculated?",
            a: "It's set by Medrae admins. The rate may change in the future — we'll notify everyone before any change.",
        },
        {
            q: "What if my MPesa redemption fails?",
            a: "The coins are automatically refunded to your balance, and you'll be notified. Try again or contact support.",
        },
        {
            q: "Is there a monthly cap on total earnings?",
            a: "No. There's a daily cap per action (see above), but no monthly cap on your total balance.",
        },
    ];

    return (
        <Section
            icon={HelpCircle}
            tone="text-slate-600 bg-slate-100 dark:bg-white/[0.06] dark:text-slate-300"
            eyebrow="FAQ"
            title="Frequently asked questions"
        >
            <div className="space-y-3">
                {faqs.map((f, i) => (
                    <div key={i} className="space-y-1">
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-snug">
                            {f.q}
                        </p>
                        <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {f.a}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}

/* ------------------------------------------------------------------ */
/*  Full page body — used by both embedded tab and standalone route   */
/* ------------------------------------------------------------------ */

export function LearnContent() {
    return (
        <div className="space-y-4">
            <WhatAreCoinsSection />
            <HowToEarnSection />
            <DailyLimitsSection />
            <ApprovalSection />
            <RedemptionSection />
            <AntiAbuseSection />
            <FaqSection />

            {/* Footer note */}
            <div className="pt-2 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">
                    Last updated · {new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Questions?{" "}
                    <a
                        href="/feedback"
                        className="text-blue-600 dark:text-blue-400 underline"
                    >
                        Send feedback
                    </a>
                </p>
            </div>
        </div>
    );
}