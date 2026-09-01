// soundManager.ts - Updated with Web Audio support + Resuscitation Sounds

let unlocked = false;

const sounds: Record<string, HTMLAudioElement> = {};

// 🎚️ GLOBAL DEFAULT VOLUME (study app friendly)
const DEFAULT_VOLUME = 0.8;

// Global mute state
let isGloballyMuted = false;

// Web Audio Context for instant sounds
let audioContext: AudioContext | null = null;
let webAudioInitialized = false;

// Initialize mute state from localStorage
try {
    const saved = localStorage.getItem('medrae_sound_muted');
    if (saved) {
        isGloballyMuted = JSON.parse(saved);
    }
} catch (e) {
    console.error('Error loading sound settings:', e);
}

// Listen for changes to mute state from other tabs/windows
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'medrae_sound_muted' && e.newValue) {
            try {
                isGloballyMuted = JSON.parse(e.newValue);
            } catch (error) {
                console.error('Error parsing mute state:', error);
            }
        }
    });
}

/**
 * Initialize Web Audio Context (for instant sounds)
 */
function initWebAudio() {
    if (webAudioInitialized) return;

    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        webAudioInitialized = true;
    } catch (e) {
        console.warn('Web Audio API not supported');
    }
}

/**
 * Unlocks audio playback on first user interaction
 */
export function initSound() {
    if (unlocked) return;

    const unlock = () => {
        // Unlock MP3 sounds
        Object.values(sounds).forEach((audio) => {
            audio.play().catch(() => { });
            audio.pause();
            audio.currentTime = 0;
        });

        // Initialize Web Audio
        initWebAudio();

        unlocked = true;

        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
}

/**
 * Loads a sound and returns the HTMLAudioElement
 */
export function loadSound(name: string, src: string): HTMLAudioElement {
    if (!sounds[name]) {
        const audio = new Audio(src);
        audio.preload = "auto";

        // 🎚️ set default soft volume for study mode
        audio.volume = DEFAULT_VOLUME;

        sounds[name] = audio;
    }

    const audio = sounds[name];

    // Preload after unlock
    if (unlocked && audio.readyState < 3) {
        audio.play().catch(() => { });
        audio.pause();
        audio.currentTime = 0;
    }

    return audio;
}

/**
 * Checks if sound is currently muted
 */
export function isSoundMuted(): boolean {
    try {
        const saved = localStorage.getItem('medrae_sound_muted');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error reading mute state:', e);
    }
    return false;
}

/**
 * Toggles the global mute state
 */
export function toggleSoundMute(): boolean {
    const currentMute = isSoundMuted();
    const newMute = !currentMute;
    localStorage.setItem('medrae_sound_muted', JSON.stringify(newMute));

    // Update the in-memory state
    isGloballyMuted = newMute;

    return newMute;
}

// ============================================
// 🎵 WEB AUDIO INSTANT SOUNDS (Internal)
// ============================================

/**
 * Internal: Play tap sound using Web Audio
 */
function playTapWebAudio() {
    try {
        if (!audioContext) {
            initWebAudio();
            if (!audioContext) return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Quick click using white noise burst
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12 * DEFAULT_VOLUME, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.04);
    } catch (e) {
        // Silently fail - will use MP3 fallback
    }
}

/**
 * Internal: Play complete sound using Web Audio
 */
function playCompleteWebAudio() {
    try {
        if (!audioContext) {
            initWebAudio();
            if (!audioContext) return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Main note
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(880, now);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.2 * DEFAULT_VOLUME, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);

        // Higher harmony
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.frequency.setValueAtTime(1108.73, now);
        osc2.type = 'sine';

        gain2.gain.setValueAtTime(0.1 * DEFAULT_VOLUME, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc2.start(now + 0.05);
        osc2.stop(now + 0.15);
    } catch (e) {
        // Silently fail - will use MP3 fallback
    }
}

/**
 * Internal: Play victory sound using Web Audio
 */
function playVictoryWebAudio() {
    try {
        if (!audioContext) {
            initWebAudio();
            if (!audioContext) return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Ascending notes
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const durations = [0.12, 0.12, 0.12, 0.2];

        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = now + (index * 0.1);

            osc.frequency.setValueAtTime(freq, startTime);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0.18 * DEFAULT_VOLUME, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[index]);

            osc.start(startTime);
            osc.stop(startTime + durations[index]);
        });

        // Final chord
        setTimeout(() => {
            if (!audioContext) return;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const chordNotes = [523.25, 659.25, 783.99, 1046.50];
            const chordTime = audioContext.currentTime;

            chordNotes.forEach((freq) => {
                const osc = audioContext!.createOscillator();
                const gain = audioContext!.createGain();
                osc.connect(gain);
                gain.connect(audioContext!.destination);

                osc.frequency.setValueAtTime(freq, chordTime);
                osc.type = 'sine';

                gain.gain.setValueAtTime(0.1 * DEFAULT_VOLUME, chordTime);
                gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.4);

                osc.start(chordTime);
                osc.stop(chordTime + 0.4);
            });
        }, 450);
    } catch (e) {
        // Silently fail - will use MP3 fallback
    }
}

// ============================================
// 🎵 RESUSCITATION SOUNDS (Web Audio)
// ============================================

/**
 * Internal: Play resuscitation progress sound (when a share is completed)
 */
