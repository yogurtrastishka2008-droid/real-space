import {
  AU_KM,
  BODY_MAP,
  getChildren,
  getParent,
  KIND_LABEL,
  type Body,
} from '../data/bodies';
import {
  au,
  days,
  diameter,
  earthDiameters,
  earthMasses,
  hours,
  kmDistance,
  mass,
  num,
  temperature,
} from './format';

export interface InfoRow {
  label: string;
  value: string;
  hint?: string;
}

export function bodyGroup(body: Body): string {
  if (body.kind === 'star') return 'жёлтый карлик';
  if (body.kind === 'belt') return body.id === 'kuiper-belt' ? 'пояс Койпера' : 'главный пояс';
  if (body.kind === 'moon') return getParent(body) ? `спутник ${getParent(body)!.name}` : 'спутник';
  if (body.kind === 'dwarf') return 'карликовая планета';
  const gas = ['jupiter', 'saturn'];
  const ice = ['uranus', 'neptune'];
  if (gas.includes(body.id)) return 'газовый гигант';
  if (ice.includes(body.id)) return 'ледяной гигант';
  return 'планета земной группы';
}

export function bodySubtitle(body: Body): string {
  if (body.kind === 'moon') {
    const parent = getParent(body);
    return parent ? `Спутник ${parent.name}` : 'Спутник';
  }
  if (body.kind === 'star') return 'Звезда · жёлтый карлик';
  if (body.kind === 'dwarf') return 'Карликовая планета';
  if (body.kind === 'belt') {
    return body.id === 'kuiper-belt' ? 'Пояс Койпера' : 'Главный пояс астероидов';
  }
  return bodyGroup(body).replace(/^./, (c) => c.toUpperCase());
}

export function bodyRows(body: Body, includeExtra = true): InfoRow[] {
  const rows: InfoRow[] = [{ label: 'Тип объекта', value: KIND_LABEL[body.kind] }];

  if (body.kind === 'belt') {
    rows.length = 0;
    rows.push({ label: 'Тип объекта', value: 'Область малых тел' });
    rows.push({ label: 'Суммарная масса', value: mass(body.massKg ?? 0), hint: 'оценка' });
    if (body.meanTempC !== null && body.meanTempC !== undefined) {
      rows.push({ label: 'Температура тел', value: temperature(body.meanTempC) });
    }
    rows.push({ label: 'Атмосфера', value: body.atmosphere });
    rows.push({ label: 'Состав', value: body.composition });
    if (includeExtra) rows.push(...body.extra);
    return rows;
  }

  const d = body.radiusKm * 2;
  rows.push({
    label: 'Диаметр',
    value: `${diameter(d)}${body.kind === 'star' ? '' : ` · ${earthDiameters(d)}`}`,
  });

  if (body.massKg) {
    rows.push({
      label: 'Масса',
      value: `${mass(body.massKg)} · ${earthMasses(body.massKg)}`,
    });
  }

  if (body.gravityMs2) {
    rows.push({
      label: 'Ускорение свободного падения',
      value: `${num(body.gravityMs2, 2)} м/с² · ${num(body.gravityMs2 / 9.807, 2)} g`,
    });
  }

  rows.push({ label: 'Средняя температура', value: temperature(body.meanTempC), hint: 'для поверхности/облачного слоя' });

  if (body.rotationHours !== undefined) {
    const label =
      body.kind === 'moon' ? 'Период вращения' : body.kind === 'star' ? 'Период вращения' : 'Сутки (сидерические)';
    const note = body.rotationHours < 0 ? 'обратное вращение' : undefined;
    rows.push({ label, value: hours(body.rotationHours), hint: note });
  }

  if (body.orbit) {
    rows.push({
      label: body.kind === 'star' ? 'Период обращения' : 'Год (орбитальный период)',
      value: days(body.orbit.periodDays),
    });
    rows.push({
      label: 'Расстояние от Солнца',
      value: au(body.orbit.aAu),
      hint: 'большая полуось орбиты',
    });
    rows.push({
      label: 'Эксцентриситет орбиты',
      value: num(body.orbit.e, 3),
    });
  } else if (body.moonOrbit) {
    const parent = getParent(body);
    rows.push({
      label: `Расстояние от ${parent ? parent.name : 'родителя'}`,
      value: kmDistance(body.moonOrbit.distanceKm),
      hint: 'большая полуось орбиты',
    });
    rows.push({ label: 'Орбитальный период', value: days(body.moonOrbit.periodDays) });
    rows.push({
      label: 'Наклонение орбиты',
      value: `${num(body.moonOrbit.inclinationDeg, 2)}°${
        body.moonOrbit.inclinationDeg > 90 ? ' (обратное движение)' : ''
      }`,
    });
  }

  rows.push({ label: 'Атмосфера', value: body.atmosphere });
  rows.push({ label: 'Состав и поверхность', value: body.composition });

  if (body.kind === 'star') {
    rows.push({
      label: 'Планетная система',
      value: '8 планет, 5 карликовых планет, 18 спутников в модели',
    });
  } else if (body.kind !== 'moon') {
    const children = getChildren(body.id);
    rows.push({
      label: 'Спутники в модели',
      value: children.length ? `${children.length}: ${children.map((c) => c.name).join(', ')}` : 'Нет',
    });
  }

  rows.push(...body.extra);
  return includeExtra ? rows : rows.slice(0, Math.max(0, rows.length - body.extra.length));
}

