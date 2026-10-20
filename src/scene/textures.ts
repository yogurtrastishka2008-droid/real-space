import * as THREE from 'three';
import type { Body } from '../data/bodies';

export interface TextureResult {
  textures: Map<string, THREE.Texture>;
  failed: Set<string>;
}

export function textureUrls(bodies: Body[]): string[] {
  const urls = new Set<string>();
  for (const b of bodies) {
    for (const key of ['texture', 'bumpMap', 'normalMap', 'specularMap', 'nightMap', 'cloudMap'] as const) {
      const value = b[key];
      if (value) urls.add(value);
    }
    if (b.ring) urls.add(b.ring.texture);
  }
  urls.add('/textures/sun_glow.png');
  urls.add('/textures/star_sprite.png');
  urls.add('/textures/milkyway.jpg');
  return [...urls];
}

function isColorTexture(url: string): boolean {
  return !/(bump|normal|specular)/i.test(url);
}

export function loadTextures(
  urls: string[],
  renderer: THREE.WebGLRenderer,
  onProgress: (loaded: number, total: number) => void,
): Promise<TextureResult> {
  const loader = new THREE.TextureLoader();
  const textures = new Map<string, THREE.Texture>();
  const failed = new Set<string>();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let loaded = 0;

  return new Promise((resolve) => {
    let settled = 0;
    const done = () => {
      settled += 1;
      if (settled === urls.length) resolve({ textures, failed });
    };
    for (const url of urls) {
      loader.load(
        url,
        (tex) => {
          tex.colorSpace = isColorTexture(url) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = maxAniso;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          textures.set(url, tex);
          loaded += 1;
          onProgress(loaded, urls.length);
          done();
        },
        undefined,
        () => {
          failed.add(url);
          loaded += 1;
          onProgress(loaded, urls.length);
          done();
        },
      );
    }
    if (urls.length === 0) resolve({ textures, failed });
  });
}

const fallbackCache = new Map<string, THREE.Texture>();

/** Процедурная текстура-заглушка, если файл карты недоступен. */
export function fallbackTexture(color: string, seed = 1): THREE.Texture {
  const key = `${color}-${seed}`;
  const cached = fallbackCache.get(key);
  if (cached) return cached;

  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(color);
  const r = Math.round(base.r * 255);
  const g = Math.round(base.g * 255);
  const b = Math.round(base.b * 255);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`);
  grad.addColorStop(0.5, `rgb(${r},${g},${b})`);
  grad.addColorStop(1, `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // мягкие широтные полосы, чтобы заглушка читалась как планета
  for (let band = 0; band < 9; band += 1) {
    const y = (band / 9) * h;
    const shade = band % 2 === 0 ? 0.94 : 1.03;
    ctx.fillStyle = `rgba(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)},0.22)`;
    ctx.fillRect(0, y, w, h / 9 + 1);
  }

  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = 0; i < 900; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const radius = 2 + rand() * 22;
    const shade = rand() > 0.5 ? 1.18 : 0.82;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)},0.12)`;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // полярные шапки
  ctx.fillStyle = 'rgba(235,240,245,0.28)';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillRect(0, h - 10, w, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  fallbackCache.set(key, tex);
  return tex;
}

let selectionTexture: THREE.Texture | null = null;

/** Кольцо выделения, рисуется в canvas один раз. */
export function getSelectionTexture(): THREE.Texture {
  if (selectionTexture) return selectionTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.stroke();
  // четыре засечки
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(a) * size * 0.43, size / 2 + Math.sin(a) * size * 0.43);
    ctx.lineTo(size / 2 + Math.cos(a) * size * 0.49, size / 2 + Math.sin(a) * size * 0.49);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  selectionTexture = tex;
  return tex;
}

export function disposeTextureCache(): void {
  for (const tex of fallbackCache.values()) tex.dispose();
  fallbackCache.clear();
  selectionTexture?.dispose();
  selectionTexture = null;
}
