// src/pages/challenge/confetti.ts

import confetti from "canvas-confetti";

export const burstConfetti = () => {
    requestAnimationFrame(() => {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, startVelocity: 25, colors: ["#fbbf24", "#f97316", "#ef4444", "#22c55e"], ticks: 150, gravity: 0.8 });
        setTimeout(() => {
            requestAnimationFrame(() => {
                confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, startVelocity: 20, colors: ["#f59e0b", "#ec4899", "#06b6d4"], ticks: 120, gravity: 0.9 });
            });
        }, 120);
    });
};

export const LAST_BATTLE_KEY = "last_battle_result";
export const LAST_BATTLE_SHOWN_KEY = "last_battle_result_shown";

export const playTimerBeep = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = "square";

        gainNode.gain.value = 0.3;
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
        // Audio not available — silent
    }
};