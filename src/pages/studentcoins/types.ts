// src/pages/studentcoins/types.ts

export type EnrollmentStatus = "pending" | "approved" | "rejected" | "suspended";

export type Wallet = {
    balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
    is_frozen: boolean;
    currency: string;
};

export type Config = {
    ksh_per_coin: number;
    min_redeem_coins: number;
    max_redeem_coins: number;
    redemption_enabled: boolean;
};

export type Enrollment = {
    status: EnrollmentStatus;
    applied_at: string;
    reviewed_at: string | null;
    notes: string | null;
    reason: string | null;
} | null;

export type LedgerRow = {
    id: number;
    action: string;
    coins: number;
    at: string;
    meta: Record<string, unknown> | null;
};

export type RedemptionStatus =
    | "pending"
    | "processing"
    | "fulfilled"
    | "rejected"
    | "refunded";

export type Redemption = {
    id: string;
    coins_spent: number;
    reward_key: string;
    reward_label: string;
    status: RedemptionStatus;
    external_ref: string | null;
    requested_at: string;
    fulfilled_at: string | null;
};

export type Reward = {
    reward_key: string;
    label: string;
    description: string;
    coins_cost: number;
    icon: string;
    category: string;
};

export type WalletPageData = {
    wallet: Wallet | null;
    config: Config | null;
    enrollment: Enrollment;
    today_earned: number;
    week_earned: number;
    recent: LedgerRow[];
    redemptions: Redemption[];
};

export type TabId = "earn" | "redeem" | "history" | "learn";