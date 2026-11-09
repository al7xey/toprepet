import { useEffect } from 'react';
import './liquid-glass.css';

const NS = 'http://www.w3.org/2000/svg';
const SURFACES = '.hdr.surf,.trk-tabbar,.trh-tools .search,.trh-tools .chipf.ico,.tc .pl,.trh-drop-menu,.trk-modal,.trh-fpage,.trh-menu';

/** Rounded lens normal map. Only the rim refracts; the reading area stays stable. */
function lensMap(width: number, height: number, radius: number) {
  const scale = Math.min(1, 160 / width, 96 / height);
  const w = Math.max(2, Math.round(width * scale));
  const h = Math.max(2, Math.round(height * scale));
  const r = Math.min(radius * scale, w / 2, h / 2);
  const edge = Math.max(2, Math.min(12 * scale, r));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const pixels = context.createImageData(w, h);
  const distance = (x: number, y: number) => {
    const qx = Math.abs(x - w / 2) - (w / 2 - r);
    const qy = Math.abs(y - h / 2) - (h / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = distance(x + .5, y + .5);
    const strength = d <= 0 && d > -edge ? Math.sin((1 + d / edge) * Math.PI / 2) : 0;
    const dx = distance(x + 1, y) - distance(x - 1, y);
    const dy = distance(x, y + 1) - distance(x, y - 1);
    const length = Math.hypot(dx, dy) || 1;
    const offset = (y * w + x) * 4;
    pixels.data[offset] = Math.round(128 + 110 * strength * dx / length);
    pixels.data[offset + 1] = Math.round(128 + 110 * strength * dy / length);
    pixels.data[offset + 2] = 128;
    pixels.data[offset + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

/** Browser implementation of optical refraction; Figma's native GLASS stays in Figma. */
export function LiquidGlassEffects() {
  useEffect(() => {
    // Chromium can apply the optical map to the backdrop. CSS provides the frost fallback.
    if (!/Chrome|Chromium|Edg\//.test(navigator.userAgent)) return;
    const root = document.querySelector<HTMLElement>('.tr');
    if (!root || typeof ResizeObserver === 'undefined') return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'lg-filter-definitions');
    const defs = document.createElementNS(NS, 'defs');
    svg.append(defs); document.body.append(svg);
    const observed = new Set<HTMLElement>();
    const cache = new Map<string, string>();
    const update = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 28;
      const key = `${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(radius)}`;
      let id = cache.get(key);
      if (!id) {
        const map = lensMap(box.width, box.height, radius);
        if (!map) return;
        id = `tr-lens-${cache.size}`;
        const filter = document.createElementNS(NS, 'filter');
        filter.setAttribute('id', id);
        filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
        filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        const image = document.createElementNS(NS, 'feImage');
        image.setAttribute('href', map); image.setAttribute('result', 'normals');
        image.setAttribute('x', '0'); image.setAttribute('y', '0');
        image.setAttribute('width', '100%'); image.setAttribute('height', '100%');
        image.setAttribute('preserveAspectRatio', 'none');
        const displacement = document.createElementNS(NS, 'feDisplacementMap');
        displacement.setAttribute('in', 'SourceGraphic'); displacement.setAttribute('in2', 'normals');
        displacement.setAttribute('scale', '10'); displacement.setAttribute('xChannelSelector', 'R');
        displacement.setAttribute('yChannelSelector', 'G');
        filter.append(image, displacement); defs.append(filter); cache.set(key, id);
      }
      element.style.setProperty('--lg-optics', `url("#${id}")`);
    };
    const resize = new ResizeObserver(entries => entries.forEach(entry => update(entry.target as HTMLElement)));
    const scan = () => {
      document.querySelectorAll<HTMLElement>('.tr').forEach(host => { host.dataset.glassOptics = 'refraction'; });
      for (const element of document.querySelectorAll<HTMLElement>(SURFACES)) if (element.closest('.tr') && !observed.has(element)) {
        observed.add(element); resize.observe(element);
      }
      for (const element of observed) if (!element.isConnected) { resize.unobserve(element); observed.delete(element); }
    };
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true }); scan();
    root.dataset.glassOptics = 'refraction';
    return () => {
      mutations.disconnect(); resize.disconnect(); svg.remove();
      document.querySelectorAll<HTMLElement>('.tr').forEach(host => { delete host.dataset.glassOptics; });
      observed.forEach(element => element.style.removeProperty('--lg-optics'));
    };
  }, []);
  return null;
}
