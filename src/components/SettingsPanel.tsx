import type { Settings } from '../scene/settings';
import { num } from '../lib/format';
import { Icon } from './Icons';

interface SettingsPanelProps {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onReset: () => void;
  onCameraPreset: (preset: 'overview' | 'top' | 'side' | 'focus') => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}

function RangeRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="setting-row setting-row--slider">
      <div className="setting-row__label">
        <span>{label}</span>
        {hint && <em>{hint}</em>}
      </div>
      <div className="setting-row__control">
        <strong className="setting-value">{display}</strong>
        <input
          className="range range--sm"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row__label">
        <span>{label}</span>
        {hint && <em>{hint}</em>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  onReset,
  onCameraPreset,
}: SettingsPanelProps) {
  return (
    <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button className="drawer__backdrop" onClick={onClose} aria-label="Закрыть настройки" />
      <aside className="drawer__panel" aria-label="Настройки сцены">
        <div className="drawer__head">
          <div>
            <span className="eyebrow">Настройки</span>
            <h2>Параметры сцены</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть настройки">
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="drawer__scroll">
          <section className="setting-section">
            <h3>Масштаб</h3>
            <div className="scale-modes">
              <button
                className={`scale-mode ${settings.scaleMode === 'explore' ? 'is-active' : ''}`}
                onClick={() => onChange({ scaleMode: 'explore' })}
              >
                <span className="scale-mode__title">Исследование</span>
                <span className="scale-mode__text">
                  Увеличенные планеты и удобные расстояния. Масштаб условный.
                </span>
              </button>
              <button
                className={`scale-mode ${settings.scaleMode === 'scientific' ? 'is-active' : ''}`}
                onClick={() => onChange({ scaleMode: 'scientific' })}
              >
                <span className="scale-mode__title">Научный</span>
                <span className="scale-mode__text">
                  Пропорции расстояний и размеров соблюдены; радиусы планет увеличены равномерно
                  ради видимости.
                </span>
              </button>
            </div>
            <RangeRow
              label="Масштаб сцены"
              hint="меняет расстояния между орбитами"
              value={settings.sceneScale}
              min={0.5}
              max={1.6}
              step={0.05}
              display={`×${num(settings.sceneScale, 2)}`}
              onChange={(v) => onChange({ sceneScale: v })}
            />
          </section>

          <section className="setting-section">
            <h3>Ракурсы</h3>
            <div className="preset-grid">
              <button className="btn" onClick={() => onCameraPreset('overview')}>
                Вся система
              </button>
              <button className="btn" onClick={() => onCameraPreset('focus')}>
                К объекту
              </button>
              <button className="btn" onClick={() => onCameraPreset('top')}>
                Сверху
              </button>
              <button className="btn" onClick={() => onCameraPreset('side')}>
                В плоскости орбит
              </button>
            </div>
          </section>

          <section className="setting-section">
            <h3>Отображение</h3>
            <ToggleRow
              label="Орбиты"
              hint="линии орбит планет и спутников"
              checked={settings.showOrbits}
              onChange={(v) => onChange({ showOrbits: v })}
            />
            <ToggleRow
              label="Подписи"
              hint="названия объектов в сцене"
              checked={settings.showLabels}
              onChange={(v) => onChange({ showLabels: v })}
            />
            <ToggleRow
              label="Спутники"
              hint="Луна и крупные спутники планет"
              checked={settings.showMoons}
              onChange={(v) => onChange({ showMoons: v })}
            />
            <ToggleRow
              label="Пояса малых тел"
              hint="астероиды и пояс Койпера"
              checked={settings.showBelts}
              onChange={(v) => onChange({ showBelts: v })}
            />
            <ToggleRow
              label="Млечный Путь"
              hint="фоновая галактическая полоса"
              checked={settings.showMilkyWay}
              onChange={(v) => onChange({ showMilkyWay: v })}
            />
          </section>

          <section className="setting-section">
            <h3>Свет и слои</h3>
            <RangeRow
              label="Яркость звёзд"
              value={settings.starBrightness}
              min={0}
              max={2}
              step={0.05}
              display={`${num(settings.starBrightness * 100)}%`}
              onChange={(v) => onChange({ starBrightness: v })}
            />
            <RangeRow
              label="Свечение Солнца"
              value={settings.sunGlow}
              min={0}
              max={2}
              step={0.05}
              display={`${num(settings.sunGlow * 100)}%`}
              onChange={(v) => onChange({ sunGlow: v })}
            />
            <RangeRow
              label="Атмосферы"
              hint="прозрачность светящегося ободка"
              value={settings.atmosphere}
              min={0}
              max={1.5}
              step={0.05}
              display={`${num(settings.atmosphere * 100)}%`}
              onChange={(v) => onChange({ atmosphere: v })}
            />
            <RangeRow
              label="Облака Земли"
              hint="плотность облачного слоя"
              value={settings.clouds}
              min={0}
              max={1}
              step={0.05}
              display={`${num(settings.clouds * 100)}%`}
              onChange={(v) => onChange({ clouds: v })}
            />
          </section>

          <section className="setting-section">
            <h3>Графика</h3>
            <div className="setting-row">
              <div className="setting-row__label">
                <span>Качество</span>
                <em>разрешение и звёздное поле</em>
              </div>
              <div className="segmented">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    className={settings.quality === q ? 'is-active' : ''}
                    onClick={() => onChange({ quality: q })}
                  >
                    {q === 'low' ? 'Низкое' : q === 'medium' ? 'Среднее' : 'Высокое'}
                  </button>
                ))}
              </div>
            </div>
            <ToggleRow
              label="Свечение (bloom)"
              hint="кинематографическое свечение Солнца"
              checked={settings.bloom}
              onChange={(v) => onChange({ bloom: v })}
            />
          </section>

          <section className="setting-section setting-section--note">
            <p>
              Положения планет вычисляются по кеплеровским элементам J2000. Это наглядная модель,
              а не точная эфемерида: для навигации используйте JPL Horizons.
            </p>
            <p>
              Текстуры: NASA / USGS / Solar System Scope (CC BY 4.0). Карты спутников, не имеющие
              открытых текстур в комплекте, созданы процедурно.
            </p>
          </section>
        </div>

        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={onReset}>
            <Icon name="reset" size={15} /> Сбросить настройки
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Готово
          </button>
        </div>
      </aside>
    </div>
  );
}
