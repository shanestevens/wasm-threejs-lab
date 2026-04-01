import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type CameraMode = "orbit" | "fps";

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

export abstract class BaseDemo {
  protected readonly stage: HTMLElement;
  protected readonly canvas: HTMLCanvasElement;
  protected readonly fpsBadge: HTMLElement;
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly scene = new THREE.Scene();
  protected readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  protected readonly controls: OrbitControls;

  private cameraMode: CameraMode = "orbit";
  private orbitZoomEnabled = true;
  private orbitDistance = 4;
  private fpsLookActive = false;
  private fpsPointerId: number | null = null;
  private fpsYaw = 0;
  private fpsPitch = 0;
  private readonly pressedKeys = new Set<string>();
  private readonly scratchForward = new THREE.Vector3();
  private readonly scratchRight = new THREE.Vector3();
  private readonly scratchUp = new THREE.Vector3(0, 1, 0);
  private readonly scratchTarget = new THREE.Vector3();
  private readonly scratchEuler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly resizeObserver: ResizeObserver;
  private resizeFrame = 0;
  private lastWidth = 0;
  private lastHeight = 0;
  private fpsFrames = 0;
  private fpsElapsed = 0;

  constructor(protected readonly root: HTMLElement) {
    this.stage = requireElement<HTMLElement>(root, ".demo-card__stage");
    this.canvas = requireElement<HTMLCanvasElement>(root, "canvas");
    this.fpsBadge = requireElement<HTMLElement>(root, ".demo-card__fps");

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearAlpha(0);

    this.canvas.tabIndex = 0;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 16;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.9;

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.stage);

