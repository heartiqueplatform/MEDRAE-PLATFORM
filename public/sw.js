const CACHE_NAME = "medrae-app-shell-v1";
const urlsToCache = [
    "/", // SPA index
    "/index.html",
    "/index.css",
    "/main.js", // your compiled JS filename from Vite
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
    // Add all other videos

    // SPA routes (from App.tsx)
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
