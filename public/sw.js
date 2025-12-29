const CACHE_NAME = "medrae-app-shell-v02";
const urlsToCache = [
    "/", // SPA index
    "/index.html",
    "/index.css",
    "/main.js", // Vite compiled JS
    "/pwa-192x192.jpeg",
    "/pwa-512x512.jpeg",
    "/UsersAvatar.jpg",
    "/indexbackground7.jpg",
    "/indexbackground6.jpg",
    "/indexbackground5.jpg",
    "/indexbackground3.jpg",
    "/indexbackground2.jpg",
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

    // Videos
    "/videos/Medrae1.mp4",
    "/videos/Medrae2.mp4",
    "/videos/Medrae3.mp4",

    // SPA routes (for reference, still fallback to index.html)
    "/dashboard/student",
    "/dashboard/tutor",
    "/dashboard/staff",
    "/ai-assistant",
    "/calendar",
    "/progress",
    "/resources",
    "/medtube",
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

// Install: cache everything
self.addEventListener("install", (event) => {
    console.log("[SW] Install");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
    console.log("[SW] Activate");
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: robust offline handling
self.addEventListener("fetch", (event) => {
    const request = event.request;

    // 1️⃣ SPA navigation: fallback to cached index.html
    if (request.mode === "navigate") {
        event.respondWith(
            caches.match("/index.html").then((cached) => {
                return cached || fetch("/index.html").catch(() => {
                    // Offline HTML fallback
                    return new Response(
                        `<html><body><h1>Offline</h1><p>You are offline. Please check your connection.</p></body></html>`,
                        { headers: { "Content-Type": "text/html" } }
                    );
                });
            })
        );
        return;
    }

    // 2️⃣ Other requests: cache-first, then network, fallback for images
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    if (
                        request.url.startsWith(self.location.origin) &&
                        !request.url.includes("/videos/") &&
                        !request.url.includes("/medtube_videos/")
                    ) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    if (request.destination === "image") {
                        return caches.match("/pwa-192x192.jpeg");
                    }
                });
        })
    );
});

// Optional: skip waiting on new SW
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
