import { useMemo, useState } from 'react';
import {
  BODIES,
  getParent,
  KIND_LABEL,
  KIND_ORDER,
  type Body,
  type BodyKind,
} from '../data/bodies';
import { auShort, days, plural } from '../lib/format';
import { Icon } from './Icons';

type CatalogFilter = BodyKind | 'all';

interface CatalogPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

const GROUPS: { kind: BodyKind; title: string }[] = [
  { kind: 'star', title: 'Звезда' },
  { kind: 'planet', title: 'Планеты' },
  { kind: 'dwarf', title: 'Карликовые планеты' },
  { kind: 'moon', title: 'Спутники' },
  { kind: 'belt', title: 'Малые тела и пояса' },
];

function metaFor(body: Body): string {
  if (body.kind === 'belt') return body.id === 'kuiper-belt' ? '30–50 а.е.' : '2,1–3,3 а.е.';
  if (body.orbit) return auShort(body.orbit.aAu);
  if (body.moonOrbit) return days(body.moonOrbit.periodDays);
  return '';
}

export function CatalogPanel({ selectedId, onSelect, open, onClose }: CatalogPanelProps) {
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map = new Map<CatalogFilter, number>();
    map.set('all', BODIES.length);
    for (const body of BODIES) map.set(body.kind, (map.get(body.kind) ?? 0) + 1);
    return map;
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((group) => ({
      ...group,
      bodies: BODIES.filter(
        (b) =>
          b.kind === group.kind &&
          (filter === 'all' || b.kind === filter) &&
          (q === '' ||
            b.name.toLowerCase().includes(q) ||
            b.nameEn.toLowerCase().includes(q) ||
            (b.searchTerms ?? []).some((t) => t.toLowerCase().includes(q))),
      ),
    })).filter((g) => g.bodies.length > 0);
  }, [filter, query]);

  return (
    <aside className={`panel catalog ${open ? 'is-open' : ''}`} aria-label="Каталог небесных тел">
      <div className="panel__head">
        <div>
          <span className="eyebrow">Каталог объектов</span>
          <h2>Солнечная система</h2>
        </div>
        <button className="icon-btn panel__close" onClick={onClose} aria-label="Закрыть каталог">
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="catalog__filters" role="tablist" aria-label="Фильтр по типу">
        <button
          className={`chip ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все <span>{counts.get('all')}</span>
        </button>
        {KIND_ORDER.map((kind) => (
          <button
            key={kind}
            className={`chip ${filter === kind ? 'is-active' : ''}`}
            onClick={() => setFilter(kind)}
          >
            {KIND_LABEL[kind]}
            <span>{counts.get(kind)}</span>
          </button>
        ))}
      </div>

      <label className="catalog__search">
        <Icon name="search" size={14} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Фильтр по названию"
          aria-label="Фильтр каталога по названию"
        />
      </label>

      <div className="catalog__scroll">
        {groups.length === 0 && <p className="catalog__empty">В этой категории ничего нет.</p>}
        {groups.map((group) => (
          <section key={group.kind} className="catalog__group">
            <h3>
              {group.title} <span>{group.bodies.length}</span>
            </h3>
            {group.bodies.map((body) => {
              const parent = getParent(body);
              return (
                <button
                  key={body.id}
                  className={`catalog-item ${selectedId === body.id ? 'is-selected' : ''}`}
                  onClick={() => onSelect(body.id)}
                >
                  <span
                    className="catalog-item__orb"
                    style={{
                      background: `radial-gradient(circle at 32% 30%, ${body.color}, #131820 72%)`,
                    }}
                  />
                  <span className="catalog-item__main">
                    <strong>{body.name}</strong>
                    <small>
                      {KIND_LABEL[body.kind]}
                      {parent ? ` · ${parent.name}` : ''}
                    </small>
                  </span>
                  <span className="catalog-item__meta">{metaFor(body)}</span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <div className="panel__foot catalog__foot">
        <span>
          {BODIES.length} {plural(BODIES.length, 'объект', 'объекта', 'объектов')} в каталоге
        </span>
        <span>NASA / JPL / USGS</span>
      </div>
    </aside>
  );
}
