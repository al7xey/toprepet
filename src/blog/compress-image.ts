'use client'
import imageCompression from 'browser-image-compression'

const accepted = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export async function compressImage(file: File, cover = false) {
  if (file.type === 'image/svg+xml') throw new Error('SVG не поддерживается. Сохраните изображение как JPG, PNG, WebP или AVIF.')
  if (!accepted.includes(file.type)) throw new Error('Не удалось обработать этот формат. Сохраните изображение как JPG, PNG, WebP или AVIF.')
  if (file.size > 50 * 1024 * 1024) throw new Error('Файл больше 50 МБ. Сохраните изображение в более компактном формате.')
  let compressed: File
  try {
    compressed = await imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: .43, initialQuality: .84, fileType: 'image/webp', useWebWorker: true, preserveExif: false })
  } catch {
    throw new Error('Не удалось обработать это изображение. Попробуйте сохранить его как JPG, PNG, WebP или AVIF.')
  }
  const bitmap = await createImageBitmap(compressed)
  let width = bitmap.width, height = bitmap.height
  if (cover && height > 900) {
    const scale = 900 / height
    width = Math.round(width * scale); height = 900
  }
  if (compressed.size > 450 * 1024 || (cover && bitmap.height > 900)) {
    const canvas = document.createElement('canvas')
    for (let i = 0; i < 5; i++) {
      canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Не удалось обработать это изображение')
      context.drawImage(bitmap, 0, 0, width, height)
      const quality = Math.max(.62, .8 - i * .05)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Не удалось сжать изображение')), 'image/webp', quality))
      compressed = new File([blob], 'image.webp', { type: 'image/webp' })
      if (compressed.size <= 450 * 1024) break
      width = Math.round(width * .88); height = Math.round(height * .88)
    }
  }
  bitmap.close()
  if (compressed.size > 450 * 1024) throw new Error('Не удалось достаточно сжать изображение. Попробуйте сохранить его как JPG или WebP.')
  const finalBitmap = await createImageBitmap(compressed)
  const result = { file: new File([compressed], 'image.webp', { type: 'image/webp' }), width: finalBitmap.width, height: finalBitmap.height }
  finalBitmap.close()
  return result
}
