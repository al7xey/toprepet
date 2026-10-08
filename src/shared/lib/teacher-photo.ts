import photos from '../config/teacher-photos.json';

export function teacherPhotoAttributes(id: string, variant: 'card' | 'profile') {
  const photo = photos[id as keyof typeof photos];
  if (!photo) return {};
  return {
    srcSet: photo.srcSet,
    width: photo.width,
    height: photo.height,
    sizes: variant === 'card'
      ? '(min-width: 760px) 256px, 232px'
      : '(min-width: 760px) 256px, (min-width: 448px) 420px, calc(100vw - 28px)',
  };
}
