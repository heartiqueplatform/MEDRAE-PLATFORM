"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useVoiceRoom(roomId: string, userId: string) {
    const [room, setRoom] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ---------------- LOAD ROOM ----------------
    const loadRoom = useCallback(async () => {
        const { data: roomData, error: roomError } = await supabase
            .from("audio_rooms")
            .select("*")
            .eq("id", roomId)
            .single();

        if (roomError) console.log("ROOM ERROR:", roomError);

        const { data: partData, error: partError } = await supabase
            .from("audio_participants")
            .select("*")
            .eq("room_id", roomId);

        if (partError) console.log("PARTICIPANTS ERROR:", partError);

        const { data: reqData, error: reqError } = await supabase
            .from("audio_mic_requests")
            .select("*")
            .eq("room_id", roomId)
            .eq("status", "pending");

        if (reqError) console.log("REQUESTS ERROR:", reqError);

        setRoom(roomData);
        setParticipants(partData || []);
        setRequests(reqData || []);
        setLoading(false);
    }, [roomId]);

    // ---------------- JOIN ROOM ----------------
    const joinRoom = useCallback(async () => {
        if (!roomId || !userId) return;

        await supabase.from("audio_participants").upsert({
            room_id: roomId,
            user_id: userId,
            role: "listener",
            is_online: true,
        });
    }, [roomId, userId]);

    // ---------------- ACTIONS ----------------
    const requestMic = async () => {
        await supabase.from("audio_mic_requests").upsert({
            room_id: roomId,
            user_id: userId,
            status: "pending",
        });
    };

    const becomeSpeaker = async () => {
        await supabase
            .from("audio_rooms")
            .update({ current_speaker: userId })
            .eq("id", roomId);
    };

    const passMic = async (targetUserId: string) => {
        await supabase
            .from("audio_rooms")
            .update({ current_speaker: targetUserId })
            .eq("id", roomId);
    };

    const leaveRoom = async () => {
        await supabase
            .from("audio_participants")
            .delete()
            .eq("room_id", roomId)
            .eq("user_id", userId);
    };

    // ---------------- REALTIME ----------------
    useEffect(() => {
        if (!roomId || !userId) return;

        let isMounted = true;

        const init = async () => {
            setLoading(true);
            await loadRoom();
            await joinRoom();
        };

        init();

        const channel = supabase
            .channel("voice-room-" + roomId)

            // ROOM CHANGES
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "audio_rooms",
                filter: `id=eq.${roomId}`,
            }, (payload) => {
                if (payload.new) setRoom(payload.new);
            })

            // PARTICIPANTS (light refresh only)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "audio_participants",
                filter: `room_id=eq.${roomId}`,
            }, async () => {
                const { data } = await supabase
                    .from("audio_participants")
                    .select("*")
                    .eq("room_id", roomId);

                setParticipants(data || []);
            })

            // MIC REQUESTS
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "audio_mic_requests",
                filter: `room_id=eq.${roomId}`,
            }, async () => {
                const { data } = await supabase
                    .from("audio_mic_requests")
                    .select("*")
                    .eq("room_id", roomId)
                    .eq("status", "pending");

                setRequests(data || []);
            })

            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, loadRoom, joinRoom]);

    // ---------------- DERIVED STATE ----------------
    const speakerId = room?.current_speaker || null;

    const isSpeaker = speakerId === userId;

    const listeners = participants.filter(
        (p) => p.user_id !== speakerId
    );

    const speakers = participants.filter(
        (p) => p.user_id === speakerId
    );

    // ---------------- RETURN ----------------
    return {
        room,
        participants,
        requests,
        speakerId,
        listeners,
        speakers,
        loading,

        requestMic,
        becomeSpeaker,
        passMic,
        leaveRoom,
        refresh: loadRoom,
        isSpeaker,
    };
}