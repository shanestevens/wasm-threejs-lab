import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { BaseDemo } from "./base-demo";

type ThemeName = "dark" | "light" | "warm";
type CameraPreset = "orbit" | "front" | "hero";

type BoardAsset = {
  mesh: THREE.Mesh<THREE.SphereGeometry | THREE.CapsuleGeometry, THREE.MeshPhysicalMaterial>;
  base: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshPhysicalMaterial;
};

function createStripedTexture(colors: string[], diagonal = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas context for striped texture.");
  }

  context.fillStyle = colors[0];
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.lineWidth = 18;
  colors.slice(1).forEach((color, index) => {
    context.strokeStyle = color;
    context.beginPath();

    if (diagonal) {
      context.moveTo(-40, 36 + index * 44);
      context.lineTo(canvas.width + 40, index * 44 - 24);
    } else {
      context.moveTo(0, 28 + index * 44);
      context.lineTo(canvas.width, 28 + index * 44);
    }

    context.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.1, 1.1);
  return texture;
}

function createSwirlTexture(primary: string, secondary: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas context for swirl texture.");
  }

  context.fillStyle = primary;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.lineWidth = 14;
  for (let ring = 0; ring < 8; ring += 1) {
    context.strokeStyle = ring % 2 === 0 ? secondary : accent;
    context.beginPath();
    context.ellipse(128, 128, 112 - ring * 11, 38 + ring * 11, 0.35 + ring * 0.09, 0, Math.PI * 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCheckerTexture(a: string, b: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas context for checker texture.");
  }

  const step = 32;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      context.fillStyle = ((x + y) / step) % 2 === 0 ? a : b;
      context.fillRect(x, y, step, step);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function setCameraPreset(
  camera: THREE.PerspectiveCamera,
  controls: BaseDemo["controls"],
  preset: CameraPreset,
): void {
  if (preset === "front") {
    camera.position.set(0.2, 1.95, 8.4);
    controls.target.set(0.12, -0.1, -0.28);
    return;
  }

  if (preset === "hero") {
    camera.position.set(6.6, 1.75, 3.8);
    controls.target.set(0.34, -0.18, 0.08);
    return;
  }

  camera.position.set(5.9, 2.25, 6.6);
  controls.target.set(0.1, -0.14, -0.18);
}

export class PbrLookdevBoardDemo extends BaseDemo {
  private readonly board = new THREE.Group();
  private readonly assets: BoardAsset[] = [];
  private readonly stageMaterial: THREE.MeshStandardMaterial;
  private readonly insetMaterial: THREE.MeshStandardMaterial;
  private readonly wallMaterial: THREE.MeshStandardMaterial;
  private readonly key = new THREE.DirectionalLight(0xffddb6, 1.18);
  private readonly fill = new THREE.DirectionalLight(0xa7c8ff, 0.1);
  private readonly rim = new THREE.DirectionalLight(0xdde7ff, 0.62);
  private readonly accent = new THREE.PointLight(0xffd39d, 0.8, 12, 2);
  private readonly envTarget: THREE.WebGLRenderTarget;
  private readonly dynamicTextures: THREE.Texture[] = [];

  private theme: ThemeName = "dark";
  private envIntensity = 0.62;
  private exposure = 0.95;
  private keyIntensity = 1.18;
  private fillIntensity = 0.1;
  private rimIntensity = 0.62;
  private accentIntensity = 0.8;

  constructor(root: HTMLElement) {
    super(root);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = this.exposure;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;

    this.stageMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3f48,
      roughness: 0.96,
      metalness: 0.04,
    });
    this.insetMaterial = new THREE.MeshStandardMaterial({
      color: 0x181b20,
      roughness: 0.9,
      metalness: 0.02,
    });
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x272c35,
      roughness: 0.94,
      metalness: 0.02,
    });

    const stage = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.26, 5.3), this.stageMaterial);
    stage.position.set(0, -1.08, 0);
    stage.receiveShadow = true;

    const inset = new THREE.Mesh(new THREE.PlaneGeometry(6.95, 4.55), this.insetMaterial);
    inset.rotation.x = -Math.PI / 2;
    inset.position.set(0, -0.94, 0);
    inset.receiveShadow = true;

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.8), this.wallMaterial);
    wall.position.set(0, 1.4, -2.75);
    wall.receiveShadow = true;

    this.scene.add(stage, inset, wall, this.board);

    const sphereGeometry = new THREE.SphereGeometry(0.4, 52, 34);
    const capsuleGeometry = new THREE.CapsuleGeometry(0.26, 0.9, 10, 20);
    const baseGeometry = new THREE.CylinderGeometry(0.26, 0.3, 0.06, 28);

    const zebra = createStripedTexture(["#f7f8fb", "#0d1016", "#f7f8fb", "#121822"], false);
    const swirlBlue = createSwirlTexture("#f2f6ff", "#5f8fff", "#d7e7ff");
    const wood = createSwirlTexture("#f0d4b4", "#a77850", "#e7c39f");
    const mint = createStripedTexture(["#dcebc8", "#78a56c", "#e7f2d3", "#94b487"], true);
    const checker = createCheckerTexture("#111318", "#f7f8fb");
    this.dynamicTextures.push(zebra, swirlBlue, wood, mint, checker);

    const descriptors: Array<{
      material: THREE.MeshPhysicalMaterial;
      position: [number, number, number];
      shape?: "sphere" | "capsule";
    }> = [
      { material: new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.05, metalness: 1, envMapIntensity: this.envIntensity }), position: [-2.6, 0.24, -1.45], shape: "capsule" },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x0d1016, roughness: 0.12, metalness: 1, envMapIntensity: this.envIntensity }), position: [1.1, 0.22, -1.4], shape: "capsule" },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x0b1116, roughness: 0.04, transmission: 0.94, thickness: 1.1, ior: 1.22, envMapIntensity: this.envIntensity }), position: [-3.2, -0.08, -0.92] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x5879d0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: this.envIntensity }), position: [-2.5, -0.14, -0.72] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xdbe8ff, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: this.envIntensity }), position: [-1.8, 0.02, -0.8] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xb3a998, roughness: 0.14, metalness: 1, envMapIntensity: this.envIntensity }), position: [-1.1, 0.1, -0.84] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xe3d7bc, roughness: 0.16, metalness: 1, envMapIntensity: this.envIntensity }), position: [-0.38, -0.04, -0.82] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xd6e4ff, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.09, envMapIntensity: this.envIntensity }), position: [0.32, -0.02, -0.8] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xf2e6ce, roughness: 0.22, transmission: 0.88, thickness: 1.2, ior: 1.28, attenuationColor: new THREE.Color(0xffecb8), attenuationDistance: 0.75, envMapIntensity: this.envIntensity }), position: [1.08, -0.1, -0.76] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xbfceb4, roughness: 0.34, clearcoat: 0.62, clearcoatRoughness: 0.14, envMapIntensity: this.envIntensity }), position: [1.86, -0.02, -0.76] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xe8ddc9, roughness: 0.24, metalness: 0.04, envMapIntensity: this.envIntensity }), position: [2.64, 0.02, -0.7] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xbad5b8, roughness: 0.28, clearcoat: 0.78, clearcoatRoughness: 0.12, envMapIntensity: this.envIntensity }), position: [3.3, 0.22, -0.78], shape: "capsule" },

      { material: new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.52, metalness: 0.02, map: zebra, envMapIntensity: this.envIntensity }), position: [-3.6, -0.44, 0.02] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xf8f8ff, roughness: 0.28, metalness: 0.02, map: swirlBlue, envMapIntensity: this.envIntensity }), position: [-2.82, -0.4, 0.16] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xf2dfc7, roughness: 0.44, metalness: 0.02, map: wood, envMapIntensity: this.envIntensity }), position: [-2.02, -0.42, 0.3] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xe9efff, roughness: 0.1, transmission: 0.92, thickness: 1.0, ior: 1.25, attenuationColor: new THREE.Color(0xcfe2ff), attenuationDistance: 0.7, envMapIntensity: this.envIntensity }), position: [-1.16, -0.5, 0.38] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x171626, roughness: 0.24, metalness: 0.04, envMapIntensity: this.envIntensity }), position: [-0.44, -0.42, 0.2] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x5a7ec8, roughness: 0.26, clearcoat: 0.94, clearcoatRoughness: 0.06, envMapIntensity: this.envIntensity }), position: [0.28, -0.36, 0.08] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x0b2018, roughness: 0.34, clearcoat: 0.35, metalness: 0.06, envMapIntensity: this.envIntensity }), position: [1.06, -0.38, 0.18] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xaad0cb, roughness: 0.42, clearcoat: 0.72, clearcoatRoughness: 0.18, envMapIntensity: this.envIntensity }), position: [1.82, -0.44, 0.14] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xd7d8d4, roughness: 0.68, envMapIntensity: this.envIntensity }), position: [2.56, -0.36, 0.12] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xe7dcc0, roughness: 0.38, envMapIntensity: this.envIntensity }), position: [3.2, -0.3, 0.04] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xce7678, roughness: 0.46, clearcoat: 0.88, clearcoatRoughness: 0.14, envMapIntensity: this.envIntensity }), position: [3.94, -0.3, 0.18] },

      { material: new THREE.MeshPhysicalMaterial({ color: 0x0f1116, roughness: 0.18, transmission: 0.42, thickness: 1.2, ior: 1.46, attenuationColor: new THREE.Color(0x0d0f14), attenuationDistance: 0.25, envMapIntensity: this.envIntensity }), position: [-3.1, -0.66, 0.86] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x14284a, roughness: 0.16, sheen: 0.8, sheenColor: new THREE.Color(0xcfe0ff), sheenRoughness: 0.34, envMapIntensity: this.envIntensity }), position: [-2.34, -0.72, 0.82] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x28211d, roughness: 0.22, metalness: 0.08, envMapIntensity: this.envIntensity }), position: [-1.58, -0.72, 0.9] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x212636, roughness: 0.16, metalness: 0.02, iridescence: 1, iridescenceIOR: 1.23, iridescenceThicknessRange: [120, 420], envMapIntensity: this.envIntensity }), position: [-0.82, -0.74, 0.84] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xeef2ff, roughness: 0.18, transmission: 0.96, thickness: 1.5, ior: 1.28, attenuationColor: new THREE.Color(0xd4dfff), attenuationDistance: 0.68, envMapIntensity: this.envIntensity }), position: [-0.04, -0.74, 0.92] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xf2f3f7, roughness: 0.18, metalness: 0.02, map: checker, envMapIntensity: this.envIntensity }), position: [0.74, -0.78, 1.02] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x1b2a1b, roughness: 0.22, metalness: 0.06, clearcoat: 0.22, envMapIntensity: this.envIntensity }), position: [1.54, -0.74, 0.84] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0xe1f0d2, roughness: 0.26, clearcoat: 0.82, clearcoatRoughness: 0.12, map: mint, envMapIntensity: this.envIntensity }), position: [2.3, -0.8, 1.02] },
      { material: new THREE.MeshPhysicalMaterial({ color: 0x302728, roughness: 0.2, metalness: 0.04, envMapIntensity: this.envIntensity }), position: [3.1, -0.74, 0.88] },
    ];

    descriptors.forEach((descriptor) => {
      const mesh =
        descriptor.shape === "capsule"
          ? new THREE.Mesh(capsuleGeometry, descriptor.material)
          : new THREE.Mesh(sphereGeometry, descriptor.material);
      mesh.position.set(...descriptor.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.z = descriptor.shape === "capsule" ? Math.PI / 2 : 0;

      const base = new THREE.Mesh(
        baseGeometry,
        new THREE.MeshStandardMaterial({
          color: 0xdfd5c8,
          roughness: 0.76,
          metalness: 0.02,
        }),
      );
      base.position.set(descriptor.position[0], descriptor.position[1] - (descriptor.shape === "capsule" ? 0.48 : 0.46), descriptor.position[2]);
      base.receiveShadow = true;

      this.assets.push({ mesh, base, material: descriptor.material });
      this.board.add(mesh, base);
    });

    this.board.rotation.x = -0.16;
    this.scene.add(new THREE.AmbientLight(0xe7e7ff, 0.14));

    this.key.position.set(4.6, 4.8, 3.8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.00035;
    this.fill.position.set(-4.2, 2.2, 1.8);
    this.rim.position.set(-1.8, 2.9, -4.2);
    this.accent.position.set(2.8, 1.4, 1.4);
    this.scene.add(this.key, this.fill, this.rim, this.accent);

    this.controls.autoRotateSpeed = 0.34;
    setCameraPreset(this.camera, this.controls, "orbit");

    this.bindCheckbox("pbr-wireframe", (value) => {
      for (const asset of this.assets) {
        asset.material.wireframe = value;
      }
    });
    this.bindSelect("pbr-camera", (value) => {
      const allowed: CameraPreset[] = ["orbit", "front", "hero"];
      setCameraPreset(this.camera, this.controls, allowed.includes(value as CameraPreset) ? (value as CameraPreset) : "orbit");
    });
    this.bindCheckbox("pbr-auto-rotate", (value) => {
      this.setAutoRotate(value);
    });
    this.bindSelect("pbr-theme", (value) => {
      const allowed: ThemeName[] = ["dark", "light", "warm"];
      this.theme = allowed.includes(value as ThemeName) ? (value as ThemeName) : "dark";
      this.applyTheme();
    });
    this.bindRange("pbr-env", (value) => {
      this.envIntensity = value;
      this.applyRig();
    }, (value) => value.toFixed(2));
    this.bindRange("pbr-exposure", (value) => {
      this.exposure = value;
      this.renderer.toneMappingExposure = value;
    }, (value) => value.toFixed(2));
    this.bindRange("pbr-key", (value) => {
      this.keyIntensity = value;
      this.applyRig();
    }, (value) => value.toFixed(2));
    this.bindRange("pbr-fill", (value) => {
      this.fillIntensity = value;
      this.applyRig();
    }, (value) => value.toFixed(2));
    this.bindRange("pbr-rim", (value) => {
      this.rimIntensity = value;
      this.applyRig();
    }, (value) => value.toFixed(2));
    this.bindRange("pbr-accent", (value) => {
      this.accentIntensity = value;
      this.applyRig();
    }, (value) => value.toFixed(2));

    this.applyTheme();
    this.applyRig();
  }

  protected update(_delta: number, elapsed: number): void {
    this.board.rotation.y = Math.sin(elapsed * 0.18) * 0.12;
    this.accent.position.x = 2.8 + Math.cos(elapsed * 0.5) * 0.35;
    this.key.position.z = 3.8 + Math.sin(elapsed * 0.38) * 0.28;

    for (let index = 0; index < this.assets.length; index += 1) {
      const asset = this.assets[index];
      asset.mesh.rotation.y = elapsed * (0.09 + (index % 5) * 0.012);
    }
  }

  private applyRig(): void {
    for (const asset of this.assets) {
      asset.material.envMapIntensity = this.envIntensity;
    }

    this.key.intensity = this.keyIntensity;
    this.fill.intensity = this.fillIntensity;
    this.rim.intensity = this.rimIntensity;
    this.accent.intensity = this.accentIntensity;
  }

  private applyTheme(): void {
    if (this.theme === "light") {
      this.scene.background = new THREE.Color(0xcfd6e0);
      this.scene.fog = new THREE.Fog(0xcfd6e0, 10, 24);
      this.stageMaterial.color.set(0x696f79);
      this.insetMaterial.color.set(0x2b2f36);
      this.wallMaterial.color.set(0xb8c0cc);
      this.fill.color.set(0x8ab7ff);
      this.rim.color.set(0xffffff);
      return;
    }

    if (this.theme === "warm") {
      this.scene.background = new THREE.Color(0x120f10);
      this.scene.fog = new THREE.Fog(0x120f10, 9, 22);
      this.stageMaterial.color.set(0x4f423c);
      this.insetMaterial.color.set(0x241d1a);
      this.wallMaterial.color.set(0x433731);
      this.fill.color.set(0xffc899);
      this.rim.color.set(0xfff0dd);
      return;
    }

    this.scene.background = new THREE.Color(0x05070b);
    this.scene.fog = new THREE.Fog(0x05070b, 8.5, 20);
    this.stageMaterial.color.set(0x3a3f48);
    this.insetMaterial.color.set(0x181b20);
    this.wallMaterial.color.set(0x272c35);
    this.fill.color.set(0x8ab4ff);
    this.rim.color.set(0xdde7ff);
  }
}
