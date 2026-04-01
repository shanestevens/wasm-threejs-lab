export const TEXTURE_SIZE = 128;

export const WASM_LAYOUT = {
  trianglePositions: 0,
  triangleColors: 256,
  geometryPositions: 4_096,
  geometryColors: 8_192,
  geometryIndices: 12_288,
  texturePixels: 16_384,
  lightingState: 90_112,
} as const;

export interface LabWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  fill_triangle(positionPtr: number, colorPtr: number, phase: number): void;
  fill_indexed_cube(positionPtr: number, colorPtr: number, indexPtr: number, profile: number): void;
  fill_texture(pixelPtr: number, width: number, height: number, tick: number): void;
  fill_lighting_state(statePtr: number, setup: number, phase: number): void;
}

async function instantiateModule(url: string): Promise<WebAssembly.Instance> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const clone = response.clone();

  if ("instantiateStreaming" in WebAssembly) {
    try {
      const result = await WebAssembly.instantiateStreaming(response, {});
      return result.instance;
    } catch {
      const bytes = await clone.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, {});
      return result.instance;
    }
  }

  const bytes = await clone.arrayBuffer();
  const result = await WebAssembly.instantiate(bytes, {});
  return result.instance;
}

export async function loadLabWasm(): Promise<LabWasmExports> {
  const wasmUrl = new URL(`${import.meta.env.BASE_URL}wasm/lab.wasm`, window.location.origin);
  const instance = await instantiateModule(wasmUrl.toString());
  return instance.exports as unknown as LabWasmExports;
}
