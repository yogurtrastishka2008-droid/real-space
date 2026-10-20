/**
 * Научные данные REAL SPACE.
 *
 * Источники значений: NASA Planetary Fact Sheet, JPL Solar System Dynamics
 * (Approximate Positions of the Planets, J2000), IAU / NASA Solar System
 * Exploration, USGS Astrogeology. Орбитальные элементы планет — J2000,
 * положения вычисляются по кеплеровским элементам и НЕ являются эфемеридой
 * реального времени. Для карликовых планет и спутников положения условные.
 */

export type BodyKind = 'star' | 'planet' | 'dwarf' | 'moon' | 'belt';
export type ScaleMode = 'scientific' | 'explore';

export interface OrbitalElements {
  aAu: number;
  e: number;
  iDeg: number;
  nodeDeg: number;
  argPeriDeg: number;
  meanAnomalyDeg: number;
  periodDays: number;
}

export interface MoonOrbit {
  distanceKm: number;
  periodDays: number;
  inclinationDeg: number;
  phaseDeg: number;
}

export interface RingInfo {
  texture: string;
  innerRadius: number;
  outerRadius: number;
  opacity: number;
}

export interface StatRow {
  label: string;
  value: string;
}

export interface Body {
  id: string;
  name: string;
  nameEn: string;
  kind: BodyKind;
  parentId?: string;
  /** Средний радиус в километрах. */
  radiusKm: number;
  massKg?: number;
  gravityMs2?: number;
  albedo?: number;
  /** Сидерические сутки в часах; отрицательное значение — обратное вращение. */
  rotationHours?: number;
  axialTiltDeg?: number;
  meanTempC?: number | null;
  atmosphere: string;
  composition: string;
  description: string;
  facts: string[];
  orbit?: OrbitalElements;
  moonOrbit?: MoonOrbit;
  texture?: string;
  bumpMap?: string;
  normalMap?: string;
  specularMap?: string;
  nightMap?: string;
  cloudMap?: string;
  ring?: RingInfo;
  color: string;
  atmosphereColor?: string;
  atmosphereStrength?: number;
  /** Для карликовых планет с приблизительными элементами. */
  approxOrbit?: boolean;
  /** Дополнительные поля, специфичные для типа объекта. */
  extra: StatRow[];
  searchTerms?: string[];
}

export const SOLAR_MASS_KG = 1.9885e30;
export const EARTH_RADIUS_KM = 6371;
export const EARTH_MASS_KG = 5.9722e24;
export const AU_KM = 149_597_870.7;

