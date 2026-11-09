// src/components/chatroom/types.ts
// Single source of truth for chat types + constants.

export interface Message {
    id: number;
    unit_code: string;
    user_id: string;
    content: string;
    created_at: string;
    sender_name?: string;
    avatar_url?: string | null;
    replyToId?: number | null;
    deleted?: boolean;
    replyToContent?: string;
}

export interface Unit {
    id: string;
    unit_code: string;
    title: string;
    /** ✅ Quiz artwork — same image as Medrae Quizzes page. Cached by the
     *  browser, so chat avatars cost zero extra network requests. */
    image_url?: string | null;
}

export type ActiveScreen = "list" | "chat";

export type LayoutMode = "stacked" | "columns";

// Cache keys (chatCache module handles memory + localStorage + TTL + dedupe)
export const CK = {
    UNITS: "units",
    ARCHIVED: "archived",
    PINNED: "pinned",
    MESSAGES_PREFIX: "messages_",
    LAST_READ_PREFIX: "last_read_",
} as const;

export const TTL = {
    UNITS: 30 * 60 * 1000,
    STATE: 60 * 1000,
    MESSAGES: 2 * 60 * 1000,
} as const;

export const LOCAL_AVATARS = [
    "/background05.jpg",
    "/indexbackground3.jpg",
    "/background03.jpg",
    "/background02.jpg",
    "/background06.jpg",
    "/terms (1).png",
    "/indexbackground2.jpg",
] as const;

export const LONG_PRESS_MS = 500;