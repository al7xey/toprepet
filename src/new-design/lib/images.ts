/**
 * Фото любого размера: сайт сам уменьшает его в браузере перед отправкой (до 1600 px и около 1 МБ),
 * так что пользователю не нужно думать о весе файла. Файл, который не получилось сжать, уходит как есть.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const { default: compress } = await import('browser-image-compression');
    const small = await compress(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true });
    return small.size < file.size ? small : file;
  } catch {
    return file;
  }
}
