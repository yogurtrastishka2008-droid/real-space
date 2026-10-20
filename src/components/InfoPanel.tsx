import type { CSSProperties } from 'react';
import { getChildren, KIND_LABEL, type Body } from '../data/bodies';
import { bodyRows, bodySubtitle } from '../lib/bodyInfo';import { plural } from '../lib/format';
import { Icon } from './Icons';

interface InfoPanelProps {
  body: Body | null;
  selectedId: string | null;
  open: boolean;
  onClose: () => void;
  onFly: (id: string) => void;
  onDetails: (id: string) => void;
  onCompare: (id: string) => void;
  onToggleOrbits: () => void;
  orbitsVisible: boolean;
  onOverview: () => void;
  onRandom: () => void;
  scaleMode: 'scientific' | 'explore';
}

function previewStyle(body: Body): CSSProperties {
  if (body.texture && body.kind !== 'belt') {
    return {
      backgroundImage: `radial-gradient(circle at 33% 30%, rgba(255,255,255,0.16), rgba(0,0,0,0.55) 68%), url(${body.texture})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: body.color,
    };
  }
  return {
    background: `radial-gradient(circle at 33% 30%, ${body.color}, #0b1018 75%)`,
  };
}

export function InfoPanel({
  body,
  selectedId,
  open,
  onClose,
  onFly,
  onDetails,
  onCompare,
  onToggleOrbits,
  orbitsVisible,
  onOverview,
  onRandom,
  scaleMode,
}: InfoPanelProps) {
  const rows = body ? bodyRows(body) : [];
  const children = body ? getChildren(body.id) : [];

  return (
    <aside className={`panel info ${open ? 'is-open' : ''}`} aria-label="Информация об объекте">
      <div className="panel__head">
        <span className="eyebrow">Карточка объекта</span>
        <button className="icon-btn panel__close" onClick={onClose} aria-label="Закрыть карточку">
          <Icon name="close" size={16} />
        </button>
      </div>

      {!body && (
        <div className="info__empty">
          <div className="info__system-orbit" aria-hidden="true">
            <span className="so so--1" />
            <span className="so so--2" />
            <span className="so so--3" />
            <span className="so so--sun" />
          </div>
          <h2>Солнечная система</h2>
          <p className="info__latin">Выберите объект в сцене или каталоге</p>
          <p className="info__desc">
            Интерактивная модель восьми планет, пяти карликовых планет, крупнейших спутников и
            поясов малых тел. Положения рассчитываются по кеплеровским элементам J2000 и не являются
            точной эфемеридой.
          </p>
          <div className="info__system-stats">
            <div>
              <strong>8</strong>
              <span>планет</span>
            </div>
            <div>
              <strong>5</strong>
              <span>карликовых</span>
            </div>
            <div>
              <strong>18</strong>
              <span>спутников</span>
            </div>
            <div>
              <strong>2</strong>
              <span>пояса</span>
            </div>
          </div>
          <div className="info__actions">
            <button className="btn btn--primary" onClick={onOverview}>
              <Icon name="orbit" size={16} /> К общему виду
            </button>
            <button className="btn" onClick={onRandom}>
              <Icon name="shuffle" size={16} /> Случайный объект
            </button>
          </div>
          <div className="info__source">
            <Icon name="info" size={14} />
            <span>
              Масштаб: {scaleMode === 'scientific' ? 'научный' : 'исследовательский'}. Источники:
              NASA, JPL, USGS.
            </span>
          </div>
        </div>
      )}

      {body && (
        <>
          <div className="info__hero">
            <div className="info__preview" style={previewStyle(body)}>
              <span className="info__preview-shine" />
            </div>
            <div className="info__titles">
              <span className="info__kind">{bodySubtitle(body)}</span>
              <h2>{body.name}</h2>
              <p className="info__latin">{body.nameEn}</p>
              {selectedId === body.id && <span className="info__selected">выбран в сцене</span>}
            </div>
          </div>

          <div className="info__actions">
            <button className="btn btn--primary" onClick={() => onFly(body.id)}>
              <Icon name="arrow" size={16} /> Перелететь
            </button>
            <button className="btn" onClick={() => onDetails(body.id)}>
              <Icon name="info" size={16} /> Подробнее
            </button>
            <button className={`btn ${orbitsVisible ? 'is-active' : ''}`} onClick={onToggleOrbits}>
              <Icon name="orbit" size={16} />
              {orbitsVisible ? 'Скрыть орбиту' : 'Показать орбиту'}
            </button>
            <button className="btn" onClick={() => onCompare(body.id)}>
              <Icon name="compare" size={16} /> Сравнить
            </button>
            <button className="btn btn--wide" onClick={onOverview}>
              <Icon name="globe" size={16} /> К системе
            </button>
          </div>

          <div className="info__scroll">
            <p className="info__desc">{body.description}</p>

            {body.approxOrbit && (
              <div className="badge-note">
                <Icon name="info" size={13} />
                Положение на орбите — приближённое, не эфемерида.
              </div>
            )}

            <dl className="stat-list">
              {rows.map((row, i) => (
                <div className="stat-row" key={`${row.label}-${i}`}>
                  <dt>
                    {row.label}
                    {row.hint && <em>{row.hint}</em>}
                  </dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            {children.length > 0 && (
              <div className="info__children">
                <span className="eyebrow">Спутники в модели</span>
                <div className="mini-links">
                  {children.map((child) => (
                    <button key={child.id} className="mini-link" onClick={() => onFly(child.id)}>
                      <span style={{ background: child.color }} />
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="info__facts">
              <span className="eyebrow">Интересные факты</span>
              <ul>
                {body.facts.slice(0, 3).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <button className="text-btn" onClick={() => onDetails(body.id)}>
                Все характеристики и факты <Icon name="chevron" size={13} />
              </button>
            </div>

            <div className="info__source">
              <Icon name="info" size={14} />
              <span>
                {body.kind === 'star'
                  ? 'Источник: NASA Solar System Exploration, IAU.'
                  : 'Источник: NASA Planetary Fact Sheet, JPL, USGS Astrogeology.'}
              </span>
            </div>
          </div>

          <div className="panel__foot info__foot">
            <span>{body.kind === 'moon' ? bodySubtitle(body) : KIND_LABEL[body.kind]}</span>
            <span>
              {body.kind === 'moon'
                ? 'приливная синхронизация'
                : children.length > 0
                  ? `${children.length} ${plural(children.length, 'спутник', 'спутника', 'спутников')}`
                  : 'Спутников нет'}
            </span>
          </div>
        </>
      )}
    </aside>
  );
}