    this.bindCameraMode();
    this.bindFpsControls();
    this.bindFullscreenButton();
    this.scheduleResize();
  }

  protected bindRange(
    name: string,
    onChange: (value: number) => void,
    format: (value: number) => string = (value) => value.toFixed(2),
  ): void {
    const input = this.root.querySelector<HTMLInputElement>(`[data-control="${name}"]`);

    if (!input) {
      return;
    }

    const output = input.closest(".control-row")?.querySelector<HTMLOutputElement>("output");

    const apply = (): void => {
      const value = Number(input.value);
      onChange(value);

      if (output) {
        output.value = format(value);
        output.textContent = format(value);
      }
    };

    input.addEventListener("input", apply);
    apply();
  }

  protected bindCheckbox(name: string, onChange: (value: boolean) => void): void {
    const input = this.root.querySelector<HTMLInputElement>(`[data-control="${name}"]`);

    if (!input) {
      return;
    }

    const apply = (): void => {
      onChange(input.checked);
    };

    input.addEventListener("change", apply);
    apply();
  }

  protected bindSelect(name: string, onChange: (value: string) => void): void {
    const input = this.root.querySelector<HTMLSelectElement>(`[data-control="${name}"]`);

    if (!input) {
      return;
    }

    const apply = (): void => {
      onChange(input.value);
    };

    input.addEventListener("change", apply);
    apply();
  }

  protected setAutoRotate(enabled: boolean): void {
    this.controls.autoRotate = enabled;
  }

  protected setOrbitZoomEnabled(enabled: boolean): void {
    this.orbitZoomEnabled = enabled;
    if (this.cameraMode === "orbit") {
      this.controls.enableZoom = enabled;
    }
  }

  public tick(delta: number, elapsed: number): void {
    this.fpsFrames += 1;
    this.fpsElapsed += delta;

    if (this.fpsElapsed >= 0.35) {
      const fps = Math.round(this.fpsFrames / this.fpsElapsed);
      this.fpsBadge.textContent = `${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }

    if (this.cameraMode === "orbit") {
      this.controls.update();
      this.orbitDistance = Math.max(0.001, this.camera.position.distanceTo(this.controls.target));
    } else {
      this.updateFpsMovement(delta);
    }

    this.update(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  protected abstract update(delta: number, elapsed: number): void;

  private bindCameraMode(controlName = "camera-mode"): void {
    this.bindSelect(controlName, (value) => {
      this.setCameraMode(value === "fps" ? "fps" : "orbit");
    });
  }

  private bindFpsControls(): void {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (this.cameraMode !== "fps") {
        return;
      }

      this.canvas.focus();
      this.fpsLookActive = true;
      this.fpsPointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      this.syncCursor();
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (this.cameraMode !== "fps" || !this.fpsLookActive || this.fpsPointerId !== event.pointerId) {
        return;
      }

      const movementX = event.movementX ?? 0;
      const movementY = event.movementY ?? 0;
      const lookSpeed = 0.0024;

      this.fpsYaw -= movementX * lookSpeed;
      this.fpsPitch -= movementY * lookSpeed;
      this.fpsPitch = THREE.MathUtils.clamp(this.fpsPitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
      this.applyFpsRotation();
    });

    const stopLook = (pointerId?: number): void => {
      if (pointerId !== undefined && this.fpsPointerId !== pointerId) {
        return;
      }

      this.fpsLookActive = false;
      this.fpsPointerId = null;
      this.syncCursor();
    };

    this.canvas.addEventListener("pointerup", (event) => {
      stopLook(event.pointerId);
    });
    this.canvas.addEventListener("pointercancel", (event) => {
      stopLook(event.pointerId);
    });
    this.canvas.addEventListener("lostpointercapture", () => {
      stopLook();
    });

    this.canvas.addEventListener(
      "wheel",
      (event) => {
        if (this.cameraMode !== "fps") {
          return;
        }

        event.preventDefault();
        const distance = -event.deltaY * 0.0026;
        this.moveAlongView(distance);
      },
      { passive: false },
    );

    this.canvas.addEventListener("keydown", (event) => {
      if (this.cameraMode !== "fps") {
        return;
      }

      if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"].includes(event.code)) {
        event.preventDefault();
        this.pressedKeys.add(event.code);
      }
    });

    this.canvas.addEventListener("keyup", (event) => {
      this.pressedKeys.delete(event.code);
    });

    this.canvas.addEventListener("blur", () => {
      this.pressedKeys.clear();
      stopLook();
    });

    this.syncCursor();
  }

  private scheduleResize(): void {
    if (this.resizeFrame) {
      return;
    }

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.resize();
    });
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.stage;

    if (!clientWidth || !clientHeight) {
      return;
    }

    if (clientWidth === this.lastWidth && clientHeight === this.lastHeight) {
      return;
    }

    this.lastWidth = clientWidth;
    this.lastHeight = clientHeight;

    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  private bindFullscreenButton(): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');

    if (!button) {
      return;
    }

    const syncLabel = (): void => {
      button.textContent = document.fullscreenElement === this.root ? "Exit full screen" : "Full screen";
    };

    button.addEventListener("click", async () => {
      if (document.fullscreenElement === this.root) {
        await document.exitFullscreen();
      } else {
        await this.root.requestFullscreen();
      }
      syncLabel();
      this.scheduleResize();
    });

    document.addEventListener("fullscreenchange", () => {
      syncLabel();
      this.scheduleResize();
    });
  }

  private setCameraMode(mode: CameraMode): void {
    if (this.cameraMode === mode) {
      this.syncCursor();
      return;
    }

    if (mode === "fps") {
      this.orbitDistance = Math.max(0.001, this.camera.position.distanceTo(this.controls.target));
      this.syncFpsAnglesFromCamera();
      this.controls.enabled = false;
      this.controls.enableZoom = false;
      this.cameraMode = mode;
      this.syncCursor();
      return;
    }

    this.camera.getWorldDirection(this.scratchForward);
    this.scratchTarget.copy(this.camera.position).addScaledVector(this.scratchForward, this.orbitDistance);
    this.controls.target.copy(this.scratchTarget);
    this.controls.enabled = true;
    this.controls.enableZoom = this.orbitZoomEnabled;
    this.controls.update();
    this.cameraMode = mode;
    this.fpsLookActive = false;
    this.pressedKeys.clear();
    this.syncCursor();
  }

  private syncFpsAnglesFromCamera(): void {
    this.scratchEuler.setFromQuaternion(this.camera.quaternion, "YXZ");
    this.fpsPitch = this.scratchEuler.x;
    this.fpsYaw = this.scratchEuler.y;
  }

  private applyFpsRotation(): void {
    this.scratchEuler.set(this.fpsPitch, this.fpsYaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(this.scratchEuler);
  }

  private moveAlongView(distance: number): void {
    this.camera.getWorldDirection(this.scratchForward);
    this.camera.position.addScaledVector(this.scratchForward, distance);
  }

  private updateFpsMovement(delta: number): void {
    if (this.pressedKeys.size === 0) {
      return;
    }

    this.camera.getWorldDirection(this.scratchForward);
    this.scratchRight.crossVectors(this.scratchForward, this.scratchUp).normalize();

    const moveVector = new THREE.Vector3();
    if (this.pressedKeys.has("KeyW")) {
      moveVector.add(this.scratchForward);
    }
    if (this.pressedKeys.has("KeyS")) {
      moveVector.sub(this.scratchForward);
    }
    if (this.pressedKeys.has("KeyD")) {
      moveVector.add(this.scratchRight);
    }
    if (this.pressedKeys.has("KeyA")) {
      moveVector.sub(this.scratchRight);
    }
    if (this.pressedKeys.has("KeyE")) {
      moveVector.add(this.scratchUp);
    }
    if (this.pressedKeys.has("KeyQ")) {
      moveVector.sub(this.scratchUp);
    }

    const moveLength = moveVector.length();
    if (moveLength === 0) {
      return;
    }

    const speed = (this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight") ? 7.6 : 3.6) * delta;
    moveVector.multiplyScalar(speed / moveLength);
    this.camera.position.add(moveVector);
  }

  private syncCursor(): void {
    this.canvas.style.cursor = this.cameraMode === "fps" ? (this.fpsLookActive ? "grabbing" : "grab") : "default";
  }
}
