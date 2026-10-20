import { useEffect, useMemo, useRef, useState } from 'react';
import { BODIES, getParent, KIND_LABEL } from '../data/bodies';
import { Icon } from './Icons';

interface TopBarProps {
  onSelect: (id: string) => void;
  onToggleCatalog: () => void;
  onToggleInfo: () => void;
  catalogOpen: boolean;
  infoOpen: boolean;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onStartTour: () => void;
  onRandom: () => void;
  onResetView: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export function TopBar({
  onSelect,
  onToggleCatalog,
  onToggleInfo,
  catalogOpen,
  infoOpen,
  onOpenSettings,
  onOpenHelp,
  onStartTour,
  onRandom,
  onResetView,
  onToggleFullscreen,
  isFullscreen,
}: TopBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const scored = BODIES.map((b) => {
      const haystack = [b.name, b.nameEn, ...(b.searchTerms ?? [])].map((s) => s.toLowerCase());
      const exact = haystack.some((s) => s === q);
      const starts = haystack.some((s) => s.startsWith(q));
      const includes = haystack.some((s) => s.includes(q));
      return { body: b, score: exact ? 3 : starts ? 2 : includes ? 1 : 0 };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.body.name.localeCompare(b.body.name, 'ru'));
    return scored.slice(0, 8);
  }, [query]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (id: string) => {
    onSelect(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-mark__sun" />
          <span className="brand-mark__orbit" />
          <span className="brand-mark__planet" />
        </div>
        <div className="brand-text">
          <h1>REAL SPACE</h1>
          <p>Интерактивный атлас Солнечной системы</p>
        </div>
      </div>

      <div className="search" ref={wrapRef}>
        <Icon name="search" size={17} className="search__icon" />
        <input
          ref={inputRef}
          className="search__input"
          value={query}
          placeholder="Найти планету, спутник или пояс"
          aria-label="Поиск небесных тел"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && results[active]) {
              choose(results[active].body.id);
            }
          }}
        />
        {query ? (
          <button
            className="search__clear"
            aria-label="Очистить поиск"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={14} />
          </button>
        ) : (
          <kbd className="search__kbd">/</kbd>
        )}

        {open && query.trim() !== '' && (
          <div className="search-results" role="listbox" aria-label="Результаты поиска">
            {results.length === 0 && <div className="search-results__empty">Ничего не найдено</div>}
            {results.map(({ body }, i) => {
              const parent = getParent(body);
              return (
                <button
                  key={body.id}
                  className={`search-result ${i === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(body.id)}
                >
                  <span className="search-result__dot" style={{ background: body.color }} />
                  <span className="search-result__text">
                    <strong>{body.name}</strong>
                    <small>
                      {KIND_LABEL[body.kind]}
                      {parent ? ` · ${parent.name}` : ''}
                    </small>
                  </span>
                  <Icon name="chevron" size={14} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <nav className="topbar__actions" aria-label="Основные действия">
        <button
          className={`icon-btn ${catalogOpen ? 'is-active' : ''}`}
          onClick={onToggleCatalog}
          title="Каталог объектов"
          aria-label="Каталог объектов"
        >
          <Icon name="list" />
          <span>Каталог</span>
        </button>
        <button
          className="icon-btn desktop-label"
          onClick={onStartTour}
          title="Краткое обучение"
          aria-label="Краткое обучение"
        >
          <Icon name="sparkle" />
          <span>Обучение</span>
        </button>
        <button
          className="icon-btn desktop-label"
          onClick={onOpenHelp}
          title="Справка и горячие клавиши"
          aria-label="Справка"
        >
          <Icon name="help" />
          <span>Справка</span>
        </button>
        <button
          className="icon-btn desktop-label"
          onClick={onRandom}
          title="Случайный объект (G)"
          aria-label="Случайный объект"
        >
          <Icon name="shuffle" />
          <span>Случайный</span>
        </button>
        <button
          className="icon-btn reset-btn"
          onClick={onResetView}
          title="Сбросить камеру (R)"
          aria-label="Сбросить камеру"
        >
          <Icon name="reset" />
        </button>
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Настройки"
          aria-label="Настройки"
        >
          <Icon name="settings" />
        </button>
        <button
          className="icon-btn fullscreen-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          aria-label="Полноэкранный режим"
        >
          <Icon name={isFullscreen ? 'collapse' : 'expand'} />
        </button>
        <button
          className={`icon-btn ${infoOpen ? 'is-active' : ''}`}
          onClick={onToggleInfo}
          title="Информация об объекте"
          aria-label="Информация об объекте"
        >
          <Icon name="info" />
        </button>
      </nav>
    </header>
  );
}
