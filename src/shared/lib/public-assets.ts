const basePath = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function publicAssetPath(path: string): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;
  return `${basePath}${path.replace(/^\/+/, '')}`;
}

export function publicAssetSrcSet(srcSet: string): string {
  return srcSet.split(',').map((candidate) => {
    const [path, ...descriptor] = candidate.trim().split(/\s+/);
    return [publicAssetPath(path), ...descriptor].join(' ');
  }).join(', ');
}
