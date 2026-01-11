"use client";

import { useState } from "react";

// Typing bubbles
function TypingBubbles({ isDark = false }: { isDark?: boolean }) {
    const bubbleColor = isDark ? "bg-gray-500" : "bg-gray-400";
    return (
        <div className="flex items-center gap-1">
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay`}></span>
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay200`}></span>
            <span className={`w-2 h-2 ${bubbleColor} rounded-full animate-bounceDelay400`}></span>
        </div>
    );
}

// TTS function
function speakText(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

import { supabase } from "@/lib/supabaseClient";

interface VoiceButtonProps {
    prefillQuestion: string;
    isDark?: boolean;
}

export default function VoiceButton({ prefillQuestion, isDark = false }: VoiceButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showBubbles, setShowBubbles] = useState(false);

    const handleClick = async () => {
        if (!prefillQuestion.trim()) return;

        setIsLoading(true);
        setShowBubbles(true);

        try {
            // Get current user
            const userResponse = await supabase.auth.getUser();
            const currentUser = userResponse.data.user;

            // Save user message to Supabase
            if (currentUser?.id) {
                await supabase.from("Aimessages").insert([{
                    content: prefillQuestion,
                    sender: "user",
                    timestamp: new Date(),
                    user_id: currentUser.id,
                }]);
            }

            // Fetch presummary
            const { data: presummaryData } = await supabase
                .from("user_presummary")
                .select("presummary_text")
                .eq("user_id", currentUser?.id)
                .single();

            const cachedSummary = presummaryData?.presummary_text || "No user summary available.";

            // Build system prompt (same as OverlayAI)
            const now = new Date();
            const systemMessage = `
You are a personal AI assistant for the Medrae Medical Network.
Current date and time: ${now.toUTCString()}
IMPORTANT: Always start every response by addressing the user by their name, extracted from the presummary.
The user has the following profile (presummary):
${cachedSummary}

Your instructions:
1. Always greet the user by their name.
2. Use the presummary to answer any questions about the user, including calendar, posts, progress, quiz results, notes.
3. Respond naturally in a friendly, supportive, and helpful tone.
4. Never invent user-specific data; only use what's in the presummary.
5. Always end your response in a positive, encouraging tone.

User's message: ${prefillQuestion}
`;

            // AI streaming call
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
                const chunk = decoder.decode(value);
                aiContent += chunk;
            }

            // Save AI message
            if (currentUser?.id) {
                await supabase.from("Aimessages").insert([{
                    content: aiContent,
                    sender: "ai",
                    timestamp: new Date(),
                    user_id: currentUser.id,
                }]);
            }

            // Done typing → hide bubbles
            setShowBubbles(false);

            // Speak AI response
            speakText(aiContent);

        } catch (err) {
            console.error(err);
            setShowBubbles(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative inline-flex items-center gap-2">
            <button
                onClick={handleClick}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
                🎙 Ask & Listen
            </button>

            {showBubbles && <TypingBubbles isDark={isDark} />}
        </div>
    );
}
