import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:5174/';
fs.mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
  ],
});

const errors = [];
const checks = {};
const note = (key, value) => {
  checks[key] = value;
};

async function newPage(width, height, clear = true) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (clear) await page.evaluateOnNewDocument(() => localStorage.clear());
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (req) => {
    if (!req.url().includes('textures/')) return;
  });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 60000 });
  await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));
  return page;
}

const state = (page) =>
  page.evaluate(() => {
    const e = window.__realSpaceEngine;
    const s = e.getDebugState();
    return {
      focus: s.focusId,
      selected: s.selectedId,
      radius: s.radius,
      camera: s.camera,
      target: s.target,
    };
  });

const page = await newPage(1600, 900);

note('canvas', await page.evaluate(() => {
  const c = document.querySelector('canvas.scene-canvas');
  return c ? { width: c.width, height: c.height } : null;
}));
note('catalogItems', await page.evaluate(() => document.querySelectorAll('.catalog-item').length));
note('labelsVisible', await page.evaluate(() => [...document.querySelectorAll('.body-label')].filter((el) => el.style.display !== 'none').length));
note('initialFocus', await state(page));
await page.screenshot({ path: 'shots/f01-overview.png' });

// selection by clicking the 3D scene (Mars at overview)
const marsPoint = await page.evaluate(() => {
  const e = window.__realSpaceEngine;
  const item = e.bodyScenes.get('mars');
  const p = item.root.position.clone().project(e.camera);
  const rect = document.querySelector('canvas.scene-canvas').getBoundingClientRect();
  return {
    x: rect.left + (p.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-p.y * 0.5 + 0.5) * rect.height,
    inStage: Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
  };
});
note('marsScreenPoint', marsPoint);
if (marsPoint.inStage) {
  await page.mouse.click(marsPoint.x, marsPoint.y);
  await new Promise((r) => setTimeout(r, 500));
  await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 30000, polling: 200 });
  note('afterCanvasClick', await state(page));
  note('afterCanvasClickHeading', await page.evaluate(() => document.querySelector('.info__titles h2')?.textContent));
}

const beforeDrag = await state(page);
const rect = await page.evaluate(() => {
  const r = document.querySelector('canvas.scene-canvas').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(rect.x, rect.y);
await page.mouse.down();
await page.mouse.move(rect.x + 140, rect.y + 50, { steps: 12 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));
const afterDrag = await state(page);
note('dragChangedCamera', {
  before: beforeDrag.camera.map((n) => Number(n.toFixed(2))),
  after: afterDrag.camera.map((n) => Number(n.toFixed(2))),
});

await page.mouse.move(rect.x, rect.y);
await page.mouse.wheel({ deltaY: -400 });
await new Promise((r) => setTimeout(r, 700));
const afterWheel = await state(page);
note('wheelZoom', {
  before: Number(beforeDrag.radius.toFixed(3)),
  after: Number(afterWheel.radius.toFixed(3)),
});

// label click for Earth
await page.evaluate(() => {
  const el = [...document.querySelectorAll('.body-label')].find((b) => b.textContent?.includes('Земля'));
  el?.click();
});
await new Promise((r) => setTimeout(r, 500));
await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 30000, polling: 200 });
await new Promise((r) => setTimeout(r, 1200));
note('afterLabelClick', await state(page));
note('earthVisibleLabels', await page.evaluate(() =>
  [...document.querySelectorAll('.body-label')]
    .filter((el) => el.style.display !== 'none')
    .map((el) => el.textContent?.trim()),
));
await page.screenshot({ path: 'shots/f02-earth.png' });

// search
await page.click('.search__input');
await page.type('.search__input', 'Титан', { delay: 25 });
await new Promise((r) => setTimeout(r, 400));
note('searchResults', await page.evaluate(() => [...document.querySelectorAll('.search-result')].map((el) => el.textContent?.trim())));
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 500));
await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 30000, polling: 200 });
await new Promise((r) => setTimeout(r, 800));
note('searchSelection', await page.evaluate(() => document.querySelector('.info__titles h2')?.textContent));
await page.screenshot({ path: 'shots/f03-titan.png' });

// time
const dateBefore = await page.evaluate(() => document.querySelector('.timebar__date strong')?.textContent);
await page.evaluate(() => {
  [...document.querySelectorAll('.preset')].find((b) => b.textContent?.includes('1 год/с'))?.click();
});
await new Promise((r) => setTimeout(r, 2200));
const dateAfter = await page.evaluate(() => document.querySelector('.timebar__date strong')?.textContent);
note('timeAdvanced', { before: dateBefore, after: dateAfter });

// orbits toggle
const orbitLabelBefore = await page.evaluate(() =>
  [...document.querySelectorAll('.info__actions .btn')].map((b) => b.textContent?.trim()).find((t) => t?.includes('орбит')),
);
await page.evaluate(() => {
  [...document.querySelectorAll('.info__actions .btn')].find((b) => b.textContent?.includes('орбит'))?.click();
});
await new Promise((r) => setTimeout(r, 500));
const orbitLabelsAfter = await page.evaluate(() =>
  [...document.querySelectorAll('.body-label')].filter((el) => el.style.display !== 'none').length,
);
note('orbitToggle', { before: orbitLabelBefore, visibleLabelsAfter: orbitLabelsAfter });
await page.evaluate(() => {
  [...document.querySelectorAll('.info__actions .btn')].find((b) => b.textContent?.includes('орбит'))?.click();
});

