const CACHE_NAME = "medrae-app-shell-v1";
const urlsToCache = [
    "/", // SPA index
    "/index.html",
    "/index.css",
    "/main.js", // your compiled JS filename from Vite
    "/pwa-192x192.jpeg",
    "/pwa-512x512.jpeg",

    // SPA routes (from App.tsx)
    "/dashboard/student",
    "/dashboard/tutor",
    "/dashboard/staff",
    "/ai-assistant",
    "/chat",
    "/calendar",
    "/progress",
    "/resources",
    "/medtube",
    "/reels",
    "/announcements",
    "/feedback",
    "/settings",
    "/subscription",
    "/notifications",
    "/profile",
    "/quiz-units/student",
    "/quiz-units/tutor",
    "/quiz-units/staff",
    "/quiz",
    "/assessment-notes",
    "/simulation/candidate",
    "/quiz-simulation/instructions",
    "/forum",
    "/Medrae-quizzes",
    "/feed"
];

// Install: cache app shell + SPA routes
self.addEventListener("install", (event) => {
    console.log("[SW] Install");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Activate: keep cache, claim clients
self.addEventListener("activate", (event) => {
    console.log("[SW] Activate");
    event.waitUntil(self.clients.claim());
});

// Fetch: serve cache first, fallback to network
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // SPA fallback for navigation requests
    if (request.mode === "navigate") {
        event.respondWith(
            caches.match("/index.html").then((cached) => cached || fetch("/index.html"))
        );
        return;
    }

    // Other requests: cache first, then network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    // Only cache same-origin requests (skip large media)
                    if (
                        request.url.startsWith(self.location.origin) &&
                        !request.url.includes("/medtube_videos/")
                    ) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) =>
                            cache.put(request, responseClone)
                        );
                    }
                    return response;
                })
                .catch(() => {
                    // Optional: offline fallback for images
                    if (request.destination === "image") {
                        return caches.match("/pwa-192x192.jpeg");
                    }
                });
        })
    );
});

// Optional: listen for skip waiting message
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
