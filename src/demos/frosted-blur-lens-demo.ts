import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { BaseDemo } from "./base-demo";

type CameraPreset = "orbit" | "front" | "hero";

function createBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create frosted board texture.");
  }

  context.fillStyle = "#eef1f5";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#e5e9ef";
  context.fillRect(0, 0, canvas.width, 220);

  context.fillStyle = "#798ca7";
  context.font = "700 92px IBM Plex Sans, sans-serif";
  context.fillText("FROST TEST", 92, 144);

  const swatches = [
    { x: 122, color: "#ff6c60" },
    { x: 334, color: "#82dd8f" },
    { x: 546, color: "#69a9df" },
    { x: 758, color: "#f0cf63" },
  ];

  context.strokeStyle = "#51647f";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(92, 706);
  context.lineTo(932, 732);
  context.stroke();

  for (const swatch of swatches) {
    context.fillStyle = swatch.color;
    context.fillRect(swatch.x, 292, 116, 380);
  }

  context.strokeStyle = "#97a6b9";
  context.lineWidth = 6;
  for (let x = 126; x <= 902; x += 76) {
    context.beginPath();
    context.moveTo(x, 244);
    context.lineTo(x, 782);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCheckerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create checker texture.");
  }

  const cell = 32;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      context.fillStyle = (x + y) / cell % 2 === 0 ? "#c3cedd" : "#adb9c9";
      context.fillRect(x, y, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5.5, 5.5);
  return texture;
}

function setCameraPreset(
  camera: THREE.PerspectiveCamera,
  controls: BaseDemo["controls"],
  preset: CameraPreset,
): void {
  if (preset === "front") {
    camera.position.set(0.16, 1.82, 7.2);
    controls.target.set(0.1, -0.08, -0.22);
    return;
  }

  if (preset === "hero") {
    camera.position.set(4.85, 1.32, 3.35);
    controls.target.set(0.12, -0.22, 0.14);
    return;
  }

  camera.position.set(5.7, 2.0, 5.9);
  controls.target.set(0.18, -0.12, -0.12);
}

export class FrostedBlurLensDemo extends BaseDemo {
  private readonly rig = new THREE.Group();
  private readonly lensMaterial: THREE.MeshPhysicalMaterial;
  private readonly slabMaterial: THREE.MeshPhysicalMaterial;
  private readonly lens: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
  private readonly slab: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial>;
  private readonly backdropBoard: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private readonly accentBars: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[] = [];
  private readonly boardTexture: THREE.Texture;
  private readonly floorTexture: THREE.Texture;
  private readonly envTarget: THREE.WebGLRenderTarget;
  private readonly lensPositions: Float32Array;
  private readonly lensNormals: Float32Array;
  private readonly lensPositionAttribute: THREE.BufferAttribute;

  private roughness = 0.42;
  private thickness = 1.4;
  private ior = 1.14;
  private wobble = 0.11;
  private animateWobble = true;

  constructor(root: HTMLElement) {
    super(root);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.04;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    this.scene.background = new THREE.Color(0xcfd4dd);
    this.scene.fog = new THREE.Fog(0xcfd4dd, 10, 24);

    this.boardTexture = createBoardTexture();
    this.floorTexture = createCheckerTexture();

    const room = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 6.8),
      new THREE.MeshStandardMaterial({
        color: 0xd8dde5,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    room.position.set(0, 1.1, -2.55);
    room.receiveShadow = true;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 8.6),
      new THREE.MeshStandardMaterial({
        color: 0xc1cad7,
        roughness: 0.94,
        metalness: 0.02,
        map: this.floorTexture,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.04;
    floor.receiveShadow = true;

    this.backdropBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(4.55, 3.25),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.02,
        map: this.boardTexture,
      }),
    );
    this.backdropBoard.position.set(0.58, 0.08, -1.16);
    this.backdropBoard.receiveShadow = true;