export function satelliteCount(body: Body): number {
  return getChildren(body.id).length;
}

export interface CompareMetric {
  label: string;
  get: (b: Body) => number | null;
  format: (v: number) => string;
  unitShort?: string;
  higher?: boolean;
}

export const COMPARE_METRICS: CompareMetric[] = [
  {
    label: 'Диаметр',
    unitShort: 'км',
    get: (b) => (b.kind === 'belt' ? null : b.radiusKm * 2),
    format: (v) => `${num(v)} км`,
    higher: true,
  },
  {
    label: 'Масса',
    unitShort: 'кг',
    get: (b) => b.massKg ?? null,
    format: (v) => mass(v),
    higher: true,
  },
  {
    label: 'Гравитация',
    unitShort: 'м/с²',
    get: (b) => b.gravityMs2 ?? null,
    format: (v) => `${num(v, 2)} м/с²`,
    higher: true,
  },
  {
    label: 'Сутки',
    unitShort: 'ч',
    get: (b) => (b.rotationHours === undefined ? null : Math.abs(b.rotationHours)),
    format: (v) => hours(v),
  },
  {
    label: 'Год / орбитальный период',
    unitShort: 'сут',
    get: (b) => b.orbit?.periodDays ?? b.moonOrbit?.periodDays ?? null,
    format: (v) => days(v),
  },
  {
    label: 'Расстояние от Солнца',
    unitShort: 'а.е.',
    get: (b) => b.orbit?.aAu ?? null,
    format: (v) => `${num(v, 2)} а.е.`,
    higher: true,
  },
  {
    label: 'Температура',
    unitShort: '°C',
    get: (b) => b.meanTempC ?? null,
    format: (v) => `${num(v)} °C`,
    higher: true,
  },
  {
    label: 'Спутники',
    unitShort: 'шт.',
    get: (b) => (b.kind === 'moon' || b.kind === 'belt' ? null : satelliteCount(b)),
    format: (v) => `${num(v)}`,
    higher: true,
  },
];

export function bodyDistanceAu(body: Body): number | null {
  return body.orbit?.aAu ?? null;
}

export function bodyRadiusKm(body: Body): number | null {
  return body.kind === 'belt' ? null : body.radiusKm;
}

export function parentDistanceKm(body: Body): number | null {
  return body.moonOrbit?.distanceKm ?? null;
}

export function beltExtentAu(body: Body): [number, number] | null {
  if (body.id === 'asteroid-belt') return [2.1, 3.3];
  if (body.id === 'kuiper-belt') return [30, 50];
  return null;
}

export function bodyMassEarths(body: Body): number | null {
  return body.massKg ? body.massKg / 5.9722e24 : null;
}

export function bodyAuKm(body: Body): number | null {
  return body.orbit ? body.orbit.aAu * AU_KM : null;
}

export function relatedBodies(body: Body): Body[] {
  if (body.parentId) {
    const parent = BODY_MAP[body.parentId];
    return parent ? [parent, ...getChildren(parent.id).filter((b) => b.id !== body.id)] : [];
  }
  return getChildren(body.id);
}
