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
// 🎯 CONFIGURABLE CONSTANTS - Edit these to change requirements
// ============================================================
export const GROUPPAY_CONFIG = {
    // Minimum members required for group activation
    MIN_MEMBERS_REQUIRED: 10,

    // Fixed price per member (users CANNOT edit this)
    PRICE_PER_MEMBER: 99,

    // Maximum members allowed per group
    MAX_MEMBERS_LIMIT: 100,

    // Minimum members allowed per group
    MIN_MEMBERS_LIMIT: 10,

    // Currency symbol
    CURRENCY: 'KSh',

    // Premium duration
    PREMIUM_DURATION: '2-months',

    // Regular individual price (for comparison)
    INDIVIDUAL_PRICE: 199,
} as const;

// ============================================================
// TYPE HELPERS
// ============================================================
export type GroupStatus = 'open' | 'payment_pending' | 'active' | 'closed';
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';
export type MemberRole = 'leader' | 'member';