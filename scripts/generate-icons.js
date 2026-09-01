import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(__dirname, '../public')

// Use valid.png as source (we verified this works)
const sourceImage = path.resolve(__dirname, '../public/valid.png')

if (!fs.existsSync(sourceImage)) {
    console.error('Source image not found!')
    process.exit(1)
}

console.log('Using source image: valid.png')

const sizes = {
    'favicon-32x32.png': 32,
    'favicon-16x16.png': 16,
    'favicon.ico': 32,
}

async function generateIcons() {
    for (const [filename, size] of Object.entries(sizes)) {
        const filePath = path.join(outputDir, filename)

        if (fs.existsSync(filePath) && filename !== 'favicon.ico') {
            console.log(`${filename} already exists, skipping...`)
            continue
        }

        try {
            if (filename === 'favicon.ico') {
                await sharp(sourceImage)
                    .resize(32, 32, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .png()
                    .toFile(filePath.replace('.ico', '-temp.png'))

                fs.renameSync(filePath.replace('.ico', '-temp.png'), filePath)
                console.log(`Generated ${filename}`)
            } else {
                await sharp(sourceImage)
                    .resize(size, size, {
                        fit: 'contain',
                        background: { r: 255, g: 255, b: 255, alpha: 0 }
                    })
                    .png()
                    .toFile(filePath)
                console.log(`Generated ${filename}`)
            }
        } catch (error) {
            console.error(`Failed to generate ${filename}:`, error.message)
        }
    }
    console.log('All icons generated successfully!')
}

generateIcons().catch(console.error)