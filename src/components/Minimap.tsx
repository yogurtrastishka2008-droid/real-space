import { useEffect, useRef } from 'react';
import type { SolarSystemEngine } from '../scene/engine';
import type { Settings } from '../scene/settings';

interface MinimapProps {
  engine: SolarSystemEngine | null;
  selectedId: string | null;
  mode: Settings['scaleMode'];
  onOverview: () => void;
}

export function Minimap({ engine, selectedId, mode, onOverview }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!engine) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 180) return;
      last = now;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = 148;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      const data = engine.getMinimapData();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 10;
      const scale = radius / Math.max(1, data.extent);

      // сетка
      ctx.strokeStyle = 'rgba(126,160,196,0.14)';
      ctx.lineWidth = 1;
      for (const r of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.strokeStyle = 'rgba(126,160,196,0.1)';
      ctx.stroke();

      // орбитальные позиции тел
      for (const body of data.bodies) {
        const x = cx + body.x * scale;
        const y = cy + body.z * scale;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const isSel = body.id === selectedId;
        ctx.beginPath();
        ctx.fillStyle = body.color;
        ctx.globalAlpha = isSel ? 1 : 0.78;
        ctx.arc(x, y, isSel ? 3.2 : 1.8, 0, Math.PI * 2);
        ctx.fill();
        if (isSel) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = '#8fd3ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Солнце
      ctx.beginPath();
      ctx.fillStyle = '#ffbb66';
      ctx.shadowColor = 'rgba(255,180,80,0.8)';
      ctx.shadowBlur = 8;
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // камера
      const camX = cx + data.camera.x * scale;
      const camY = cy + data.camera.z * scale;
      const tx = cx + data.target.x * scale;
      const ty = cy + data.target.z * scale;
      ctx.strokeStyle = 'rgba(143,211,255,0.5)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(camX, camY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.fillStyle = '#8fd3ff';
      ctx.arc(camX, camY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(143,211,255,0.7)';
      ctx.beginPath();
      ctx.arc(tx, ty, 1.6, 0, Math.PI * 2);
      ctx.stroke();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine, selectedId]);

  return (
    <button className="minimap" onClick={onOverview} title="Показать всю систему">
      <span className="minimap__label">
        Карта системы
        <em>{mode === 'scientific' ? 'научный масштаб' : 'условный масштаб'}</em>
      </span>
      <div className="minimap__canvas-wrap">
        <canvas ref={canvasRef} className="minimap__canvas" />
        <span className="minimap__hint">клик — общий вид</span>
      </div>
    </button>
  );
}
