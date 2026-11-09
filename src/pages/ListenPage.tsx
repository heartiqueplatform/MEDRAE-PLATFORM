// src/pages/ListenPage.tsx
import { MusicPlayer } from "@/components/MusicPlayer";

export default function ListenPage() {
    return (
        <div
            className="w-full bg-background dark:bg-[#0d1117]"
            style={{
                // Fill the viewport minus the MEDRAE header (hidden here)
                // and the desktop sidebar. The footer is hidden, so no
                // need to reserve its space.
                height: "100dvh",
                maxHeight: "100dvh",
            }}
        >
            <MusicPlayer forceOpen />
        </div>
    );
}