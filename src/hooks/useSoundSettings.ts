// hooks/useSoundSettings.ts
import { useState, useEffect, useCallback } from 'react';

const SOUND_MUTED_KEY = 'medrae_sound_muted';

export function useSoundSettings() {
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem(SOUND_MUTED_KEY);
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem(SOUND_MUTED_KEY, JSON.stringify(isMuted));
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    return { isMuted, toggleMute };
}