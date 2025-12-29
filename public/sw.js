// ===== Service Worker =====

// Cache names
const CACHE_NAME = "medrae-app-shell-v03";       // Static assets cache
const DYNAMIC_CACHE_NAME = "medrae-dynamic-v01"; // Optional for dynamic media

// Files to pre-cache (static assets only)
const urlsToCache = [
    "/",
    "/index.html",
    "/index.css",
    "/main.js",
    "/pwa-192x192.jpeg",
    "/pwa-512x512.jpeg",
    "/UsersAvatar.jpg",
    "/indexbackground7.jpg",
    "/indexbackground6.jpg",
    "/icon-512.jpg",
    "/background06.jpg",
    "/background05.jpg",
    "/background04.jpg",
    "/background03.jpg",
    "/background02.jpg",
    "/background1.jpg",

    // Sounds
    "/sounds/medrae.mp3",
    "/sounds/MedraeStudy.mp3",
    "/sounds/MedraeVoice.mp3",
    "/sounds/notification.mp3",
    "/sounds/tap1.mp3",
    "/sounds/tap2.mp3",

    // Videos (optional if small)
    "/videos/Medrae1.mp4",
    "/videos/Medrae2.mp4",
    "/videos/Medrae3.mp4"
];

// ===== Install =====
self.addEventListener("install", (event) => {
    console.log("[SW] Install");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// ===== Activate =====
self.addEventListener("activate", (event) => {
    console.log("[SW] Activate");
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    // Delete only old static caches, preserve dynamic cache
                    .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// ===== Fetch =====
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // SPA navigation fallback
    if (request.mode === "navigate") {
        event.respondWith(
            caches.match("/index.html").then((cached) => cached || fetch("/index.html"))
        );
        return;
    }

    // Other requests: cache-first for static assets, network-first for dynamic
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    // Only cache same-origin static assets (not API responses / user data)
                    if (
                        request.url.startsWith(self.location.origin) &&
                        !request.url.includes("/api/") // Skip user data APIs
                    ) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline fallback for images
                    if (request.destination === "image") {
                        return caches.match("/pwa-192x192.jpeg");
                    }
                });
        })
    );
});

// ===== Optional: Skip waiting immediately =====
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
