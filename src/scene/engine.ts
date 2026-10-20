import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { BODIES, BODY_MAP, type Body, type OrbitalElements } from '../data/bodies';
import { clamp } from '../lib/format';
import { SpaceCameraController } from './camera';
import { QUALITY_CAPS, type Settings } from './settings';
import {
  createAtmosphereMaterial,
  createNightMaterial,
  createRingMaterial,
  createStarMaterial,
  createSunMaterial,
} from './shaders';
import {
  fallbackTexture,
  getSelectionTexture,
  loadTextures,
  textureUrls,
} from './textures';

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DAY_MS = 86_400_000;
const SCI_DISTANCE = 40;
const SCI_RADIUS_FACTOR = 6e-6;
const EXPLORE_SUN_RADIUS = 6;
const STAR_RADIUS = 9000;
const MILKYWAY_RADIUS = 12_000;

interface BodyScene {
  body: Body;
  root: THREE.Object3D;
  spin: THREE.Group;
  mesh: THREE.Mesh;
  radius: number;
  distance: number;
  isMoon: boolean;
  orbitLine: THREE.Line | null;
  orbitColor: THREE.Color;
  moonGroup: THREE.Group | null;
  label: CSS2DObject | null;
  labelEl: HTMLButtonElement | null;
  cloud: THREE.Mesh | null;
  atmosphere: THREE.Mesh | null;
  night: THREE.Mesh | null;
  ring: THREE.Mesh | null;
  ringMaterial: THREE.ShaderMaterial | null;
  proxy: THREE.Mesh;
  atmosphereMaterial: THREE.ShaderMaterial | null;
  cloudMaterial: THREE.MeshStandardMaterial | null;
}

export interface MinimapBody {
  id: string;
  x: number;
  z: number;
  color: string;
  selected: boolean;
}

export interface MinimapData {
  bodies: MinimapBody[];
  camera: { x: number; z: number };
  target: { x: number; z: number };
  extent: number;
  mode: Settings['scaleMode'];
}

export interface EngineCallbacks {
  onProgress: (progress: number, message?: string) => void;
  onReady: (meta: { missingTextures: string[] }) => void;
  onSelect: (id: string | null) => void;
  onTick: (date: Date, simDays: number) => void;
  onError: (message: string) => void;
}

export class SolarSystemEngine {
  private container: HTMLElement;
  private settings: Settings;
  private callbacks: EngineCallbacks;

  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: SpaceCameraController;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private bodyScenes = new Map<string, BodyScene>();
  private pickables: THREE.Mesh[] = [];
  private orbitGroup = new THREE.Group();
  private moonsGroup = new THREE.Group();
  private beltGroup = new THREE.Group();
  private kuiperGroup = new THREE.Group();
  private starPoints: THREE.Points | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;
  private milkyway: THREE.Mesh | null = null;
  private sunMaterial: THREE.ShaderMaterial | null = null;
  private sunGlowSprites: THREE.Sprite[] = [];
  private sunLight: THREE.PointLight | null = null;
  private selectionSprite: THREE.Sprite | null = null;
  private selectedId: string | null = null;

  private textures = new Map<string, THREE.Texture>();
  private missingTextures: string[] = [];

  private sphereGeometry = new THREE.SphereGeometry(1, 64, 40);
  private lowSphereGeometry = new THREE.SphereGeometry(1, 32, 20);
  private proxyGeometry = new THREE.SphereGeometry(1, 12, 8);
  private proxyMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private tmpVec = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();

  private epochMs = Date.now();
  private simDays = 0;
  private lastFrame = performance.now();
  private lastTick = 0;
  private raf = 0;
  private labelFrame = 0;
  private disposed = false;
  private running = false;
  private starPixelRatio = 1;

  constructor(container: HTMLElement, settings: Settings, callbacks: EngineCallbacks) {
    this.container = container;
    this.settings = { ...settings };
    this.callbacks = callbacks;
  }

  /* ------------------------------------------------------------- lifecycle */
  async init(): Promise<void> {
    try {
      this.setupRenderer();
      this.setupScene();
      this.callbacks.onProgress(0.04, 'Инициализация рендера');

      const urls = textureUrls(BODIES);
      const result = await loadTextures(urls, this.renderer, (loaded, total) => {
        this.callbacks.onProgress(0.05 + (loaded / total) * 0.82, 'Загрузка текстур');
      });
      if (this.disposed) return;
      this.textures = result.textures;
      this.missingTextures = [...result.failed];
      this.callbacks.onProgress(0.9, 'Сборка сцены');

      this.buildStarfield();
      this.buildMilkyWay();
      this.buildSun();
      this.buildBodies();
      this.buildBelts();
      this.buildSelection();
      this.layout();
      this.setupCamera();
      this.applySettings(this.settings, true);
      this.bindEvents();

      this.callbacks.onProgress(1, 'Готово');
      this.callbacks.onReady({ missingTextures: this.missingTextures });
      if (import.meta.env.DEV) {
        (window as unknown as { __realSpaceEngine?: SolarSystemEngine }).__realSpaceEngine = this;
      }
      this.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(message);
      throw err;
    }
  }

