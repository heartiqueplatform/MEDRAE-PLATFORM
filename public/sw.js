// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST); // ← this line MUST appear exactly once

// ===== Service Worker =====
// ===== Workbox injection point (REQUIRED) =====

// Cache names
const CACHE_NAME = "medrae-app-shell-v20";       // Static assets cache
const DYNAMIC_CACHE_NAME = "medrae-dynamic-v05"; // Optional for dynamic media

// Files to pre-cache (static assets only)
const urlsToCache = [
    "/",
    "/index.html",
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
    "/offline.html",
    "/sw.js",
    // Sounds
    "/sounds/medrae.mp3",
    "/sounds/MedraeStudy.mp3",
    "/sounds/MedraeVoice.mp3",
    "/sounds/notification.mp3",
    "/sounds/tap1.mp3",
    "/sounds/tap2.mp3",
    "/sounds/tap0.mp3",
    "/sounds/Trivia.mp3",
    // Videos
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

// ===== Activate (merged) =====
self.addEventListener("activate", (event) => {
    console.log("[SW] Activate");
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => {
            self.clients.claim(); // New SW takes control immediately
            // Reload all controlled pages to pick up new SW/assets
            self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
                clients.forEach((client) => client.navigate(client.url));
            });
        })
    );
});

// ===== Fetch =====
self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.mode === "navigate") {
        event.respondWith(
            caches.match("/index.html").then((cached) => cached || fetch("/index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    if (
                        request.url.startsWith(self.location.origin) &&
                        !request.url.includes("/api/")
                    ) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
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

// ===== Message =====
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// ===== Push Notifications =====
self.addEventListener("push", (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: "Medrae", body: event.data.text() };
    }

    const title = data.title || "Medrae";
    const options = {
        body: data.body || "New update available!",
        icon: "/pwa-192x192.jpeg",
        badge: "/pwa-192x192.jpeg",
        data: { url: data.url || "/" }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ===== Notification Click =====
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === targetUrl && "focus" in client) return client.focus();
                }
                if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
            })
    );
});
