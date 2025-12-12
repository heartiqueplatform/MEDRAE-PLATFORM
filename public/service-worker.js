const CACHE_NAME = "medrae-v2";

// Pre-cache essential assets (app shell)
const CORE_ASSETS = [
    "/",
    "/index.html",
    "/pwa-192x192.jpeg",
    "/pwa-512x512.jpeg"
];

// Install event
self.addEventListener("install", (event) => {
    console.log("[SW] Installing…");

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(CORE_ASSETS);
        })
    );

    self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
    console.log("[SW] Activating…");

    // Delete old caches
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            )
        )
    );

    self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // 1️⃣ Handle SPA navigation (offline dashboard fix)
    if (request.mode === "navigate") {
        event.respondWith(
            caches.match("/index.html").then((cached) => {
                return (
                    cached ||
                    fetch(request).catch(() => caches.match("/index.html"))
                );
            })
        );
        return;
    }

    // 2️⃣ Static files (JS, CSS, images, audio, video)
    if (
        request.destination === "script" ||
        request.destination === "style" ||
        request.destination === "image" ||
        request.destination === "audio" ||
        request.destination === "video" ||
        request.destination === "font"
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 3️⃣ Other requests (APIs, misc)
    event.respondWith(networkFallingBackToCache(request));
});

// ----------------------------
// CACHE STRATEGIES
// ----------------------------

// Cache-first strategy (fast UI)
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        // Fallback for images
        if (request.destination === "image") {
            return caches.match("/pwa-192x192.jpeg");
        }

        throw err;
    }
}

// Network-first strategy (APIs)
async function networkFallingBackToCache(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch (err) {
        return cache.match(request);
    }
}

// Listen for skip waiting message
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
