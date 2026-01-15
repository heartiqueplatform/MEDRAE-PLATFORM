// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// =======================
// 1️⃣ Precache build assets + offline fallback
// =======================
precacheAndRoute([
    ...self.__WB_MANIFEST,          // injected by Vite at build time
    { url: '/offline.html', revision: 'v1' },
    // Optional: keep other static assets not part of build
    { url: '/pwa-192x192.jpeg', revision: 'v1' },
    { url: '/pwa-512x512.jpeg', revision: 'v1' },
    { url: '/UsersAvatar.jpg', revision: 'v1' },
    { url: '/indexbackground7.jpg', revision: 'v1' },
    { url: '/indexbackground6.jpg', revision: 'v1' },
    { url: '/icon-512.jpg', revision: 'v1' },
    { url: '/background06.jpg', revision: 'v1' },
    { url: '/background05.jpg', revision: 'v1' },
    { url: '/background04.jpg', revision: 'v1' },
    { url: '/background03.jpg', revision: 'v1' },
    { url: '/background02.jpg', revision: 'v1' },
    { url: '/background1.jpg', revision: 'v1' },
    // Sounds
    { url: '/sounds/medrae.mp3', revision: 'v1' },
    { url: '/sounds/MedraeStudy.mp3', revision: 'v1' },
    { url: '/sounds/MedraeVoice.mp3', revision: 'v1' },
    { url: '/sounds/notification.mp3', revision: 'v1' },
    { url: '/sounds/tap1.mp3', revision: 'v1' },
    { url: '/sounds/tap2.mp3', revision: 'v1' },
    { url: '/sounds/tap0.mp3', revision: 'v1' },
    { url: '/sounds/Trivia.mp3', revision: 'v1' },
    // Videos (if small)
    { url: '/videos/Medrae1.mp4', revision: 'v1' },
    { url: '/videos/Medrae2.mp4', revision: 'v1' },
    { url: '/videos/Medrae3.mp4', revision: 'v1' }
]);

// =======================
// 2️⃣ SPA navigation fallback
// =======================
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 3,
        plugins: [],
    })
);

// =======================
// 3️⃣ Runtime caching for images
// =======================
registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images-cache',
        plugins: [],
    })
);

// =======================
// 4️⃣ Runtime caching for API requests (optional)
// =======================
registerRoute(
    ({ url }) => url.pathname.startsWith('/api'),
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
    })
);

// =======================
// 5️⃣ Skip waiting & claim clients
// =======================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// =======================
// 6️⃣ Push notifications
// =======================
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Medrae', body: event.data.text() };
    }

    const title = data.title || 'Medrae';
    const options = {
        body: data.body || 'New update available!',
        icon: '/pwa-192x192.jpeg',
        badge: '/pwa-192x192.jpeg',
        data: { url: data.url || '/' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});
