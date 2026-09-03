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
 * App Version Control - Smart Cache Management
 */
const APP_VERSION = "1.1.022322";
const CACHE_NAMES = {
    static: `medrae-static-${APP_VERSION}`,
    api: `medrae-api-cache-${APP_VERSION}`,
    assets: `medrae-assets-${APP_VERSION}`
};

/**
 * PWA Auto-Update with Enhanced UX
 */
let updateSW: (reloadPage?: boolean) => Promise<void>;
let deferredPrompt: any = null;

const setupPWA = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
        const registration = await navigator.serviceWorker.ready;

        await registration.update();

        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker updated');
            if (!document.hidden) {
                setTimeout(() => window.location.reload(), 1500);
            }
        });

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New version available');
                    }
                });
            }
        });

    } catch (error) {
        console.error('SW registration failed:', error);
    }
};

/**
 * Smart Cache Cleanup - Only removes old caches
 */
const cleanupOldCaches = async () => {
    if (!('caches' in window)) return;

    try {
        const cacheNames = await caches.keys();
        const currentCaches = Object.values(CACHE_NAMES);

        for (const name of cacheNames) {
            if (name.startsWith('medrae-') && !currentCaches.includes(name)) {
                console.log(`Deleting old cache: ${name}`);
                await caches.delete(name);
            }
        }
    } catch (error) {
        console.warn('Cache cleanup failed:', error);
    }
};

/**
 * Pre-cache Critical Assets
 */
const precacheAssets = async () => {
    const criticalAssets = [
        '/',
        '/index.css',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png'
    ];

    try {
        const cache = await caches.open(CACHE_NAMES.static);
        await cache.addAll(criticalAssets);
        console.log('Critical assets pre-cached');
    } catch (error) {
        console.warn('Failed to pre-cache assets:', error);
    }
};

/**
 * Smart Fetch Interceptor with Cache-First Strategy
 */
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const request = args[0] instanceof Request ? args[0] : new Request(args[0] as string);
    const url = request.url;
    const isStaticAsset = url.includes('/static/') ||
        url.match(/\.(css|js|jpg|png|svg|webp|woff|woff2|ttf)$/i);
    const isSupabase = url.includes('supabase.co');

    if (isStaticAsset && !isSupabase) {
        try {
            const cache = await caches.open(CACHE_NAMES.assets);
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                fetchAndCache(request, cache);
                return cachedResponse;
            }

            const response = await originalFetch.apply(this, args);
            if (response.ok) {
                const clone = response.clone();
                cache.put(request, clone);
            }
            return response;
        } catch (error) {
            // Fall through to normal fetch
        }
    }

    if (isSupabase) {
        try {
            const response = await originalFetch.apply(this, args);

            if (response && response.ok) {
                try {
                    const clone = response.clone();
                    clone.blob().then(blob => {
                        PerformanceMonitor.trackCall(url, blob.size);
                    }).catch(() => { });

                    const cache = await caches.open(CACHE_NAMES.api);
                    const responseClone = response.clone();
                    cache.put(request, responseClone);
                } catch (e) {
                    // Silent fail for blob reading
                }
            }
            return response;
        } catch (error) {
            console.warn("Offline Mode: Returning cached data.");

            try {
                const cache = await caches.open(CACHE_NAMES.api);
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    console.log('Returning cached response for:', url);
                    return cachedResponse;
                }
            } catch (e) {
                // Cache read failed
            }

            const isListRequest = url.includes('?') || url.includes('select=');
            return new Response(isListRequest ? '[]' : '{}', {
                status: 200,
                statusText: 'OK (Offline Mode)',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Offline': 'true'
                }
            });
        }
    }

    return originalFetch.apply(this, args);
};

/**
 * Helper: Fetch and cache in background
 */
const fetchAndCache = async (request: Request, cache: Cache) => {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const clone = response.clone();
            cache.put(request, clone);
        }
    } catch (error) {
        // Silent fail
    }
};

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
 * Initialize PWA
 */
const initPWA = () => {
    const storedVersion = localStorage.getItem("appVersion");

    if (storedVersion !== APP_VERSION) {
        cleanupOldCaches();
        localStorage.setItem("appVersion", APP_VERSION);
        console.log('App version updated to:', APP_VERSION);

        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
};

/**
 * Register Service Worker
 */
updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        console.log('New version available');

        const isInExam = window.location.pathname.includes('/exam') ||
            window.location.pathname.includes('/simulation');

        if (isInExam) {
            console.log('New version available, but user is in an exam. Waiting...');
            localStorage.setItem('pwaUpdatePending', 'true');
            return;
        }

        console.log('New version found, updating...');

        const autoUpdateTimeout = setTimeout(() => {
            const pendingUpdate = localStorage.getItem('pwaUpdatePending');
            if (pendingUpdate !== 'false' && updateSW) {
                console.log('Auto-updating after timeout');
                updateSW(true);
            }
        }, 30000);

        localStorage.setItem('pwaAutoUpdateTimeout', String(autoUpdateTimeout));
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
                detail: {
                    message: 'A new version is available. Update now?',
                    update: () => updateSW(true)
                }
            });
            window.dispatchEvent(updateEvent);

            const isInExam = window.location.pathname.includes('/exam') ||
                window.location.pathname.includes('/simulation');
            if (!isInExam) {
                console.log('Notifying user of pending update');
            }
        }
    },
});

/**
 * Handle PWA Install Prompt
 */
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
 * Online/Offline Status Handling
 */
window.addEventListener('online', () => {
    console.log('App is online. Syncing data...');
    window.dispatchEvent(new CustomEvent('pwa-online'));
});

window.addEventListener('offline', () => {
    console.log('App is offline. Using cached data.');
    window.dispatchEvent(new CustomEvent('pwa-offline'));
});

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
 * Initialize App with PWA
 */
const initApp = async () => {
    initPWA();

    if ('serviceWorker' in navigator) {
        await setupPWA();

        window.addEventListener('load', () => {
            setTimeout(() => {
                precacheAssets();
            }, 3000);
        });
    }

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
};

initApp().catch(console.error);

/**
 * Expose PWA Controls for App Components
 */
(window as any).__pwa = {
    updateApp: () => {
        if (updateSW) {
            updateSW(true);
            console.log('Manual update triggered');
        }
    },
    getUpdateStatus: () => {
        return localStorage.getItem('pwaUpdatePending') === 'true';
    },
    clearUpdateStatus: () => {
        localStorage.removeItem('pwaUpdatePending');
        localStorage.removeItem('pwaAutoUpdateTimeout');
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
    },
    getVersion: () => APP_VERSION,
    getCacheNames: () => CACHE_NAMES,
    clearAllCaches: async () => {
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                if (key.startsWith('medrae-')) {
                    await caches.delete(key);
                }
            }
            console.log('All caches cleared');
        }
    }
};