import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { BaseDemo } from "./base-demo";

type RelicTheme = "aqua" | "opal" | "amber";

type ThemeSpec = {
  background: THREE.ColorRepresentation;
  fog: THREE.ColorRepresentation;
  stage: THREE.ColorRepresentation;
  wall: THREE.ColorRepresentation;
  inset: THREE.ColorRepresentation;
  glowA: THREE.ColorRepresentation;
  glowB: THREE.ColorRepresentation;
  glass: THREE.ColorRepresentation;
  attenuation: THREE.ColorRepresentation;
  shellA: THREE.ColorRepresentation;
  shellB: THREE.ColorRepresentation;
  key: THREE.ColorRepresentation;
  rim: THREE.ColorRepresentation;
  accent: THREE.ColorRepresentation;
};

const CAUSTIC_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CAUSTIC_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uStrength;
  uniform float uDistortion;
  uniform float uMode;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec2 vUv;

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

    for (int index = 0; index < 5; index++) {
      value += amplitude * noise(p);
      p = p * 2.02 + vec3(9.1, 5.7, 3.4);
      amplitude *= 0.52;
    }

    return value;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= mix(1.35, 0.92, uMode);
    uv.y *= mix(0.86, 1.18, uMode);

    float time = uTime * 0.24;
    vec2 warp = vec2(
      fbm(vec3(uv * (3.1 + uDistortion * 1.8) + vec2(time, -time * 0.6), time)),
      fbm(vec3((uv.yx + vec2(-time * 0.75, time * 0.38)) * (3.6 + uDistortion * 2.2), time * 0.55))
    );
    vec2 flowUv = uv * (3.4 + uDistortion * 3.2) + (warp - 0.5) * (0.95 + uDistortion * 0.85);

    float causticA = 1.0 / (abs(sin((flowUv.x + flowUv.y * 0.72 + warp.x * 2.5) * 8.8 + time * 3.2)) * 8.0 + 0.08);
    float causticB = 1.0 / (abs(sin((flowUv.x * 0.58 - flowUv.y + warp.y * 2.0) * 10.3 - time * 2.4)) * 9.5 + 0.08);
    float ribbons = smoothstep(0.3, 0.98, 0.5 + 0.5 * sin(length(uv) * 22.0 - time * 6.0 + warp.x * 4.5));
    float intensity = pow(clamp(max(causticA, causticB) * 0.3, 0.0, 1.0), 1.6) * ribbons;

    float falloff = smoothstep(1.12, 0.06, length(uv * vec2(1.0, 1.22)));
    intensity *= falloff * uStrength;

    vec3 color = mix(uColorA, uColorB, clamp(warp.y * 1.35, 0.0, 1.0)) * intensity;
    gl_FragColor = vec4(color, intensity * 0.7);
  }
`;

const SHELL_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uDistortion;

  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying float vWave;

  void main() {
    float waveA = sin(position.y * 8.0 + uTime * 1.5 + position.x * 6.5);
    float waveB = sin(position.z * 11.0 - uTime * 1.2 + position.y * 5.2);
    float offset = (waveA * 0.018 + waveB * 0.014) * uDistortion;
    vec3 displaced = position + normal * offset;
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = world.xyz;
    vNormalDir = normalize(normalMatrix * normal);
    vWave = waveA * 0.6 + waveB * 0.4;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SHELL_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGlow;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying float vWave;

  void main() {
    vec3 normalDir = normalize(vNormalDir);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(normalDir, viewDir), 0.0), 1.35);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.8 + vWave * 3.6);
    vec3 color = mix(uColorA, uColorB, pulse) * fresnel * (1.15 + uGlow * 1.5);
    float alpha = fresnel * (0.26 + uGlow * 0.18);
    gl_FragColor = vec4(color, alpha);
  }
`;

