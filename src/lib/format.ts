import { AU_KM, EARTH_MASS_KG, EARTH_RADIUS_KM } from '../data/bodies';

const MINUS = '\u2212';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const nf = (digits: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export function num(value: number, digits = 0): string {
  return nf(digits).format(value);
}

export function superscript(value: number): string {
  return String(value)
    .split('')
    .map((ch) => (ch === '-' ? '⁻' : SUP[Number(ch)] ?? ch))
    .join('');
}

export function signed(value: number, digits = 0): string {
  return value < 0 ? `${MINUS}${num(Math.abs(value), digits)}` : num(value, digits);
}

export function km(value: number, digits = 0): string {
  return `${num(value, digits)} км`;
}

export function mass(valueKg: number): string {
  const exp = Math.floor(Math.log10(Math.abs(valueKg)));
  const mantissa = valueKg / 10 ** exp;
  return `${num(mantissa, 3)} × 10${superscript(exp)} кг`;
}

export function earthMasses(valueKg: number): string {
  const ratio = valueKg / EARTH_MASS_KG;
  if (ratio >= 0.01) return `${num(ratio, ratio >= 10 ? 0 : 2)} M⊕`;
  return `${num(ratio, 3)} M⊕`;
}

export function diameter(valueKm: number): string {
  return `${num(valueKm)} км`;
}

export function earthDiameters(valueKm: number): string {
  return `${num(valueKm / (2 * EARTH_RADIUS_KM), 2)} ⌀⊕`;
}

export function hours(value: number): string {
  const abs = Math.abs(value);
  const retro = value < 0 ? ' (обратное вращение)' : '';
  if (abs >= 48) return `${num(abs / 24, 2)} сут${retro}`;
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return m === 60 ? `${h + 1} ч${retro}` : `${h} ч ${m} мин${retro}`;
}

export function days(value: number): string {
  if (value < 1) return hours(value * 24);
  if (value < 730) return `${num(value, 2)} сут`;
  return `${num(value / 365.256, 2)} лет`;
}

export function period(valueDays: number): string {
  return days(valueDays);
}

export function temperature(valueC: number | null | undefined): string {
  if (valueC === null || valueC === undefined) return '—';
  return `${signed(valueC)} °C`;
}

export function au(valueAu: number): string {
  const kmValue = valueAu * AU_KM;
  const distance =
    kmValue >= 1e9
      ? `${num(kmValue / 1e9, 2)} млрд км`
      : kmValue >= 1e6
        ? `${num(kmValue / 1e6, 1)} млн км`
        : `${num(kmValue)} км`;
  return `${num(valueAu, 2)} а.е. · ${distance}`;
}

export function auShort(valueAu: number): string {
  return `${num(valueAu, 2)} а.е.`;
}

export function kmDistance(valueKm: number): string {
  return `${num(valueKm)} км`;
}

export function dateRu(d: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function timeRu(d: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

export function dateTimeRu(d: Date): string {
  return `${dateRu(d)}, ${timeRu(d)}`;
}

/** Скорость симуляции в «сутках за секунду» -> человекочитаемая строка. */
export function speedLabel(daysPerSecond: number): string {
  if (daysPerSecond <= 0) return 'Пауза';
  if (daysPerSecond < 1 / 24) return `${num(daysPerSecond * 24 * 60, 1)} мин/с`;
  if (daysPerSecond < 1) return `${num(daysPerSecond * 24, 1)} ч/с`;
  if (daysPerSecond < 365) return `${num(daysPerSecond, daysPerSecond < 10 ? 2 : 0)} сут/с`;
  return `${num(daysPerSecond / 365.256, 2)} лет/с`;
}

export function speedFromSlider(v: number): number {
  if (v <= 0) return 0;
  return 0.02 * 10 ** (v / 23.5);
}

export function sliderFromSpeed(speed: number): number {
  if (speed <= 0) return 0;
  return Math.max(0, Math.min(100, 23.5 * Math.log10(speed / 0.02)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
