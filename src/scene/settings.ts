import type { ScaleMode } from '../data/bodies';
import { clamp } from '../lib/format';

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  scaleMode: ScaleMode;
  sceneScale: number;
  showOrbits: boolean;
  showLabels: boolean;
  showMoons: boolean;
  showBelts: boolean;
  showMilkyWay: boolean;
  starBrightness: number;
  sunGlow: number;
  atmosphere: number;
  clouds: number;
  bloom: boolean;
  quality: Quality;
  timeSpeed: number;
  paused: boolean;
}

export const QUALITY_CAPS: Record<Quality, { pixelRatio: number; stars: number; aniso: number }> = {
  low: { pixelRatio: 1, stars: 7000, aniso: 2 },
  medium: { pixelRatio: 1.5, stars: 11000, aniso: 4 },
  high: { pixelRatio: 2, stars: 16000, aniso: 8 },
};

function defaultQuality(): Quality {
  if (typeof window === 'undefined') return 'high';
  const small = window.matchMedia('(max-width: 820px)').matches;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  if (small || cores <= 4) return 'medium';
  return 'high';
}

export const DEFAULT_SETTINGS: Settings = {
  scaleMode: 'explore',
  sceneScale: 1,
  showOrbits: true,
  showLabels: true,
  showMoons: true,
  showBelts: true,
  showMilkyWay: true,
  starBrightness: 1,
  sunGlow: 1,
  atmosphere: 1,
  clouds: 0.9,
  bloom: true,
  quality: defaultQuality(),
  timeSpeed: 2,
  paused: false,
};

const STORAGE_KEY = 'realspace.settings.v2';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw) as Partial<Settings>;
    return sanitize({ ...DEFAULT_SETTINGS, ...data });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function sanitize(s: Settings): Settings {
  return {
    ...s,
    scaleMode: s.scaleMode === 'scientific' ? 'scientific' : 'explore',
    sceneScale: clamp(s.sceneScale, 0.5, 1.6),
    starBrightness: clamp(s.starBrightness, 0, 2),
    sunGlow: clamp(s.sunGlow, 0, 2),
    atmosphere: clamp(s.atmosphere, 0, 1.5),
    clouds: clamp(s.clouds, 0, 1),
    timeSpeed: s.paused ? 0 : clamp(s.timeSpeed, 0, 400),
    quality: s.quality === 'low' || s.quality === 'high' ? s.quality : 'medium',
  };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* приватный режим или переполнение — не критично */
  }
}