function themeSpec(theme: RelicTheme): ThemeSpec {
  if (theme === "opal") {
    return {
      background: 0xe7ebf2,
      fog: 0xdfe4ee,
      stage: 0xaeb8c7,
      wall: 0xc8d0db,
      inset: 0xb6c0d1,
      glowA: 0x75bbff,
      glowB: 0xffb9d4,
      glass: 0xfafcff,
      attenuation: 0xe1f1ff,
      shellA: 0x88d3ff,
      shellB: 0xffb8de,
      key: 0xfff6ec,
      rim: 0xbdd8ff,
      accent: 0xffffff,
    };
  }

  if (theme === "amber") {
    return {
      background: 0x0d0a08,
      fog: 0x0d0a08,
      stage: 0x2b221a,
      wall: 0x17110d,
      inset: 0x1a1511,
      glowA: 0xffb15a,
      glowB: 0xfff2a2,
      glass: 0xfff0df,
      attenuation: 0xffcf9b,
      shellA: 0xffa45b,
      shellB: 0xfff1b6,
      key: 0xffedcf,
      rim: 0xffb474,
      accent: 0xffd7a2,
    };
  }

  return {
    background: 0x040812,
    fog: 0x050914,
    stage: 0x121d2f,
    wall: 0x081120,
    inset: 0x0b1625,
    glowA: 0x5ed3ff,
    glowB: 0x88ffd8,
    glass: 0xdff5ff,
    attenuation: 0x9be8ff,
    shellA: 0x67cfff,
    shellB: 0xa8fff1,
    key: 0xf8f5eb,
    rim: 0x7dcaff,
    accent: 0x9bfde8,
  };
}

function setCameraView(camera: THREE.PerspectiveCamera, controls: BaseDemo["controls"]): void {
  camera.position.set(6.4, 2.6, 5.8);
  controls.target.set(0, 0.1, 0);
}

function makeCausticMaterial(mode: "floor" | "wall"): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 1 },
      uDistortion: { value: 0.4 },
      uMode: { value: mode === "wall" ? 1 : 0 },
      uColorA: { value: new THREE.Color(0x5ed3ff) },
      uColorB: { value: new THREE.Color(0x88ffd8) },
    },
    vertexShader: CAUSTIC_VERTEX_SHADER,
    fragmentShader: CAUSTIC_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function makeShellMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 1.1 },
      uDistortion: { value: 0.35 },
      uColorA: { value: new THREE.Color(0x67cfff) },
      uColorB: { value: new THREE.Color(0xa8fff1) },
    },
    vertexShader: SHELL_VERTEX_SHADER,
    fragmentShader: SHELL_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
}

export class CausticRelicDemo extends BaseDemo {
  private readonly rig = new THREE.Group();
  private readonly stageMaterial: THREE.MeshStandardMaterial;
  private readonly insetMaterial: THREE.MeshStandardMaterial;
  private readonly wallMaterial: THREE.MeshStandardMaterial;
  private readonly glassMaterial: THREE.MeshPhysicalMaterial;
  private readonly shellMaterial = makeShellMaterial();
  private readonly floorCaustics = makeCausticMaterial("floor");
  private readonly wallCaustics = makeCausticMaterial("wall");
  private readonly heroPivot = new THREE.Group();
  private readonly relicMesh: THREE.Mesh<THREE.TorusKnotGeometry, THREE.MeshPhysicalMaterial>;
  private readonly shellMesh: THREE.Mesh<THREE.TorusKnotGeometry, THREE.ShaderMaterial>;
  private readonly accents: THREE.Object3D[] = [];
  private readonly envTarget: THREE.WebGLRenderTarget;
  private readonly keyLight = new THREE.DirectionalLight(0xf8f5eb, 1.45);
  private readonly fillLight = new THREE.PointLight(0x66d7ff, 0.95, 14, 2);
  private readonly rimLight = new THREE.DirectionalLight(0x8edcff, 0.82);
  private readonly haloSprite: THREE.Sprite;

  private theme: RelicTheme = "aqua";
  private roughness = 0.12;
  private thickness = 1.7;
  private iridescence = 0.92;
  private causticStrength = 1.15;
  private distortion = 0.38;
  private glow = 1.05;
  private animateScene = true;

  constructor(root: HTMLElement) {
    super(root);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.14;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.045);
    this.scene.environment = this.envTarget.texture;

