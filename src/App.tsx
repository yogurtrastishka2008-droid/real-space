import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BODIES, BODY_MAP, PLANETS } from './data/bodies';
import { SolarSystemEngine } from './scene/engine';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from './scene/settings';
import { TopBar } from './components/TopBar';
import { CatalogPanel } from './components/CatalogPanel';
import { InfoPanel } from './components/InfoPanel';
import { TimeBar } from './components/TimeBar';
import { SettingsPanel } from './components/SettingsPanel';
import { DetailsModal, CompareModal, HelpModal } from './components/Modals';
import { TourOverlay } from './components/Tour';
import { Minimap } from './components/Minimap';
import { Icon } from './components/Icons';

const TOUR = [
  {
    title: 'Вся система перед вами',
    text: 'Это интерактивная модель: вращайте камеру мышью или пальцем, приближайтесь колесом. Сейчас включён исследовательский масштаб — он удобен для обзора, но условен.',
  },
  {
    title: 'Солнце — источник света',
    text: 'Нажмите на Солнце или выберите его в каталоге. Камера плавно перелетит к звезде. Свечение можно уменьшить в настройках, а скорость времени — внизу.',
  },
  {
    title: 'Земля и Луна',
    text: 'У Земли есть облачный слой, голубая атмосфера и ночные огни на теневой стороне. Луна обращается вокруг неё по своей орбите — попробуйте перелететь к ней.',
  },
  {
    title: 'Сатурн и его кольца',
    text: 'Кольца имеют деление Кассини и другие щели. Тень планеты падает на кольца — это геометрически рассчитано в шейдере, а не нарисовано текстурой.',
  },
  {
    title: 'Пояс астероидов',
    text: 'Между Марсом и Юпитером — тысячи малых тел. В модели показаны 2 600 астероидов; реальные расстояния между ними огромны.',
  },
  {
    title: 'Плутон и пояс Койпера',
    text: 'Карликовые планеты включаются в отдельном режиме масштаба. Положения карликовых планет условны и помечены в карточке объекта.',
  },
];

const isNarrowScreen = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1150px)').matches;

