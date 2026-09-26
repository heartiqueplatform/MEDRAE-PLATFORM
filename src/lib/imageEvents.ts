// lib/imageEvents.ts
// Global pub/sub for cross-component cache invalidation.
// When ANY UnitPics instance uploads or deletes, ALL others refetch.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onImagesChanged(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function emitImagesChanged(): void {
    // Copy to array first in case a listener unsubscribes during iteration
    Array.from(listeners).forEach((fn) => {
        try {
            fn();
        } catch (e) {
            console.error('[imageEvents] listener error:', e);
        }
    });
}