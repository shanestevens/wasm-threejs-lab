import * as THREE from "three";

import { BaseDemo } from "./base-demo";

type EffectKey = "all" | "hologram" | "lava" | "contour" | "aurora";

type ShaderEntry = {
  key: Exclude<EffectKey, "all">;
  pivot: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  shell: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  base: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  halo: THREE.Sprite;
  material: THREE.ShaderMaterial;
  shellMaterial: THREE.ShaderMaterial;
  anchorY: number;
  baseRotation: THREE.Euler;
};

function rgba(color: THREE.ColorRepresentation, alpha: number): string {
  const resolved = new THREE.Color(color);
  const r = Math.round(resolved.r * 255);
  const g = Math.round(resolved.g * 255);
  const b = Math.round(resolved.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createGlowTexture(
  inner: THREE.ColorRepresentation,
  mid: THREE.ColorRepresentation,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create glow texture");
  }

  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 122);
  gradient.addColorStop(0, rgba(inner, 0.95));
  gradient.addColorStop(0.28, rgba(mid, 0.55));
  gradient.addColorStop(0.68, rgba(mid, 0.12));
  gradient.addColorStop(1, rgba(mid, 0));

  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = `
  uniform float uTime;
  uniform float uDistortion;
  uniform float uMode;
  uniform float uShell;

  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;

    float waveA = sin(position.y * 9.0 + uTime * (1.6 + uMode * 0.55) + position.x * 7.0);
    float waveB = sin(position.z * 11.0 - uTime * 2.2 + position.y * 4.0 + uMode * 1.7);
    float shellScale = mix(1.0, 1.9, uShell);
    float displacement = (waveA * 0.02 + waveB * 0.012) * uDistortion * shellScale;
    vec3 displaced = position + normal * displacement;

    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = world.xyz;
    vNormalDir = normalize(normalMatrix * normal);
    vWave = waveA * 0.5 + waveB * 0.5;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uPulse;
  uniform float uDistortion;
  uniform float uRim;
  uniform float uGlow;
  uniform float uMode;
  uniform float uShell;
  uniform vec3 uBase;
  uniform vec3 uAccent;

  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying vec2 vUv;
  varying float vWave;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.17, 0.23, 0.31));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int index = 0; index < 4; index++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec3(9.1, 5.7, 3.4);
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 normalDir = normalize(vNormalDir);
    vec3 lightDir = normalize(vec3(-0.2, 0.82, 0.46));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    float diffuse = max(dot(normalDir, lightDir), 0.0);
    float fresnel = pow(1.0 - max(dot(normalDir, viewDir), 0.0), 2.2 + uRim * 1.15);

    float energy = fbm(vWorldPos * 2.2 + vec3(0.0, uTime * (0.65 + uPulse * 0.35), 0.0));
    float energyAlt = fbm(vWorldPos.zyx * 1.85 + vec3(uTime * 0.28, -uTime * 0.15, uTime * 0.21));

    float scan = 0.5 + 0.5 * sin(vUv.y * 88.0 + uTime * (10.0 + uPulse * 5.8) + energy * 10.0);
    float arcs = 0.5 + 0.5 * sin(atan(vWorldPos.z, vWorldPos.x) * 10.0 + uTime * (2.1 + uPulse * 2.3) + energyAlt * 8.5);
    float contour = smoothstep(0.56, 0.98, abs(sin(length(vUv - 0.5) * 35.0 - uTime * (4.4 + uPulse * 4.0) + energy * 7.0)));
    float lattice = smoothstep(0.68, 1.0, sin(vUv.x * 18.0 + energy * 9.0) * sin(vUv.y * 24.0 - uTime * 3.0));
    float molten = smoothstep(0.58, 0.86, energy + 0.45 * sin(vWorldPos.y * 14.0 - uTime * (3.0 + uPulse * 2.0)));
    float pulse = 0.5 + 0.5 * sin(uTime * (3.0 + uPulse * 1.8) + vWave * 2.2);

    vec3 color = uBase * (0.18 + diffuse * 0.45);
    float alpha = 1.0;

    if (uMode < 0.5) {
      float grid = max(lattice, scan * 0.75);
      color = mix(uBase * 0.26, uAccent, grid * 0.82 + fresnel * 0.46);
      color += vec3(0.05, 0.18, 0.34) * (0.45 + arcs * 0.55);
      color += uAccent * fresnel * (1.55 + uGlow);
      color += uAccent * pulse * 0.12;
      alpha = 0.72 + fresnel * 0.22;
    } else if (uMode < 1.5) {
      float veins = smoothstep(0.42, 0.94, molten + energyAlt * 0.36);
      vec3 ember = mix(uBase * 0.65, uAccent, veins);
      color = ember * (0.42 + diffuse * 0.78);
      color += vec3(1.55, 0.58, 0.12) * pow(veins, 3.1) * (0.48 + uGlow);
      color += vec3(0.34, 0.08, 0.02) * contour * 0.42;
    } else if (uMode < 2.5) {
      float stripes = smoothstep(0.6, 0.96, abs(sin((vUv.y + energy * 0.16) * 62.0)));
      float edgeMix = max(stripes, contour);
      color = mix(uBase * 0.18, uAccent, edgeMix);
      color += uAccent * fresnel * (1.1 + uGlow);
      color += vec3(0.14, 0.18, 0.26) * arcs;
      color += uAccent * pulse * 0.08;
    } else {
      float ribbons = smoothstep(0.32, 0.95, arcs * 0.45 + energy * 0.55);
      vec3 aurora = mix(uBase, uAccent, ribbons);
      color = aurora * (0.4 + diffuse * 0.42);
      color += mix(vec3(0.22, 0.8, 1.0), vec3(0.85, 1.0, 0.9), energyAlt) * fresnel * (1.18 + uGlow * 0.75);
      color += aurora * scan * 0.24;
    }

    if (uShell > 0.5) {
      float shell = pow(fresnel, 0.8) * (0.34 + 0.66 * max(arcs, energy));
      vec3 shellColor = mix(uBase, uAccent, 0.45 + 0.55 * max(contour, energyAlt));
      gl_FragColor = vec4(shellColor * shell * (1.55 + uGlow * 2.15), shell * (0.34 + 0.24 * uGlow));
      return;
    }

    color *= 1.0 + uGlow * 0.28;
    gl_FragColor = vec4(color, alpha);
  }
`;

function makeShaderMaterial(
  mode: number,
  base: THREE.ColorRepresentation,
  accent: THREE.ColorRepresentation,
  shell = false,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 1.15 },
      uDistortion: { value: 0.48 },
      uRim: { value: 1.35 },
      uGlow: { value: 1.25 },
      uMode: { value: mode },
      uShell: { value: shell ? 1 : 0 },
      uBase: { value: new THREE.Color(base) },
      uAccent: { value: new THREE.Color(accent) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: !shell,
    side: shell ? THREE.BackSide : THREE.FrontSide,
    blending: shell ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

export class ShaderFxBenchDemo extends BaseDemo {
  private readonly rig = new THREE.Group();
  private readonly entries: ShaderEntry[] = [];
  private readonly lightBars: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly orbGlow: THREE.Sprite;

  private focus: EffectKey = "all";
  private pulse = 1.15;
  private distortion = 0.48;
  private rim = 1.35;
  private glow = 1.25;

  constructor(root: HTMLElement) {
    super(root);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.24;

    this.scene.fog = new THREE.Fog(0x020611, 8, 18);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.15, 96),
      new THREE.MeshStandardMaterial({
        color: 0x070d1a,
        roughness: 0.9,
        metalness: 0.12,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.06;
    floor.receiveShadow = true;

    const floorWash = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 72),
      new THREE.MeshBasicMaterial({
        color: 0x123878,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    floorWash.rotation.x = -Math.PI / 2;
    floorWash.position.y = -1.045;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.18, 0.065, 18, 160),
      new THREE.MeshBasicMaterial({
        color: 0x21508d,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.995;

    const backPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 3.8),
      new THREE.MeshBasicMaterial({
        color: 0x040916,
        transparent: true,
        opacity: 0.92,
      }),
    );
    backPanel.position.set(0, 0.55, -1.8);

    const glowTexture = createGlowTexture(0xbfdfff, 0x4b7dff);
    this.orbGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xfff5e8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.orbGlow.position.set(0, 1.92, -0.9);
    this.orbGlow.scale.set(0.58, 0.58, 1);

    const barConfigs: Array<[number, number, number, number, THREE.ColorRepresentation]> = [
      [-2.1, 0.32, -1.46, -0.22, 0x2a7bff],
      [-0.84, 0.5, -1.32, 0.18, 0x86f2ff],
      [0.88, 0.4, -1.3, -0.16, 0xff7bc3],
      [2.06, 0.18, -1.44, 0.24, 0x7affc8],
    ];

    for (const [x, y, z, tilt, color] of barConfigs) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 2.7),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      bar.position.set(x, y, z);
      bar.rotation.y = tilt;
      bar.userData.anchorY = y;
      this.lightBars.push(bar);
    }

    const baseGeometry = new THREE.CylinderGeometry(0.36, 0.42, 0.14, 42);
    const hologramGlow = createGlowTexture(0x97f1ff, 0x234d9b);
    const moltenGlow = createGlowTexture(0xffcb95, 0xff6a29);
    const contourGlow = createGlowTexture(0xf0f6ff, 0x5175e7);
    const auroraGlow = createGlowTexture(0xb2ffe8, 0x3a7cff);

    const descriptors: Array<{
      key: Exclude<EffectKey, "all">;
      mode: number;
      base: THREE.ColorRepresentation;
      accent: THREE.ColorRepresentation;
      geometry: THREE.BufferGeometry;
      position: [number, number, number];
      rotation: [number, number, number];
      haloTexture: THREE.Texture;
      haloColor: THREE.ColorRepresentation;
      ringColor: THREE.ColorRepresentation;
    }> = [
      {
        key: "hologram",
        mode: 0,
        base: 0x123d74,
        accent: 0x7af3ff,
        geometry: new THREE.TorusKnotGeometry(0.24, 0.085, 180, 28),
        position: [-1.62, 0.02, 0.14],
        rotation: [0.42, 0.2, 0.12],
        haloTexture: hologramGlow,
        haloColor: 0x8cecff,
        ringColor: 0x2f73ff,
      },
      {
        key: "lava",
        mode: 1,
        base: 0x2d0907,
        accent: 0xffa256,
        geometry: new THREE.IcosahedronGeometry(0.38, 3),
        position: [-0.52, 0.16, -0.12],
        rotation: [0.14, -0.26, 0.18],
        haloTexture: moltenGlow,
        haloColor: 0xffb770,
        ringColor: 0xff7d2b,
      },
      {
        key: "contour",
        mode: 2,
        base: 0x060a12,
        accent: 0xf5fbff,
        geometry: new THREE.OctahedronGeometry(0.42, 3),
        position: [0.56, 0.17, -0.06],
        rotation: [0.2, 0.28, 0],
        haloTexture: contourGlow,
        haloColor: 0xffffff,
        ringColor: 0x8db2ff,
      },
      {
        key: "aurora",
        mode: 3,
        base: 0x11253d,
        accent: 0x9cffdc,
        geometry: new THREE.CapsuleGeometry(0.21, 0.58, 10, 24),
        position: [1.64, 0.02, 0.12],
        rotation: [0, 0.4, -0.12],
        haloTexture: auroraGlow,
        haloColor: 0xa2ffe2,
        ringColor: 0x47d7c3,
      },
    ];

    for (const descriptor of descriptors) {
      const pivot = new THREE.Group();
      pivot.position.set(...descriptor.position);

      const base = new THREE.Mesh(
        baseGeometry,
        new THREE.MeshStandardMaterial({
          color: 0x111a2a,
          roughness: 0.42,
          metalness: 0.36,
          emissive: new THREE.Color(descriptor.ringColor).multiplyScalar(0.14),
        }),
      );
      base.position.y = -0.48;
      base.castShadow = true;
      base.receiveShadow = true;

      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.022, 12, 84),
        new THREE.MeshBasicMaterial({
          color: descriptor.ringColor,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -0.4;

      const material = makeShaderMaterial(descriptor.mode, descriptor.base, descriptor.accent);
      const shellMaterial = makeShaderMaterial(descriptor.mode, descriptor.base, descriptor.accent, true);
      const mesh = new THREE.Mesh(descriptor.geometry, material);
      const shell = new THREE.Mesh(descriptor.geometry.clone(), shellMaterial);
      shell.scale.setScalar(1.12);

      mesh.rotation.set(...descriptor.rotation);
      shell.rotation.copy(mesh.rotation);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: descriptor.haloTexture,
          color: descriptor.haloColor,
          transparent: true,
          opacity: 0.68,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.position.set(0, 0.06, -0.44);
      halo.scale.set(1.75, 1.75, 1);

      pivot.add(halo, ringMesh, base, shell, mesh);

      this.entries.push({
        key: descriptor.key,
        pivot,
        mesh,
        shell,
        base,
        ring: ringMesh,
        halo,
        material,
        shellMaterial,
        anchorY: descriptor.position[1],
        baseRotation: mesh.rotation.clone(),
      });

      this.rig.add(pivot);
    }

    this.scene.add(backPanel, floor, floorWash, ring, this.orbGlow, ...this.lightBars, this.rig);

    this.scene.add(new THREE.AmbientLight(0xa0b8ff, 0.14));

    const keyLight = new THREE.DirectionalLight(0xffdcc4, 0.78);
    keyLight.position.set(3.8, 4.4, 2.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0004;

    const fillLight = new THREE.DirectionalLight(0x5a93ff, 0.34);
    fillLight.position.set(-3.1, 2.6, -2.8);

    const stageLight = new THREE.PointLight(0x2f7cff, 1.3, 9.5, 2.2);
    stageLight.position.set(0, 1.35, 1.05);

    const emberLight = new THREE.PointLight(0xff8a42, 0.6, 6.5, 2.1);
    emberLight.position.set(-0.65, 0.45, 0.7);

    this.scene.add(keyLight, fillLight, stageLight, emberLight);

    this.camera.position.set(4.9, 2.16, 4.85);
    this.controls.target.set(0, -0.06, -0.1);
    this.controls.autoRotateSpeed = 0.56;

    this.bindCheckbox("shader-auto-rotate", (value) => {
      this.setAutoRotate(value);
    });
    this.bindSelect("shader-focus", (value) => {
      const allowed: EffectKey[] = ["all", "hologram", "lava", "contour", "aurora"];
      this.focus = allowed.includes(value as EffectKey) ? (value as EffectKey) : "all";
      this.updateVisibility();
    });
    this.bindRange("shader-pulse", (value) => {
      this.pulse = value;
      for (const entry of this.entries) {
        entry.material.uniforms.uPulse.value = value;
        entry.shellMaterial.uniforms.uPulse.value = value;
      }
    }, (value) => `${value.toFixed(2)}x`);
    this.bindRange("shader-distortion", (value) => {
      this.distortion = value;
      for (const entry of this.entries) {
        entry.material.uniforms.uDistortion.value = value;
        entry.shellMaterial.uniforms.uDistortion.value = value;
      }
    }, (value) => value.toFixed(2));
    this.bindRange("shader-rim", (value) => {
      this.rim = value;
      for (const entry of this.entries) {
        entry.material.uniforms.uRim.value = value;
        entry.shellMaterial.uniforms.uRim.value = value;
      }
    }, (value) => value.toFixed(2));
    this.bindRange("shader-glow", (value) => {
      this.glow = value;
      for (const entry of this.entries) {
        entry.material.uniforms.uGlow.value = value;
        entry.shellMaterial.uniforms.uGlow.value = value;
      }
    }, (value) => value.toFixed(2));

    this.updateVisibility();
  }

  protected update(_delta: number, elapsed: number): void {
    this.rig.rotation.y = Math.sin(elapsed * 0.24) * 0.18;

    for (let index = 0; index < this.entries.length; index += 1) {
      const entry = this.entries[index];
      const phase = elapsed * (0.72 + index * 0.08);
      const bob = Math.sin(phase * 1.4 + index * 0.8) * 0.045;

      entry.pivot.position.y = entry.anchorY + bob;
      entry.material.uniforms.uTime.value = elapsed;
      entry.shellMaterial.uniforms.uTime.value = elapsed;

      entry.mesh.rotation.x = entry.baseRotation.x + Math.sin(elapsed * (0.9 + index * 0.18)) * 0.2;
      entry.mesh.rotation.y = entry.baseRotation.y + elapsed * (0.46 + index * 0.08) + index * 0.18;
      entry.mesh.rotation.z = entry.baseRotation.z + Math.cos(elapsed * (0.72 + index * 0.14)) * 0.08;
      entry.shell.rotation.copy(entry.mesh.rotation);
      entry.ring.rotation.z = Math.sin(elapsed * 0.6 + index) * 0.06;

      const haloScale = 1.62 + Math.sin(elapsed * 1.7 + index * 0.6) * 0.1 + this.glow * 0.18;
      entry.halo.scale.set(haloScale, haloScale, 1);
      entry.halo.material.opacity = 0.44 + Math.max(0, Math.sin(elapsed * 2.1 + index)) * 0.18 + this.glow * 0.08;
    }

    for (let index = 0; index < this.lightBars.length; index += 1) {
      const bar = this.lightBars[index];
      bar.material.opacity = 0.12 + Math.max(0, Math.sin(elapsed * 1.2 + index * 0.9)) * 0.1;
      bar.position.y = (bar.userData.anchorY as number) + Math.sin(elapsed * 0.7 + index) * 0.08;
    }

    this.orbGlow.scale.setScalar(0.56 + Math.sin(elapsed * 1.6) * 0.05);
    this.orbGlow.material.opacity = 0.76 + Math.sin(elapsed * 1.8) * 0.08;
  }

  private updateVisibility(): void {
    for (const entry of this.entries) {
      const visible = this.focus === "all" || entry.key === this.focus;
      entry.pivot.visible = visible;
    }
  }
}
