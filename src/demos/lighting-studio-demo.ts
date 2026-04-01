import * as THREE from "three";

import { BaseDemo } from "./base-demo";
import type { LabWasmExports } from "../lib/load-wasm";
import { WASM_LAYOUT } from "../lib/load-wasm";

const SETUP_INDEX: Record<string, number> = {
  all: 0,
  ambient: 1,
  hemisphere: 2,
  directional: 3,
  point: 4,
  spot: 5,
};

export class LightingStudioDemo extends BaseDemo {
  private readonly lightingState: Float32Array;
  private readonly stageGroup = new THREE.Group();
  private readonly heroGroup = new THREE.Group();
  private readonly floor: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  private readonly torus: THREE.Mesh<THREE.TorusKnotGeometry, THREE.MeshStandardMaterial>;
  private readonly box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private readonly ambient = new THREE.AmbientLight(0xa7c2ff, 0.24);
  private readonly hemisphere = new THREE.HemisphereLight(0x98b8ff, 0x161a2a, 0.68);
  private readonly directional = new THREE.DirectionalLight(0xffddb8, 1.5);
  private readonly point = new THREE.PointLight(0xffd39d, 1.08, 12, 2);
  private readonly spot = new THREE.SpotLight(0xf7d7c3, 0.92, 18, 0.42, 0.48, 1.1);
  private readonly helperGroup = new THREE.Group();
  private readonly spotTarget = new THREE.Object3D();
  private readonly directionalHelper: THREE.DirectionalLightHelper;
  private readonly pointHelper: THREE.PointLightHelper;
  private readonly spotHelper: THREE.SpotLightHelper;
  private readonly heroMaterials: THREE.MeshStandardMaterial[];

  private ambientGain = 0.25;
  private hemisphereGain = 0.68;
  private directionalGain = 1.5;
  private pointGain = 1.08;
  private spotGain = 0.92;
  private setup = "all";

