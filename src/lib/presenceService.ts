// lib/presenceService.ts - SILENT VERSION (No Realtime)
import { supabase } from "./supabaseClient";

class PresenceService {
    private static instance: PresenceService;
    private channel: any = null;
    private listeners: ((onlineIds: string[]) => void)[] = [];
    private currentUserId: string | null = null;

    static getInstance(): PresenceService {
        if (!PresenceService.instance) {
            PresenceService.instance = new PresenceService();
        }
        return PresenceService.instance;
    }

    // Gutted: No longer creates channels or tracks users
    async initialize(userId: string) {
        console.log("⚪ Presence Service is now DISABLED to save egress.");
        this.currentUserId = userId;
        return;
    }

    onOnlineUsers(listener: (ids: string[]) => void) {
        // Immediately return an empty list so components don't crash
        listener([]);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    async cleanup() {
        this.currentUserId = null;
    }
}

export default PresenceService;