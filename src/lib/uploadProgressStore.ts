// Tiny global store for upload progress.
// No React inside — just subscribe/emit. Any component can read.
// Uses a very small pub/sub so the pill can render without prop-drilling.

export type UploadStatus =
    | "idle"
    | "uploading"
    | "success"
    | "error";

export type UploadSnapshot = {
    status: UploadStatus;
    done: number;
    total: number;
    label: string;
    message?: string;
};

const INITIAL: UploadSnapshot = {
    status: "idle",
    done: 0,
    total: 0,
    label: "",
};

let snapshot: UploadSnapshot = INITIAL;
const listeners = new Set<(s: UploadSnapshot) => void>();

function emit(next: UploadSnapshot) {
    snapshot = next;
    listeners.forEach((fn) => {
        try {
            fn(snapshot);
        } catch {
            /* subscriber error must not break emitter */
        }
    });
}

export const uploadProgressStore = {
    get: (): UploadSnapshot => snapshot,

    subscribe(fn: (s: UploadSnapshot) => void): () => void {
        listeners.add(fn);
        fn(snapshot); // fire immediately so new subscribers get current state
        return () => {
            listeners.delete(fn);
        };
    },

    start(label: string, total: number) {
        emit({ status: "uploading", done: 0, total, label });
    },

    progress(label: string, done: number, total: number) {
        emit({ status: "uploading", done, total, label });
    },

    succeed(done: number, total: number, label: string) {
        emit({ status: "success", done, total, label });
        // auto-hide after a short flash
        setTimeout(() => {
            if (snapshot.status === "success") {
                emit(INITIAL);
            }
        }, 1800);
    },

    fail(done: number, total: number, label: string, message: string) {
        emit({ status: "error", done, total, label, message });
        setTimeout(() => {
            if (snapshot.status === "error") {
                emit(INITIAL);
            }
        }, 3200);
    },

    reset() {
        emit(INITIAL);
    },
};