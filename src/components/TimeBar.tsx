import { dateRu, sliderFromSpeed, speedFromSlider, speedLabel, timeRu } from '../lib/format';
import { Icon } from './Icons';

interface TimeBarProps {
  paused: boolean;
  speed: number;
  date: Date;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onNow: () => void;
  onShift: (days: number) => void;
}

const PRESETS = [
  { label: '1 ч/с', value: 1 / 24 },
  { label: '6 ч/с', value: 0.25 },
  { label: '1 сут/с', value: 1 },
  { label: '1 нед/с', value: 7 },
  { label: '1 мес/с', value: 30 },
  { label: '1 год/с', value: 365.25 },
];

export function TimeBar({
  paused,
  speed,
  date,
  onTogglePlay,
  onSpeedChange,
  onNow,
  onShift,
}: TimeBarProps) {
  const sliderValue = sliderFromSpeed(speed);

  return (
    <footer className="timebar" aria-label="Управление временем">
      <div className="timebar__clock">
        <button
          className="play-btn"
          onClick={onTogglePlay}
          aria-label={paused ? 'Запустить время' : 'Приостановить время'}
          title={paused ? 'Запустить (Space)' : 'Пауза (Space)'}
        >
          <Icon name={paused ? 'play' : 'pause'} size={20} />
        </button>
        <div className="timebar__date">
          <span className="eyebrow">Эпоха симуляции</span>
          <strong>{dateRu(date)}</strong>
          <em>{timeRu(date)} · местное время</em>
        </div>
      </div>

      <div className="timebar__speed">
        <div className="timebar__speed-head">
          <span className="eyebrow">Скорость времени</span>
          <strong>{paused ? 'Пауза' : speedLabel(speed)}</strong>
        </div>
        <div className="slider-row">
          <span className="slider-row__edge">0</span>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={sliderValue}
            aria-label="Скорость симуляции"
            onChange={(e) => {
              const value = Number(e.target.value);
              onSpeedChange(value === 0 ? 0 : speedFromSlider(value));
            }}
          />
          <span className="slider-row__edge">365 сут/с</span>
        </div>
        <div className="timebar__presets">
          {PRESETS.map((preset) => {
            const active = Math.abs(speed - preset.value) / preset.value < 0.06;
            return (
              <button
                key={preset.label}
                className={`preset ${active && !paused ? 'is-active' : ''}`}
                onClick={() => onSpeedChange(preset.value)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="timebar__jump">
        <span className="eyebrow">Перемотка</span>
        <div className="timebar__jump-row">
          <button className="preset" onClick={() => onShift(-365.25)}>
            −1 год
          </button>
          <button className="preset" onClick={() => onShift(-1)}>
            −1 сут
          </button>
          <button className="preset preset--live" onClick={onNow} title="Вернуться к текущей дате">
            <span className="live-dot" /> Сейчас
          </button>
          <button className="preset" onClick={() => onShift(1)}>
            +1 сут
          </button>
          <button className="preset" onClick={() => onShift(365.25)}>
            +1 год
          </button>
        </div>
      </div>
    </footer>
  );
}
