"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import VoiceRoom from "./VoiceRoom";
import { useUser } from "@supabase/auth-helpers-react";

export default function VoiceRoomsPage() {
    const user = useUser();
    const [rooms, setRooms] = useState<any[]>([]);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);

    // load rooms
    useEffect(() => {
        const loadRooms = async () => {
            const { data } = await supabase
                .from("audio_rooms")
                .select("*")
                .order("created_at", { ascending: false });

            setRooms(data || []);
        };

        loadRooms();
    }, []);

    if (!user) return <div>Loading user...</div>;

    // 👉 IF ROOM SELECTED → OPEN ROOM UI
    if (activeRoom) {
        return (
            <VoiceRoom
                roomId={activeRoom}
                userId={user.id}
                onBack={() => setActiveRoom(null)}
            />
        );
    }

    // 👉 ROOMS LIST
    return (
        <div className="h-screen p-6 bg-black text-white">
            <h1 className="text-xl font-bold mb-4">Voice Rooms</h1>

            <div className="space-y-3">
                {rooms.map((room) => (
                    <button
                        key={room.id}
                        onClick={() => setActiveRoom(room.id)}
                        className="w-full p-4 bg-white/10 rounded text-left"
                    >
                        <div className="font-bold">{room.unit}</div>
                        <div className="text-xs text-gray-400">
                            Speaker: {room.current_speaker || "none"}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}