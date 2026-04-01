import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { BaseDemo } from "./base-demo";

type ThemeName = "dark" | "light" | "warm";

type BoardAsset = {
  mesh: THREE.Mesh<THREE.SphereGeometry | THREE.CapsuleGeometry, THREE.MeshPhysicalMaterial>;
  material: THREE.MeshPhysicalMaterial;
};

type MaterialDescriptor = {
  material: THREE.MeshPhysicalMaterial;
  shape?: "sphere" | "capsule";
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

function layoutRow(
  descriptors: MaterialDescriptor[],
  z: number,
  xPositions: number[],
): Array<MaterialDescriptor & { position: [number, number, number] }> {
  return descriptors.map((descriptor, index) => ({
    ...descriptor,
    position: [
      xPositions[index] ?? 0,
      descriptor.shape === "capsule" ? -0.67 : -0.54,
      z,
    ],
  }));
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

    const stage = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.26, 7.3), this.stageMaterial);
    stage.position.set(0, -1.08, 0);
    stage.receiveShadow = true;

    const inset = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 6.4), this.insetMaterial);
    inset.rotation.x = -Math.PI / 2;
    inset.position.set(0, -0.94, 0);
    inset.receiveShadow = true;

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 5.7), this.wallMaterial);
    wall.position.set(0, 1.56, -3.76);
    wall.receiveShadow = true;

    this.scene.add(stage, inset, wall, this.board);

    const sphereGeometry = new THREE.SphereGeometry(0.4, 52, 34);
    const capsuleGeometry = new THREE.CapsuleGeometry(0.26, 0.9, 10, 20);

    const zebra = createStripedTexture(["#f7f8fb", "#0d1016", "#f7f8fb", "#121822"], false);
    const swirlBlue = createSwirlTexture("#f2f6ff", "#5f8fff", "#d7e7ff");
    const wood = createSwirlTexture("#f0d4b4", "#a77850", "#e7c39f");
    const mint = createStripedTexture(["#dcebc8", "#78a56c", "#e7f2d3", "#94b487"], true);
    const checker = createCheckerTexture("#111318", "#f7f8fb");
    this.dynamicTextures.push(zebra, swirlBlue, wood, mint, checker);
    const xPositions = [-4.35, -3.1, -1.85, -0.6, 0.65, 1.9, 3.15, 4.4];

    const descriptors = [
      ...layoutRow(
        [
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.05, metalness: 1, envMapIntensity: this.envIntensity }), shape: "capsule" },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x0b1116, roughness: 0.04, transmission: 0.94, thickness: 1.1, ior: 1.22, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x5879d0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xdbe8ff, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xb3a998, roughness: 0.14, metalness: 1, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xe3d7bc, roughness: 0.16, metalness: 1, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf2e6ce, roughness: 0.22, transmission: 0.88, thickness: 1.2, ior: 1.28, attenuationColor: new THREE.Color(0xffecb8), attenuationDistance: 0.75, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x0d1016, roughness: 0.12, metalness: 1, envMapIntensity: this.envIntensity }), shape: "capsule" },
        ],
        -2.34,
        xPositions,
      ),
      ...layoutRow(
        [
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.52, metalness: 0.02, map: zebra, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf8f8ff, roughness: 0.28, metalness: 0.02, map: swirlBlue, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf2dfc7, roughness: 0.44, metalness: 0.02, map: wood, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xe9efff, roughness: 0.1, transmission: 0.92, thickness: 1.0, ior: 1.25, attenuationColor: new THREE.Color(0xcfe2ff), attenuationDistance: 0.7, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x171626, roughness: 0.24, metalness: 0.04, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x5a7ec8, roughness: 0.26, clearcoat: 0.94, clearcoatRoughness: 0.06, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x0b2018, roughness: 0.34, clearcoat: 0.35, metalness: 0.06, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xaad0cb, roughness: 0.42, clearcoat: 0.72, clearcoatRoughness: 0.18, envMapIntensity: this.envIntensity }) },
        ],
        -1.02,
        xPositions,
      ),
      ...layoutRow(
        [
          { material: new THREE.MeshPhysicalMaterial({ color: 0xd7d8d4, roughness: 0.68, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xe7dcc0, roughness: 0.38, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xce7678, roughness: 0.46, clearcoat: 0.88, clearcoatRoughness: 0.14, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x0f1116, roughness: 0.18, transmission: 0.42, thickness: 1.2, ior: 1.46, attenuationColor: new THREE.Color(0x0d0f14), attenuationDistance: 0.25, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x14284a, roughness: 0.16, sheen: 0.8, sheenColor: new THREE.Color(0xcfe0ff), sheenRoughness: 0.34, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x28211d, roughness: 0.22, metalness: 0.08, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x212636, roughness: 0.16, metalness: 0.02, iridescence: 1, iridescenceIOR: 1.23, iridescenceThicknessRange: [120, 420], envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xeef2ff, roughness: 0.18, transmission: 0.96, thickness: 1.5, ior: 1.28, attenuationColor: new THREE.Color(0xd4dfff), attenuationDistance: 0.68, envMapIntensity: this.envIntensity }) },
        ],
        0.3,
        xPositions,
      ),
      ...layoutRow(
        [
          { material: new THREE.MeshPhysicalMaterial({ color: 0xf2f3f7, roughness: 0.18, metalness: 0.02, map: checker, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x1b2a1b, roughness: 0.22, metalness: 0.06, clearcoat: 0.22, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xe1f0d2, roughness: 0.26, clearcoat: 0.82, clearcoatRoughness: 0.12, map: mint, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0x302728, roughness: 0.2, metalness: 0.04, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xd6e4ff, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.09, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xbfceb4, roughness: 0.34, clearcoat: 0.62, clearcoatRoughness: 0.14, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xe8ddc9, roughness: 0.24, metalness: 0.04, envMapIntensity: this.envIntensity }) },
          { material: new THREE.MeshPhysicalMaterial({ color: 0xbad5b8, roughness: 0.28, clearcoat: 0.78, clearcoatRoughness: 0.12, envMapIntensity: this.envIntensity }), shape: "capsule" },
        ],
        1.62,
        xPositions,
      ),
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
      this.assets.push({ mesh, material: descriptor.material });
      this.board.add(mesh);
    });

    this.board.rotation.x = -0.04;
    this.scene.add(new THREE.AmbientLight(0xe7e7ff, 0.14));

    this.key.position.set(4.8, 4.8, 3.9);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.00035;
    this.fill.position.set(-4.4, 2.3, 2.2);
    this.rim.position.set(-2.0, 3.0, -4.5);
    this.accent.position.set(3.2, 1.45, 1.7);
    this.scene.add(this.key, this.fill, this.rim, this.accent);

    this.camera.position.set(6.75, 2.28, 8.35);
    this.controls.target.set(0, -0.52, -0.2);

    this.bindCheckbox("pbr-wireframe", (value) => {
      for (const asset of this.assets) {
        asset.material.wireframe = value;
      }
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
    this.board.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
    this.accent.position.x = 3.2 + Math.cos(elapsed * 0.5) * 0.35;
    this.key.position.z = 3.9 + Math.sin(elapsed * 0.38) * 0.28;

    for (let index = 0; index < this.assets.length; index += 1) {
      const asset = this.assets[index];
      asset.mesh.rotation.y = elapsed * (0.08 + (index % 6) * 0.01);
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