export const BODIES: Body[] = [
  // ------------------------------------------------------------------- Солнце
  {
    id: 'sun',
    name: 'Солнце',
    nameEn: 'Sun',
    kind: 'star',
    radiusKm: 696_340,
    massKg: 1.9885e30,
    gravityMs2: 274,
    rotationHours: 609.12,
    axialTiltDeg: 7.25,
    meanTempC: 5505,
    atmosphere: 'Фотосфера ≈ 5 500 °C, хромосфера, корона до 1–3 млн °C',
    composition: '73,5% водорода, 24,9% гелия, 0,8% кислорода, 0,3% углерода (по массе)',
    description:
      'Звезда спектрального класса G2V, удерживающая всю Солнечную систему. Термоядерные реакции в ядре превращают около 600 млн тонн водорода в гелий каждую секунду.',
    facts: [
      'Солнце содержит 99,86% всей массы Солнечной системы.',
      'Свету нужно около 8 минут 20 секунд, чтобы добраться до Земли.',
      'Температура ядра достигает 15,7 млн °C, а корона горячее фотосферы почти в 300 раз.',
      'Солнце вращается не как твёрдое тело: экватор — за 25,4 суток, полюса — примерно за 35.',
    ],
    texture: '/textures/sun.jpg',
    color: '#ffb347',
    atmosphereColor: '#ff9a3c',
    atmosphereStrength: 0.55,
    extra: [
      { label: 'Спектральный класс', value: 'G2V' },
      { label: 'Светимость', value: '3,828 × 10²⁶ Вт' },
      { label: 'Возраст', value: '≈ 4,6 млрд лет' },
      { label: 'Температура ядра', value: '≈ 15,7 млн °C' },
      { label: 'Абсолютная звёздная величина', value: '+4,83ᵐ' },
    ],
    searchTerms: ['солнце', 'sun', 'звезда', 'star', 'g2v'],
  },

  // ------------------------------------------------------------------ Меркурий
  {
    id: 'mercury',
    name: 'Меркурий',
    nameEn: 'Mercury',
    kind: 'planet',
    radiusKm: 2439.7,
    massKg: 3.3011e23,
    gravityMs2: 3.7,
    albedo: 0.088,
    rotationHours: 1407.6,
    axialTiltDeg: 0.034,
    meanTempC: 167,
    atmosphere: 'Практически отсутствует; экзосфера из Na, O, H, He, K (давление < 10⁻¹⁴ бар)',
    composition: 'Железное ядро (~85% радиуса), силикатная мантия, тонкая кора, ударные кратеры',
    description:
      'Самая маленькая планета и ближайшая к Солнцу. Из-за отсутствия атмосферы перепад температур между днём и ночью — около 600 °C.',
    facts: [
      'Один оборот вокруг Солнца занимает 88 земных суток, а солнечные сутки длятся 176 суток.',
      'Здесь находится крупнейший ударный кратер Меркурия — бассейн Калорис диаметром около 1 550 км.',
      'Меркурий сжимается: радиус планеты уменьшился на несколько километров за миллиарды лет.',
      'Несмотря на близость к Солнцу, в полярных кратерах есть водяной лёд.',
    ],
    orbit: {
      aAu: 0.38709893,
      e: 0.20563069,
      iDeg: 7.00487,
      nodeDeg: 48.33167,
      argPeriDeg: 29.12478,
      meanAnomalyDeg: 174.79495,
      periodDays: 87.969,
    },
    texture: '/textures/mercury.jpg',
    bumpMap: '/textures/mercury_bump.jpg',
    color: '#a9a19b',
    extra: [
      { label: 'Крупнейшая структура', value: 'Бассейн Калорис, ⌀ ≈ 1 550 км' },
      { label: 'Магнитное поле', value: 'Слабое, ~1% земного' },
      { label: 'Атмосферное давление', value: '< 10⁻¹⁴ бар' },
      { label: 'Период солнечных суток', value: '175,94 земных суток' },
      { label: 'Спутники', value: 'Нет' },
    ],
    searchTerms: ['меркурий', 'mercury', 'планета'],
  },

  // -------------------------------------------------------------------- Венера
  {
    id: 'venus',
    name: 'Венера',
    nameEn: 'Venus',
    kind: 'planet',
    radiusKm: 6051.8,
    massKg: 4.8675e24,
    gravityMs2: 8.87,
    albedo: 0.76,
    rotationHours: -5832.5,
    axialTiltDeg: 177.36,
    meanTempC: 464,
    atmosphere: '96,5% CO₂, 3,5% N₂; давление 92 бар; облака серной кислоты',
    composition: 'Силикатная кора, базальтовые равнины, вулканические плато, мантия и железное ядро',
    description:
      'Самая горячая планета: парниковый эффект плотной углекислотной атмосферы удерживает температуру выше, чем у Меркурия, который ближе к Солнцу.',
    facts: [
      'Венера вращается в обратную сторону: Солнце встаёт на западе и садится на востоке.',
      'Давление на поверхности такое же, как на глубине 900 метров в океане Земли.',
      'Венера — самая яркая планета на земном небе, её называют «вечерней звездой».',
      'Один венерианский год (225 суток) короче венерианских суток (243 суток).',
    ],
    orbit: {
      aAu: 0.72333199,
      e: 0.00677323,
      iDeg: 3.39471,
      nodeDeg: 76.68069,
      argPeriDeg: 54.92263,
      meanAnomalyDeg: 50.37662,
      periodDays: 224.701,
    },
    texture: '/textures/venus.jpg',
    bumpMap: '/textures/venus_bump.jpg',
    color: '#e8cda2',
    atmosphereColor: '#ffd9a0',
    atmosphereStrength: 0.65,
    extra: [
      { label: 'Давление на поверхности', value: '92 бар' },
      { label: 'Количество вулканов', value: 'Более 1 600 крупных' },
      { label: 'Облачный слой', value: '50–70 км, капли серной кислоты' },
      { label: 'Период вращения', value: '243,02 суток (обратное)' },
      { label: 'Спутники', value: 'Нет' },
    ],
    searchTerms: ['венера', 'venus', 'планета'],
  },

  // -------------------------------------------------------------------- Земля
  {
    id: 'earth',
    name: 'Земля',
    nameEn: 'Earth',
    kind: 'planet',
    radiusKm: 6371.0,
    massKg: 5.9722e24,
    gravityMs2: 9.807,
    albedo: 0.306,
    rotationHours: 23.9345,
    axialTiltDeg: 23.44,
    meanTempC: 15,
    atmosphere: '78,08% N₂, 20,95% O₂, 0,93% Ar, 0,04% CO₂; давление 1 атм',
    composition: '71% поверхности — океаны; материки из гранита и базальта; железно-никелевое ядро',
    description:
      'Единственная известная планета с жидкой водой на поверхности и жизнью. Магнитное поле и атмосфера защищают поверхность от солнечного ветра.',
    facts: [
      'Земля — самая плотная планета Солнечной системы: 5,51 г/см³.',
      'Магнитное поле Земли отклоняет солнечный ветер, создавая полярные сияния.',
      'Ось вращения наклонена на 23,44°, поэтому происходит смена времён года.',
      'Луна стабилизирует наклон оси Земли и замедляет её вращение.',
    ],
    orbit: {
      aAu: 1.00000011,
      e: 0.01671022,
      iDeg: 0.00005,
      nodeDeg: 0.0,
      argPeriDeg: 102.93768,
      meanAnomalyDeg: -2.47302,
      periodDays: 365.256,
    },
    texture: '/textures/earth_day.jpg',
    normalMap: '/textures/earth_normal.jpg',
    specularMap: '/textures/earth_specular.jpg',
    nightMap: '/textures/earth_night.png',
    cloudMap: '/textures/earth_clouds.png',
    color: '#4f8fd6',
    atmosphereColor: '#4c9dff',
    atmosphereStrength: 1.0,
    extra: [
      { label: 'Площадь поверхности', value: '510 млн км²' },
      { label: 'Объём океанов', value: '≈ 1,335 млрд км³' },
      { label: 'Магнитное поле', value: '25–65 мкТл на поверхности' },
      { label: 'Скорость обращения', value: '29,78 км/с' },
      { label: 'Спутники', value: '1 — Луна' },
    ],
    searchTerms: ['земля', 'earth', 'терра', 'планета', 'дом'],
  },

  // --------------------------------------------------------------------- Луна
  {
    id: 'moon',
    name: 'Луна',
    nameEn: 'Moon',
    kind: 'moon',
    parentId: 'earth',
    radiusKm: 1737.4,
    massKg: 7.342e22,
    gravityMs2: 1.62,
    albedo: 0.12,
    rotationHours: 655.72,
    axialTiltDeg: 6.68,
    meanTempC: -20,
    atmosphere: 'Практически отсутствует (экзосфера: He, Ne, Ar, Na, K); давление ~3 × 10⁻¹⁵ бар',
    composition: 'Силикатная кора с базальтовыми морями, мантия, небольшое железное ядро',
    description:
      'Естественный спутник Земли и пятый по величине в Солнечной системе. Она синхронно вращается, поэтому с Земли видна только одна сторона.',
    facts: [
      'Луна удаляется от Земли примерно на 3,8 см в год.',
      'Тёмные «моря» — это застывшие базальтовые лавовые равнины.',
      'На Луне нет атмосферы, поэтому следы астронавтов сохраняются миллионы лет.',
      'Лунная гравитация вызывает приливы и отливы на Земле.',
    ],
    moonOrbit: { distanceKm: 384_400, periodDays: 27.3217, inclinationDeg: 5.145, phaseDeg: 40 },
    texture: '/textures/moon.jpg',
    bumpMap: '/textures/moon_bump.jpg',
    color: '#c9c6c1',
    extra: [
      { label: 'Родительское тело', value: 'Земля' },
      { label: 'Орбитальный период', value: '27,32 суток' },
      { label: 'Приливная синхронизация', value: 'Да — видна одна сторона' },
      { label: 'Удаление от Земли', value: '≈ 3,8 см/год' },
    ],
    searchTerms: ['луна', 'moon', 'спутник', 'земля'],
  },

  // --------------------------------------------------------------------- Марс
  {
    id: 'mars',
    name: 'Марс',
    nameEn: 'Mars',
    kind: 'planet',
    radiusKm: 3389.5,
    massKg: 6.4171e23,
    gravityMs2: 3.721,
    albedo: 0.25,
    rotationHours: 24.6229,
    axialTiltDeg: 25.19,
    meanTempC: -63,
    atmosphere: '95,3% CO₂, 2,7% N₂, 1,6% Ar; давление ≈ 0,006 бар',
    composition: 'Базальтовая кора, оксиды железа (ржавый цвет), полярные шапки из воды и CO₂',
    description:
      'Холодная пустынная планета с крупнейшим вулканом Солнечной системы и гигантским каньоном. Здесь работают марсоходы и орбитальные аппараты.',
    facts: [
      'Олимп — вулкан высотой около 21,9 км, почти в 2,5 раза выше Эвереста.',
      'Долины Маринер тянутся на 4 000 км и местами достигают 7 км в глубину.',
      'Атмосфера Марса на 95% состоит из углекислого газа, но она очень разрежена.',
      'На Марсе есть полярные шапки из водяного льда и замёрзшего CO₂.',
    ],
    orbit: {
      aAu: 1.52366231,
      e: 0.09341233,
      iDeg: 1.85061,
      nodeDeg: 49.57854,
      argPeriDeg: 286.49683,
      meanAnomalyDeg: 19.38709,
      periodDays: 686.98,
    },
    texture: '/textures/mars.jpg',
    bumpMap: '/textures/mars_bump.jpg',
    color: '#c96845',
    atmosphereColor: '#e2a37a',
    atmosphereStrength: 0.22,
    extra: [
      { label: 'Высочайшая вершина', value: 'Олимп, ≈ 21,9 км' },
      { label: 'Крупнейший каньон', value: 'Долины Маринер, ≈ 4 000 км' },
      { label: 'Спутники', value: 'Фобос и Деймос' },
      { label: 'Период солнечных суток', value: '24 ч 39 мин' },
    ],
    searchTerms: ['марс', 'mars', 'красная планета', 'планета'],
  },

  {
    id: 'phobos',
    name: 'Фобос',
    nameEn: 'Phobos',
    kind: 'moon',
    parentId: 'mars',
    radiusKm: 11.27,
    massKg: 1.0659e16,
    gravityMs2: 0.0057,
    albedo: 0.071,
    rotationHours: 7.65,
    meanTempC: -40,
    atmosphere: 'Отсутствует',
    composition: 'Углеродистый хондритоподобный материал, покрытый кратерами и бороздами',
    description:
      'Крупнейший и ближайший к Марсу спутник. Он обращается быстрее, чем вращается Марс, поэтому восходит на западе и садится на востоке.',
    facts: [
      'Фобос приближается к Марсу примерно на 1,8 см в год и через десятки миллионов лет может разрушиться.',
      'Кратер Стикни диаметром около 9 км — почти половина диаметра самого Фобоса.',
      'Орбитальный период — всего 7 часов 39 минут.',
    ],
    moonOrbit: { distanceKm: 9_376, periodDays: 0.31891, inclinationDeg: 1.08, phaseDeg: 120 },
    texture: '/textures/moon_phobos.jpg',
    color: '#7a6d60',
    extra: [
      { label: 'Родительское тело', value: 'Марс' },
      { label: 'Орбитальный период', value: '7 ч 39 мин' },
      { label: 'Размеры', value: '27 × 22 × 18 км' },
      { label: 'Приближение к Марсу', value: '≈ 1,8 см/год' },
    ],
    searchTerms: ['фобос', 'phobos', 'спутник марса'],
  },
  {
    id: 'deimos',
    name: 'Деймос',
    nameEn: 'Deimos',
    kind: 'moon',
    parentId: 'mars',
    radiusKm: 6.2,
    massKg: 1.4762e15,
    gravityMs2: 0.003,
    albedo: 0.068,
    rotationHours: 30.3,
    meanTempC: -40,
    atmosphere: 'Отсутствует',
    composition: 'Скалистое тело, вероятно захваченный астероид; поверхность сглажена реголитом',
    description:
      'Меньший и более далёкий спутник Марса. Из-за низкой гравитации его поверхность покрыта толстым слоем пыли, скрывающим кратеры.',
    facts: [
      'Деймос настолько мал, что на Марсе выглядит как яркая звезда, а не как диск.',
      'Его орбитальный период — 30 часов 18 минут.',
      'Спутник, вероятно, является захваченным астероидом.',
    ],
    moonOrbit: { distanceKm: 23_463, periodDays: 1.263, inclinationDeg: 1.79, phaseDeg: 300 },
    texture: '/textures/moon_deimos.jpg',
    color: '#8b7f72',
    extra: [
      { label: 'Родительское тело', value: 'Марс' },
      { label: 'Орбитальный период', value: '30 ч 18 мин' },
      { label: 'Размеры', value: '15 × 12 × 11 км' },
    ],
    searchTerms: ['деймос', 'deimos', 'спутник марса'],
  },

  // ------------------------------------------------------------------ Юпитер
  {
    id: 'jupiter',
    name: 'Юпитер',
    nameEn: 'Jupiter',
    kind: 'planet',
    radiusKm: 69_911,
    massKg: 1.8982e27,
    gravityMs2: 24.79,
    albedo: 0.503,
    rotationHours: 9.925,
    axialTiltDeg: 3.13,
    meanTempC: -110,
    atmosphere: '89,8% H₂, 10,2% He, следы CH₄, NH₃, водяного пара; полосы облаков',
    composition: 'Газообразный водород и гелий, металлический водород, возможно каменное ядро',
    description:
      'Крупнейшая планета Солнечной системы — газовый гигант с мощной магнитосферой и Большим красным пятном, гигантским атмосферным вихрем.',
    facts: [
      'Масса Юпитера в 2,5 раза больше массы всех остальных планет вместе взятых.',
      'Большое красное пятно — антициклон шириной больше Земли, наблюдаемый не менее 190 лет.',
      'Юпитер вращается быстрее всех планет: сутки длятся 9 ч 55 мин.',
      'У Юпитера 95 подтверждённых спутников; четыре крупнейших открыл Галилей в 1610 году.',
    ],
    orbit: {
      aAu: 5.20336301,
      e: 0.04839266,
      iDeg: 1.3053,
      nodeDeg: 100.55615,
      argPeriDeg: -85.74525,
      meanAnomalyDeg: 19.66796,
      periodDays: 4332.589,
    },
    texture: '/textures/jupiter.jpg',
    color: '#d8b48b',
    atmosphereColor: '#e8cda6',
    atmosphereStrength: 0.3,
    extra: [
      { label: 'Спутники', value: '95 подтверждённых' },
      { label: 'Галилеевы спутники', value: 'Ио, Европа, Ганимед, Каллисто' },
      { label: 'Магнитосфера', value: 'Сильнейшая в Солнечной системе' },
      { label: 'Кольцевая система', value: 'Слабое пылевое кольцо' },
    ],
    searchTerms: ['юпитер', 'jupiter', 'газовый гигант', 'планета'],
  },

  {
    id: 'io',
    name: 'Ио',
    nameEn: 'Io',
    kind: 'moon',
    parentId: 'jupiter',
    radiusKm: 1821.6,
    massKg: 8.9319e22,
    gravityMs2: 1.796,
    albedo: 0.63,
    rotationHours: 42.46,
    meanTempC: -143,
    atmosphere: 'Крайне разреженная SO₂',
    composition: 'Силикатная кора, сотни активных вулканов, серные и солевые отложения',
    description:
      'Самый вулканически активный объект Солнечной системы. Приливные силы Юпитера разогревают недра Ио, вызывая извержения высотой в сотни километров.',
    facts: [
      'На Ио более 400 действующих вулканов.',
      'Приливные силы Юпитера деформируют поверхность Ио с амплитудой до 100 метров.',
      'Сернистые соединения придают поверхности жёлто-оранжевые оттенки.',
    ],
    moonOrbit: { distanceKm: 421_700, periodDays: 1.769, inclinationDeg: 0.05, phaseDeg: 15 },
    texture: '/textures/moon_io.jpg',
    color: '#d8c05a',
    extra: [
      { label: 'Родительское тело', value: 'Юпитер' },
      { label: 'Орбитальный период', value: '1,77 суток' },
      { label: 'Вулканов', value: 'Более 400' },
      { label: 'Приливная синхронизация', value: 'Да' },
    ],
    searchTerms: ['ио', 'io', 'спутник юпитера', 'вулкан'],
  },
  {
    id: 'europa',
    name: 'Европа',
    nameEn: 'Europa',
    kind: 'moon',
    parentId: 'jupiter',
    radiusKm: 1560.8,
    massKg: 4.7998e22,
    gravityMs2: 1.314,
    albedo: 0.67,
    rotationHours: 85.23,
    meanTempC: -171,
    atmosphere: 'Крайне разреженная O₂',
    composition: 'Ледяная кора (10–30 км), под которой, вероятно, глобальный солёный океан',
    description:
      'Один из главных кандидатов на наличие жизни за пределами Земли. Под ледяной корой Европы скрывается океан жидкой воды глубиной до 100 км.',
    facts: [
      'Океан Европы может содержать в два раза больше воды, чем все океаны Земли.',
      'Поверхность Европы — самый гладкий твёрдый объект Солнечной системы.',
      'Коричневые полосы на льду, возможно, имеют солевое или серное происхождение.',
      'Планируется миссия Europa Clipper для исследования спутника.',
    ],
    moonOrbit: { distanceKm: 671_034, periodDays: 3.551, inclinationDeg: 0.47, phaseDeg: 92 },
    texture: '/textures/moon_europa.jpg',
    color: '#d9cfc0',
    extra: [
      { label: 'Родительское тело', value: 'Юпитер' },
      { label: 'Орбитальный период', value: '3,55 суток' },
      { label: 'Подлёдный океан', value: 'Вероятно, глубиной до 100 км' },
      { label: 'Поверхность', value: 'Водяной лёд, ≈ 150 млн лет' },
    ],
    searchTerms: ['европа', 'europa', 'спутник юпитера', 'океан'],
  },
  {
    id: 'ganymede',
    name: 'Ганимед',
    nameEn: 'Ganymede',
    kind: 'moon',
    parentId: 'jupiter',
    radiusKm: 2634.1,
    massKg: 1.4819e23,
    gravityMs2: 1.428,
    albedo: 0.43,
    rotationHours: 171.7,
    meanTempC: -163,
    atmosphere: 'Разреженная кислородная экзосфера',
    composition: 'Силикатные породы, водяной лёд, солёный океан под корой, железное ядро',
    description:
      'Крупнейший спутник в Солнечной системе — больше Меркурия. Единственный спутник, у которого есть собственное магнитное поле.',
    facts: [
      'Диаметр Ганимеда — 5 268 км, он крупнее Меркурия.',
      'Ганимед обладает собственным магнитным полем и полярными сияниями.',
      'Под ледяной корой может находиться солёный океан.',
    ],
    moonOrbit: { distanceKm: 1_070_412, periodDays: 7.155, inclinationDeg: 0.2, phaseDeg: 210 },
    texture: '/textures/moon_ganymede.jpg',
    color: '#9a8b7b',
    extra: [
      { label: 'Родительское тело', value: 'Юпитер' },
      { label: 'Орбитальный период', value: '7,15 суток' },
      { label: 'Размер', value: 'Крупнейший спутник Солнечной системы' },
      { label: 'Магнитное поле', value: 'Собственное, уникально для спутника' },
    ],
    searchTerms: ['ганим', 'ganymede', 'спутник юпитера'],
  },
  {
    id: 'callisto',
    name: 'Каллисто',
    nameEn: 'Callisto',
    kind: 'moon',
    parentId: 'jupiter',
    radiusKm: 2410.3,
    massKg: 1.0759e23,
    gravityMs2: 1.235,
    albedo: 0.22,
    rotationHours: 400.54,
    meanTempC: -163,
    atmosphere: 'Крайне разреженная CO₂',
    composition: 'Тёмная ледяно-каменная поверхность, насыщенная кратерами; возможный подлёдный океан',
    description:
      'Один из самых кратерированных объектов Солнечной системы. Его поверхность возрастом около 4 млрд лет почти не изменилась за это время.',
    facts: [
      'Каллисто — самый внешний из галилеевых спутников Юпитера.',
      'Его поверхность — древнейший ландшафт в Солнечной системе.',
      'Каллисто находится за пределами основного радиационного пояса Юпитера, что важно для будущих миссий.',
    ],
    moonOrbit: { distanceKm: 1_882_709, periodDays: 16.689, inclinationDeg: 0.192, phaseDeg: 330 },
    texture: '/textures/moon_callisto.jpg',
    color: '#6b5d50',
    extra: [
      { label: 'Родительское тело', value: 'Юпитер' },
      { label: 'Орбитальный период', value: '16,69 суток' },
      { label: 'Возраст поверхности', value: '≈ 4 млрд лет' },
      { label: 'Приливная синхронизация', value: 'Да' },
    ],
    searchTerms: ['каллисто', 'callisto', 'спутник юпитера'],
  },

  // ------------------------------------------------------------------ Сатурн
  {
    id: 'saturn',
    name: 'Сатурн',
    nameEn: 'Saturn',
    kind: 'planet',
    radiusKm: 58_232,
    massKg: 5.6834e26,
    gravityMs2: 10.44,
    albedo: 0.342,
    rotationHours: 10.656,
    axialTiltDeg: 26.73,
    meanTempC: -140,
    atmosphere: '96,3% H₂, 3,25% He, CH₄, NH₃; полосы облаков и гексагональный вихрь',
    composition: 'Газовый гигант преимущественно из водорода и гелия; средняя плотность 0,687 г/см³',
    description:
      'Планета с самой яркой и сложной кольцевой системой. Плотность Сатурна ниже плотности воды — он мог бы плавать в достаточно большом океане.',
    facts: [
      'Кольца Сатурна простираются на 280 000 км, но их толщина местами всего 10–100 метров.',
      'Средняя плотность Сатурна — 0,687 г/см³, меньше плотности воды.',
      'На северном полюсе существует стабильный шестиугольный вихрь шириной около 30 000 км.',
      'У Сатурна 274 подтверждённых спутника — больше, чем у любой другой планеты (данные 2025 года).',
    ],
    orbit: {
      aAu: 9.53707032,
      e: 0.0541506,
      iDeg: 2.48446,
      nodeDeg: 113.71504,
      argPeriDeg: -21.06337,
      meanAnomalyDeg: -42.64466,
      periodDays: 10_759.22,
    },
    texture: '/textures/saturn.jpg',
    ring: { texture: '/textures/saturn_ring.png', innerRadius: 1.2, outerRadius: 2.33, opacity: 0.95 },
    color: '#e3c88f',
    atmosphereColor: '#f0d9a8',
    atmosphereStrength: 0.34,
    extra: [
      { label: 'Спутники', value: '274 подтверждённых (2025)' },
      { label: 'Размах колец', value: '≈ 280 000 км' },
      { label: 'Толщина колец', value: '10–100 м в некоторых участках' },
      { label: 'Средняя плотность', value: '0,687 г/см³' },
    ],
    searchTerms: ['сатурн', 'saturn', 'кольца', 'газовый гигант'],
  },

  {
    id: 'mimas',
    name: 'Мимас',
    nameEn: 'Mimas',
    kind: 'moon',
    parentId: 'saturn',
    radiusKm: 198.2,
    massKg: 3.7493e19,
    gravityMs2: 0.064,
    albedo: 0.962,
    rotationHours: 22.61,
    meanTempC: -200,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд с примесью горных пород; гигантский кратер Гершель',
    description:
      'Небольшой ледяной спутник Сатурна, известный кратером Гершель диаметром 139 км — около трети диаметра Мимаса.',
    facts: [
      'Кратер Гершель — один из крупнейших известных ударных кратеров относительно размера тела.',
      'Из-за кратера Мимас напоминает «Звезду Смерти».',
      'Мимас может содержать внутренний океан жидкой воды.',
    ],
    moonOrbit: { distanceKm: 185_539, periodDays: 0.942, inclinationDeg: 1.574, phaseDeg: 70 },
    texture: '/textures/moon_mimas.jpg',
    color: '#c4c0b8',
    extra: [
      { label: 'Родительское тело', value: 'Сатурн' },
      { label: 'Орбитальный период', value: '22 ч 37 мин' },
      { label: 'Кратер Гершель', value: '⌀ 139 км' },
    ],
    searchTerms: ['мимас', 'mimas', 'спутник сатурна'],
  },
  {
    id: 'enceladus',
    name: 'Энцелад',
    nameEn: 'Enceladus',
    kind: 'moon',
    parentId: 'saturn',
    radiusKm: 252.1,
    massKg: 1.08e20,
    gravityMs2: 0.113,
    albedo: 0.99,
    rotationHours: 32.89,
    meanTempC: -198,
    atmosphere: 'Локальные выбросы водяного пара над южным полюсом',
    composition: 'Водяной лёд, солёный подлёдный океан, гейзеры с кремнием и органикой',
    description:
      'Ледяной спутник с активными гейзерами. Выбросы из трещин «тигровых полос» питают кольцо E Сатурна.',
    facts: [
      'Гейзеры Энцелада выбрасывают водяной пар на сотни километров.',
      'Под южным полюсом находится солёный океан, контактирующий с каменным ядром.',
      'Энцелад отражает около 99% падающего солнечного света — один из самых ярких объектов.',
    ],
    moonOrbit: { distanceKm: 238_020, periodDays: 1.37, inclinationDeg: 0.009, phaseDeg: 160 },
    texture: '/textures/moon_enceladus.jpg',
    color: '#e8eef2',
    extra: [
      { label: 'Родительское тело', value: 'Сатурн' },
      { label: 'Орбитальный период', value: '1,37 суток' },
      { label: 'Активность', value: 'Гейзеры водяного пара' },
      { label: 'Альбедо', value: '≈ 0,99' },
    ],
    searchTerms: ['энцелад', 'enceladus', 'спутник сатурна', 'гейзеры'],
  },
  {
    id: 'rhea',
    name: 'Рея',
    nameEn: 'Rhea',
    kind: 'moon',
    parentId: 'saturn',
    radiusKm: 763.8,
    massKg: 2.3065e21,
    gravityMs2: 0.264,
    albedo: 0.949,
    rotationHours: 108.43,
    meanTempC: -174,
    atmosphere: 'Разреженная кислородно-углекислотная экзосфера',
    composition: 'В основном водяной лёд, покрытый кратерами',
    description:
      'Второй по величине спутник Сатурна. Его поверхность — древний ледяной ландшафт с многочисленными кратерами.',
    facts: [
      'Рея — второй по размеру спутник Сатурна после Титана.',
      'У Реи есть тонкая экзосфера из кислорода и углекислого газа.',
      'Поверхность состоит преимущественно из водяного льда.',
    ],
    moonOrbit: { distanceKm: 527_108, periodDays: 4.518, inclinationDeg: 0.345, phaseDeg: 250 },
    texture: '/textures/moon_rhea.jpg',
    color: '#b8b3ac',
    extra: [
      { label: 'Родительское тело', value: 'Сатурн' },
      { label: 'Орбитальный период', value: '4,52 суток' },
      { label: 'Поверхность', value: 'Водяной лёд, кратеры' },
    ],
    searchTerms: ['рея', 'rhea', 'спутник сатурна'],
  },
  {
    id: 'titan',
    name: 'Титан',
    nameEn: 'Titan',
    kind: 'moon',
    parentId: 'saturn',
    radiusKm: 2574.7,
    massKg: 1.3452e23,
    gravityMs2: 1.352,
    albedo: 0.22,
    rotationHours: 382.68,
    meanTempC: -179,
    atmosphere: '98% N₂, 1,4% CH₄, водород; давление 1,45 бар',
    composition: 'Ледяная кора, метановые озёра и моря, подповерхностный океан',
    description:
      'Крупнейший спутник Сатурна и единственный спутник с плотной атмосферой. Здесь идут метановые дожди и существуют моря жидких углеводородов.',
    facts: [
      'Титан — единственное, кроме Земли, тело с озёрами и морями на поверхности.',
      'Его атмосфера плотнее земной и состоит в основном из азота.',
      'В 2005 году аппарат «Гюйгенс» совершил посадку на Титан.',
      'Под ледяной корой Титана предполагается океан жидкой воды.',
    ],
    moonOrbit: { distanceKm: 1_221_870, periodDays: 15.945, inclinationDeg: 0.35, phaseDeg: 20 },
    texture: '/textures/moon_titan.jpg',
    color: '#d9a45b',
    atmosphereColor: '#e0a04a',
    atmosphereStrength: 0.8,
    extra: [
      { label: 'Родительское тело', value: 'Сатурн' },
      { label: 'Орбитальный период', value: '15,95 суток' },
      { label: 'Атмосферное давление', value: '1,45 бар' },
      { label: 'Поверхность', value: 'Метановые озёра и моря' },
    ],
    searchTerms: ['титан', 'titan', 'спутник сатурна', 'атмосфера'],
  },
  {
    id: 'iapetus',
    name: 'Япет',
    nameEn: 'Iapetus',
    kind: 'moon',
    parentId: 'saturn',
    radiusKm: 734.5,
    massKg: 1.8056e21,
    gravityMs2: 0.223,
    albedo: 0.25,
    rotationHours: 1903.7,
    meanTempC: -143,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд; контрастные тёмные и светлые области, горный хребет на экваторе',
    description:
      'Спутник с загадочным двухцветным ландшафтом: одно полушарие почти чёрное, другое — ярко-белое. По экватору тянется гигантский горный хребет.',
    facts: [
      'Одно полушарие Япета отражает свет в 10 раз сильнее другого.',
      'Экваториальный хребет высотой до 20 км опоясывает почти весь спутник.',
      'Из-за приливной синхронизации Япет всегда повёрнут к Сатурну одной стороной.',
    ],
    moonOrbit: { distanceKm: 3_560_820, periodDays: 79.32, inclinationDeg: 15.47, phaseDeg: 280 },
    texture: '/textures/moon_iapetus.jpg',
    color: '#8a7a62',
    extra: [
      { label: 'Родительское тело', value: 'Сатурн' },
      { label: 'Орбитальный период', value: '79,3 суток' },
      { label: 'Экваториальный хребет', value: 'Высота до 20 км' },
    ],
    searchTerms: ['япет', 'iapetus', 'спутник сатурна'],
  },

  // ------------------------------------------------------------------ Уран
  {
    id: 'uranus',
    name: 'Уран',
    nameEn: 'Uranus',
    kind: 'planet',
    radiusKm: 25_362,
    massKg: 8.681e25,
    gravityMs2: 8.87,
    albedo: 0.3,
    rotationHours: -17.24,
    axialTiltDeg: 97.77,
    meanTempC: -195,
    atmosphere: '82,5% H₂, 15,2% He, 2,3% CH₄; метан придаёт голубой цвет',
    composition: 'Ледяной гигант: водяной, аммиачный и метановый льды над каменным ядром',
    description:
      'Ледяной гигант, ось которого наклонена почти на 98° — планета вращается «на боку», а полюса поочерёдно смотрят на Солнце.',
    facts: [
      'Уран вращается вокруг оси, лежащей почти в плоскости орбиты.',
      'Самый холодный объект Солнечной системы, измеренный в атмосфере, — Уран: около −224 °C.',
      'У Урана 28 спутников и слабая система тёмных колец.',
      'Уран был открыт Уильямом Гершелем в 1781 году — первая планета, обнаруженная с помощью телескопа.',
    ],
    orbit: {
      aAu: 19.19126393,
      e: 0.04716771,
      iDeg: 0.76986,
      nodeDeg: 74.22988,
      argPeriDeg: 96.73455,
      meanAnomalyDeg: 142.26754,
      periodDays: 30_688.5,
    },
    texture: '/textures/uranus.jpg',
    ring: { texture: '/textures/uranus_ring.png', innerRadius: 1.45, outerRadius: 2.05, opacity: 0.55 },
    color: '#9fd8dd',
    atmosphereColor: '#a8e6ec',
    atmosphereStrength: 0.4,
    extra: [
      { label: 'Наклон оси', value: '97,77°' },
      { label: 'Спутники', value: '28 подтверждённых' },
      { label: 'Кольца', value: '13 узких тёмных колец' },
      { label: 'Открыт', value: '1781, Уильям Гершель' },
    ],
    searchTerms: ['уран', 'uranus', 'ледяной гигант'],
  },

  {
    id: 'miranda',
    name: 'Миранда',
    nameEn: 'Miranda',
    kind: 'moon',
    parentId: 'uranus',
    radiusKm: 235.8,
    massKg: 6.59e19,
    gravityMs2: 0.079,
    albedo: 0.32,
    rotationHours: 33.92,
    meanTempC: -187,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд и силикатные породы; хаотичный рельеф с каньонами',
    description:
      'Небольшой спутник Урана с одним из самых сложных рельефов: обрывы высотой до 20 км, «короны» и хаотичные трещины.',
    facts: [
      'Обрыв Верона на Миранде достигает 20 км в высоту.',
      'Рельеф Миранды выглядит мозаикой из разных эпох геологической активности.',
      'Спутник открыт в 1948 году Джерардом Койпером.',
    ],
    moonOrbit: { distanceKm: 129_390, periodDays: 1.413, inclinationDeg: 4.232, phaseDeg: 45 },
    texture: '/textures/moon_miranda.jpg',
    color: '#a8a5a0',
    extra: [
      { label: 'Родительское тело', value: 'Уран' },
      { label: 'Орбитальный период', value: '1,41 суток' },
      { label: 'Обрыв Верона', value: 'До 20 км' },
    ],
    searchTerms: ['миранда', 'miranda', 'спутник урана'],
  },
  {
    id: 'ariel',
    name: 'Ариэль',
    nameEn: 'Ariel',
    kind: 'moon',
    parentId: 'uranus',
    radiusKm: 578.9,
    massKg: 1.251e21,
    gravityMs2: 0.269,
    albedo: 0.53,
    rotationHours: 60.48,
    meanTempC: -213,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд с примесью CO₂; молодые каньоны и ударные кратеры',
    description:
      'Самый яркий и, вероятно, самый молодой по поверхности спутник Урана. Его пересекают длинные системы каньонов.',
    facts: [
      'Ариэль отражает больше света, чем другие крупные спутники Урана.',
      'Поверхность Ариэля сравнительно молода — возможны криовулканические процессы.',
      'Спутник открыт Уильямом Ласселлом в 1851 году.',
    ],
    moonOrbit: { distanceKm: 190_900, periodDays: 2.52, inclinationDeg: 0.26, phaseDeg: 150 },
    texture: '/textures/moon_ariel.jpg',
    color: '#b9b6b1',
    extra: [
      { label: 'Родительское тело', value: 'Уран' },
      { label: 'Орбитальный период', value: '2,52 суток' },
      { label: 'Альбедо', value: '0,53' },
    ],
    searchTerms: ['ариэль', 'ariel', 'спутник урана'],
  },
  {
    id: 'titania',
    name: 'Титания',
    nameEn: 'Titania',
    kind: 'moon',
    parentId: 'uranus',
    radiusKm: 788.4,
    massKg: 3.4e21,
    gravityMs2: 0.367,
    albedo: 0.35,
    rotationHours: 208.95,
    meanTempC: -203,
    atmosphere: 'Возможно, разреженная CO₂',
    composition: 'Водяной лёд и горные породы; каньоны и кратеры',
    description:
      'Крупнейший спутник Урана. Его ледяная поверхность покрыта кратерами и глубокими тектоническими разломами.',
    facts: [
      'Титания — крупнейший спутник Урана, диаметр около 1 577 км.',
      'Каньоны на Титании тянутся на сотни километров.',
      'Спутник открыт Уильямом Гершелем в 1787 году.',
    ],
    moonOrbit: { distanceKm: 435_910, periodDays: 8.706, inclinationDeg: 0.34, phaseDeg: 215 },
    texture: '/textures/moon_titania.jpg',
    color: '#a89f96',
    extra: [
      { label: 'Родительское тело', value: 'Уран' },
      { label: 'Орбитальный период', value: '8,71 суток' },
      { label: 'Крупнейший спутник', value: 'Урана' },
    ],
    searchTerms: ['титания', 'titania', 'спутник урана'],
  },
  {
    id: 'oberon',
    name: 'Оберон',
    nameEn: 'Oberon',
    kind: 'moon',
    parentId: 'uranus',
    radiusKm: 761.4,
    massKg: 3.076e21,
    gravityMs2: 0.346,
    albedo: 0.31,
    rotationHours: 323.12,
    meanTempC: -203,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд и горные породы, тёмная поверхность с кратерами',
    description:
      'Самый внешний из крупных спутников Урана. Его тёмная поверхность несёт следы древних ударов и тектоники.',
    facts: [
      'Оберон — самый далёкий крупный спутник Урана.',
      'На его поверхности есть кратеры с тёмными днищами.',
      'Спутник открыт Уильямом Гершелем в 1787 году.',
    ],
    moonOrbit: { distanceKm: 583_520, periodDays: 13.463, inclinationDeg: 0.058, phaseDeg: 300 },
    texture: '/textures/moon_oberon.jpg',
    color: '#8e8378',
    extra: [
      { label: 'Родительское тело', value: 'Уран' },
      { label: 'Орбитальный период', value: '13,46 суток' },
      { label: 'Поверхность', value: 'Тёмная, древняя, кратерированная' },
    ],
    searchTerms: ['оберон', 'oberon', 'спутник урана'],
  },

  // ----------------------------------------------------------------- Нептун
  {
    id: 'neptune',
    name: 'Нептун',
    nameEn: 'Neptune',
    kind: 'planet',
    radiusKm: 24_622,
    massKg: 1.02413e26,
    gravityMs2: 11.15,
    albedo: 0.29,
    rotationHours: 16.11,
    axialTiltDeg: 28.32,
    meanTempC: -200,
    atmosphere: '80% H₂, 19% He, 1,5% CH₄; самые быстрые ветры в Солнечной системе',
    composition: 'Ледяной гигант: водяной, метановый и аммиачный льды, каменное ядро',
    description:
      'Самая далёкая планета Солнечной системы и один из самых ветреных миров: скорость ветра достигает 2 100 км/ч.',
    facts: [
      'Нептун был открыт в 1846 году по математическим расчётам, а затем найден в телескоп.',
      'Ветры Нептуна достигают 2 100 км/ч.',
      'Крупнейший спутник Тритон движется по обратной орбите и, вероятно, захвачен из пояса Койпера.',
      'Нептун завершает один оборот вокруг Солнца за 164,8 земных года.',
    ],
    orbit: {
      aAu: 30.06896348,
      e: 0.00858587,
      iDeg: 1.76917,
      nodeDeg: 131.72169,
      argPeriDeg: -86.81956,
      meanAnomalyDeg: -100.04183,
      periodDays: 60_182,
    },
    texture: '/textures/neptune.jpg',
    color: '#5a7ee0',
    atmosphereColor: '#6b9aff',
    atmosphereStrength: 0.45,
    extra: [
      { label: 'Спутники', value: '16 подтверждённых' },
      { label: 'Скорость ветра', value: 'До 2 100 км/ч' },
      { label: 'Открыт', value: '1846, Иоганн Галле и Генрих д’Арре' },
      { label: 'Год', value: '164,8 земных лет' },
    ],
    searchTerms: ['нептун', 'neptune', 'ледяной гигант'],
  },

  {
    id: 'triton',
    name: 'Тритон',
    nameEn: 'Triton',
    kind: 'moon',
    parentId: 'neptune',
    radiusKm: 1353.4,
    massKg: 2.139e22,
    gravityMs2: 0.779,
    albedo: 0.76,
    rotationHours: 141.05,
    meanTempC: -235,
    atmosphere: 'Разреженная N₂ (≈ 1,4 × 10⁻⁵ бар)',
    composition: 'Азотный и водяной лёд, тёмные полосы, азотные гейзеры',
    description:
      'Крупнейший спутник Нептуна, движущийся по обратной орбите. Вероятно, это захваченный объект пояса Койпера с активными азотными гейзерами.',
    facts: [
      'Тритон — единственный большой спутник с обратным движением по орбите.',
      'На Тритоне действуют азотные гейзеры высотой до 8 км.',
      'Поверхность Тритона очень молода — около 10–100 млн лет.',
      'Приливные силы постепенно приближают Тритон к Нептуну.',
    ],
    moonOrbit: { distanceKm: 354_759, periodDays: 5.877, inclinationDeg: 156.885, phaseDeg: 60 },
    texture: '/textures/moon_triton.jpg',
    color: '#d8c8c0',
    extra: [
      { label: 'Родительское тело', value: 'Нептун' },
      { label: 'Орбитальный период', value: '5,88 суток (обратное движение)' },
      { label: 'Гейзеры', value: 'Азотные, высотой до 8 км' },
      { label: 'Происхождение', value: 'Вероятно, захваченный объект пояса Койпера' },
    ],
    searchTerms: ['тритон', 'triton', 'спутник нептуна'],
  },

  // ---------------------------------------------------------- Карликовые планеты
  {
    id: 'ceres',
    name: 'Церера',
    nameEn: 'Ceres',
    kind: 'dwarf',
    radiusKm: 469.5,
    massKg: 9.3835e20,
    gravityMs2: 0.28,
    albedo: 0.09,
    rotationHours: 9.074,
    axialTiltDeg: 4,
    meanTempC: -105,
    atmosphere: 'Возможно, разреженный водяной пар',
    composition: 'Водяной лёд, глинистые минералы, карбонаты; каменное ядро',
    description:
      'Крупнейшее тело пояса астероидов и единственная карликовая планета во внутренней Солнечной системе. Содержит около трети массы всего пояса.',
    facts: [
      'Церера содержит примерно треть всей массы пояса астероидов.',
      'Яркие пятна в кратере Оккатор — вероятно, карбонаты натрия.',
      'Миссия Dawn исследовала Цереру с 2015 по 2018 год.',
      'Церера открыта Джузеппе Пиацци в 1801 году и сначала считалась планетой.',
    ],
    orbit: {
      aAu: 2.7675,
      e: 0.0758,
      iDeg: 10.594,
      nodeDeg: 80.305,
      argPeriDeg: 73.597,
      meanAnomalyDeg: 95.99,
      periodDays: 1681.6,
    },
    texture: '/textures/dwarf_ceres.jpg',
    color: '#9a958d',
    approxOrbit: true,
    extra: [
      { label: 'Пояс', value: 'Главный пояс астероидов' },
      { label: 'Открыта', value: '1801, Джузеппе Пиацци' },
      { label: 'Доля массы пояса', value: '≈ 33%' },
      { label: 'Спутники', value: 'Нет' },
    ],
    searchTerms: ['церера', 'ceres', 'карликовая планета', 'астероид'],
  },
  {
    id: 'pluto',
    name: 'Плутон',
    nameEn: 'Pluto',
    kind: 'dwarf',
    radiusKm: 1188.3,
    massKg: 1.303e22,
    gravityMs2: 0.62,
    albedo: 0.52,
    rotationHours: 153.29,
    axialTiltDeg: 122.53,
    meanTempC: -229,
    atmosphere: 'Тонкая азотная атмосфера с метаном и CO; давление ≈ 10⁻⁵ бар',
    composition: 'Азотный и метановый лёд, водяной лёд, каменное ядро; «сердце» Спутника',
    description:
      'Карликовая планета пояса Койпера, разжалованная из планет в 2006 году. Миссия New Horizons показала сложный мир с азотными ледниками.',
    facts: [
      'Плутон и Харон образуют двойную систему с общим центром масс вне Плутона.',
      'Регион Спутник в форме сердца — гигантский азотный ледник.',
      'Год на Плутоне длится 248 земных лет.',
      'У Плутона пять известных спутников: Харон, Стикс, Никта, Кербер, Гидра.',
    ],
    orbit: {
      aAu: 39.48211675,
      e: 0.2488273,
      iDeg: 17.14001206,
      nodeDeg: 110.30393684,
      argPeriDeg: 113.76329,
      meanAnomalyDeg: 14.53,
      periodDays: 90_560,
    },
    texture: '/textures/pluto.jpg',
    bumpMap: '/textures/pluto_bump.jpg',
    color: '#c9b7a4',
    approxOrbit: true,
    extra: [
      { label: 'Пояс', value: 'Пояс Койпера' },
      { label: 'Открыт', value: '1930, Клайд Томбо' },
      { label: 'Спутники', value: '5: Харон, Стикс, Никта, Кербер, Гидра' },
      { label: 'Миссия', value: 'New Horizons, пролёт в 2015 году' },
    ],
    searchTerms: ['плутон', 'pluto', 'карликовая планета', 'койпер'],
  },
  {
    id: 'charon',
    name: 'Харон',
    nameEn: 'Charon',
    kind: 'moon',
    parentId: 'pluto',
    radiusKm: 606,
    massKg: 1.586e21,
    gravityMs2: 0.288,
    albedo: 0.38,
    rotationHours: 153.29,
    meanTempC: -220,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд, тёмный кратерный полюс (плато Мордор)',
    description:
      'Крупнейший спутник Плутона, диаметр которого составляет больше половины диаметра самой карликовой планеты.',
    facts: [
      'Харон и Плутон всегда обращены друг к другу одной стороной.',
      'Диаметр Харона — 1 212 км, это половина диаметра Плутона.',
      'На северном полюсе Харона находится тёмная область, неофициально называемая плато Мордор.',
    ],
    moonOrbit: { distanceKm: 19_591, periodDays: 6.387, inclinationDeg: 0.08, phaseDeg: 0 },
    texture: '/textures/moon_charon.jpg',
    color: '#a9a29a',
    extra: [
      { label: 'Родительское тело', value: 'Плутон (двойная система)' },
      { label: 'Орбитальный период', value: '6,39 суток' },
      { label: 'Размер относительно Плутона', value: '≈ 0,51 диаметра' },
    ],
    searchTerms: ['харон', 'charon', 'спутник плутона'],
  },
  {
    id: 'haumea',
    name: 'Хаумеа',
    nameEn: 'Haumea',
    kind: 'dwarf',
    radiusKm: 780,
    massKg: 4.006e21,
    gravityMs2: 0.44,
    albedo: 0.51,
    rotationHours: 3.915,
    meanTempC: -241,
    atmosphere: 'Отсутствует',
    composition: 'Водяной лёд, удлинённая форма из-за быстрого вращения',
    description:
      'Быстровращающаяся карликовая планета пояса Койпера вытянутой формы с двумя спутниками и кристаллическим водяным льдом на поверхности.',
    facts: [
      'Хаумеа вращается быстрее всех крупных объектов Солнечной системы — сутки длятся 3,9 часа.',
      'Из-за быстрого вращения планета вытянута в эллипсоид размерами примерно 2 100 × 1 680 × 1 074 км.',
      'У Хаумеа есть два спутника — Хииака и Намака.',
    ],
    orbit: {
      aAu: 43.13,
      e: 0.195,
      iDeg: 28.19,
      nodeDeg: 122.16,
      argPeriDeg: 239.05,
      meanAnomalyDeg: 218.2,
      periodDays: 103_660,
    },
    texture: '/textures/dwarf_haumea.jpg',
    color: '#c3ccd2',
    approxOrbit: true,
    extra: [
      { label: 'Пояс', value: 'Пояс Койпера' },
      { label: 'Открыта', value: '2004, Майкл Браун и др.' },
      { label: 'Спутники', value: '2: Хииака и Намака' },
      { label: 'Форма', value: 'Эллипсоид из-за быстрого вращения' },
    ],
    searchTerms: ['хаумеа', 'haumea', 'карликовая планета', 'койпер'],
  },
  {
    id: 'makemake',
    name: 'Макемаке',
    nameEn: 'Makemake',
    kind: 'dwarf',
    radiusKm: 715,
    massKg: 3.1e21,
    gravityMs2: 0.5,
    albedo: 0.77,
    rotationHours: 22.83,
    meanTempC: -243,
    atmosphere: 'Возможно, тонкая метановая',
    composition: 'Метановый и водяной лёд, красноватая поверхность',
    description:
      'Карликовая планета пояса Койпера с одним известным спутником. Её поверхность покрыта метановым льдом и имеет красноватый оттенок.',
    facts: [
      'Спутник Макемаке — MK 2 — открыт в 2016 году.',
      'Макемаке относится к классу плутоидов.',
      'Поверхность покрыта метановым льдом, как у Плутона.',
    ],
    orbit: {
      aAu: 45.79,
      e: 0.159,
      iDeg: 28.98,
      nodeDeg: 79.36,
      argPeriDeg: 296.0,
      meanAnomalyDeg: 165.5,
      periodDays: 112_897,
    },
    texture: '/textures/dwarf_makemake.jpg',
    color: '#c6a08a',
    approxOrbit: true,
    extra: [
      { label: 'Пояс', value: 'Пояс Койпера' },
      { label: 'Открыта', value: '2005, Майкл Браун и др.' },
      { label: 'Спутники', value: '1: MK 2' },
    ],
    searchTerms: ['макемаке', 'makemake', 'карликовая планета', 'койпер'],
  },
  {
    id: 'eris',
    name: 'Эрида',
    nameEn: 'Eris',
    kind: 'dwarf',
    radiusKm: 1163,
    massKg: 1.6466e22,
    gravityMs2: 0.82,
    albedo: 0.96,
    rotationHours: 379.2,
    meanTempC: -231,
    atmosphere: 'Возможно, тонкая метановая',
    composition: 'Метановый лёд, каменное ядро; очень высокое альбедо',
    description:
      'Карликовая планета рассеянного диска, открытие которой в 2005 году привело к пересмотру определения планеты и статуса Плутона.',
    facts: [
      'Эрида почти такого же размера, как Плутон, но массивнее его на 27%.',
      'Открытие Эриды стало поводом для определения термина «карликовая планета» в 2006 году.',
      'У Эриды есть спутник Дисномия.',
      'Расстояние от Солнца в афелии превышает 97 а.е.',
    ],
    orbit: {
      aAu: 67.78,
      e: 0.436,
      iDeg: 44.04,
      nodeDeg: 35.95,
      argPeriDeg: 151.64,
      meanAnomalyDeg: 205.99,
      periodDays: 204_199,
    },
    texture: '/textures/dwarf_eris.jpg',
    color: '#d8d4cc',
    approxOrbit: true,
    extra: [
      { label: 'Пояс', value: 'Рассеянный диск' },
      { label: 'Открыта', value: '2005, Майкл Браун и др.' },
      { label: 'Спутники', value: '1: Дисномия' },
      { label: 'Альбедо', value: '≈ 0,96' },
    ],
    searchTerms: ['эрида', 'eris', 'карликовая планета', 'рассеянный диск'],
  },

  // -------------------------------------------------------------------- Пояса
  {
    id: 'asteroid-belt',
    name: 'Пояс астероидов',
    nameEn: 'Asteroid Belt',
    kind: 'belt',
    radiusKm: 0,
    massKg: 2.39e21,
    meanTempC: null,
    atmosphere: 'Отсутствует',
    composition: 'C-тип (~75%), S-тип (~17%), M-тип; вода, глины, силикаты, металлы',
    description:
      'Область между орбитами Марса и Юпитера, где сосредоточено более миллиона тел размером более 1 км. Несмотря на популярный образ, расстояния между астероидами огромны.',
    facts: [
      'Суммарная масса пояса — около 2,39 × 10²¹ кг, примерно 3% массы Луны.',
      'Около трети массы пояса приходится на Цереру.',
      'Крупнейшие тела пояса: Церера, Веста, Паллада и Гигея.',
      'Пояс не является плотным скоплением: среднее расстояние между астероидами — миллионы километров.',
    ],
    color: '#9a8f82',
    extra: [
      { label: 'Протяжённость', value: '≈ 2,1–3,3 а.е.' },
      { label: 'Число тел > 1 км', value: 'Более 1 млн (оценка)' },
      { label: 'Суммарная масса', value: '≈ 2,39 × 10²¹ кг' },
      { label: 'Крупнейшее тело', value: 'Церера' },
    ],
    searchTerms: ['пояс астероидов', 'asteroid belt', 'астероиды'],
  },
  {
    id: 'kuiper-belt',
    name: 'Пояс Койпера',
    nameEn: 'Kuiper Belt',
    kind: 'belt',
    radiusKm: 0,
    massKg: 1e23,
    meanTempC: null,
    atmosphere: 'Отсутствует',
    composition: 'Ледяные тела: водяной, метановый и азотный лёд, каменные включения',
    description:
      'Кольцо ледяных тел за орбитой Нептуна, от 30 до ~50 а.е. Здесь находятся Плутон, Хаумеа, Макемаке и множество короткопериодических комет.',
    facts: [
      'Пояс Койпера — источник короткопериодических комет.',
      'Оценки количества объектов > 100 км — десятки тысяч.',
      'Суммарная масса пояса, вероятно, составляет от 0,01 до 0,1 массы Земли.',
      'Крупнейшие известные объекты: Плутон, Эрида, Хаумеа, Макемаке, Квавар.',
    ],
    color: '#7f93a8',
    extra: [
      { label: 'Протяжённость', value: '≈ 30–50 а.е.' },
      { label: 'Число тел > 100 км', value: '≈ 70 000 (оценка)' },
      { label: 'Суммарная масса', value: '≈ 0,01–0,1 массы Земли' },
      { label: 'Крупнейшие объекты', value: 'Плутон, Эрида, Хаумеа, Макемаке' },
    ],
    searchTerms: ['пояс койпера', 'kuiper belt', 'койпер'],
  },
];

export const BODY_MAP: Record<string, Body> = Object.fromEntries(BODIES.map((b) => [b.id, b]));

export const PLANETS = BODIES.filter((b) => b.kind === 'planet');
export const MOONS = BODIES.filter((b) => b.kind === 'moon');
export const DWARFS = BODIES.filter((b) => b.kind === 'dwarf');
export const BELTS = BODIES.filter((b) => b.kind === 'belt');

export const KIND_LABEL: Record<BodyKind, string> = {
  star: 'Звезда',
  planet: 'Планета',
  dwarf: 'Карликовая планета',
  moon: 'Спутник',
  belt: 'Пояс тел',
};

export const KIND_ORDER: BodyKind[] = ['star', 'planet', 'dwarf', 'moon', 'belt'];

export function getChildren(id: string): Body[] {
  return BODIES.filter((b) => b.parentId === id);
}

export function getParent(body: Body): Body | undefined {
  return body.parentId ? BODY_MAP[body.parentId] : undefined;
}