    this.stageMaterial = new THREE.MeshStandardMaterial({
      color: 0x121d2f,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.insetMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1625,
      roughness: 0.88,
      metalness: 0.04,
    });
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x081120,
      roughness: 0.92,
      metalness: 0.02,
    });

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.4, 0.24, 96), this.stageMaterial);
    floor.position.y = -1.1;
    floor.receiveShadow = true;

    const inset = new THREE.Mesh(new THREE.CircleGeometry(3.8, 96), this.insetMaterial);
    inset.rotation.x = -Math.PI / 2;
    inset.position.y = -0.97;
    inset.receiveShadow = true;

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 6.2), this.wallMaterial);
    wall.position.set(0, 1.46, -3.8);
    wall.receiveShadow = true;

    const floorCausticMesh = new THREE.Mesh(new THREE.CircleGeometry(3.46, 96), this.floorCaustics);
    floorCausticMesh.rotation.x = -Math.PI / 2;
    floorCausticMesh.position.y = -0.955;

    const wallCausticMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.8), this.wallCaustics);
    wallCausticMesh.position.set(0, 1.35, -3.76);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.16, 1.42, 0.34, 72),
      new THREE.MeshStandardMaterial({
        color: 0x18263c,
        roughness: 0.72,
        metalness: 0.18,
      }),
    );
    plinth.position.y = -0.82;
    plinth.castShadow = true;
    plinth.receiveShadow = true;

    const plinthRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.42, 0.045, 18, 128),
      new THREE.MeshBasicMaterial({
        color: 0x6bd7ff,
        transparent: true,
        opacity: 0.22,
      }),
    );
    plinthRing.rotation.x = Math.PI / 2;
    plinthRing.position.y = -0.63;

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdff5ff,
      roughness: this.roughness,
      metalness: 0,
      transmission: 1,
      thickness: this.thickness,
      ior: 1.18,
      iridescence: this.iridescence,
      iridescenceIOR: 1.24,
      iridescenceThicknessRange: [120, 520],
      attenuationColor: new THREE.Color(0x9be8ff),
      attenuationDistance: 0.84,
      envMapIntensity: 1,
      clearcoat: 0.85,
      clearcoatRoughness: 0.06,
    });

    this.relicMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.78, 0.24, 256, 36, 2, 5), this.glassMaterial);
    this.relicMesh.castShadow = true;
    this.relicMesh.receiveShadow = true;
    this.relicMesh.position.y = 0.18;

    this.shellMesh = new THREE.Mesh(this.relicMesh.geometry, this.shellMaterial);
    this.shellMesh.scale.setScalar(1.08);
    this.shellMesh.position.copy(this.relicMesh.position);

    const accentConfigs: Array<[number, number, number, number, number, THREE.ColorRepresentation]> = [
      [-2.24, -0.06, -0.62, 0.18, 1.9, 0x74d7ff],
      [-1.32, -0.1, 0.86, 0.16, 1.62, 0xffbf7c],
      [1.44, -0.08, -0.54, 0.14, 1.82, 0x88ffd8],
      [2.32, -0.04, 0.78, 0.18, 1.7, 0x97c4ff],
    ];

    for (const [x, y, z, radius, height, color] of accentConfigs) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 32),
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.08,
          transmission: 0.88,
          thickness: 0.7,
          ior: 1.16,
          envMapIntensity: 0.8,
          attenuationColor: new THREE.Color(color),
          attenuationDistance: 0.9,
        }),
      );
      pillar.position.set(x, y, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.accents.push(pillar);
      this.rig.add(pillar);
    }

    const sideLensLeft = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 1.2, 10, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0xe2f1ff,
        roughness: 0.1,
        transmission: 0.92,
        thickness: 0.7,
        ior: 1.2,
        envMapIntensity: 0.9,
        attenuationColor: new THREE.Color(0xc1e9ff),
        attenuationDistance: 0.8,
      }),
    );
    sideLensLeft.rotation.z = Math.PI / 2;
    sideLensLeft.position.set(-2.36, 0.62, 1.34);
    sideLensLeft.castShadow = true;
    sideLensLeft.receiveShadow = true;

    const sideLensRight = sideLensLeft.clone();
    sideLensRight.position.set(2.42, 0.82, -1.22);
    sideLensRight.rotation.set(0.2, -0.6, Math.PI / 2);
    this.accents.push(sideLensLeft, sideLensRight);

    this.heroPivot.add(this.relicMesh, this.shellMesh);
    this.rig.add(this.heroPivot, sideLensLeft, sideLensRight, plinth, plinthRing);
    this.scene.add(floor, inset, wall, floorCausticMesh, wallCausticMesh, this.rig);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x0a1220, 0.5));

    this.keyLight.position.set(3.8, 5.2, 2.8);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.00035;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;

    this.fillLight.position.set(-3.8, 1.8, 2.6);
    this.rimLight.position.set(-4.4, 2.6, -3.2);

    this.scene.add(this.keyLight, this.fillLight, this.rimLight);

    const haloTexture = this.createHaloTexture();
    this.haloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.haloSprite.position.set(0, 2.34, -0.84);
    this.haloSprite.scale.set(0.92, 0.92, 1);
    this.scene.add(this.haloSprite);

    setCameraView(this.camera, this.controls);
    this.controls.autoRotateSpeed = 0.16;

    this.bindCheckbox("relic-wireframe", (value) => {
      this.glassMaterial.wireframe = value;
    });
    this.bindSelect("relic-theme", (value) => {
      this.theme = value === "opal" || value === "amber" ? value : "aqua";
      this.applyTheme();
    });
    this.bindRange("relic-roughness", (value) => {
      this.roughness = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("relic-thickness", (value) => {
      this.thickness = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("relic-iridescence", (value) => {
      this.iridescence = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("relic-caustics", (value) => {
      this.causticStrength = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("relic-distortion", (value) => {
      this.distortion = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("relic-glow", (value) => {
      this.glow = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindCheckbox("relic-animate", (value) => {
      this.animateScene = value;
    });

    this.applyTheme();
    this.applyMaterialState();
  }

  protected update(_delta: number, elapsed: number): void {
    const time = this.animateScene ? elapsed : 0;

    this.heroPivot.rotation.y = time * 0.3;
    this.heroPivot.rotation.x = Math.sin(time * 0.38) * 0.08;
    this.relicMesh.rotation.z = Math.sin(time * 0.72) * 0.18;
    this.shellMesh.rotation.copy(this.relicMesh.rotation);

    this.floorCaustics.uniforms.uTime.value = time;
    this.wallCaustics.uniforms.uTime.value = time * 0.86;
    this.shellMaterial.uniforms.uTime.value = time;

    this.haloSprite.position.y = 2.26 + Math.sin(time * 1.2) * 0.1;
    this.fillLight.position.x = -3.8 + Math.sin(time * 0.62) * 0.55;
    this.fillLight.position.z = 2.6 + Math.cos(time * 0.54) * 0.42;

    this.accents.forEach((accent, index) => {
      accent.position.y += Math.sin(time * 0.85 + index * 1.2) * 0.0009;
      accent.rotation.y += 0.0015 + index * 0.00022;
    });
  }

  private createHaloTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create halo texture.");
    }

    const gradient = context.createRadialGradient(128, 128, 18, 128, 128, 118);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.25, "rgba(158,228,255,0.62)");
    gradient.addColorStop(0.65, "rgba(107,194,255,0.16)");
    gradient.addColorStop(1, "rgba(107,194,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private applyMaterialState(): void {
    this.glassMaterial.roughness = this.roughness;
    this.glassMaterial.thickness = this.thickness;
    this.glassMaterial.iridescence = this.iridescence;
    this.glassMaterial.needsUpdate = true;

    this.floorCaustics.uniforms.uStrength.value = this.causticStrength;
    this.wallCaustics.uniforms.uStrength.value = this.causticStrength * 0.86;
    this.floorCaustics.uniforms.uDistortion.value = this.distortion;
    this.wallCaustics.uniforms.uDistortion.value = this.distortion * 1.08;
    this.shellMaterial.uniforms.uDistortion.value = this.distortion;
    this.shellMaterial.uniforms.uGlow.value = this.glow;
    (this.haloSprite.material as THREE.SpriteMaterial).opacity = 0.4 + this.glow * 0.26;
  }

  private applyTheme(): void {
    const theme = themeSpec(this.theme);
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = new THREE.Fog(theme.fog, 8, 18);
    this.stageMaterial.color.set(theme.stage);
    this.insetMaterial.color.set(theme.inset);
    this.wallMaterial.color.set(theme.wall);
    this.glassMaterial.color.set(theme.glass);
    this.glassMaterial.attenuationColor = new THREE.Color(theme.attenuation);
    this.shellMaterial.uniforms.uColorA.value.set(theme.shellA);
    this.shellMaterial.uniforms.uColorB.value.set(theme.shellB);
    this.floorCaustics.uniforms.uColorA.value.set(theme.glowA);
    this.floorCaustics.uniforms.uColorB.value.set(theme.glowB);
    this.wallCaustics.uniforms.uColorA.value.set(theme.glowA);
    this.wallCaustics.uniforms.uColorB.value.set(theme.glowB);
    this.keyLight.color.set(theme.key);
    this.rimLight.color.set(theme.rim);
    this.fillLight.color.set(theme.glowA);
    (this.haloSprite.material as THREE.SpriteMaterial).color.set(theme.accent);
  }
}
