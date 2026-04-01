export const TEXTURE_SIZE = 128;
export const SWARM_MAX_ENTITIES = 40000;
export const TERRAIN_MAX_RESOLUTION = 384;
export const TERRAIN_MAX_VERTICES = (TERRAIN_MAX_RESOLUTION + 1) * (TERRAIN_MAX_RESOLUTION + 1);
export const TERRAIN_MAX_INDICES = TERRAIN_MAX_RESOLUTION * TERRAIN_MAX_RESOLUTION * 6;

const TERRAIN_FLOAT_COMPONENTS = TERRAIN_MAX_VERTICES * 3;
const TERRAIN_ATTRIBUTE_BYTES = TERRAIN_FLOAT_COMPONENTS * Float32Array.BYTES_PER_ELEMENT;
const TERRAIN_INDEX_BYTES = TERRAIN_MAX_INDICES * Uint32Array.BYTES_PER_ELEMENT;
const TERRAIN_POSITIONS_OFFSET = 4_198_656;

export const WASM_LAYOUT = {
  trianglePositions: 0,
  triangleColors: 256,
  geometryPositions: 4_096,
  geometryColors: 8_192,
  geometryIndices: 12_288,
  texturePixels: 16_384,
  lightingState: 90_112,
  swarmState: 98_304,
  swarmGridHeads: 1_441_792,
  swarmGridNext: 1_458_176,
  swarmMatrices: 1_638_400,
  terrainPositions: TERRAIN_POSITIONS_OFFSET,
  terrainNormals: TERRAIN_POSITIONS_OFFSET + TERRAIN_ATTRIBUTE_BYTES,
  terrainColors: TERRAIN_POSITIONS_OFFSET + TERRAIN_ATTRIBUTE_BYTES * 2,
  terrainIndices: TERRAIN_POSITIONS_OFFSET + TERRAIN_ATTRIBUTE_BYTES * 3,
  terrainEnd: TERRAIN_POSITIONS_OFFSET + TERRAIN_ATTRIBUTE_BYTES * 3 + TERRAIN_INDEX_BYTES,
} as const;

const WASM_ASSET_VERSION = `terrain-${TERRAIN_MAX_RESOLUTION}-${WASM_LAYOUT.terrainEnd}`;

export interface LabWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  fill_triangle(positionPtr: number, colorPtr: number, phase: number): void;
  fill_indexed_cube(positionPtr: number, colorPtr: number, indexPtr: number, profile: number): void;
  fill_texture(pixelPtr: number, width: number, height: number, tick: number): void;
  fill_lighting_state(statePtr: number, setup: number, phase: number): void;
  build_terrain_mesh(
    positionPtr: number,
    normalPtr: number,
    colorPtr: number,
    indexPtr: number,
    resolution: number,
    phase: number,
    amplitude: number,
    roughness: number,
  ): void;
  seed_swarm(statePtr: number, count: number): void;
  step_swarm(
    statePtr: number,
    gridHeadPtr: number,
    gridNextPtr: number,
    matrixPtr: number,
    count: number,
    dt: number,
    spread: number,
    lift: number,
  ): void;
}

export interface TerrainCppWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  build_terrain_mesh(
    positionPtr: number,
    normalPtr: number,
    colorPtr: number,
    indexPtr: number,
    resolution: number,
    phase: number,
    amplitude: number,
    roughness: number,
  ): void;
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

function ensureMemoryBytes(memory: WebAssembly.Memory, requiredBytes: number): void {
  const currentBytes = memory.buffer.byteLength;

  if (currentBytes >= requiredBytes) {
    return;
  }

  const missingBytes = requiredBytes - currentBytes;
  const pageSize = 64 * 1024;
  const missingPages = Math.ceil(missingBytes / pageSize);

  try {
    memory.grow(missingPages);
  } catch (error) {
    throw new Error(
      `WASM memory is too small for the current terrain buffers. Required ${requiredBytes} bytes, got ${currentBytes} bytes.`,
      { cause: error },
    );
  }
}

export async function loadLabWasm(): Promise<LabWasmExports> {
  const wasmUrl = new URL(`${import.meta.env.BASE_URL}wasm/lab.wasm`, window.location.origin);
  wasmUrl.searchParams.set("v", WASM_ASSET_VERSION);
  const instance = await instantiateModule(wasmUrl.toString());
  const exports = instance.exports as unknown as LabWasmExports;
  ensureMemoryBytes(exports.memory, WASM_LAYOUT.terrainEnd);
  return exports;
}

export async function loadTerrainCppWasm(): Promise<TerrainCppWasmExports> {
  const wasmUrl = new URL(`${import.meta.env.BASE_URL}wasm/terrain-cpp.wasm`, window.location.origin);
  wasmUrl.searchParams.set("v", WASM_ASSET_VERSION);
  const instance = await instantiateModule(wasmUrl.toString());
  const exports = instance.exports as unknown as TerrainCppWasmExports;
  ensureMemoryBytes(exports.memory, WASM_LAYOUT.terrainEnd);
  return exports;
}
