let unlocked = false;

const sounds: Record<string, HTMLAudioElement> = {};

// 🎚️ GLOBAL DEFAULT VOLUME (study app friendly)
const DEFAULT_VOLUME = 0.80;

/**
 * Unlocks audio playback on first user interaction
 */
export function initSound() {
    if (unlocked) return;

    const unlock = () => {
        Object.values(sounds).forEach((audio) => {
            audio.play().catch(() => { });
            audio.pause();
            audio.currentTime = 0;
        });

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
 * Plays a sound by name
 * - muted: global mute
 * - volume: override volume per call (optional)
 */
export function playSound(
    name: string,
    muted = false,
    volume: number = DEFAULT_VOLUME
) {
    if (muted) return;

    const audio = sounds[name];
    if (!audio) return;

    audio.currentTime = 0;

    // 🎚️ enforce soft study volume
    audio.volume = volume;

    audio.play().catch(() => { });
}