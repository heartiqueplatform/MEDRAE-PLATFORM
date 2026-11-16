/**
 * Community Pulse unread counter — tiny external store.
 *
 * Lives under lib/dailystatus/ because it belongs exclusively to the
 * Community Pulse feature. Nothing else should import this directly
 * except DailyStatus (writer) and StudentFilters (reader, via the hook).
 *
 * Writers:
 *   - DailyStatus — bumpPulse(n) on realtime INSERT or pull-on-focus
 *   - DailyStatus — clearPulse() when the section becomes visible
 *
 * Readers:
 *   - StudentFilters — usePulseCount() to render the pill badge
 */

type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

const notify = () => {
    listeners.forEach((l) => l());
};

export function bumpPulse(n = 1) {
    if (n <= 0) return;
    count = Math.min(999, count + n); // cap so the badge never blows up
    notify();
}

export function clearPulse() {
    if (count === 0) return;
    count = 0;
    notify();
}

export function getPulseCount() {
    return count;
}

export function subscribePulse(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}