function playResuscitationProgressWebAudio() {
    try {
        if (!audioContext) {
            initWebAudio();
            if (!audioContext) return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Two ascending notes - positive and encouraging
        const notes = [523.25, 659.25]; // C5, E5
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = now + (index * 0.12);
            osc.frequency.setValueAtTime(freq, startTime);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15 * DEFAULT_VOLUME, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });

        // Add a soft chime
        setTimeout(() => {
            if (!audioContext) return;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const chimeFreq = 784.0; // G5
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);

            const chimeTime = audioContext.currentTime;
            osc.frequency.setValueAtTime(chimeFreq, chimeTime);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.08 * DEFAULT_VOLUME, chimeTime);
            gain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.2);
            osc.start(chimeTime);
            osc.stop(chimeTime + 0.2);
        }, 150);
    } catch (e) {
        // Silently fail - will use MP3 fallback
    }
}

/**
 * Internal: Play resuscitation complete sound (when streak is restored)
 */
function playResuscitationCompleteWebAudio() {
    try {
        if (!audioContext) {
            initWebAudio();
            if (!audioContext) return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const ctx = audioContext;
        const now = ctx.currentTime;

        // Short victory fanfare with uplifting notes
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const startTime = now + (index * 0.08);
            osc.frequency.setValueAtTime(freq, startTime);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12 * DEFAULT_VOLUME, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });

        // Add a shimmer/tambourine-like effect
        setTimeout(() => {
            if (!audioContext) return;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const bufferSize = audioContext.sampleRate * 0.05;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
            }

            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = audioContext.createGain();
            noiseGain.gain.setValueAtTime(0.08 * DEFAULT_VOLUME, audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            noise.connect(noiseGain);
            noiseGain.connect(audioContext.destination);
            noise.start(audioContext.currentTime);
            noise.stop(audioContext.currentTime + 0.15);
        }, 350);

        // Add a final triumphant chord
        setTimeout(() => {
            if (!audioContext) return;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const chordNotes = [523.25, 659.25, 783.99];
            const chordTime = audioContext.currentTime;

            chordNotes.forEach((freq) => {
                const osc = audioContext!.createOscillator();
                const gain = audioContext!.createGain();
                osc.connect(gain);
                gain.connect(audioContext!.destination);

                osc.frequency.setValueAtTime(freq, chordTime);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.1 * DEFAULT_VOLUME, chordTime);
                gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.3);
                osc.start(chordTime);
                osc.stop(chordTime + 0.3);
            });
        }, 500);
    } catch (e) {
        // Silently fail - will use MP3 fallback
    }
}

// ============================================
// 🎯 MAIN PLAY SOUND - UPDATED with Web Audio
// ============================================

/**
 * Plays a sound by name
 * - muted: explicit mute override (defaults to global mute)
 * - volume: override volume per call (optional)
 * - instant: use Web Audio for instant playback (optional, defaults to false)
 */
export function playSound(
    name: string,
    muted?: boolean,
    volume: number = DEFAULT_VOLUME,
    instant?: boolean // NEW: Use Web Audio for instant sounds
) {
    // Check if explicitly muted or globally muted
    if (muted !== undefined ? muted : isGloballyMuted) {
        return;
    }

    // 🎵 USE WEB AUDIO FOR INSTANT SOUNDS (if requested)
    if (instant) {
        // Map sound names to Web Audio functions - INCLUDING RESUSCITATION SOUNDS
        const webAudioMap: Record<string, () => void> = {
            // Existing sounds
            'tap': playTapWebAudio,
            'ui-tap': playTapWebAudio,
            'tap-correct': playCompleteWebAudio,
            'complete': playCompleteWebAudio,
            'trivia-finish': playVictoryWebAudio,
            'victory': playVictoryWebAudio,
            // NEW: Resuscitation sounds
            'resuscitation-progress': playResuscitationProgressWebAudio,
            'resuscitation-complete': playResuscitationCompleteWebAudio,
            'resuscitation-success': playResuscitationCompleteWebAudio,
            'resuscitation-share': playResuscitationProgressWebAudio,
        };

        const webAudioFn = webAudioMap[name];
        if (webAudioFn) {
            webAudioFn();
            return; // Successfully played with Web Audio
        }
        // If not in map, fall through to MP3
    }

    // 📁 MP3 FALLBACK (your existing system)
    const audio = sounds[name];
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => { });
}

// ============================================
// 🎯 CONVENIENCE FUNCTIONS - UPDATED with Resuscitation
// ============================================

/**
 * Play instant tap sound (Web Audio)
 * Falls back to MP3 if Web Audio fails
 */
export function playTap() {
    playSound('tap', undefined, DEFAULT_VOLUME, true);
}

/**
 * Play instant complete sound (Web Audio)
 * Falls back to MP3 if Web Audio fails
 */
export function playComplete() {
    playSound('tap-correct', undefined, DEFAULT_VOLUME, true);
}

/**
 * Play instant victory sound (Web Audio)
 * Falls back to MP3 if Web Audio fails
 */
export function playVictory() {
    playSound('trivia-finish', undefined, DEFAULT_VOLUME, true);
}

/**
 * Play resuscitation progress sound (when a share is completed)
 * This plays a pleasant chime to encourage users
 */
export function playResuscitationProgress() {
    playSound('resuscitation-progress', undefined, DEFAULT_VOLUME, true);
}

/**
 * Play resuscitation complete sound (when streak is restored)
 * This plays a celebration fanfare
 */
export function playResuscitationComplete() {
    playSound('resuscitation-complete', undefined, DEFAULT_VOLUME, true);
}

/**
 * Play resuscitation success sound (alias for complete)
 */
export function playResuscitationSuccess() {
    playResuscitationComplete();
}

/**
 * Play share completed sound (alias for progress)
 */
export function playShareComplete() {
    playResuscitationProgress();
}

// Everything below stays EXACTLY the same as your original
// No changes needed to your existing code!