import * as THREE from "three";

import { BaseDemo } from "./base-demo";
import type { LabWasmExports } from "../lib/load-wasm";
import { WASM_LAYOUT } from "../lib/load-wasm";

export class TriangleDemo extends BaseDemo {
  private readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly colorAttribute: THREE.BufferAttribute;

  private pulseSpeed = 1.1;
  private amplitude = 0.3;
  private spinSpeed = 0.18;

  constructor(root: HTMLElement, private readonly wasm: LabWasmExports) {
    super(root);

    const positions = new Float32Array(this.wasm.memory.buffer, WASM_LAYOUT.trianglePositions, 9);
    const colors = new Float32Array(this.wasm.memory.buffer, WASM_LAYOUT.triangleColors, 9);

    const geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    geometry.setAttribute("position", this.positionAttribute);
    geometry.setAttribute("color", this.colorAttribute);

    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    );

    this.outline = new THREE.LineLoop(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0xdceaff,
        transparent: true,
        opacity: 0.72,
      }),
    );
    this.outline.visible = false;

    this.group.add(this.mesh, this.outline);
    this.scene.add(this.group);

    this.camera.position.set(0.04, 0.1, 2.5);
    this.controls.enableZoom = false;
    this.controls.autoRotate = false;

    this.bindCheckbox("triangle-wireframe", (value) => {
      this.mesh.material.wireframe = value;
      this.outline.visible = value;
    });
    this.bindRange("triangle-pulse", (value) => {
      this.pulseSpeed = value;
    }, (value) => `${value.toFixed(1)}x`);
    this.bindRange("triangle-amplitude", (value) => {
      this.amplitude = value;
    }, (value) => `${Math.round(value * 100)}%`);
    this.bindRange("triangle-spin", (value) => {
      this.spinSpeed = value;
    }, (value) => `${value.toFixed(2)}`);
  }

  protected update(delta: number, elapsed: number): void {
    const phase = Math.sin(elapsed * this.pulseSpeed) * this.amplitude;
    this.wasm.fill_triangle(WASM_LAYOUT.trianglePositions, WASM_LAYOUT.triangleColors, phase);

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.group.rotation.z += delta * this.spinSpeed;
  }
}