    const lensGeometry = new THREE.SphereGeometry(0.76, 64, 48);
    this.lensMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe8f1ff,
      roughness: this.roughness,
      metalness: 0,
      transmission: 1,
      thickness: this.thickness,
      ior: this.ior,
      envMapIntensity: 0.72,
      attenuationColor: new THREE.Color(0xd2e7ff),
      attenuationDistance: 1.1,
      clearcoat: 0.32,
      clearcoatRoughness: 0.1,
    });
    this.lens = new THREE.Mesh(lensGeometry, this.lensMaterial);
    this.lens.position.set(-0.72, -0.18, 0.24);
    this.lens.castShadow = true;
    this.lens.receiveShadow = true;

    this.lensPositionAttribute = this.lens.geometry.getAttribute("position") as THREE.BufferAttribute;
    this.lensPositions = new Float32Array(this.lensPositionAttribute.array as ArrayLike<number>);
    this.lensNormals = new Float32Array(((this.lens.geometry.getAttribute("normal") as THREE.BufferAttribute).array as ArrayLike<number>));

    this.slabMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc7defa,
      roughness: this.roughness * 0.82,
      metalness: 0,
      transmission: 1,
      thickness: Math.max(0.45, this.thickness * 0.75),
      ior: this.ior,
      envMapIntensity: 0.68,
      attenuationColor: new THREE.Color(0xb3d5ff),
      attenuationDistance: 0.8,
    });
    this.slab = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.85, 0.18), this.slabMaterial);
    this.slab.position.set(1.1, -0.15, 0.6);
    this.slab.castShadow = true;
    this.slab.receiveShadow = true;

    const barGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.05, 24);
    const barConfigs: Array<[number, THREE.ColorRepresentation, number, number]> = [
      [-1.48, 0xffb1a8, 0.58, -0.16],
      [0.08, 0xbaffbf, 0.22, 0.06],
      [0.92, 0x63a8df, -0.18, -0.12],
      [1.88, 0xb5e2ff, 0.7, 0.08],
    ];

    for (const [x, color, z, tilt] of barConfigs) {
      const bar = new THREE.Mesh(
        barGeometry,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.24,
          metalness: 0.04,
          emissive: new THREE.Color(color).multiplyScalar(0.08),
        }),
      );
      bar.position.set(x, -0.06, z);
      bar.rotation.z = tilt;
      bar.castShadow = true;
      bar.receiveShadow = true;
      this.accentBars.push(bar);
      this.rig.add(bar);
    }

    const shadowPlate = new THREE.Mesh(
      new THREE.CircleGeometry(1.12, 64),
      new THREE.ShadowMaterial({
        color: 0x1e2e43,
        opacity: 0.18,
      }),
    );
    shadowPlate.rotation.x = -Math.PI / 2;
    shadowPlate.position.set(-0.68, -1.035, 0.28);

    this.rig.add(this.backdropBoard, this.lens, this.slab, shadowPlate);
    this.scene.add(room, floor, this.rig);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.44));
    this.scene.add(new THREE.HemisphereLight(0xfefefe, 0xb5bcc9, 0.46));

    const key = new THREE.DirectionalLight(0xfff1df, 1.4);
    key.position.set(4.2, 5.1, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.00035;

    const fill = new THREE.DirectionalLight(0xdde9ff, 0.58);
    fill.position.set(-4.6, 2.4, 3.2);

    const rim = new THREE.PointLight(0xffffff, 0.82, 12, 2);
    rim.position.set(-0.6, 2.6, -2.2);

    this.scene.add(key, fill, rim);

    setCameraPreset(this.camera, this.controls, "orbit");
    this.controls.autoRotateSpeed = 0.24;

    this.bindCheckbox("frost-wireframe", (value) => {
      this.lensMaterial.wireframe = value;
      this.slabMaterial.wireframe = value;
    });
    this.bindSelect("frost-camera", (value) => {
      const allowed: CameraPreset[] = ["orbit", "front", "hero"];
      setCameraPreset(this.camera, this.controls, allowed.includes(value as CameraPreset) ? (value as CameraPreset) : "orbit");
    });
    this.bindCheckbox("frost-auto-rotate", (value) => {
      this.setAutoRotate(value);
    });
    this.bindRange("frost-roughness", (value) => {
      this.roughness = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("frost-thickness", (value) => {
      this.thickness = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("frost-ior", (value) => {
      this.ior = value;
      this.applyMaterialState();
    }, (value) => value.toFixed(2));
    this.bindRange("frost-wobble", (value) => {
      this.wobble = value;
      this.updateLensGeometry(this.animateWobble ? performance.now() / 1000 : 0);
    }, (value) => value.toFixed(2));
    this.bindCheckbox("frost-animate", (value) => {
      this.animateWobble = value;
      this.updateLensGeometry(value ? performance.now() / 1000 : 0);
    });

    this.applyMaterialState();
    this.updateLensGeometry(0);
  }

  protected update(_delta: number, elapsed: number): void {
    this.rig.rotation.y = Math.sin(elapsed * 0.18) * 0.1;

    this.slab.rotation.y = elapsed * 0.18;
    this.slab.rotation.x = Math.sin(elapsed * 0.36) * 0.06;
    this.backdropBoard.position.x = 0.58 + Math.sin(elapsed * 0.32) * 0.08;

    for (let index = 0; index < this.accentBars.length; index += 1) {
      const bar = this.accentBars[index];
      bar.position.y = -0.06 + Math.sin(elapsed * 0.9 + index) * 0.03;
    }

    this.updateLensGeometry(this.animateWobble ? elapsed : 0);
  }

  private applyMaterialState(): void {
    this.lensMaterial.roughness = this.roughness;
    this.lensMaterial.thickness = this.thickness;
    this.lensMaterial.ior = this.ior;
    this.lensMaterial.needsUpdate = true;

    this.slabMaterial.roughness = Math.min(1, this.roughness * 0.82);
    this.slabMaterial.thickness = Math.max(0.3, this.thickness * 0.75);
    this.slabMaterial.ior = this.ior;
    this.slabMaterial.needsUpdate = true;
  }

  private updateLensGeometry(elapsed: number): void {
    const target = this.lensPositionAttribute.array as Float32Array;

    for (let index = 0; index < target.length; index += 3) {
      const x = this.lensPositions[index];
      const y = this.lensPositions[index + 1];
      const z = this.lensPositions[index + 2];
      const nx = this.lensNormals[index];
      const ny = this.lensNormals[index + 1];
      const nz = this.lensNormals[index + 2];

      const phaseA = Math.sin(y * 6.8 + elapsed * 1.8 + x * 5.4);
      const phaseB = Math.sin(z * 8.6 - elapsed * 1.3 + y * 4.2);
      const offset = (phaseA * 0.65 + phaseB * 0.35) * this.wobble;

      target[index] = x + nx * offset;
      target[index + 1] = y + ny * offset;
      target[index + 2] = z + nz * offset;
    }

    this.lensPositionAttribute.needsUpdate = true;
    this.lens.geometry.computeVertexNormals();
  }
}