  private setupRenderer(): void {
    const caps = QUALITY_CAPS[this.settings.quality];
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.settings.quality !== 'low',
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      alpha: false,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, caps.pixelRatio));
    this.renderer.setClearColor(0x020308, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.className = 'scene-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020308);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.001, 60_000);
    this.camera.position.set(0, 120, 240);
    this.controls = new SpaceCameraController(this.camera, this.renderer.domElement);
    this.controls.onTap = (x, y) => this.handleTap(x, y);
    this.controls.resolveFocus = (id) => {
      const item = this.bodyScenes.get(id);
      if (!item) return null;
      return item.root.getWorldPosition(new THREE.Vector3());
    };

    this.scene.add(this.orbitGroup);
    this.scene.add(this.moonsGroup);
    this.scene.add(this.beltGroup);
    this.scene.add(this.kuiperGroup);

    const ambient = new THREE.AmbientLight(0x2a3a55, 0.16);
    this.scene.add(ambient);
    this.sunLight = new THREE.PointLight(0xfff3e2, 3.1, 0, 0);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.9);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.resize();
  }

  private bindEvents(): void {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  private onVisibility = () => {
    this.lastFrame = performance.now();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onError('WebGL-контекст потерян. Обновите страницу.');
  };

  resize = (): void => {
    if (this.disposed || !this.renderer) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    this.starPixelRatio = Math.min(window.devicePixelRatio || 1, QUALITY_CAPS[this.settings.quality].pixelRatio);
    if (this.starMaterial) this.starMaterial.uniforms.uPixelRatio.value = this.starPixelRatio;
  };

  /* ---------------------------------------------------------------- assets */
  private tex(url?: string): THREE.Texture | null {
    if (!url) return null;
    return this.textures.get(url) ?? null;
  }

  private bodyTexture(body: Body): THREE.Texture {
    const tex = this.tex(body.texture);
    if (tex) return tex;
    return fallbackTexture(body.color, body.id.length + 3);
  }

  private bumpTexture(body: Body): THREE.Texture | null {
    return this.tex(body.bumpMap);
  }

  private labelFor(body: Body): { label: CSS2DObject; el: HTMLButtonElement } {
    const el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.className = `body-label body-label--${body.kind}`;
    el.dataset.id = body.id;
    const dot = document.createElement('span');
    dot.className = 'body-label__dot';
    const text = document.createElement('span');
    text.className = 'body-label__text';
    text.textContent = body.name;
    el.append(dot, text);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectFromScene(body.id);
    });
    const label = new CSS2DObject(el);
    label.center.set(0.5, 1.05);
    return { label, el };
  }

  /* ---------------------------------------------------------------- stars */
  private buildStarfield(): void {
    const count = QUALITY_CAPS[this.settings.quality].stars;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [
      new THREE.Color(0xaecbff),
      new THREE.Color(0xdfe9ff),
      new THREE.Color(0xffffff),
      new THREE.Color(0xfff1d0),
      new THREE.Color(0xffd2a1),
      new THREE.Color(0xffb08a),
    ];

    for (let i = 0; i < count; i += 1) {
      // равномерно по сфере
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const r = STAR_RADIUS * (0.92 + Math.random() * 0.16);
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = r * s * Math.cos(phi);
      positions[i * 3 + 1] = r * u;
      positions[i * 3 + 2] = r * s * Math.sin(phi);

      const c = palette[Math.floor(Math.random() ** 1.6 * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() < 0.05 ? 2.0 + Math.random() * 1.8 : 0.7 + Math.random() * 1.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.starPixelRatio = Math.min(
      window.devicePixelRatio || 1,
      QUALITY_CAPS[this.settings.quality].pixelRatio,
    );
    this.starMaterial = createStarMaterial(this.starPixelRatio);
    this.starPoints = new THREE.Points(geo, this.starMaterial);
    this.starPoints.frustumCulled = false;
    this.starPoints.renderOrder = -8;
    this.scene.add(this.starPoints);
  }

  private buildMilkyWay(): void {
    const tex = this.tex('/textures/milkyway.jpg');
    if (!tex) return;
    const geo = new THREE.SphereGeometry(MILKYWAY_RADIUS, 64, 40);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });
    this.milkyway = new THREE.Mesh(geo, mat);
    this.milkyway.renderOrder = -9;
    this.milkyway.rotation.z = -0.35;
    this.milkyway.rotation.x = 0.55;
    this.scene.add(this.milkyway);
  }

  /* ------------------------------------------------------------------ sun */
  private buildSun(): void {
    const sun = BODY_MAP.sun;
    const radius = this.displayRadius(sun);
    const root = new THREE.Object3D();
    root.name = 'sun';
    const spin = new THREE.Group();
    root.add(spin);

    const material = createSunMaterial(this.bodyTexture(sun));
    this.sunMaterial = material;
    const mesh = new THREE.Mesh(this.sphereGeometry, material);
    mesh.scale.setScalar(radius);
    spin.add(mesh);

    const glowTex = this.tex('/textures/sun_glow.png');
    if (glowTex) {
      const makeSprite = (scale: number, opacity: number, color: number) => {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color,
            transparent: true,
            opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            toneMapped: false,
          }),
        );
        sprite.scale.setScalar(scale);
        sprite.renderOrder = 1;
        root.add(sprite);
        return sprite;
      };
      this.sunGlowSprites = [
        makeSprite(radius * 3.2, 0.6, 0xffd9a0),
        makeSprite(radius * 7, 0.18, 0xff9a3c),
      ];
    }

    const { label, el } = this.labelFor(sun);
    label.position.set(0, radius * 0.95, 0);
    root.add(label);

    const proxy = new THREE.Mesh(this.proxyGeometry, this.proxyMaterial);
    proxy.scale.setScalar(radius * 1.35);
    proxy.userData.bodyId = sun.id;
    root.add(proxy);
    this.pickables.push(proxy);

    this.scene.add(root);
    this.bodyScenes.set(sun.id, {
      body: sun,
      root,
      spin,
      mesh,
      radius,
      distance: 0,
      isMoon: false,
      orbitLine: null,
      orbitColor: new THREE.Color(sun.color),
      moonGroup: null,
      label,
      labelEl: el,
      cloud: null,
      atmosphere: null,
      night: null,
      ring: null,
      ringMaterial: null,
      proxy,
      atmosphereMaterial: null,
      cloudMaterial: null,
    });
  }

  /* --------------------------------------------------------------- bodies */
  private buildBodies(): void {
    const ordered = [...BODIES].sort((a, b) => {
      const rank = (body: Body) => {
        if (body.kind === 'star' || body.kind === 'belt') return 9;
        return body.parentId ? 1 : 0;
      };
      return rank(a) - rank(b);
    });

    for (const body of ordered) {
      if (body.kind === 'star' || body.kind === 'belt') continue;
      if (body.parentId && !this.bodyScenes.has(body.parentId)) continue;
      this.buildBody(body);
    }
  }

  private buildBody(body: Body): void {
    const parentScene = body.parentId ? this.bodyScenes.get(body.parentId) : null;
    const isMoon = Boolean(body.parentId);
    const radius = this.displayRadius(body);

    const root = new THREE.Object3D();
    root.name = body.id;
    const spin = new THREE.Group();
    if (body.axialTiltDeg !== undefined) {
      spin.rotation.z = body.axialTiltDeg * DEG;
    }
    root.add(spin);

    const material = this.createBodyMaterial(body);
    const geometry = radius < 0.35 ? this.lowSphereGeometry : this.sphereGeometry;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(radius);
    mesh.userData.bodyId = body.id;
    spin.add(mesh);

    let cloud: THREE.Mesh | null = null;
    let cloudMaterial: THREE.MeshStandardMaterial | null = null;
    const cloudTexture = this.tex(body.cloudMap);
    if (cloudTexture) {
      cloudMaterial = new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: this.settings.clouds * 0.92,
        depthWrite: false,
        roughness: 1,
        metalness: 0,
      });
      cloud = new THREE.Mesh(geometry, cloudMaterial);
      cloud.scale.setScalar(radius * 1.007);
      cloud.renderOrder = 1;
      spin.add(cloud);
    }

    let night: THREE.Mesh | null = null;
    const nightTexture = this.tex(body.nightMap);
    if (nightTexture) {
      const nightMat = createNightMaterial(nightTexture);
      nightMat.uniforms.uIntensity.value = 1;
      night = new THREE.Mesh(geometry, nightMat);
      night.scale.setScalar(radius * 1.0015);
      night.renderOrder = 2;
      spin.add(night);
    }

    let atmosphere: THREE.Mesh | null = null;
    let atmosphereMaterial: THREE.ShaderMaterial | null = null;
    if (body.atmosphereStrength) {
      atmosphereMaterial = createAtmosphereMaterial(
        body.atmosphereColor ?? body.color,
        body.atmosphereStrength,
      );
      atmosphere = new THREE.Mesh(geometry, atmosphereMaterial);
      atmosphere.scale.setScalar(radius * (1.025 + 0.02 * (body.atmosphereStrength ?? 0)));
      atmosphere.renderOrder = 3;
      spin.add(atmosphere);
    }

    let ring: THREE.Mesh | null = null;
    let ringMaterial: THREE.ShaderMaterial | null = null;
    if (body.ring) {
      const texture = this.tex(body.ring.texture) ?? fallbackTexture('#cbb994', 7);
      ringMaterial = createRingMaterial(
        texture,
        body.ring.innerRadius,
        body.ring.outerRadius,
        body.ring.opacity,
      );
      const ringGeo = new THREE.RingGeometry(body.ring.innerRadius, body.ring.outerRadius, 256, 1);
      ring = new THREE.Mesh(ringGeo, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 4;
      ring.scale.setScalar(radius);
      spin.add(ring);
    }

    const { label, el } = this.labelFor(body);
    label.position.set(0, radius * 1.02, 0);
    root.add(label);

    const proxy = new THREE.Mesh(this.proxyGeometry, this.proxyMaterial);
    const minPick = this.settings.scaleMode === 'scientific' ? 0.014 : 0.1;
    proxy.scale.setScalar(Math.max(radius * 2.1, minPick));
    proxy.userData.bodyId = body.id;
    root.add(proxy);
    this.pickables.push(proxy);

    let moonGroup: THREE.Group | null = null;
    let distance = 0;

    if (isMoon && parentScene && body.moonOrbit) {
      const parentBody = BODY_MAP[body.parentId!];
      distance = this.moonDistance(body, parentScene.radius, parentBody);
      moonGroup = new THREE.Group();
      moonGroup.rotation.x = body.moonOrbit.inclinationDeg * DEG;
      parentScene.root.add(moonGroup);
      moonGroup.add(root);
      root.position.set(Math.cos(body.moonOrbit.phaseDeg * DEG) * distance, 0, Math.sin(body.moonOrbit.phaseDeg * DEG) * distance);

      const circle = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 128 }, (_, i) => {
          const a = (i / 128) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * distance, 0, Math.sin(a) * distance);
        }),
      );
      const orbitColor = new THREE.Color(body.color).lerp(new THREE.Color(0x5a7290), 0.55);
      const orbitLine = new THREE.Line(
        circle,
        new THREE.LineBasicMaterial({
          color: orbitColor,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      moonGroup.add(orbitLine);
      this.setupOrbitLine(body, orbitLine, orbitColor);
      this.registerScene(body, {
        root,
        spin,
        mesh,
        radius,
        distance,
        isMoon,
        orbitLine,
        orbitColor,
        moonGroup,
        label,
        labelEl: el,
        cloud,
        atmosphere,
        night,
        ring,
        ringMaterial,
        proxy,
        atmosphereMaterial,
        cloudMaterial,
      });
      return;
    }

    this.scene.add(root);

    let orbitLine: THREE.Line | null = null;
    const orbitColor = new THREE.Color(body.color).lerp(new THREE.Color(0x5a7290), 0.5);
    if (body.orbit) {
      const points = this.orbitPoints(body.orbit);
      orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: orbitColor,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
        }),
      );
      this.orbitGroup.add(orbitLine);
      this.setupOrbitLine(body, orbitLine, orbitColor);
    }

    this.registerScene(body, {
      root,
      spin,
      mesh,
      radius,
      distance,
      isMoon: false,
      orbitLine,
      orbitColor,
      moonGroup,
      label,
      labelEl: el,
      cloud,
      atmosphere,
      night,
      ring,
      ringMaterial,
      proxy,
      atmosphereMaterial,
      cloudMaterial,
    });
  }

  private registerScene(body: Body, data: Omit<BodyScene, 'body'>): void {
    this.bodyScenes.set(body.id, { body, ...data });
  }

  private setupOrbitLine(body: Body, line: THREE.Line, color: THREE.Color): void {
    line.userData.bodyId = body.id;
    line.userData.baseColor = color.clone();
    line.userData.baseOpacity = body.parentId ? 0.18 : 0.16;
  }

  private createBodyMaterial(body: Body): THREE.Material {
    const map = this.bodyTexture(body);
    if (body.id === 'earth') {
      const normal = this.tex(body.normalMap);
      const specular = this.tex(body.specularMap);
      return new THREE.MeshPhongMaterial({
        map,
        normalMap: normal ?? undefined,
        normalScale: new THREE.Vector2(0.55, 0.55),
        specularMap: specular ?? undefined,
        specular: new THREE.Color(0x2c3b4d),
        shininess: 14,
      });
    }

    const bump = this.bumpTexture(body);
    const material = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump ?? undefined,
      bumpScale: bump ? (body.kind === 'moon' ? 0.6 : 1.1) : 0,
      roughness: 0.94,
      metalness: 0,
    });
    if (!bump) material.bumpScale = 0;
    return material;
  }

  /* --------------------------------------------------------------- layout */
  private displayRadius(body: Body): number {
    if (body.kind === 'belt') return 0;
    if (this.settings.scaleMode === 'scientific') {
      return body.radiusKm * SCI_RADIUS_FACTOR;
    }
    if (body.kind === 'star') return EXPLORE_SUN_RADIUS;
    const base = body.kind === 'moon' ? 0.34 : 0.62;
    const value = base * Math.pow(body.radiusKm / 6371, 0.55);
    return body.kind === 'moon' ? Math.max(0.075, value) : Math.max(0.1, value);
  }

  private distanceScaleFor(aAu: number): number {
    if (this.settings.scaleMode === 'scientific') {
      return SCI_DISTANCE * this.settings.sceneScale;
    }
    const radius = 12 + 16 * Math.pow(aAu, 0.55);
    return (radius / aAu) * this.settings.sceneScale;
  }

  private moonDistance(body: Body, parentRadius: number, parent: Body): number {
    if (!body.moonOrbit) return 0;
    if (this.settings.scaleMode === 'scientific') {
      return body.moonOrbit.distanceKm * SCI_RADIUS_FACTOR * this.settings.sceneScale;
    }
    const ratio = body.moonOrbit.distanceKm / Math.max(1, parent.radiusKm);
    return (
      Math.max(parentRadius * 2.15, parentRadius * Math.pow(ratio, 0.45) * 0.95) *
      this.settings.sceneScale
    );
  }

  private orbitPoints(elements: OrbitalElements): THREE.Vector3[] {
    const scale = this.distanceScaleFor(elements.aAu);
    const points: THREE.Vector3[] = [];
    const e = elements.e;
    const a = elements.aAu;
    const omega = elements.argPeriDeg * DEG;
    const node = elements.nodeDeg * DEG;
    const inc = elements.iDeg * DEG;
    const cosO = Math.cos(omega);
    const sinO = Math.sin(omega);
    const cosN = Math.cos(node);
    const sinN = Math.sin(node);
    const cosI = Math.cos(inc);
    const sinI = Math.sin(inc);

    for (let i = 0; i <= 512; i += 1) {
      const E = (i / 512) * Math.PI * 2;
      const xv = a * (Math.cos(E) - e);
      const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const x = (cosO * cosN - sinO * sinN * cosI) * xv + (-sinO * cosN - cosO * sinN * cosI) * yv;
      const y = (cosO * sinN + sinO * cosN * cosI) * xv + (-sinO * sinN + cosO * cosN * cosI) * yv;
      const z = sinO * sinI * xv + cosO * sinI * yv;
      points.push(new THREE.Vector3(x * scale, z * scale, y * scale));
    }
    return points;
  }

  private positionFor(elements: OrbitalElements, days: number, target: THREE.Vector3): void {
    const scale = this.distanceScaleFor(elements.aAu);
    const a = elements.aAu;
    const e = elements.e;
    const M = (elements.meanAnomalyDeg + (360 * days) / elements.periodDays) * DEG;
    let E = M;
    for (let i = 0; i < 7; i += 1) {
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const omega = elements.argPeriDeg * DEG;
    const node = elements.nodeDeg * DEG;
    const inc = elements.iDeg * DEG;
    const cosO = Math.cos(omega);
    const sinO = Math.sin(omega);
    const cosN = Math.cos(node);
    const sinN = Math.sin(node);
    const cosI = Math.cos(inc);
    const sinI = Math.sin(inc);
    const x = (cosO * cosN - sinO * sinN * cosI) * xv + (-sinO * cosN - cosO * sinN * cosI) * yv;
    const y = (cosO * sinN + sinO * cosN * cosI) * xv + (-sinO * sinN + cosO * cosN * cosI) * yv;
    const z = sinO * sinI * xv + cosO * sinI * yv;
    target.set(x * scale, z * scale, y * scale);
  }

  /** Пересобрать геометрию/масштабы при смене режима масштаба. */
  layout(): void {
    for (const [, item] of this.bodyScenes) {
      const { body } = item;
      const radius = this.displayRadius(body);
      item.radius = radius;
      if (body.kind === 'star') {
        item.mesh.scale.setScalar(radius);
        item.mesh.rotation.y = 0;
        item.proxy.scale.setScalar(radius * 1.35);
        for (const sprite of this.sunGlowSprites) {
          const index = this.sunGlowSprites.indexOf(sprite);
          sprite.scale.setScalar(radius * (index === 0 ? 3.2 : 7));
        }
        if (item.label) item.label.position.set(0, radius * 0.95, 0);
        continue;
      }

      item.mesh.scale.setScalar(radius);
      if (item.cloud) item.cloud.scale.setScalar(radius * 1.007);
      if (item.night) item.night.scale.setScalar(radius * 1.0015);
      if (item.atmosphere) {
        const strength = body.atmosphereStrength ?? 0.3;
        item.atmosphere.scale.setScalar(radius * (1.025 + 0.02 * strength));
      }
      if (item.ring) item.ring.scale.setScalar(radius);
      if (item.ringMaterial) {
        item.ringMaterial.uniforms.uPlanetRadius.value = radius;
      }
      const minPick = this.settings.scaleMode === 'scientific' ? 0.014 : 0.1;
      item.proxy.scale.setScalar(Math.max(radius * 2.1, minPick));
      if (item.label) item.label.position.set(0, radius * 1.02, 0);

      if (item.orbitLine && body.orbit) {
        const points = this.orbitPoints(body.orbit);
        item.orbitLine.geometry.dispose();
        item.orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }

      if (item.isMoon && item.moonGroup && body.moonOrbit && body.parentId) {
        const parent = this.bodyScenes.get(body.parentId);
        if (parent) {
          item.distance = this.moonDistance(body, parent.radius, BODY_MAP[body.parentId]);
          item.moonGroup.rotation.x = body.moonOrbit.inclinationDeg * DEG;
          const circle = new THREE.BufferGeometry().setFromPoints(
            Array.from({ length: 128 }, (_, i) => {
              const a = (i / 128) * Math.PI * 2;
              return new THREE.Vector3(Math.cos(a) * item.distance, 0, Math.sin(a) * item.distance);
            }),
          );
          if (item.orbitLine) {
            item.orbitLine.geometry.dispose();
            item.orbitLine.geometry = circle;
          } else {
            item.orbitLine = new THREE.Line(
              circle,
              new THREE.LineBasicMaterial({
                color: item.orbitColor,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
              }),
            );
            item.moonGroup.add(item.orbitLine);
          }
        }
      }
    }

    for (const body of BODIES) {
      if (body.kind === 'belt') continue;
      if (!this.bodyScenes.has(body.id)) continue;
      this.updateOrbitHighlight(body.id);
    }
  }

  /* ----------------------------------------------------------- belts */
  private beltAU: { asteroid: Float32Array; kuiper: Float32Array } = {
    asteroid: new Float32Array(0),
    kuiper: new Float32Array(0),
  };
  private asteroidPoints: THREE.Points | null = null;
  private kuiperPoints: THREE.Points | null = null;

  private makeBeltPositions(count: number, innerAu: number, outerAu: number, spread: number): Float32Array {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const aAu = innerAu + Math.pow(Math.random(), 0.7) * (outerAu - innerAu);
      const angle = Math.random() * Math.PI * 2;
      const ecc = 1 - 0.04 * Math.random();
      const x = Math.cos(angle) * aAu * ecc;
      const z = Math.sin(angle) * aAu * ecc;
      arr[i * 3] = x;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread * aAu;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }

  private buildBelts(): void {
    this.beltAU.asteroid = this.makeBeltPositions(1900, 2.06, 3.32, 0.12);
    this.beltAU.kuiper = this.makeBeltPositions(1400, 30, 49, 0.22);

    const makePoints = (data: Float32Array, color: THREE.ColorRepresentation, size: number) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.length), 3));
      const mat = new THREE.PointsMaterial({
        color,
        size,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      return points;
    };

    this.asteroidPoints = makePoints(this.beltAU.asteroid, 0xb3a998, 1.05);
    this.beltGroup.add(this.asteroidPoints);
    this.kuiperPoints = makePoints(this.beltAU.kuiper, 0x8fa8c4, 0.95);
    this.kuiperGroup.add(this.kuiperPoints);

    this.rebuildBeltGeometry();
  }

  private rebuildBeltGeometry(): void {
    const apply = (points: THREE.Points | null, data: Float32Array) => {
      if (!points) return;
      const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attr.array as Float32Array;
      for (let i = 0; i < data.length; i += 3) {
        const aAu = Math.hypot(data[i], data[i + 2]) || 1;
        const scale = this.distanceScaleFor(aAu);
        array[i] = data[i] * scale;
        array[i + 1] = data[i + 1] * scale;
        array[i + 2] = data[i + 2] * scale;
      }
      attr.needsUpdate = true;
      points.geometry.computeBoundingSphere();
    };
    apply(this.asteroidPoints, this.beltAU.asteroid);
    apply(this.kuiperPoints, this.beltAU.kuiper);
  }

  /* ------------------------------------------------------------- selection */
  private buildSelection(): void {
    const material = new THREE.SpriteMaterial({
      map: getSelectionTexture(),
      color: 0x8fd3ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.selectionSprite = new THREE.Sprite(material);
    this.selectionSprite.renderOrder = 8;
    this.scene.add(this.selectionSprite);
    this.updateSelectionVisual();
  }

  private updateSelectionVisual(): void {
    if (!this.selectionSprite) return;
    for (const body of BODIES) {
      if (body.kind === 'belt') continue;
      this.updateOrbitHighlight(body.id);
    }
    const item = this.selectedId ? this.bodyScenes.get(this.selectedId) : null;
    if (!item) {
      this.selectionSprite.visible = false;
      return;
    }
    if (this.selectionSprite.parent !== item.root) {
      item.root.add(this.selectionSprite);
    }
    this.selectionSprite.position.set(0, 0, 0);
    const scaleFactor = item.body.ring ? 0 : item.body.kind === 'star' ? 0 : 3.2;
    this.selectionSprite.scale.setScalar(item.radius * scaleFactor);
    this.selectionSprite.visible = scaleFactor > 0;
  }

  private updateOrbitHighlight(id: string): void {
    const item = this.bodyScenes.get(id);
    if (!item?.orbitLine) return;
    const material = item.orbitLine.material as THREE.LineBasicMaterial;
    const selected = this.selectedId === id;
    if (selected) {
      material.color.set(new THREE.Color(item.body.color).lerp(new THREE.Color(0xffffff), 0.25));
      material.opacity = 0.78;
    } else {
      material.color.copy(item.orbitColor);
      material.opacity = item.body.parentId ? 0.17 : 0.15;
    }
    if (item.labelEl) {
      item.labelEl.classList.toggle('is-selected', selected);
    }
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.updateSelectionVisual();
    this.labelFrame = 0;
  }

  selectFromScene(id: string | null): void {
    this.setSelected(id);
    this.callbacks.onSelect(id);
    if (id) this.flyTo(id);
  }

  private handleTap(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const candidates = this.pickables.filter((proxy) => {
      let obj: THREE.Object3D | null = proxy;
      while (obj) {
        if (!obj.visible) return false;
        obj = obj.parent;
      }
      return true;
    });
    const hits = this.raycaster.intersectObjects(candidates, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.bodyId as string;
      this.selectFromScene(id);
    } else {
      this.selectFromScene(null);
    }
  }

  /* --------------------------------------------------------------- camera */
  private setupCamera(): void {
    const radius = this.overviewRadius();
    this.controls.setLimits(0.01, this.settings.scaleMode === 'scientific' ? 6000 : 800);
    this.controls.jumpTo(new THREE.Vector3(0, 0, 0), radius * 0.62, 0.8, 0.92);
    this.controls.flyTo(new THREE.Vector3(0, 0, 0), radius, {
      duration: 2.2,
      theta: 0.8,
      phi: 1.02,
    });
    this.controls.resolveFocus = (id) => {
      const item = this.bodyScenes.get(id);
      return item ? item.root.getWorldPosition(new THREE.Vector3()) : null;
    };
  }

  private overviewRadius(): number {
    let max = 0;
    for (const body of BODIES) {
      if (body.kind !== 'planet' && body.id !== 'pluto') continue;
      if (!body.orbit) continue;
      max = Math.max(max, this.distanceScaleFor(body.orbit.aAu) * body.orbit.aAu);
    }
    const aspect = this.camera.aspect || 1;
    const aspectFactor = aspect < 1 ? Math.min(2.2, 1 / Math.max(0.45, aspect)) : 1;
    return Math.max(20, max * 1.75 * aspectFactor);
  }

  private maxCameraRadius(): number {
    return this.settings.scaleMode === 'scientific' ? 6000 : 800;
  }

  /** Направление камеры, при котором видна освещённая сторона тела. */
  private litViewAngles(target: THREE.Vector3): { theta: number; phi: number } {
    const sunDir = this.tmpVec.copy(target).multiplyScalar(-1);
    if (sunDir.lengthSq() < 1e-8) {
      return { theta: this.controls.theta, phi: clamp(this.controls.phi, 0.6, 1.3) };
    }
    sunDir.normalize();
    const phase = 0.85;
    const cos = Math.cos(phase);
    const sin = Math.sin(phase);
    const dir = new THREE.Vector3(
      sunDir.x * cos + sunDir.z * sin,
      sunDir.y + 0.34,
      -sunDir.x * sin + sunDir.z * cos,
    ).normalize();
    const phi = clamp(Math.acos(clamp(dir.y, -1, 1)), 0.28, Math.PI - 0.28);
    const theta = Math.atan2(dir.x, dir.z);
    return { theta, phi };
  }

  flyTo(id: string): void {
    if (id === 'asteroid-belt' || id === 'kuiper-belt') {
      this.flyToBelt(id);
      return;
    }
    const item = this.bodyScenes.get(id);
    if (!item) return;
    const target = item.root.getWorldPosition(new THREE.Vector3());
    const radius = item.radius;
    let dist = Math.max(radius * (item.body.kind === 'star' ? 3.1 : 3.9), radius + 0.01);
    if (this.settings.scaleMode === 'explore' && item.body.kind !== 'star') {
      let moonSpread = 0;
      for (const [, child] of this.bodyScenes) {
        if (child.body.parentId === id && child.distance > 0 && child.distance < radius * 12) {
          moonSpread = Math.max(moonSpread, child.distance);
        }
      }
      if (moonSpread > 0) dist = Math.max(dist, moonSpread * 1.9);
    }
    const min = Math.max(radius * 1.28, 0.006);
    const view = this.litViewAngles(target);
    this.controls.minRadius = min;
    this.controls.setLimits(min, this.maxCameraRadius());
    this.controls.flyTo(target, dist, {
      id,
      focusRadius: radius,
      theta: view.theta,
      phi: view.phi,
      duration: dist > 100 ? 2.2 : 1.35,
    });
  }

  private flyToBelt(id: string): void {
    const aAu = id === 'kuiper-belt' ? 38 : 2.7;
    const scale = this.distanceScaleFor(aAu);
    const radius = aAu * scale;
    this.controls.focusId = null;
    this.controls.setLimits(0.02, this.maxCameraRadius());
    this.controls.flyTo(new THREE.Vector3(0, 0, 0), Math.max(radius * 1.1, 10), {
      theta: this.controls.theta,
      phi: 0.78,
      duration: 1.6,
    });
  }

  overview(): void {
    this.controls.setLimits(0.01, this.maxCameraRadius());
    this.controls.flyTo(new THREE.Vector3(0, 0, 0), this.overviewRadius(), {
      theta: 0.8,
      phi: 1.0,
      duration: 1.8,
    });
  }

  /** Предустановленные ракурсы: вид сверху и вид в плоскости орбит. */
  setViewPreset(kind: 'top' | 'side'): void {
    this.controls.focusId = null;
    this.controls.minRadius = 0.01;
    this.controls.setLimits(0.01, this.maxCameraRadius());
    this.controls.flyTo(
      new THREE.Vector3(0, 0, 0),
      this.overviewRadius() * (kind === 'top' ? 0.92 : 1.02),
      {
        theta: kind === 'top' ? 0.9 : 0.35,
        phi: kind === 'top' ? 0.13 : 1.52,
        duration: 1.5,
      },
    );
  }

  resetView(): void {
    this.overview();
  }

  focusOrbit(id: string | null): void {
    if (!id) return;
    const item = this.bodyScenes.get(id);
    if (item?.orbitLine) {
      this.selectedId = id;
      this.updateSelectionVisual();
    }
  }

  /* ---------------------------------------------------------------- time */
  setTimeSpeed(daysPerSecond: number): void {
    this.settings.timeSpeed = Math.max(0, daysPerSecond);
  }

  setPaused(paused: boolean): void {
    this.settings.paused = paused;
  }

  getSimDate(): Date {
    return new Date(this.epochMs + this.simDays * DAY_MS);
  }

  setSimDate(date: Date): void {
    this.simDays = (date.getTime() - this.epochMs) / DAY_MS;
    this.updateBodies();
  }

  resetTimeToNow(): void {
    this.epochMs = Date.now();
    this.simDays = 0;
    this.updateBodies();
  }

  /* ------------------------------------------------------------ settings */
  applySettings(next: Settings, initial = false): void {
    const prev = this.settings;
    this.settings = { ...next };
    const modeChanged = prev.scaleMode !== next.scaleMode || prev.sceneScale !== next.sceneScale;

    this.orbitGroup.visible = next.showOrbits;
    this.moonsGroup.visible = next.showMoons;
    this.beltGroup.visible = next.showBelts;
    this.kuiperGroup.visible = next.showBelts;
    if (this.milkyway) this.milkyway.visible = next.showMilkyWay;

    if (this.starMaterial) {
      this.starMaterial.uniforms.uBrightness.value = next.starBrightness;
    }
    if (this.milkyway) {
      (this.milkyway.material as THREE.MeshBasicMaterial).opacity = 0.52 * next.starBrightness;
    }
    for (let i = 0; i < this.sunGlowSprites.length; i += 1) {
      const sprite = this.sunGlowSprites[i];
      sprite.material.opacity = (i === 0 ? 0.6 : 0.18) * next.sunGlow;
      const radius = this.bodyScenes.get('sun')?.radius ?? 1;
      sprite.scale.setScalar(radius * (i === 0 ? 3.2 : 7) * (0.85 + 0.15 * next.sunGlow));
    }
    if (this.sunLight) this.sunLight.intensity = 3.0 * (0.85 + 0.15 * next.sunGlow);
    if (this.sunMaterial) {
      this.sunMaterial.uniforms.uIntensity.value = 0.95 * (0.8 + 0.2 * next.sunGlow);
    }

    for (const [, item] of this.bodyScenes) {
      if (item.cloudMaterial) {
        item.cloudMaterial.opacity = next.clouds * 0.92;
        if (item.cloud) item.cloud.visible = next.clouds > 0.01;
      }
      if (item.atmosphereMaterial) {
        const base = item.body.atmosphereStrength ?? 0.5;
        item.atmosphereMaterial.uniforms.uIntensity.value = base * next.atmosphere;
        if (item.atmosphere) item.atmosphere.visible = next.atmosphere > 0.01;
      }
      if (item.isMoon) {
        item.root.visible = next.showMoons;
        if (item.orbitLine) item.orbitLine.visible = next.showOrbits && next.showMoons;
      } else if (item.orbitLine) {
        item.orbitLine.visible = next.showOrbits;
      }
    }

    const caps = QUALITY_CAPS[next.quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, caps.pixelRatio));
    this.starPixelRatio = Math.min(window.devicePixelRatio || 1, caps.pixelRatio);
    if (this.starMaterial) this.starMaterial.uniforms.uPixelRatio.value = this.starPixelRatio;
    if (this.bloomPass) this.bloomPass.enabled = next.bloom && next.quality !== 'low';
    this.resize();

    if (modeChanged || initial) {
      this.layout();
      this.rebuildBeltGeometry();
      if (!initial) {
        this.controls.maxRadius = this.maxCameraRadius();
        const focus = this.controls.focusId ? this.bodyScenes.get(this.controls.focusId) : null;
        if (focus) {
          this.controls.minRadius = Math.max(0.008, focus.radius * 1.3);
          this.controls.desiredRadius = focus.radius * 4;
          this.controls.radius = this.controls.desiredRadius;
          const p = focus.root.getWorldPosition(new THREE.Vector3());
          this.controls.target.copy(p);
          this.controls.desiredTarget.copy(p);
        } else {
          this.controls.minRadius = 0.01;
          this.controls.desiredTarget.set(0, 0, 0);
          this.controls.target.set(0, 0, 0);
          this.controls.desiredRadius = this.overviewRadius();
          this.controls.radius = this.controls.desiredRadius;
        }
      }
    }

    this.labelFrame = 0;
    this.updateSelectionVisual();
    this.updateLabels();
  }

  /* --------------------------------------------------------------- render */
  private start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.animate);
  }

  private animate = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(0.06, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (!this.settings.paused) {
      this.simDays += this.settings.timeSpeed * dt;
    }

    this.updateBodies();
    this.scene.updateMatrixWorld();

    const focusId = this.controls.focusId;
    let focusPos: THREE.Vector3 | null = null;
    if (focusId) {
      const item = this.bodyScenes.get(focusId);
      if (item) focusPos = item.root.getWorldPosition(this.tmpVec2);
    }
    this.controls.update(dt, focusPos);

    if (this.sunMaterial) this.sunMaterial.uniforms.uTime.value += dt;
    if (this.starMaterial) this.starMaterial.uniforms.uTime.value += dt;
    if (this.selectionSprite) {
      const pulse = 0.46 + 0.1 * Math.sin(now * 0.002);
      (this.selectionSprite.material as THREE.SpriteMaterial).opacity = pulse;
    }

    this.labelFrame += 1;
    if (this.labelFrame % 6 === 0) this.updateLabels();

    const useBloom = this.settings.bloom && this.settings.quality !== 'low' && this.composer;
    if (useBloom && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.labelRenderer.render(this.scene, this.camera);

    if (now - this.lastTick > 200) {
      this.lastTick = now;
      this.callbacks.onTick(this.getSimDate(), this.simDays);
    }
  };

  private updateBodies(): void {
    const days = (this.epochMs - J2000_MS) / DAY_MS + this.simDays;
    for (const [, item] of this.bodyScenes) {
      const { body } = item;
      if (body.kind === 'star') {
        item.mesh.rotation.y = ((this.simDays * 24) / (body.rotationHours ?? 600)) * Math.PI * 2;
        continue;
      }
      if (body.orbit) {
        this.positionFor(body.orbit, days, this.tmpVec);
        item.root.position.copy(this.tmpVec);
        if (body.rotationHours) {
          item.mesh.rotation.y = ((this.simDays * 24) / body.rotationHours) * Math.PI * 2;
        }
        if (item.cloud) {
          item.cloud.rotation.y = ((this.simDays * 24) / (body.rotationHours ?? 24)) * Math.PI * 2 * 1.06;
        }
        if (item.ringMaterial) {
          item.ringMaterial.uniforms.uPlanetRadius.value = item.radius;
          item.ringMaterial.uniforms.uPlanetPos.value.copy(item.root.position);
        }
      }
      if (item.isMoon && body.moonOrbit && item.moonGroup) {
        const angle = body.moonOrbit.phaseDeg * DEG + (this.simDays / body.moonOrbit.periodDays) * Math.PI * 2;
        item.root.position.set(
          Math.cos(angle) * item.distance,
          0,
          Math.sin(angle) * item.distance,
        );
        item.mesh.rotation.y = angle;
        if (item.cloud) item.cloud.rotation.y = angle;
      }
    }
  }

  private updateLabels(): void {
    const cameraPos = this.camera.position;
    const focus = this.controls.focusId ? this.bodyScenes.get(this.controls.focusId) : null;
    const nearFocus = Boolean(focus && this.controls.radius < focus.radius * 25);
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    const entries: { item: BodyScene; x: number; y: number; priority: number; visible: boolean }[] = [];

    for (const [, item] of this.bodyScenes) {
      const { body, label } = item;
      if (!label) continue;
      let visible = this.settings.showLabels;
      if (body.kind === 'moon') {
        visible = visible && this.settings.showMoons;
        if (visible && this.selectedId !== body.id) {
          const parent = body.parentId ? this.bodyScenes.get(body.parentId) : null;
          if (parent) {
            const parentPos = parent.root.getWorldPosition(this.tmpVec);
            const threshold = Math.max(4, parent.radius * 12);
            visible = cameraPos.distanceTo(parentPos) < threshold;
          } else {
            visible = false;
          }
        }
      } else if (nearFocus && focus && body.id !== focus.body.id) {
        if (focus.body.kind === 'star') {
          visible = false;
        } else {
          const isRelated = body.id === focus.body.parentId || body.parentId === focus.body.id;
          if (!isRelated) {
            const pos = item.root.getWorldPosition(this.tmpVec);
            visible = cameraPos.distanceTo(pos) < focus.radius * 10;
          }
        }
      }

      let x = 0;
      let y = 0;
      if (visible) {
        const pos = item.root.getWorldPosition(this.tmpVec2);
        const ndc = pos.clone().project(this.camera);
        x = (ndc.x * 0.5 + 0.5) * width;
        y = (-ndc.y * 0.5 + 0.5) * height;
        if (ndc.z < -1 || ndc.z > 1 || Math.abs(ndc.x) > 1.15 || Math.abs(ndc.y) > 1.15) {
          visible = false;
        }
      }

      const priority =
        this.selectedId === body.id
          ? 0
          : body.id === 'earth'
            ? 1
            : body.kind === 'star'
              ? 2
              : body.kind === 'planet'
                ? 3
                : body.kind === 'dwarf'
                  ? 4
                  : 5;
      entries.push({ item, x, y, priority, visible });
      item.label!.visible = false;
    }

    entries.sort((a, b) => a.priority - b.priority);
    const placed: { x: number; y: number }[] = [];
    for (const entry of entries) {
      if (!entry.visible || !entry.item.label) continue;
      const clash = placed.some(
        (p) => Math.abs(p.x - entry.x) < 74 && Math.abs(p.y - entry.y) < 19,
      );
      if (clash && entry.priority > 0) {
        entry.item.label.visible = false;
        continue;
      }
      entry.item.label.visible = true;
      placed.push({ x: entry.x, y: entry.y });
    }

    if (this.selectionSprite) {
      this.selectionSprite.visible = this.selectedId !== null;
    }
  }

  isCameraSettled(): boolean {
    return !this.controls.isFlying && this.controls.pendingFocus === null;
  }

  getDebugState(): Record<string, unknown> {
    return {
      selectedId: this.selectedId,
      focusId: this.controls.focusId,
      radius: this.controls.radius,
      target: this.controls.target.toArray(),
      camera: this.camera.position.toArray(),
      aspect: this.camera.aspect,
      overview: this.overviewRadius(),
      bodies: Object.fromEntries(
        [...this.bodyScenes.entries()].map(([id, item]) => [id, item.root.position.toArray()]),
      ),
    };
  }

  getMinimapData(): MinimapData {    const extent = this.overviewRadius();
    const bodies: MinimapBody[] = [];
    for (const [, item] of this.bodyScenes) {
      if (item.isMoon || item.body.kind === 'star') continue;
      const p = item.root.position;
      bodies.push({
        id: item.body.id,
        x: p.x,
        z: p.z,
        color: item.body.color,
        selected: this.selectedId === item.body.id,
      });
    }
    const pos = this.camera.position;
    return {
      bodies,
      camera: { x: pos.x, z: pos.z },
      target: { x: this.controls.target.x, z: this.controls.target.z },
      extent,
      mode: this.settings.scaleMode,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.domElement.removeEventListener('webglcontextlost', this.onContextLost);

    this.scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else if (material) material.dispose();
    });
    for (const tex of this.textures.values()) tex.dispose();
    this.textures.clear();
    this.composer?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.labelRenderer?.domElement.remove();
    this.bodyScenes.clear();
    this.pickables = [];
  }
}
