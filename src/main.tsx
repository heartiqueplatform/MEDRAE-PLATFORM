"use client";

import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";
import AuthGate from "@/auth/AuthGate";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthProvider";
import "@fontsource/poppins";

/**
 * PWA Auto-Update with User Experience Considerations
 */
const updateSW = registerSW({
    onNeedRefresh() {
        const isUserTyping =
            document.activeElement?.tagName === 'INPUT' ||
            document.activeElement?.tagName === 'TEXTAREA' ||
            (document.activeElement as HTMLElement)?.isContentEditable;

        const isInExam = window.location.pathname.includes('/exam') ||
            window.location.pathname.includes('/simulation');

        if (!isUserTyping && !isInExam) {
            const shouldUpdate = confirm(
                'A new version of Medrae is available. Would you like to update now?'
            );
            if (shouldUpdate) {
                updateSW(true);
            }
        } else if (isInExam) {
            console.log('New version available, but user is in an exam. Waiting...');
            localStorage.setItem('pwaUpdatePending', 'true');
        } else {
            console.log("New version found, but user is busy. Waiting...");
            localStorage.setItem('pwaUpdatePending', 'true');
        }
    },
    onOfflineReady() {
        console.log('Medrae is ready to work offline');
        const offlineReady = new CustomEvent('pwa-offline-ready', {
            detail: { message: 'Medrae is ready to work offline' }
        });
        window.dispatchEvent(offlineReady);
    },
    onRegisteredSW(swUrl, registration) {
        console.log('Service Worker registered:', swUrl);

        const pendingUpdate = localStorage.getItem('pwaUpdatePending');
        if (pendingUpdate === 'true') {
            console.log('Pending update detected. Will notify user.');
            const updateEvent = new CustomEvent('pwa-update-available', {
                detail: { message: 'A new version is available. Update now?' }
            });
            window.dispatchEvent(updateEvent);
        }
    },
});

/**
 * App Version Control - Cache Busting
 */
const APP_VERSION = "1.1.0";
const storedVersion = localStorage.getItem("appVersion");

if (storedVersion !== APP_VERSION) {
    if ('caches' in window) {
        caches.keys().then(names => {
            for (let name of names) {
                console.log(`Deleting cache: ${name}`);
                caches.delete(name);
            }
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                console.log('Unregistering old service worker:', registration.scope);
                registration.unregister();
            }
        });
    }

    localStorage.setItem("appVersion", APP_VERSION);
    window.location.reload();
}

/**
 * Performance Monitor
 */
export const PerformanceMonitor = {
    supabaseCalls: 0,
    trackCall: (url: string, size: number) => {
        PerformanceMonitor.supabaseCalls++;
        if (size > 50000) {
            console.warn(`Heavy response: ${url} is ${Math.round(size / 1024)}KB`);
        }
    }
};

/**
 * Smart Fetch Interceptor - Handles Offline Gracefully
 */
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const url = args[0]?.toString() || '';
    const isSupabase = url.includes('supabase.co/rest/v1');
    const isAuth = url.includes('supabase.co/auth/v1');

    try {
        const response = await originalFetch.apply(this, args as any);

        if (response && isSupabase && response.ok) {
            try {
                const clone = response.clone();
                clone.blob().then(blob => {
                    PerformanceMonitor.trackCall(url, blob.size);
                }).catch(() => { });
            } catch (e) {
                // Silent fail for blob reading
            }
        }
        return response;
    } catch (error) {
        if (isSupabase) {
            console.warn("Medrae Offline Mode: Returning cached or empty data.");

            if ('caches' in window) {
                try {
                    const cache = await caches.open('medrae-api-cache');
                    const cachedResponse = await cache.match(url);
                    if (cachedResponse) {
                        console.log('Returning cached response for:', url);
                        return cachedResponse;
                    }
                } catch (e) {
                    // Cache read failed
                }
            }

            const isListRequest = url.includes('?') || url.includes('select=');
            const emptyBody = isListRequest ? '[]' : '{}';

            return new Response(emptyBody, {
                status: 200,
                statusText: 'OK (Offline Mode)',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Offline': 'true'
                }
            });
        }

        throw error;
    }
};

/**
 * Cache Strategy for PWA - Precache Critical Assets
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log('App loaded, checking for updates...');
    });
}

/**
 * Handle PWA Install Prompt
 */
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App can be installed');

    const installEvent = new CustomEvent('pwa-install-ready', {
        detail: { prompt: deferredPrompt }
    });
    window.dispatchEvent(installEvent);
});

window.addEventListener('appinstalled', () => {
    console.log('Medrae was installed as a PWA');
    if (window.gtag) {
        window.gtag('event', 'pwa_installed');
    }
});

/**
 * Initialize App
 */
const root = createRoot(document.getElementById("root")!);

root.render(
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
            <AuthGate>
                <App />
            </AuthGate>
        </AuthProvider>
    </BrowserRouter>
);

/**
 * Expose PWA Controls for App Components
 */
(window as any).__pwa = {
    updateApp: () => {
        updateSW(true);
    },
    getUpdateStatus: () => {
        return localStorage.getItem('pwaUpdatePending') === 'true';
    },
    clearUpdateStatus: () => {
        localStorage.removeItem('pwaUpdatePending');
    },
    installApp: () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        } else {
            console.log('Install prompt not available');
        }
    }
};

/**
 * Error Handling for PWA
 */
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('ServiceWorker')) {
        console.error('Service Worker Error:', e.message);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(r => r.update());
            });
        }
    }
});

/**
 * Online/Offline Status
 */
window.addEventListener('online', () => {
    console.log('App is online. Syncing data...');
    window.dispatchEvent(new CustomEvent('pwa-online'));
});

window.addEventListener('offline', () => {
    console.log('App is offline. Using cached data.');
    window.dispatchEvent(new CustomEvent('pwa-offline'));
});