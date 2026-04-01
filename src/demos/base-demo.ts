import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 16;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.9;

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.stage);

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

  public tick(delta: number, elapsed: number): void {
    this.fpsFrames += 1;
    this.fpsElapsed += delta;

    if (this.fpsElapsed >= 0.35) {
      const fps = Math.round(this.fpsFrames / this.fpsElapsed);
      this.fpsBadge.textContent = `${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }

    this.controls.update();
    this.update(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  protected abstract update(delta: number, elapsed: number): void;

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
}