  constructor(root: HTMLElement, private readonly wasm: LabWasmExports) {
    super(root);

    this.lightingState = new Float32Array(this.wasm.memory.buffer, WASM_LAYOUT.lightingState, 16);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.fog = new THREE.Fog(0x050916, 6.5, 13);

    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x63c4ff,
      roughness: 0.22,
      metalness: 0.48,
    });
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9ebff,
      roughness: 0.55,
      metalness: 0.06,
    });
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1d18e,
      roughness: 0.32,
      metalness: 0.12,
    });
    this.heroMaterials = [torusMaterial, boxMaterial, sphereMaterial];

    this.torus = new THREE.Mesh(new THREE.TorusKnotGeometry(0.58, 0.18, 180, 28), torusMaterial);
    this.torus.position.set(-0.42, 0.18, -0.12);
    this.torus.rotation.set(0.2, -0.84, 0.18);
    this.torus.castShadow = true;

    this.box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), boxMaterial);
    this.box.position.set(0.32, -0.2, 0.28);
    this.box.rotation.set(0.12, 0.34, 0);
    this.box.castShadow = true;
    this.box.receiveShadow = true;

    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(0.44, 48, 32), sphereMaterial);
    this.sphere.position.set(1.12, -0.06, 0.44);
    this.sphere.castShadow = true;
    this.sphere.receiveShadow = true;

    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 72),
      new THREE.MeshStandardMaterial({
        color: 0x132539,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.7;
    this.floor.receiveShadow = true;

    const pedestal = new THREE.Mesh(
      new THREE.TorusGeometry(1.88, 0.08, 20, 120),
      new THREE.MeshBasicMaterial({
        color: 0x39584e,
        transparent: true,
        opacity: 0.45,
      }),
    );
    pedestal.rotation.x = -Math.PI / 2;
    pedestal.position.y = -0.68;

    this.heroGroup.add(this.torus, this.box, this.sphere);
    this.spotTarget.position.set(0.18, -0.1, 0.12);
    this.stageGroup.add(this.floor, pedestal, this.heroGroup, this.spotTarget);
    this.scene.add(this.stageGroup);

    this.hemisphere.position.set(0, 2.8, 0);

    this.directional.position.set(2.6, 3.8, 1.8);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 10;

    this.point.position.set(-1.8, 1.6, 1.8);
    this.point.castShadow = true;

    this.spot.position.set(1.4, 3.2, 2.4);
    this.spot.target = this.spotTarget;
    this.spot.castShadow = true;

    this.directionalHelper = new THREE.DirectionalLightHelper(this.directional, 0.45, 0xffc37a);
    this.pointHelper = new THREE.PointLightHelper(this.point, 0.14, 0x86b6ff);
    this.spotHelper = new THREE.SpotLightHelper(this.spot, 0x86b6ff);
    this.helperGroup.add(this.directionalHelper, this.pointHelper, this.spotHelper);
    this.helperGroup.visible = false;

    this.scene.add(
      this.ambient,
      this.hemisphere,
      this.directional,
      this.point,
      this.spot,
      this.helperGroup,
    );

    this.camera.position.set(3.8, 2.25, 4.7);
    this.controls.target.set(0.18, 0, 0.1);

    this.bindCheckbox("lighting-wireframe", (value) => {
      for (const material of this.heroMaterials) {
        material.wireframe = value;
      }
    });
    this.bindCheckbox("lighting-helpers", (value) => {
      this.helperGroup.visible = value;
    });
    this.bindSelect("lighting-setup", (value) => {
      this.setup = value;
    });
    this.bindRange("lighting-ambient", (value) => {
      this.ambientGain = value;
    }, (value) => value.toFixed(2));
    this.bindRange("lighting-hemisphere", (value) => {
      this.hemisphereGain = value;
    }, (value) => value.toFixed(2));
    this.bindRange("lighting-directional", (value) => {
      this.directionalGain = value;
    }, (value) => value.toFixed(2));
    this.bindRange("lighting-point", (value) => {
      this.pointGain = value;
    }, (value) => value.toFixed(2));
    this.bindRange("lighting-spot", (value) => {
      this.spotGain = value;
    }, (value) => value.toFixed(2));
  }

  protected update(_delta: number, elapsed: number): void {
    this.wasm.fill_lighting_state(
      WASM_LAYOUT.lightingState,
      SETUP_INDEX[this.setup] ?? 0,
      Math.sin(elapsed * 0.9),
    );

    this.ambient.intensity = this.scaleLight(this.lightingState[0], this.ambientGain, 0.24);
    this.hemisphere.intensity = this.scaleLight(this.lightingState[1], this.hemisphereGain, 0.68);
    this.directional.intensity = this.scaleLight(this.lightingState[2], this.directionalGain, 1.5);
    this.point.intensity = this.scaleLight(this.lightingState[3], this.pointGain, 1.08);
    this.spot.intensity = this.scaleLight(this.lightingState[4], this.spotGain, 0.92);

    this.directional.position.set(this.lightingState[5], this.lightingState[6], this.lightingState[7]);
    this.point.position.set(this.lightingState[8], this.lightingState[9], this.lightingState[10]);
    this.spot.position.set(this.lightingState[11], this.lightingState[12], this.lightingState[13]);

    this.heroGroup.rotation.y = 0.4 + elapsed * 0.12 + this.lightingState[14];
    this.heroGroup.position.y = Math.sin(elapsed * 0.6) * 0.04;
    this.sphere.position.x = this.lightingState[15];
    this.torus.rotation.x = 0.24 + Math.sin(elapsed * 0.75) * 0.12;

    this.directionalHelper.update();
    this.pointHelper.update();
    this.spotHelper.update();
  }

  private scaleLight(value: number, gain: number, baseline: number): number {
    if (baseline === 0) {
      return value;
    }

    return value * (gain / baseline);
  }
}
