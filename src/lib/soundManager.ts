let unlocked = false;

const sounds: Record<string, HTMLAudioElement> = {};

export function initSound() {
    if (unlocked) return;

    const unlock = () => {
        Object.values(sounds).forEach((a) => {
            a.play().catch(() => { });
            a.pause();
            a.currentTime = 0;
        });

        unlocked = true;

        window.removeEventListener("click", unlock);
        window.removeEventListener("touchstart", unlock);
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
}

export function loadSound(name: string, src: string) {
    if (!sounds[name]) {
        const audio = new Audio(src);
        audio.preload = "auto";
        sounds[name] = audio;
    }
}

export function playSound(name: string, muted = false) {
    if (muted) return;

    const audio = sounds[name];
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => { });
}
