import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../public')
const sourceImage = path.resolve(__dirname, '../public/valid.png')

if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found!')
    process.exit(1)
}

const splashSizes = [
    { name: 'splash-iphone5.png', width: 640, height: 1136 },
    { name: 'splash-iphone6.png', width: 750, height: 1334 },
    { name: 'splash-iphoneplus.png', width: 1242, height: 2208 },
    { name: 'splash-iphonex.png', width: 1125, height: 2436 },
    { name: 'splash-iphonexr.png', width: 828, height: 1792 },
    { name: 'splash-iphonexsmax.png', width: 1242, height: 2688 },
    { name: 'splash-ipad.png', width: 1536, height: 2048 },
    { name: 'splash-ipadpro.png', width: 2048, height: 2732 },
]

async function generateSplashScreens() {
    console.log('Generating iOS splash screens...')

    for (const splash of splashSizes) {
        const filePath = path.join(outputDir, splash.name)

        if (fs.existsSync(filePath)) {
            console.log(`${splash.name} already exists, skipping...`)
            continue
        }

        try {
            const iconSize = Math.min(splash.width, splash.height) * 0.25

            await sharp({
                create: {
                    width: splash.width,
                    height: splash.height,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
                .composite([{
                    input: sourceImage,
                    gravity: 'center',
                    width: iconSize,
                    height: iconSize,
                    fit: 'contain'
                }])
                .png()
                .toFile(filePath)

            console.log(`Generated ${splash.name} (${splash.width}x${splash.height})`)
        } catch (error) {
            console.error(`Failed to generate ${splash.name}:`, error.message)
        }
    }
    console.log('All splash screens generated successfully!')
}

generateSplashScreens().catch(console.error)