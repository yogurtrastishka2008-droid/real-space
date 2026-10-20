import { useEffect, useMemo, useState } from 'react';
import {
  BODIES,
  BODY_MAP,
  KIND_LABEL,
  type Body,
} from '../data/bodies';
import {
  bodyRows,
  bodySubtitle,
  COMPARE_METRICS,
  relatedBodies,
} from '../lib/bodyInfo';
import { num } from '../lib/format';
import { Icon } from './Icons';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}

interface DetailsProps {
  bodyId: string | null;
  onClose: () => void;
  onFly: (id: string) => void;
  onSelect: (id: string) => void;
}

export function DetailsModal({ bodyId, onClose, onFly, onSelect }: DetailsProps) {
  const body = bodyId ? BODY_MAP[bodyId] : null;
  useEscape(onClose);
  if (!body) return null;
  const rows = bodyRows(body, false);
  const related = relatedBodies(body);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Подробно: ${body.name}`}>
      <button className="modal__backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="modal__panel modal__panel--wide">
        <header className="modal__head">
          <div className="modal__title">
            <div
              className="modal__orb"
              style={{
                background: body.texture
                  ? `radial-gradient(circle at 33% 30%, rgba(255,255,255,.2), rgba(0,0,0,.6)), url(${body.texture}) center/cover`
                  : `radial-gradient(circle at 33% 30%, ${body.color}, #0b1018 75%)`,
              }}
            />
            <div>
              <span className="eyebrow">Досье объекта · {KIND_LABEL[body.kind]}</span>
              <h2>{body.name}</h2>
              <p>{bodySubtitle(body)}</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="modal__body modal__body--cols">
          <div className="modal__col">
            <p className="modal__desc">{body.description}</p>

            <div className="detail-grid">
              {rows.map((row, i) => (
                <div className="detail-cell" key={`${row.label}-${i}`}>
                  <span>
                    {row.label}
                    {row.hint && <em>{row.hint}</em>}
                  </span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>

            {body.orbit && (
              <section className="modal__section">
                <h3>Орбитальные элементы (J2000)</h3>
                <div className="element-grid">
                  <div>
                    <span>Большая полуось</span>
                    <strong>{num(body.orbit.aAu, 4)} а.е.</strong>
                  </div>
                  <div>
                    <span>Эксцентриситет</span>
                    <strong>{num(body.orbit.e, 4)}</strong>
                  </div>
                  <div>
                    <span>Наклонение</span>
                    <strong>{num(body.orbit.iDeg, 3)}°</strong>
                  </div>
                  <div>
                    <span>Долгота узла</span>
                    <strong>{num(body.orbit.nodeDeg, 2)}°</strong>
                  </div>
                  <div>
                    <span>Аргумент перицентра</span>
                    <strong>{num(body.orbit.argPeriDeg, 2)}°</strong>
                  </div>
                  <div>
                    <span>Средняя аномалия</span>
                    <strong>{num(body.orbit.meanAnomalyDeg, 2)}°</strong>
                  </div>
                </div>
                <p className="modal__note">
                  Модель использует приближённые кеплеровские элементы и не учитывает возмущения
                  планет. Положение не является точным прогнозом на выбранную дату.
                </p>
              </section>
            )}

            {related.length > 0 && (
              <section className="modal__section">
                <h3>Связанные объекты</h3>
                <div className="mini-links">
                  {related.map((rel) => (
                    <button
                      key={rel.id}
                      className="mini-link"
                      onClick={() => {
                        onSelect(rel.id);
                        onFly(rel.id);
                      }}
                    >
                      <span style={{ background: rel.color }} />
                      {rel.name}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="modal__col">
            <section className="modal__section">
              <h3>Интересные факты</h3>
              <ul className="facts">
                {body.facts.map((fact) => (
                  <li key={fact}>
                    <Icon name="sparkle" size={13} />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </section>

            {body.extra.length > 0 && (
              <section className="modal__section">
                <h3>Дополнительно</h3>
                <dl className="stat-list">
                  {body.extra.map((row) => (
                    <div className="stat-row" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <div className="modal__actions">
              <button className="btn btn--primary" onClick={() => onFly(body.id)}>
                <Icon name="arrow" size={16} /> Перелететь к объекту
              </button>
              <button className="btn" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CompareProps {
  initialId: string | null;
  onClose: () => void;
}

export function CompareModal({ initialId, onClose }: CompareProps) {
  useEscape(onClose);
  const initial = initialId ?? 'earth';
  const [aId, setAId] = useState(initial);
  const [bId, setBId] = useState(initial === 'earth' ? 'jupiter' : 'earth');
  const a = BODY_MAP[aId];
  const b = BODY_MAP[bId];

  const circleSize = (body: Body | undefined) => {
    if (!body || body.kind === 'belt') return 0;
    const max = Math.max(a?.radiusKm ?? 1, b?.radiusKm ?? 1);
    return Math.max(6, Math.sqrt(body.radiusKm / max) * 74);
  };

  const rows = useMemo(
    () =>
      COMPARE_METRICS.map((metric) => {
        const va = a ? metric.get(a) : null;
        const vb = b ? metric.get(b) : null;
        return { metric, va, vb };
      }),
    [a, b],
  );

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Сравнение объектов">
      <button className="modal__backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="modal__panel">
        <header className="modal__head">
          <div>
            <span className="eyebrow">Инструмент</span>
            <h2>Сравнение объектов</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="compare">
          <div className="compare__side">
            <select
              className="select"
              value={aId}
              aria-label="Первый объект"
              onChange={(e) => setAId(e.target.value)}
            >
              {BODIES.map((body) => (
                <option key={body.id} value={body.id}>
                  {body.name} — {KIND_LABEL[body.kind]}
                </option>
              ))}
            </select>
            <div className="compare__orb-wrap">
              <span
                className="compare__orb"
                style={{
                  width: circleSize(a),
                  height: circleSize(a),
                  background: a
                    ? `radial-gradient(circle at 33% 30%, ${a.color}, #0b1018 80%)`
                    : '#111',
                }}
              />
            </div>
            <strong>{a?.name}</strong>
            <small>{a ? bodySubtitle(a) : ''}</small>
          </div>

          <button
            className="compare__swap"
            onClick={() => {
              setAId(bId);
              setBId(aId);
            }}
            aria-label="Поменять объекты местами"
            title="Поменять местами"
          >
            <Icon name="reset" size={16} />
          </button>

          <div className="compare__side compare__side--right">
            <select
              className="select"
              value={bId}
              aria-label="Второй объект"
              onChange={(e) => setBId(e.target.value)}
            >
              {BODIES.map((body) => (
                <option key={body.id} value={body.id}>
                  {body.name} — {KIND_LABEL[body.kind]}
                </option>
              ))}
            </select>
            <div className="compare__orb-wrap">
              <span
                className="compare__orb"
                style={{
                  width: circleSize(b),
                  height: circleSize(b),
                  background: b
                    ? `radial-gradient(circle at 33% 30%, ${b.color}, #0b1018 80%)`
                    : '#111',
                }}
              />
            </div>
            <strong>{b?.name}</strong>
            <small>{b ? bodySubtitle(b) : ''}</small>
          </div>
        </div>

        <div className="compare-table">
          {rows.map(({ metric, va, vb }) => {
            const max = Math.max(va ?? 0, vb ?? 0);
            const aW = va !== null && max > 0 ? Math.max(2, (va / max) * 100) : 0;
            const bW = vb !== null && max > 0 ? Math.max(2, (vb / max) * 100) : 0;
            return (
              <div className="compare-row" key={metric.label}>
                <div className="compare-row__values">
                  <strong className={va !== null && vb !== null && va > vb ? 'is-big' : ''}>
                    {va !== null ? metric.format(va) : '—'}
                  </strong>
                  <span>{metric.label}</span>
                  <strong className={va !== null && vb !== null && vb > va ? 'is-big' : ''}>
                    {vb !== null ? metric.format(vb) : '—'}
                  </strong>
                </div>
                <div className="compare-bar">
                  <span className="compare-bar__a" style={{ width: `${aW}%` }} />
                  <span className="compare-bar__b" style={{ width: `${bW}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="modal__note">
          Размеры кругов показаны в условном масштабе (√ от отношения радиусов), чтобы были видны
          небольшие тела. Точные диаметры — в таблице.
        </p>
        <div className="modal__actions">
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

interface HelpProps {
  onClose: () => void;
  onStartTour: () => void;
}

export function HelpModal({ onClose, onStartTour }: HelpProps) {
  useEscape(onClose);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Справка">
      <button className="modal__backdrop" onClick={onClose} aria-label="Закрыть" />
      <div className="modal__panel">
        <header className="modal__head">
          <div>
            <span className="eyebrow">Справка</span>
            <h2>Как исследовать</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="help-grid">
          <section>
            <h3>Мышь</h3>
            <p>
              <b>Левая кнопка</b> — вращение вокруг выбранной точки. <b>Колесо</b> — приближение и
              удаление. <b>Правая кнопка или Shift + перетаскивание</b> — перемещение по сцене.{' '}
              <b>Клик по объекту</b> — выбор и плавный перелёт.
            </p>
          </section>
          <section>
            <h3>Сенсорный экран</h3>
            <p>
              <b>Один палец</b> — вращение камеры. <b>Два пальца</b> — масштабирование и
              перемещение. <b>Короткое касание</b> — выбор объекта.
            </p>
          </section>
          <section>
            <h3>Клавиатура</h3>
            <p>
              <b>Space</b> — пауза, <b>F</b> — полный экран, <b>R</b> — общий вид, <b>G</b> —
              случайный объект, <b>/</b> — поиск, <b>Esc</b> — закрыть панель, <b>1–9</b> — быстрый
              выбор планет.
            </p>
          </section>
          <section>
            <h3>Два масштаба</h3>
            <p>
              <b>Исследование</b> — планеты увеличены, расстояния сжаты, масштаб условный.{' '}
              <b>Научный</b> — пропорции расстояний и относительных размеров точные, но тела
              увеличены равномерно, иначе их не было бы видно.
            </p>
          </section>
          <section>
            <h3>Данные</h3>
            <p>
              Характеристики взяты из открытых источников NASA, JPL и USGS. Положения планет
              рассчитываются по кеплеровским элементам J2000 и не являются точной эфемеридой.
            </p>
          </section>
          <section>
            <h3>Что попробовать</h3>
            <p>
              Включите орбиты и подписи, ускорьте время до «1 год/с», приблизьтесь к Сатурну и
              посмотрите тень планеты на кольцах. На Земле видны облака, атмосферный ободок и ночные
              огни.
            </p>
          </section>
        </div>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onStartTour}>
            <Icon name="play" size={14} /> Запустить обучение
          </button>
          <button className="btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
