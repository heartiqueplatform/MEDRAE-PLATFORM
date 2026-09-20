// src/types/grouppay.ts

export interface GroupMember {
    id: string;
    user_id: string;
    role: 'leader' | 'member';
    joined_at: string;
    profile?: {
        name: string;
        avatar_url?: string;
    };
}

export interface StudyGroup {
    id: string;
    group_name: string;
    school: string;
    description?: string;
    created_by: string;
    creator?: {
        name: string;
        avatar_url?: string;
    };
    current_members: number;
    max_members: number;
    group_code: string;
    contribution_per_member: number;
    status: 'open' | 'payment_pending' | 'active' | 'closed';
    is_locked: boolean;
    created_at: string;
    updated_at: string;
    members?: GroupMember[];
    // ✅ Contact fields for group leader
    leader_phone?: string;
    leader_whatsapp?: string;
    leader_email?: string;
    // ✅ Duration + effective per-member price for this group
    duration_type?: '1-month' | '2-months';
    price_per_member?: number;
}

export interface GroupPaymentSummary {
    members: number;
    contribution_per_member: number;
    total_amount: number;
    currency: string;
}

export interface GroupPaymentStatus {
    status: string;
    total_amount: number;
    paid_amount: number;
    members_count: number;
    is_successful: boolean;
    payment_date?: string;
    mpesa_receipt?: string;
    checkout_request_id?: string;
    result_desc?: string;
}

export interface GroupPaymentHistory {
    id: string;
    group_id: string;
    payer_user_id: string;
    amount: number;
    phone_number: string;
    checkout_request_id: string;
    merchant_request_id?: string;
    mpesa_receipt?: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    result_code?: number;
    result_desc?: string;
    payment_date?: string;
    created_at: string;
    updated_at: string;
    // ✅ Duration of the plan this payment is for
    duration_type?: '1-month' | '2-months';
    payer?: {
        name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface GroupMemberWithStatus {
    id: string;
    group_id: string;
    user_id: string;
    role: 'leader' | 'member';
    joined_at: string;
    profile: {
        name: string;
        email: string;
        avatar_url?: string;
        has_active_subscription: boolean;
        subscription_role?: string;
        subscription_expires_at?: string;
    };
}

// ============================================================
// 🎯 CONFIGURABLE CONSTANTS
// ============================================================
export const GROUPPAY_CONFIG = {
    // ============================================
    // ACTIVATION MODEL: SIMPLE
    // ============================================
    // A group activates when it fills to its own `max_members`.
    //   5-member group  → activates at 5
    //   20-member group → activates at 20
    //   100-member group → activates at 100
    //
    // The value below is ONLY used as the default prefill in the
    // create-group form's "Group Size" input. It is NOT a hard
    // activation requirement anymore.
    MIN_MEMBERS_REQUIRED: 10,

    // Explicit default for the create form (same as MIN_MEMBERS_REQUIRED).
    // Kept separate so we can tune the form prefill without touching
    // any activation logic elsewhere.
    DEFAULT_MAX_MEMBERS: 10,

    // ============================================
    // DUAL DURATION PRICING
    // ============================================
    // 1-month group price per member
    PRICE_PER_MEMBER_1_MONTH: 199,

    // 2-month group price per member (mirrors individual 399/249 ratio ≈ 1.6024)
    // 199 × 1.6024 ≈ 319 — rounded to 299 for psychological pricing ("Save 100")
    PRICE_PER_MEMBER_2_MONTHS: 299,

    // Legacy field — defaults to the 2-month price for backward compatibility.
    // Kept so older code paths that still read `PRICE_PER_MEMBER` get a sensible value.
    PRICE_PER_MEMBER: 299,

    // ============================================
    // DURATIONS
    // ============================================
    // Default duration if not explicitly selected
    DEFAULT_DURATION: '2-months' as const,

    // Premium duration (kept for backward compat — new code should use duration_type on the group)
    PREMIUM_DURATION: '2-months',

    // ============================================
    // INDIVIDUAL PRICES (for comparison / savings math)
    // ============================================
    INDIVIDUAL_PRICE_1_MONTH: 249,
    INDIVIDUAL_PRICE_2_MONTHS: 399,

    // Legacy — kept so any code still reading `INDIVIDUAL_PRICE` gets a sensible default
    INDIVIDUAL_PRICE: 399,

    // ============================================
    // LIMITS & DISPLAY
    // ============================================
    // Hard ceiling — no group can exceed this
    MAX_MEMBERS_LIMIT: 100,

    // Hard floor — smallest group a user can create
    MIN_MEMBERS_LIMIT: 1,

    // Currency symbol
    CURRENCY: 'KSh',
} as const;

// ============================================================
// HELPERS — pricing & savings (use these everywhere for consistency)
// ============================================================
export type GroupDuration = '1-month' | '2-months';

/**
 * Get the per-member contribution price for a given duration.
 */
export function getGroupPricePerMember(duration: GroupDuration): number {
    return duration === '1-month'
        ? GROUPPAY_CONFIG.PRICE_PER_MEMBER_1_MONTH
        : GROUPPAY_CONFIG.PRICE_PER_MEMBER_2_MONTHS;
}

/**
 * Get the individual (solo) price for the same duration.
 * Used for savings comparisons.
 */
export function getIndividualPrice(duration: GroupDuration): number {
    return duration === '1-month'
        ? GROUPPAY_CONFIG.INDIVIDUAL_PRICE_1_MONTH
        : GROUPPAY_CONFIG.INDIVIDUAL_PRICE_2_MONTHS;
}

/**
 * Compute per-member savings for a given duration.
 */
export function getSavingsPerMember(duration: GroupDuration): number {
    return getIndividualPrice(duration) - getGroupPricePerMember(duration);
}

/**
 * Compute monthly rate (helps show "under KSh X/month" marketing copy).
 */
export function getMonthlyRate(duration: GroupDuration): number {
    const price = getGroupPricePerMember(duration);
    const months = duration === '1-month' ? 1 : 2;
    return Math.round(price / months);
}

/**
 * ✅ SIMPLE MODEL HELPER
 * Returns true when the group is considered "ready to activate".
 * Rule: current_members >= max_members (group must be full).
 *
 * Usage:
 *   const ready = isGroupReadyToActivate(group.current_members, group.max_members);
 */
export function isGroupReadyToActivate(
    currentMembers: number,
    maxMembers: number
): boolean {
    if (!Number.isFinite(currentMembers) || !Number.isFinite(maxMembers)) {
        return false;
    }
    if (maxMembers <= 0) return false;
    return currentMembers >= maxMembers;
}

/**
 * ✅ SIMPLE MODEL HELPER
 * How many more members are needed before the group can activate.
 * Returns 0 when already full.
 */
export function membersNeededToActivate(
    currentMembers: number,
    maxMembers: number
): number {
    if (!Number.isFinite(currentMembers) || !Number.isFinite(maxMembers)) {
        return 0;
    }
    return Math.max(0, maxMembers - currentMembers);
}

// ============================================================
// TYPE HELPERS
// ============================================================
export type GroupStatus = 'open' | 'payment_pending' | 'active' | 'closed';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';
export type MemberRole = 'leader' | 'member';