export default function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SolarSystemEngine | null>(null);
  const readyRef = useRef(false);
  const narrowRef = useRef(isNarrowScreen());

  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  const [simDate, setSimDate] = useState(() => new Date());
  const lastTickRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Подготовка сцены');
  const [error, setError] = useState<string | null>(null);
  const [missingTextures, setMissingTextures] = useState<string[]>([]);

  const [isNarrow, setIsNarrow] = useState(isNarrowScreen);
  const [catalogOpen, setCatalogOpen] = useState(() => !isNarrowScreen());
  const [infoOpen, setInfoOpen] = useState(() => !isNarrowScreen());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedBody = selectedId ? BODY_MAP[selectedId] ?? null : null;

  /* ------------------------------------------------------------- engine */
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return undefined;

    const engine = new SolarSystemEngine(container, settingsRef.current, {
      onProgress: (value, message) => {
        setProgress(value);
        if (message) setProgressText(message);
      },
      onReady: (meta) => {
        readyRef.current = true;
        setReady(true);
        setMissingTextures(meta.missingTextures);
        engine.applySettings(settingsRef.current);
        engine.setSelected(selectedRef.current);
        setSimDate(engine.getSimDate());
        if (meta.missingTextures.length > 0) {
          setToast(
            `Не удалось загрузить ${meta.missingTextures.length} текстур — применены процедурные материалы.`,
          );
        }
      },
      onSelect: (id) => {
        setSelectedId(id);
        if (id) {
          setInfoOpen(true);
          if (narrowRef.current) setCatalogOpen(false);
        }
      },
      onTick: (date) => {
        const stamp = date.getTime();
        if (stamp - lastTickRef.current >= 800) {
          lastTickRef.current = stamp;
          setSimDate(date);
        }
      },
      onError: (message) => {
        setError(message);
      },
    });

    engineRef.current = engine;
    engine.init().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Не удалось запустить 3D-сцену.');
    });

    return () => {
      readyRef.current = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  /* ------------------------------------------------------------ settings */
  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
    if (readyRef.current) engineRef.current?.applySettings(settings);
  }, [settings]);

  useEffect(() => {
    selectedRef.current = selectedId;
    if (readyRef.current) {
      engineRef.current?.setSelected(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1150px)');
    const handler = () => {
      const narrow = mq.matches;
      narrowRef.current = narrow;
      setIsNarrow(narrow);
      if (narrow) {
        setCatalogOpen(false);
        setInfoOpen(false);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ------------------------------------------------------------- actions */
  const selectBody = useCallback(
    (id: string, fly = true) => {
      setSelectedId(id);
      selectedRef.current = id;
      engineRef.current?.setSelected(id);
      if (fly) engineRef.current?.flyTo(id);
      setInfoOpen(true);
      if (narrowRef.current) {
        setCatalogOpen(false);
      }
    },
    [],
  );

  const randomBody = useCallback(() => {
    const pool = BODIES.filter((b) => b.kind !== 'belt');
    const body = pool[Math.floor(Math.random() * pool.length)];
    selectBody(body.id);
    setToast(`${body.name} — ${BODY_MAP[body.id].kind === 'moon' ? 'спутник' : 'объект'} выбран случайно`);
  }, [selectBody]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setToast('Браузер не разрешил полноэкранный режим.');
    }
  }, []);

  const togglePlay = useCallback(() => {
    setSettings((s) => {
      if (s.paused) {
        return { ...s, paused: false, timeSpeed: s.timeSpeed > 0 ? s.timeSpeed : 2 };
      }
      return { ...s, paused: true };
    });
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    setSettings((s) => ({ ...s, paused: speed <= 0, timeSpeed: speed }));
  }, []);

  const shiftTime = useCallback(
    (days: number) => {
      const next = new Date(simDate.getTime() + days * 86_400_000);
      engineRef.current?.setSimDate(next);
      setSimDate(next);
    },
    [simDate],
  );

  const goNow = useCallback(() => {
    engineRef.current?.resetTimeToNow();
    setSimDate(new Date());
  }, []);

  const overview = useCallback(() => {
    engineRef.current?.overview();
  }, []);

  const openDetails = useCallback((id: string) => {
    setDetailsId(id);
  }, []);

  const openCompare = useCallback((id: string | null) => {
    setCompareId(id ?? 'earth');
  }, []);

  const startTour = useCallback(() => {
    setHelpOpen(false);
    setDetailsId(null);
    setCompareId(null);
    setSettingsOpen(false);
    setTourStep(0);
    setTourOpen(true);
  }, []);

  /* ---------------------------------------------------------- tour steps */
  useEffect(() => {
    if (!tourOpen) return;
    const engine = engineRef.current;
    switch (tourStep) {
      case 0:
        engine?.overview();
        setSelectedId(null);
        setSettings((s) => ({ ...s, showOrbits: true }));
        break;
      case 1:
        engine?.flyTo('sun');
        setSelectedId('sun');
        break;
      case 2:
        setSettings((s) => ({ ...s, showMoons: true, clouds: 0.9 }));
        engine?.flyTo('earth');
        setSelectedId('earth');
        break;
      case 3:
        engine?.flyTo('saturn');
        setSelectedId('saturn');
        break;
      case 4:
        engine?.flyTo('asteroid-belt');
        setSelectedId('asteroid-belt');
        break;
      case 5:
        engine?.flyTo('pluto');
        setSelectedId('pluto');
        break;
      default:
        break;
    }
  }, [tourOpen, tourStep]);

  /* ------------------------------------------------------------ keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setDetailsId(null);
        setCompareId(null);
        setHelpOpen(false);
        setTourOpen(false);
        if (narrowRef.current) {
          setCatalogOpen(false);
          setInfoOpen(false);
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        if (!e.ctrlKey && !e.metaKey) void toggleFullscreen();
        return;
      }
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        if (!e.ctrlKey && !e.metaKey) overview();
        return;
      }
      if (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') {
        randomBody();
        return;
      }
      if (/^[1-8]$/.test(e.key)) {
        const planet = PLANETS[Number(e.key) - 1];
        if (planet) selectBody(planet.id);
      }
      if (e.key === '9') selectBody('pluto');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overview, randomBody, selectBody, toggleFullscreen, togglePlay]);

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setToast('Настройки сброшены к значениям по умолчанию.');
  }, []);

  const cameraPreset = useCallback((preset: 'overview' | 'top' | 'side' | 'focus') => {
    const engine = engineRef.current;
    if (!engine) return;
    if (preset === 'overview') {
      engine.overview();
    } else if (preset === 'focus') {
      const id = selectedRef.current;
      if (id) engine.flyTo(id);
      else engine.overview();
    } else {
      engine.setViewPreset(preset);
    }
  }, []);

  const tourMeta = TOUR[Math.min(tourStep, TOUR.length - 1)];

  const modeLabel = useMemo(
    () => (settings.scaleMode === 'scientific' ? 'Научный масштаб' : 'Исследовательский масштаб'),
    [settings.scaleMode],
  );

  return (
    <div className={`app ${isNarrow ? 'is-narrow' : ''}`}>
      <TopBar
        onSelect={selectBody}
        onToggleCatalog={() => setCatalogOpen((v) => !v)}
        onToggleInfo={() => setInfoOpen((v) => !v)}
        catalogOpen={catalogOpen}
        infoOpen={infoOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onStartTour={startTour}
        onRandom={randomBody}
        onResetView={overview}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div className="workspace">
        <CatalogPanel
          selectedId={selectedId}
          onSelect={selectBody}
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
        />

        <main className="stage" aria-label="3D-сцена Солнечной системы">
          <div className="viewport" ref={viewportRef} />

          <div className="hud hud--top">
            <span className={`hud__mode ${settings.scaleMode}`}>
              <Icon name="orbit" size={13} /> {modeLabel}
            </span>
            <span className="hud__focus">
              {selectedBody ? `Выбран: ${selectedBody.name}` : 'Общий вид системы'}
            </span>
            {settings.scaleMode === 'explore' && (
              <span className="hud__warn">масштаб условный</span>
            )}
          </div>

          <div className="hud hud--bottom">
            <span>
              <b>ЛКМ</b> вращение
            </span>
            <span>
              <b>Колесо</b> масштаб
            </span>
            <span>
              <b>ПКМ</b> панорама
            </span>
            <span>
              <b>Клик</b> выбор
            </span>
          </div>

          {!tourOpen && (
            <nav className="quick-nav" aria-label="Быстрый переход к объектам">
              {['sun', 'earth', 'moon', 'saturn', 'pluto'].map((id) => (
                <button
                  key={id}
                  className={selectedId === id ? 'is-active' : ''}
                  onClick={() => selectBody(id)}
                >
                  <span style={{ background: BODY_MAP[id].color }} />
                  {BODY_MAP[id].name}
                </button>
              ))}
            </nav>
          )}

          <Minimap
            engine={ready ? engineRef.current : null}
            selectedId={selectedId}
            mode={settings.scaleMode}
            onOverview={overview}
          />

          {tourOpen && (
            <TourOverlay
              step={tourStep}
              total={TOUR.length}
              title={tourMeta.title}
              text={tourMeta.text}
              onPrev={() => setTourStep((s) => Math.max(0, s - 1))}
              onNext={() => {
                if (tourStep >= TOUR.length - 1) {
                  setTourOpen(false);
                  overview();
                } else {
                  setTourStep((s) => s + 1);
                }
              }}
              onClose={() => setTourOpen(false)}
            />
          )}

          {ready && missingTextures.length > 0 && (
            <div className="degraded-badge">
              <Icon name="info" size={13} />
              процедурные текстуры
            </div>
          )}
        </main>

        <InfoPanel
          body={selectedBody}
          selectedId={selectedId}
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          onFly={(id) => selectBody(id)}
          onDetails={openDetails}
          onCompare={openCompare}
          onToggleOrbits={() => patchSettings({ showOrbits: !settings.showOrbits })}
          orbitsVisible={settings.showOrbits}
          onOverview={overview}
          onRandom={randomBody}
          scaleMode={settings.scaleMode}
        />

        {isNarrow && (catalogOpen || infoOpen) && (
          <button
            className="scrim"
            aria-label="Закрыть панель"
            onClick={() => {
              setCatalogOpen(false);
              setInfoOpen(false);
            }}
          />
        )}
      </div>

      <TimeBar
        paused={settings.paused}
        speed={settings.timeSpeed}
        date={simDate}
        onTogglePlay={togglePlay}
        onSpeedChange={changeSpeed}
        onNow={goNow}
        onShift={shiftTime}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={patchSettings}
        onClose={() => setSettingsOpen(false)}
        onReset={resetSettings}
        onCameraPreset={cameraPreset}
      />

      {detailsId && (
        <DetailsModal
          bodyId={detailsId}
          onClose={() => setDetailsId(null)}
          onFly={(id) => {
            selectBody(id);
            setDetailsId(null);
          }}
          onSelect={selectBody}
        />
      )}

      {compareId && <CompareModal initialId={compareId} onClose={() => setCompareId(null)} />}

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onStartTour={startTour} />}

      {!ready && !error && (
        <div className="loading-screen">
          <div className="loading-brand">
            <div className="brand-mark brand-mark--lg" aria-hidden="true">
              <span className="brand-mark__sun" />
              <span className="brand-mark__orbit" />
              <span className="brand-mark__planet" />
            </div>
            <div>
              <h1>REAL SPACE</h1>
              <p>Интерактивный атлас Солнечной системы</p>
            </div>
          </div>
          <div className="loading-progress">
            <div className="loading-progress__bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="loading-meta">
            <span>{progressText}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <p className="loading-note">Текстуры NASA / USGS / Solar System Scope · Three.js · WebGL</p>
        </div>
      )}

      {error && (
        <div className="error-screen">
          <div className="error-card">
            <h2>Сцена не запустилась</h2>
            <p>{error}</p>
            <p className="error-hint">
              Проверьте, что в браузере включён аппаратный WebGL. Попробуйте обновить страницу.
            </p>
            <button className="btn btn--primary" onClick={() => window.location.reload()}>
              Перезагрузить
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={15} />
          <span>{toast}</span>
          <button className="icon-btn" onClick={() => setToast(null)} aria-label="Скрыть">
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {selectedBody ? `Выбран объект: ${selectedBody.name}` : 'Общий вид системы'}
      </div>
    </div>
  );
}