// details + compare + help
const openInfoButton = async (text) => {
  await page.evaluate((t) => {
    [...document.querySelectorAll('.info__actions .btn')].find((b) => b.textContent?.includes(t))?.click();
  }, text);
  await new Promise((r) => setTimeout(r, 500));
};
await openInfoButton('Подробнее');
note('details', await page.evaluate(() => ({
  open: Boolean(document.querySelector('.modal')),
  cells: document.querySelectorAll('.detail-cell').length,
  extraRows: document.querySelectorAll('.modal__section .stat-row').length,
})));
await page.screenshot({ path: 'shots/f04-details.png' });
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));
await openInfoButton('Сравнить');
note('compare', await page.evaluate(() => ({
  open: Boolean(document.querySelector('.modal')),
  rows: document.querySelectorAll('.compare-row').length,
})));
await page.screenshot({ path: 'shots/f05-compare.png' });
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 300));

// tour
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Обучение')?.click();
});
await new Promise((r) => setTimeout(r, 900));
note('tour', await page.evaluate(() => ({
  open: Boolean(document.querySelector('.tour')),
  title: document.querySelector('.tour h3')?.textContent,
})));
await page.screenshot({ path: 'shots/f06-tour.png' });
await page.evaluate(() => {
  [...document.querySelectorAll('.tour .btn')].find((b) => b.textContent?.includes('Далее'))?.click();
});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: 'shots/f07-tour-sun.png' });
await page.evaluate(() => {
  document.querySelector('.tour .icon-btn')?.click();
});
await new Promise((r) => setTimeout(r, 300));

// scientific mode
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.getAttribute('title') === 'Настройки')?.click();
});
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => {
  [...document.querySelectorAll('.scale-mode')].find((b) => b.textContent?.includes('Научный'))?.click();
});
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  [...document.querySelectorAll('.drawer__foot .btn')].find((b) => b.textContent?.includes('Готово'))?.click();
});
await new Promise((r) => setTimeout(r, 800));
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.getAttribute('title')?.includes('Сбросить камеру'))?.click();
});
await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 30000, polling: 200 });
await new Promise((r) => setTimeout(r, 1500));
note('scientificOverview', await state(page));
await page.screenshot({ path: 'shots/f08-scientific-overview.png' });
await page.evaluate(() => {
  [...document.querySelectorAll('.catalog-item')].find((el) => el.textContent?.includes('Земля'))?.click();
});
await new Promise((r) => setTimeout(r, 500));
await page.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 30000, polling: 200 });
await new Promise((r) => setTimeout(r, 1200));
note('scientificEarth', await state(page));
await page.screenshot({ path: 'shots/f09-scientific-earth.png' });

await page.close();

// texture failure resilience
const broken = await browser.newPage();
await broken.setViewport({ width: 1280, height: 800 });
broken.on('pageerror', (e) => errors.push(`broken pageerror: ${e.message}`));
broken.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`broken console: ${m.text()}`);
});
await broken.evaluateOnNewDocument(() => localStorage.clear());
await broken.setRequestInterception(true);
broken.on('request', (req) => {
  if (req.url().includes('/textures/jupiter.jpg') || req.url().includes('/textures/saturn_ring.png')) {
    req.abort();
  } else {
    req.continue();
  }
});
await broken.goto(URL, { waitUntil: 'networkidle2' });
await broken.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 60000 });
await broken.waitForFunction(() => window.__realSpaceEngine?.isCameraSettled?.(), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
note('textureFailure', await broken.evaluate(() => ({
  ready: Boolean(document.querySelector('.scene-canvas')),
  badge: document.querySelector('.degraded-badge')?.textContent?.trim(),
  toast: document.querySelector('.toast')?.textContent?.trim(),
})));
await broken.evaluate(() => {
  [...document.querySelectorAll('.catalog-item')].find((el) => el.textContent?.includes('Юпитер'))?.click();
});
await new Promise((r) => setTimeout(r, 2500));
await broken.screenshot({ path: 'shots/f10-texture-fallback.png' });
await broken.close();

// mobile
const mobile = await newPage(390, 844);
note('mobile', await mobile.evaluate(() => ({
  minimap: getComputedStyle(document.querySelector('.minimap')).display,
  infoOpen: Boolean(document.querySelector('.info.is-open')),
  catalogButton: Boolean([...document.querySelectorAll('button')].find((b) => b.getAttribute('title') === 'Каталог объектов')),
  quickNav: getComputedStyle(document.querySelector('.quick-nav')).display,
})));
await mobile.screenshot({ path: 'shots/f11-mobile.png' });
await mobile.evaluate(() => {
  [...document.querySelectorAll('button')].find((b) => b.getAttribute('title') === 'Каталог объектов')?.click();
});
await new Promise((r) => setTimeout(r, 700));
await mobile.screenshot({ path: 'shots/f12-mobile-catalog.png' });
await mobile.evaluate(() => {
  [...document.querySelectorAll('.catalog-item')].find((el) => el.textContent?.includes('Юпитер'))?.click();
});
await new Promise((r) => setTimeout(r, 3000));
note('mobileJupiter', await mobile.evaluate(() => ({
  infoOpen: Boolean(document.querySelector('.info.is-open')),
  heading: document.querySelector('.info__titles h2')?.textContent,
})));
await mobile.screenshot({ path: 'shots/f13-mobile-jupiter.png' });
await mobile.evaluate(() => {
  document.querySelector('.panel__close')?.click();
});
await new Promise((r) => setTimeout(r, 500));
await mobile.screenshot({ path: 'shots/f14-mobile-jupiter-nopanel.png' });
await mobile.close();

await browser.close();

fs.writeFileSync('shots/final-report.json', JSON.stringify({ checks, errors }, null, 2));
console.log(JSON.stringify({ checks, errors }, null, 2));
