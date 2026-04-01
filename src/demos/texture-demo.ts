import * as THREE from "three";

import { BaseDemo } from "./base-demo";
import type { LabWasmExports } from "../lib/load-wasm";
import { TEXTURE_SIZE, WASM_LAYOUT } from "../lib/load-wasm";

export class TextureDemo extends BaseDemo {
  private readonly textureData: Uint8Array;
  private readonly texture: THREE.DataTexture;
  private readonly group = new THREE.Group();
  private readonly torus: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly torusWireframe: THREE.LineSegments<THREE.WireframeGeometry, THREE.LineBasicMaterial>;
  private readonly boxWireframe: THREE.LineSegments<THREE.WireframeGeometry, THREE.LineBasicMaterial>;

  private speed = 1.1;

  constructor(root: HTMLElement, private readonly wasm: LabWasmExports) {
    super(root);

    this.textureData = new Uint8Array(
      this.wasm.memory.buffer,
      WASM_LAYOUT.texturePixels,
      TEXTURE_SIZE * TEXTURE_SIZE * 4,
    );
    this.texture = new THREE.DataTexture(
      this.textureData,
      TEXTURE_SIZE,
      TEXTURE_SIZE,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.repeat.set(2.2, 2.2);

    const material = new THREE.MeshStandardMaterial({
      map: this.texture,
      metalness: 0.18,
      roughness: 0.22,
      emissive: 0x0b2852,
      emissiveIntensity: 0.22,
    });

    this.torus = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.27, 32, 120), material);
    this.torus.rotation.set(Math.PI * 0.46, 0.2, 0.22);
    this.torus.position.set(0.84, -0.08, 0.08);

    this.box = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), material.clone());
    this.box.position.set(-1.02, 0.2, -0.28);
    this.box.rotation.set(0.28, -0.64, 0.16);

    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0x2f79ff,
      transparent: true,
      opacity: 0.9,
    });

    this.torusWireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.torus.geometry),
      wireMaterial.clone(),
    );
    this.boxWireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.box.geometry),
      wireMaterial,
    );
    this.torusWireframe.visible = false;
    this.boxWireframe.visible = false;
    this.torus.add(this.torusWireframe);
    this.box.add(this.boxWireframe);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 64),
      new THREE.MeshBasicMaterial({
        color: 0x071226,
        transparent: true,
        opacity: 0.96,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.1;

    this.group.add(this.torus, this.box);
    this.scene.add(this.group, floor);

    const ambient = new THREE.AmbientLight(0x8eb6ff, 0.78);
    const key = new THREE.DirectionalLight(0xffd7b0, 1.65);
    key.position.set(3.4, 5.1, 2.6);
    const fill = new THREE.DirectionalLight(0x2e64ff, 0.55);
    fill.position.set(-2.8, 1.8, -2.1);
    this.scene.add(ambient, key, fill);

    this.camera.position.set(0, 1.15, 4.2);
    this.controls.target.set(0, 0, 0);

    this.bindCheckbox("texture-wireframe", (value) => {
      this.torusWireframe.visible = value;
      this.boxWireframe.visible = value;
    });
    this.bindCheckbox("texture-auto-rotate", (value) => {
      this.setAutoRotate(value);
    });
    this.bindRange("texture-speed", (value) => {
      this.speed = value;
    }, (value) => `${value.toFixed(1)}x`);
    this.bindSelect("texture-filter", (value) => {
      const filter = value === "nearest" ? THREE.NearestFilter : THREE.LinearFilter;
      this.texture.magFilter = filter;
      this.texture.minFilter = filter;
      this.texture.needsUpdate = true;
    });
  }

  protected update(delta: number, elapsed: number): void {
    this.wasm.fill_texture(
      WASM_LAYOUT.texturePixels,
      TEXTURE_SIZE,
      TEXTURE_SIZE,
      Math.floor(elapsed * this.speed * 18),
    );
    this.texture.needsUpdate = true;

    this.group.rotation.y += delta * 0.24;
    this.group.rotation.x = Math.sin(elapsed * 0.45) * 0.08;
  }
}
