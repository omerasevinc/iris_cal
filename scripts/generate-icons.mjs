// Generates client/public/icon-192.png and icon-512.png
// Run from monorepo root: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0d9488"/>
  <circle cx="256" cy="290" r="140" fill="white" opacity="0.95"/>
  <circle cx="256" cy="290" r="108" fill="#e0f2fe" opacity="0.5"/>
  <rect x="170" y="148" width="10" height="52" rx="5" fill="white"/>
  <rect x="188" y="148" width="10" height="52" rx="5" fill="white"/>
  <rect x="206" y="148" width="10" height="52" rx="5" fill="white"/>
  <rect x="179" y="192" width="28" height="90" rx="14" fill="white"/>
  <rect x="316" y="148" width="18" height="134" rx="9" fill="white"/>
  <path d="M316 148 Q334 172 334 196 L316 196Z" fill="white"/>
</svg>`

for (const size of [192, 512]) {
  const outPath = join(__dirname, `../client/public/icon-${size}.png`)
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log(`Generated icon-${size}.png`)
}
