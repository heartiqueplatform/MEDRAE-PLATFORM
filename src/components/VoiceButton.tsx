"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Typing bubbles
function TypingBubbles({ isDark = false }: { isDark?: boolean }) {
    const bubbleColor = isDark ? "bg-gray-500" : "bg-gray-400";
    return (
        <div className="flex items-center gap-1">
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`} />
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`} />
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`} />
        </div>
    );
}
// Clean text for TTS
function cleanForSpeech(text: string) {
    return text
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
        .replace(/[*_`~>#]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[\r\n]+/g, ". ")
        .replace(/[-–—]{2,}/g, ", ")
        .replace(/\s{2,}/g, " ")
        .replace(/\b([A-Z]{3,})\b/g, word => {
            const acronyms = ["HIV", "WHO", "FDA", "CDC"];
            if (acronyms.includes(word)) return word.split("").join(" ");
            if (word.length > 6) return word.slice(0, 3) + "-" + word.slice(3).toLowerCase();
            return word.charAt(0) + word.slice(1).toLowerCase();
        })
        .trim();
}

// TTS with start/stop control
let currentUtterance: SpeechSynthesisUtterance | null = null;
function speakText(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const cleaned = cleanForSpeech(text).replace(/\bOption\s+([A-D])\b/gi, "Option $1,").replace(/,/g, ", ");
    const utterance = new SpeechSynthesisUtterance(cleaned);
    currentUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("google"))
        || voices.find(v => v.lang === "en-US")
        || voices[0];

    utterance.lang = "en-US";
    utterance.rate = cleaned.length < 80 ? 1.12 : 1.05;
    utterance.pitch = 1;

    utterance.onend = () => {
        currentUtterance = null;
        if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
}

interface VoiceButtonProps {
    prefillQuestion: string;
    isDark?: boolean;
}

export default function VoiceButton({ prefillQuestion, isDark = false }: VoiceButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showBubbles, setShowBubbles] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Fetch current user on mount to make button independent
    useEffect(() => {
        const getUser = async () => {
            const resp = await supabase.auth.getUser();
            setCurrentUserId(resp.data.user?.id || null);
        };
        getUser();
    }, []);

    const handleClick = async () => {
        if (!prefillQuestion.trim() || !currentUserId) return;

        setIsLoading(true);
        setShowBubbles(true);
        setIsSpeaking(true);

        try {
            // 1️⃣ Save user message
            await supabase.from("Aimessages").insert([{
                content: prefillQuestion,
                sender: "user",
                timestamp: new Date(),
                user_id: currentUserId,
            }]);

            // 2️⃣ Fetch presummary
            const { data: presummaryData } = await supabase
                .from("user_presummary")
                .select("presummary_text")
                .eq("user_id", currentUserId)
                .single();

            const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

            // 3️⃣ Build system message
            const now = new Date();
            const systemMessage = `
You are a personal AI assistant.
Current date: ${now.toUTCString()}
User presummary:
${cachedSummary}

Instructions:
- Always greet the user by name
- Answer based on presummary
- Friendly and encouraging
User's message: ${prefillQuestion}
`;

            // 4️⃣ Stream AI response
            const response = await fetch(
                "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/medrae-ai-chat-stream",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: prefillQuestion, presummary: cachedSummary, systemMessage })
                }
            );

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                aiContent += decoder.decode(value);
            }

            // 5️⃣ Save AI message
            await supabase.from("Aimessages").insert([{
                content: aiContent,
                sender: "ai",
                timestamp: new Date(),
                user_id: currentUserId,
            }]);

            setShowBubbles(false);

            // 6️⃣ Speak AI response
            speakText(aiContent, () => setIsSpeaking(false));

        } catch (err) {
            console.error(err);
            setShowBubbles(false);
            setIsSpeaking(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    return (
        <div className="relative inline-flex items-center gap-2">
            <button
                onClick={isSpeaking ? handleStop : handleClick}
                disabled={isLoading && !isSpeaking}
                className={`
                    px-4 py-2 rounded text-white font-semibold transition-all duration-300
                    ${isSpeaking
                        ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 animate-pulse"
                        : "bg-green-600 hover:bg-green-700"}
                `}
            >
                {isSpeaking ? "🛑 Stop" : "🎙 Ask & Listen"}
            </button>

            {showBubbles && <TypingBubbles isDark={isDark} />}
        </div>
    );
}
