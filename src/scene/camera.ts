import * as THREE from 'three';
import { clamp } from '../lib/format';

interface Pose {
  target: THREE.Vector3;
  radius: number;
  theta: number;
  phi: number;
}

interface Flight {
  from: Pose;
  to: Pose;
  t: number;
  duration: number;
  targetId: string | null;
}

export type FocusResolver = (id: string) => THREE.Vector3 | null;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class SpaceCameraController {
  camera: THREE.PerspectiveCamera;
  element: HTMLElement;

  target = new THREE.Vector3();
  desiredTarget = new THREE.Vector3();
  radius = 200;
  desiredRadius = 200;
  theta = 0.85;
  desiredTheta = 0.85;
  phi = 1.05;
  desiredPhi = 1.05;

  minRadius = 0.02;
  maxRadius = 4000;
  focusId: string | null = null;
  focusRadius = 1;
  resolveFocus: FocusResolver | null = null;
  onTap: ((x: number, y: number) => void) | null = null;
  onInteract: (() => void) | null = null;

  private followOffset = new THREE.Vector3();
  private flight: Flight | null = null;
  private pointers = new Map<number, { x: number; y: number; button: number }>();
  private lastPinch = 0;
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private moved = 0;
  private mode: 'rotate' | 'pan' = 'rotate';
  private disposed = false;
  private lastNear = 0.01;

  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
    this.camera = camera;
    this.element = element;
    element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    element.addEventListener('pointermove', this.onPointerMove, { passive: false });
    element.addEventListener('pointerup', this.onPointerUp, { passive: false });
    element.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.disposed = true;
    const el = this.element;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: Event) => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 2 || e.button === 1 || e.shiftKey) this.mode = 'pan';
    else this.mode = 'rotate';
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    this.followOffset.length();
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();
    this.moved = 0;
    this.lastPinch = 0;
    this.element.setPointerCapture?.(e.pointerId);
    this.stopFlight();
    this.onInteract?.();
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: prev.button });
    this.moved += Math.abs(dx) + Math.abs(dy);

    if (this.pointers.size >= 2) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.lastPinch > 0) {
        this.zoomBy(this.lastPinch / Math.max(1, dist));
      }
      this.lastPinch = dist;
      this.panBy(dx * 0.5, dy * 0.5);
    } else if (this.mode === 'pan') {
      this.panBy(dx, dy);
    } else {
      this.rotateBy(dx, dy);
    }
    e.preventDefault();
  };

  private onPointerUp = (e: PointerEvent) => {
    const wasTracked = this.pointers.delete(e.pointerId);
    this.element.releasePointerCapture?.(e.pointerId);
    if (this.pointers.size < 2) this.lastPinch = 0;
    if (!wasTracked) return;
    const elapsed = performance.now() - this.downTime;
    const travel = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (this.pointers.size === 0 && travel < 6 && elapsed < 600 && this.moved < 12) {
      this.onTap?.(e.clientX, e.clientY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = clamp(e.deltaY, -160, 160);
    this.stopFlight();
    this.zoomBy(Math.exp(delta * 0.0014));
    this.onInteract?.();
  };

  zoomBy(factor: number): void {
    this.desiredRadius = clamp(this.desiredRadius * factor, this.minRadius, this.maxRadius);
  }

  rotateBy(dx: number, dy: number): void {
    this.desiredTheta -= dx * 0.0045;
    this.desiredPhi = clamp(this.desiredPhi - dy * 0.0045, 0.06, Math.PI - 0.06);
  }

  panBy(dx: number, dy: number): void {
    const height = Math.max(1, this.element.clientHeight);
    const scale = (2 * this.radius * Math.tan((this.camera.fov * Math.PI) / 360)) / height;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const delta = right.multiplyScalar(-dx * scale).add(up.multiplyScalar(dy * scale));
    if (this.focusId) {
      this.followOffset.add(delta);
      const maxOffset = Math.max(this.focusRadius * 40, 2);
      if (this.followOffset.length() > maxOffset) this.followOffset.setLength(maxOffset);
    } else {
      this.desiredTarget.add(delta);
      const max = this.maxRadius * 0.7;
      this.desiredTarget.clampLength(0, max);
    }
  }

  setLimits(minRadius: number, maxRadius: number): void {
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;
    this.desiredRadius = clamp(this.desiredRadius, minRadius, maxRadius);
    this.radius = clamp(this.radius, minRadius, maxRadius);
  }

  /** Мгновенно поставить камеру в позицию (без анимации). */
  jumpTo(target: THREE.Vector3, radius: number, theta = this.theta, phi = this.phi): void {
    this.flight = null;
    this.focusId = null;
    this.followOffset.set(0, 0, 0);
    this.target.copy(target);
    this.desiredTarget.copy(target);
    this.radius = clamp(radius, this.minRadius, this.maxRadius);
    this.desiredRadius = this.radius;
    this.theta = theta;
    this.desiredTheta = theta;
    this.phi = phi;
    this.desiredPhi = phi;
    this.updateCamera();
  }

  flyTo(
    target: THREE.Vector3,
    radius: number,
    options: { id?: string | null; duration?: number; theta?: number; phi?: number; focusRadius?: number } = {},
  ): void {
    const distance = this.target.distanceTo(target);
    const duration = options.duration ?? clamp(0.85 + distance * 0.0015, 0.9, 1.9);
    const theta = options.theta ?? this.theta;
    const phi = options.phi ?? this.phi;
    this.flight = {
      from: {
        target: this.target.clone(),
        radius: this.radius,
        theta: this.theta,
        phi: this.phi,
      },
      to: {
        target: target.clone(),
        radius: clamp(radius, this.minRadius, this.maxRadius),
        theta,
        phi,
      },
      t: 0,
      duration,
      targetId: options.id ?? null,
    };
    if (options.id) {
      this.focusId = options.id;
      this.focusRadius = options.focusRadius ?? this.focusRadius;
      this.followOffset.set(0, 0, 0);
    } else {
      this.focusId = null;
    }
  }

  stopFlight(): void {
    if (this.flight) {
      this.flight = null;
      this.desiredTarget.copy(this.target);
      this.desiredRadius = this.radius;
      this.desiredTheta = this.theta;
      this.desiredPhi = this.phi;
    }
  }

  update(dt: number, focusPos: THREE.Vector3 | null): void {
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.duration);
      const e = easeInOut(f.t);
      if (f.targetId && this.resolveFocus) {
        const live = this.resolveFocus(f.targetId);
        if (live) f.to.target.copy(live);
      }
      this.target.lerpVectors(f.from.target, f.to.target, e);
      this.radius = THREE.MathUtils.lerp(f.from.radius, f.to.radius, e);
      this.theta = THREE.MathUtils.lerp(f.from.theta, f.to.theta, e);
      this.phi = THREE.MathUtils.lerp(f.from.phi, f.to.phi, e);
      this.desiredTarget.copy(this.target);
      this.desiredRadius = this.radius;
      this.desiredTheta = this.theta;
      this.desiredPhi = this.phi;
      if (f.t >= 1) {
        this.focusId = f.targetId;
        this.flight = null;
      }
    } else {
      if (this.focusId && focusPos) {
        this.desiredTarget.copy(focusPos).add(this.followOffset);
        // Слежение за движущимся телом без задержки, иначе планета уходит из кадра.
        this.target.copy(this.desiredTarget);
      } else {
        const k = 1 - Math.exp(-dt * 9);
        this.target.lerp(this.desiredTarget, k);
      }
      const k = 1 - Math.exp(-dt * 9);
      this.radius += (this.desiredRadius - this.radius) * k;
      this.theta += (this.desiredTheta - this.theta) * k;
      this.phi += (this.desiredPhi - this.phi) * k;
    }
    this.updateCamera();
  }

  private updateCamera(): void {
    const sinPhi = Math.sin(this.phi);
    const position = new THREE.Vector3(
      this.target.x + this.radius * sinPhi * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.cos(this.theta),
    );
    this.camera.position.copy(position);
    this.camera.lookAt(this.target);
    const near = clamp(this.radius * 0.0035, 0.0004, 4);
    if (Math.abs(near - this.lastNear) / this.lastNear > 0.18) {
      this.camera.near = near;
      this.camera.updateProjectionMatrix();
      this.lastNear = near;
    }
    this.camera.updateMatrixWorld();
  }

  /** Мировые координаты камеры и цели — для мини-карты. */
  getSnapshot(): { position: THREE.Vector3; target: THREE.Vector3 } {
    return { position: this.camera.position.clone(), target: this.target.clone() };
  }

  get isFlying(): boolean {
    return this.flight !== null;
  }

  get pendingFocus(): string | null {
    return this.flight?.targetId ?? null;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
