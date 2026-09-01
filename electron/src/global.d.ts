// global.d.ts
export { };

declare global {
    interface Window {
        electronAPI: {
            quitApp: () => void;
            onSecurityWarning: (callback: (type: string) => void) => void;
            removeSecurityListeners: () => void;
        };
    }
}