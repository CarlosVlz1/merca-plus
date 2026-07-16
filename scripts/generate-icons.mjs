/**
 * Genera icon-192.png e icon-512.png en /public
 * Solo usa módulos built-in de Node.js (zlib, fs, crypto)
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// CRC32 para chunks PNG
function crc32(buf) {
  let crc = 0xffffffff
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.allocUnsafe(4)
  const crcData = Buffer.concat([typeBytes, data])
  crcBuf.writeUInt32BE(crc32(crcData), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

// Color principal: #16A34A (verde Merca+)
const R = 0x16, G = 0xa3, B = 0x4a

function generatePNG(size) {
  const radius = Math.round(size * 0.25) // bordes redondeados ~25%

  // Pixel data: RGBA para cada píxel
  const rawRows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      // Rounded corners: esquina fuera del radio → transparente
      const dx = Math.min(x, size - 1 - x)
      const dy = Math.min(y, size - 1 - y)
      let alpha = 255
      if (dx < radius && dy < radius) {
        const dist = Math.sqrt((radius - dx) ** 2 + (radius - dy) ** 2)
        alpha = dist > radius ? 0 : dist > radius - 1 ? Math.round((radius - dist) * 255) : 255
      }

      const offset = 1 + x * 4
      row[offset] = R
      row[offset + 1] = G
      row[offset + 2] = B
      row[offset + 3] = alpha
    }
    rawRows.push(row)
  }

  const raw = Buffer.concat(rawRows)
  const compressed = deflateSync(raw)

  // IHDR
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type: RGBA
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync(publicDir, { recursive: true })

writeFileSync(join(publicDir, 'icon-192.png'), generatePNG(192))
console.log('✓ public/icon-192.png generado')

writeFileSync(join(publicDir, 'icon-512.png'), generatePNG(512))
console.log('✓ public/icon-512.png generado')
