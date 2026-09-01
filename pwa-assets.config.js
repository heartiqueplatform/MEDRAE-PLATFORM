import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
    headLinkOptions: {
        preset: '2023',
    },
    preset: {
        transparent: {
            sizes: [64, 192, 512],
            favicons: [[64, 'favicon.ico']],
        },
        maskable: {
            sizes: [192, 512],
        },
        apple: {
            sizes: [180],
        },
        appleStartup: {
            sizes: [
                { width: 640, height: 1136 },   // iPhone 5
                { width: 750, height: 1334 },   // iPhone 6/7/8
                { width: 1242, height: 2208 },  // iPhone 6/7/8 Plus
                { width: 1125, height: 2436 },  // iPhone X/XS
                { width: 828, height: 1792 },   // iPhone XR
                { width: 1242, height: 2688 },  // iPhone XS Max
                { width: 1536, height: 2048 },  // iPad
                { width: 2048, height: 2732 },  // iPad Pro
            ],
            padding: 0.3,
            resizeOptions: { fit: 'contain', background: '#ffffff' },
        },
    },
})