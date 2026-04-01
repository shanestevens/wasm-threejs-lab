import * as THREE from "three";

import { BaseDemo } from "./base-demo";
import type { LabWasmExports } from "../lib/load-wasm";
import { WASM_LAYOUT } from "../lib/load-wasm";

const VERTEX_COUNT = 24;
const INDEX_COUNT = 36;

export class IndexedGeometryDemo extends BaseDemo {
  private readonly geometry = new THREE.BufferGeometry();
  private readonly group = new THREE.Group();
  private readonly positionView: Float32Array;
  private readonly colorView: Float32Array;
  private readonly indexView: Uint32Array;
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly wireframe: THREE.LineSegments<THREE.WireframeGeometry, THREE.LineBasicMaterial>;

  private profile = 0;

  constructor(root: HTMLElement, private readonly wasm: LabWasmExports) {
    super(root);

    this.positionView = new Float32Array(this.wasm.memory.buffer, WASM_LAYOUT.geometryPositions, VERTEX_COUNT * 3);
    this.colorView = new Float32Array(this.wasm.memory.buffer, WASM_LAYOUT.geometryColors, VERTEX_COUNT * 3);
    this.indexView = new Uint32Array(this.wasm.memory.buffer, WASM_LAYOUT.geometryIndices, INDEX_COUNT);

    this.scene.fog = new THREE.Fog(0x040913, 5.2, 10.6);

    const hemisphere = new THREE.HemisphereLight(0x95b7ff, 0x11182c, 1.15);
    const key = new THREE.DirectionalLight(0xffddb1, 1.7);
    key.position.set(3.4, 4.1, 2.6);
    const rim = new THREE.DirectionalLight(0x5b7eff, 0.75);
    rim.position.set(-2.8, 2.2, -3.2);
    this.scene.add(hemisphere, key, rim);

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.34,
        metalness: 0.08,
      }),
    );

    this.populateGeometry();

    this.wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.geometry),
      new THREE.LineBasicMaterial({
        color: 0xe6f3ff,
        transparent: true,
        opacity: 0.78,
      }),
    );
    this.wireframe.visible = false;

    this.group.rotation.set(-0.42, 0.62, 0);
    this.group.add(this.mesh, this.wireframe);
    this.scene.add(this.group);

    this.camera.position.set(3.1, 2.35, 4.1);
    this.controls.target.set(0, 0.18, 0);

    this.bindCheckbox("indexed-wireframe", (value) => {
      this.wireframe.visible = value;
    });
    this.bindCheckbox("indexed-auto-rotate", (value) => {
      this.setAutoRotate(value);
    });
    this.bindRange("indexed-profile", (value) => {
      this.profile = value;
      this.refreshGeometry();
    }, (value) => `${Math.round(value * 100)}%`);
  }

  protected update(_delta: number, _elapsed: number): void {
    // Camera motion is handled by OrbitControls; the mesh data only changes when the profile slider changes.
  }

  private refreshGeometry(): void {
    this.populateGeometry();
    this.wireframe.geometry.dispose();
    this.wireframe.geometry = new THREE.WireframeGeometry(this.geometry);
  }

  private populateGeometry(): void {
    this.wasm.fill_indexed_cube(
      WASM_LAYOUT.geometryPositions,
      WASM_LAYOUT.geometryColors,
      WASM_LAYOUT.geometryIndices,
      this.profile,
    );

    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positionView.subarray(0, VERTEX_COUNT * 3), 3),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colorView.subarray(0, VERTEX_COUNT * 3), 3),
    );
    this.geometry.setIndex(new THREE.BufferAttribute(this.indexView.subarray(0, INDEX_COUNT), 1));
    this.geometry.computeVertexNormals();
  }
}
