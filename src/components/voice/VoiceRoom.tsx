"use client";

import { useVoiceRoom } from "./useVoiceRoom";

export default function VoiceRoom({
    roomId,
    userId,
    onBack,
}: {
    roomId: string;
    userId: string;
    onBack: () => void;
}) {
    const {
        room,
        participants,
        requestMic,
        becomeSpeaker,
        passMic,
        leaveRoom,
        speakerId,
        isSpeaker,
        loading,
    } = useVoiceRoom(roomId, userId);

    const speaker = participants.find(
        (p) => p.user_id === speakerId
    );

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white">
                Loading room...
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-black text-white overflow-hidden">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button
                    onClick={onBack}
                    className="text-sm text-gray-400 hover:text-white"
                >
                    ← Back
                </button>

                <div className="font-semibold text-center">
                    {room?.unit || "Voice Room"}
                </div>

                <button
                    onClick={leaveRoom}
                    className="text-sm text-red-400 hover:text-red-300"
                >
                    Leave
                </button>
            </div>

            {/* MAIN AREA */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

                {/* SPEAKER CARD */}
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <p className="text-xs text-gray-400">Current Speaker</p>

                    {speaker ? (
                        <div className="flex flex-col items-center">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${speaker.user_id}`}
                                className="w-24 h-24 rounded-full border border-white/10"
                            />

                            <p className="mt-2 font-semibold">
                                {speaker.user_id === userId ? "You" : speaker.user_id}
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-500">No one is speaking</p>
                    )}

                    {!isSpeaker && (
                        <button
                            onClick={becomeSpeaker}
                            className="mt-4 bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full text-sm"
                        >
                            Take Mic
                        </button>
                    )}

                    {isSpeaker && (
                        <p className="text-green-400 text-sm">You are speaking 🎤</p>
                    )}
                </div>

                {/* PARTICIPANTS */}
                <div className="space-y-2">
                    <p className="text-xs text-gray-400">
                        Participants ({participants.length})
                    </p>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {participants.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => passMic(p.user_id)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition
                                    ${p.user_id === speakerId
                                        ? "bg-green-600/20 border border-green-600"
                                        : "bg-white/5 hover:bg-white/10"
                                    }
                                `}
                            >
                                {/* avatar */}
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`}
                                    className="w-8 h-8 rounded-full"
                                />

                                <div className="flex-1 text-left">
                                    <p className="text-sm">
                                        {p.user_id === userId ? "You" : p.user_id}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* FIXED BOTTOM ACTIONS */}
            <div className="border-t border-white/10 p-3 space-y-2">
                <button
                    onClick={requestMic}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm"
                >
                    Request Mic
                </button>
            </div>
        </div>
    );
}