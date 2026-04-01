import * as THREE from "three";

import { BaseDemo } from "./base-demo";

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

export class ShadowPlaygroundDemo extends BaseDemo {
  private readonly rig = new THREE.Group();
  private readonly columns: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] = [];
  private readonly heroMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly helperGroup = new THREE.Group();
  private readonly directional = new THREE.DirectionalLight(0xffddb5, 1.9);
  private readonly spot = new THREE.SpotLight(0xc8d8ff, 1.15, 14, 0.42, 0.44, 1.1);
  private readonly point = new THREE.PointLight(0xffa45e, 0.6, 9, 2.2);
  private readonly spotTarget = new THREE.Object3D();
  private readonly directionalHelper: THREE.DirectionalLightHelper;
  private readonly directionalCameraHelper: THREE.CameraHelper;
  private readonly spotHelper: THREE.SpotLightHelper;
  private readonly blurOutput: HTMLOutputElement;

  private shadowBias = -0.0008;
  private blur = 3;
  private shadowMode = "pcf";

  constructor(root: HTMLElement) {
    super(root);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.fog = new THREE.Fog(0x050915, 6.5, 14);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.75, 88),
      new THREE.MeshStandardMaterial({
        color: 0x0d172a,
        roughness: 0.96,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.8;
    floor.receiveShadow = true;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.08, 22, 140),
      new THREE.MeshBasicMaterial({
        color: 0x173b62,
        transparent: true,
        opacity: 0.42,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.77;

    const archMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f4a89,
      roughness: 0.28,
      metalness: 0.78,
    });
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xc99348,
      roughness: 0.24,
      metalness: 0.28,
    });
    const plinthMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7e7ff,
      roughness: 0.52,
      metalness: 0.06,
    });

    this.heroMaterials.push(archMaterial, sphereMaterial, plinthMaterial);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 18, 120, Math.PI), archMaterial);
    arch.rotation.z = Math.PI / 2;
    arch.position.set(0.1, 0.18, -0.04);
    arch.castShadow = true;
    arch.receiveShadow = true;

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 32), sphereMaterial);
    sphere.position.set(0.04, 0.08, 0.08);
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.54, 0.54), plinthMaterial);
    plinth.position.set(1.02, -0.34, 0.16);
    plinth.rotation.y = -0.18;
    plinth.castShadow = true;
    plinth.receiveShadow = true;

    const pillarGeometry = new THREE.BoxGeometry(0.28, 1.14, 0.28);
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.2;
      const material = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x164784 : 0xcfdfff,
        roughness: index % 2 === 0 ? 0.34 : 0.56,
        metalness: index % 2 === 0 ? 0.72 : 0.08,
      });
      this.heroMaterials.push(material);

      const column = new THREE.Mesh(pillarGeometry, material);
      column.position.set(Math.cos(angle) * 1.4, -0.22, Math.sin(angle) * 1.22);
      column.rotation.y = angle * 0.34;
      column.castShadow = true;
      column.receiveShadow = true;
      this.columns.push(column);
      this.rig.add(column);
    }

    this.rig.add(arch, sphere, plinth);
    this.scene.add(floor, ring, this.rig, this.spotTarget);

    this.scene.add(new THREE.AmbientLight(0x91abff, 0.22));
    this.scene.add(new THREE.HemisphereLight(0x8ab4ff, 0x101522, 0.52));

    this.directional.position.set(2.8, 3.9, 2.2);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.left = -3.2;
    this.directional.shadow.camera.right = 3.2;
    this.directional.shadow.camera.top = 3.2;
    this.directional.shadow.camera.bottom = -3.2;
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 12;
    this.directional.shadow.bias = this.shadowBias;

    this.spot.position.set(-2.1, 3.4, 2.8);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = this.shadowBias;
    this.spot.target = this.spotTarget;

    this.point.position.set(1.8, 1.4, -1.8);

    this.directionalHelper = new THREE.DirectionalLightHelper(this.directional, 0.45, 0xffc986);
    this.directionalCameraHelper = new THREE.CameraHelper(this.directional.shadow.camera);
    this.spotHelper = new THREE.SpotLightHelper(this.spot, 0x8ab4ff);
    this.helperGroup.add(this.directionalHelper, this.directionalCameraHelper, this.spotHelper);
    this.helperGroup.visible = false;

    this.scene.add(this.directional, this.spot, this.point, this.helperGroup);

    this.camera.position.set(4.3, 2.45, 4.4);
    this.controls.target.set(0.15, -0.05, 0);
    this.controls.autoRotateSpeed = 0.7;

    this.blurOutput = requireElement(root, '[data-output="shadow-blur"]');

    this.bindCheckbox("shadow-helpers", (value) => {
      this.helperGroup.visible = value;
    });
    this.bindCheckbox("shadow-wireframe", (value) => {
      for (const material of this.heroMaterials) {
        material.wireframe = value;
      }
    });
    this.bindSelect("shadow-type", (value) => {
      this.shadowMode = value;
      this.renderer.shadowMap.type =
        value === "basic"
          ? THREE.BasicShadowMap
          : value === "vsm"
            ? THREE.VSMShadowMap
            : THREE.PCFShadowMap;
      this.renderer.shadowMap.needsUpdate = true;
    });
    this.bindRange("shadow-bias", (value) => {
      this.shadowBias = value;
      this.directional.shadow.bias = value;
      this.spot.shadow.bias = value;
    }, (value) => value.toFixed(4));
    this.bindRange("shadow-blur", (value) => {
      this.blur = value;
      this.directional.shadow.radius = value;
      this.spot.shadow.radius = value;
      this.blurOutput.textContent = value.toFixed(1);
    }, (value) => value.toFixed(1));
  }

  protected update(_delta: number, elapsed: number): void {
    const swing = Math.sin(elapsed * 0.7);
    this.rig.rotation.y = elapsed * 0.12;
    this.rig.position.y = Math.sin(elapsed * 0.55) * 0.04;

    this.spotTarget.position.set(Math.sin(elapsed * 0.8) * 0.55, -0.08, Math.cos(elapsed * 0.55) * 0.35);
    this.spot.position.set(-2.1 + Math.cos(elapsed * 0.6) * 0.6, 3.4, 2.8 + Math.sin(elapsed * 0.6) * 0.45);
    this.point.position.set(1.8 + swing * 0.5, 1.4 + Math.cos(elapsed * 0.8) * 0.16, -1.8);
    this.directional.position.set(2.8 + Math.cos(elapsed * 0.42) * 0.5, 3.9, 2.2 + Math.sin(elapsed * 0.42) * 0.35);

    if (this.shadowMode === "vsm") {
      this.directional.shadow.blurSamples = 8;
      this.spot.shadow.blurSamples = 8;
    } else {
      this.directional.shadow.blurSamples = 1;
      this.spot.shadow.blurSamples = 1;
    }

    this.directionalHelper.update();
    this.directionalCameraHelper.update();
    this.spotHelper.update();
  }
}
