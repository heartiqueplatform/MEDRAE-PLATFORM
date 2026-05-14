"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useWebRTCVoice(roomId: string, userId: string) {
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    // ---------------- CREATE PEER ----------------
    const createPeer = () => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }
            ]
        });

        // send ICE candidates to DB
        peer.onicecandidate = async (event) => {
            if (event.candidate) {
                await supabase.from("audio_signaling").insert({
                    room_id: roomId,
                    sender: userId,
                    receiver: "", // broadcast (we simplify later)
                    type: "ice",
                    data: event.candidate,
                });
            }
        };

        // receive remote audio
        peer.ontrack = (event) => {
            const [stream] = event.streams;

            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream;
            }
        };

        peerRef.current = peer;
        return peer;
    };

    // ---------------- START MIC ----------------
    const startMic = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        localStreamRef.current = stream;

        const peer = peerRef.current || createPeer();

        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        // create offer
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        await supabase.from("audio_signaling").insert({
            room_id: roomId,
            sender: userId,
            receiver: "",
            type: "offer",
            data: offer,
        });
    };

    // ---------------- HANDLE SIGNALS ----------------
    const handleSignal = async (payload: any) => {
        const signal = payload.new;

        if (!peerRef.current) createPeer();

        const peer = peerRef.current!;

        // OFFER
        if (signal.type === "offer" && signal.sender !== userId) {
            await peer.setRemoteDescription(signal.data);

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            await supabase.from("audio_signaling").insert({
                room_id: roomId,
                sender: userId,
                receiver: signal.sender,
                type: "answer",
                data: answer,
            });
        }

        // ANSWER
        if (signal.type === "answer" && signal.sender !== userId) {
            await peer.setRemoteDescription(signal.data);
        }

        // ICE
        if (signal.type === "ice" && signal.sender !== userId) {
            try {
                await peer.addIceCandidate(signal.data);
            } catch (e) {
                console.log("ICE error", e);
            }
        }
    };

    // ---------------- LISTEN REALTIME ----------------
    useEffect(() => {
        const channel = supabase
            .channel("audio-signal-" + roomId)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "audio_signaling",
                    filter: `room_id=eq.${roomId}`,
                },
                handleSignal
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    return {
        startMic,
        remoteAudioRef,
    };
}