let unlocked = false;

const sounds: Record<string, HTMLAudioElement> = {};

/**
 * Unlocks audio playback on first user interaction
 */
export function initSound() {
    if (unlocked) return;

    const unlock = () => {
        // Force all loaded sounds to preload into memory
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
        sounds[name] = audio;
    }

    const audio = sounds[name];

    // If already unlocked, force preload immediately
    if (unlocked && audio.readyState < 3) { // HAVE_FUTURE_DATA or less
        audio.play().catch(() => { });
        audio.pause();
        audio.currentTime = 0;
    }

    return audio;
}

/**
 * Plays a sound by name
 */
export function playSound(name: string, muted = false) {
    if (muted) return;

    const audio = sounds[name];
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => { });
}
