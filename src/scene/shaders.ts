import * as THREE from 'three';

/* ------------------------------------------------------------------ Sun */
export function createSunMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uIntensity: { value: 0.95 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPosW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vPosW;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 flow = vec2(uTime * 0.0035, sin(vUv.y * 12.0 + uTime * 0.05) * 0.0025);
        vec3 tex = texture2D(uMap, vUv + flow).rgb;
        float lum = dot(tex, vec3(0.299, 0.587, 0.114));

        // грануляция и медленно движущиеся ячейки
        float gran = noise(vUv * vec2(320.0, 160.0) + vec2(uTime * 0.35, 0.0));
        float cells = noise(vUv * vec2(46.0, 23.0) - vec2(uTime * 0.11, uTime * 0.04));
        float fine = 0.86 + 0.22 * gran + 0.16 * cells;

        vec3 deep = vec3(0.82, 0.18, 0.02);
        vec3 mid = vec3(1.0, 0.52, 0.10);
        vec3 hot = vec3(1.0, 0.93, 0.72);
        vec3 col = mix(deep, mid, smoothstep(0.10, 0.55, lum));
        col = mix(col, hot, smoothstep(0.55, 0.95, lum));

        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);
        float limb = smoothstep(0.0, 0.9, dot(N, V));
        col *= mix(0.45, 1.10, limb);
        col *= fine;
        col += vec3(0.30, 0.11, 0.02) * (1.0 - limb);
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
  });
}

/* ----------------------------------------------------------- Atmosphere */
export function createAtmosphereMaterial(
  color: string,
  intensity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPosW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform vec3 uSunPos;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);
        float rim = pow(1.0 - abs(dot(N, V)), 3.2);
        vec3 sunDir = normalize(uSunPos - vPosW);
        float lit = clamp(dot(N, sunDir), 0.0, 1.0);
        float alpha = rim * uIntensity * (0.12 + 0.88 * lit);
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

/* --------------------------------------------------------- Ночные огни */
export function createNightMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uIntensity: { value: 1 },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPosW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uIntensity;
      uniform vec3 uSunPos;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 sunDir = normalize(uSunPos - vPosW);
        float lambert = dot(N, sunDir);
        float night = smoothstep(0.16, -0.18, lambert);
        vec3 lights = texture2D(uMap, vUv).rgb;
        float l = max(max(lights.r, lights.g), lights.b);
        vec3 col = lights * (0.7 + l) * uIntensity * night * 1.7;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/* ---------------------------------------------------------------- Rings */
export function createRingMaterial(
  map: THREE.Texture,
  inner: number,
  outer: number,
  opacity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uInner: { value: inner },
      uOuter: { value: outer },
      uOpacity: { value: opacity },
      uPlanetPos: { value: new THREE.Vector3() },
      uPlanetRadius: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying float vR;
      varying vec3 vPosW;
      void main() {
        vR = length(position.xy);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vPosW = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform float uInner;
      uniform float uOuter;
      uniform float uOpacity;
      uniform vec3 uPlanetPos;
      uniform float uPlanetRadius;
      varying float vR;
      varying vec3 vPosW;

      void main() {
        float u = (vR - uInner) / (uOuter - uInner);
        if (u < 0.0 || u > 1.0) discard;
        vec4 tex = texture2D(uMap, vec2(clamp(u, 0.001, 0.999), 0.5));
        if (tex.a < 0.01) discard;

        // Тень планеты на кольцах: точка за планетой относительно Солнца (0,0,0).
        vec3 sunDir = normalize(-uPlanetPos);
        vec3 p = vPosW - uPlanetPos;
        float along = dot(p, sunDir);
        float perp = length(p - sunDir * along);
        float shadow = 1.0;
        if (along < 0.0) {
          shadow = smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.10, perp);
        }
        float lit = 0.22 + 0.78 * shadow;

        gl_FragColor = vec4(tex.rgb * lit, tex.a * uOpacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/* ------------------------------------------------------------ Starfield */
export function createStarMaterial(pixelRatio: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uBrightness: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      uniform float uTime;
      void main() {
        vColor = aColor;
        vAlpha = 0.68 + 0.32 * sin(uTime * 0.55 + position.x * 0.013 + position.y * 0.021);
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uBrightness;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.02, r);
        float halo = smoothstep(0.5, 0.12, r) * 0.5;
        float a = (core + halo) * vAlpha * uBrightness;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
}
