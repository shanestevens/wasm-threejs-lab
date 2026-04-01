import * as THREE from "three";

import { BaseDemo } from "./base-demo";
import {
  TERRAIN_MAX_INDICES,
  TERRAIN_MAX_RESOLUTION,
  TERRAIN_MAX_VERTICES,
  WASM_LAYOUT,
  type LabWasmExports,
  type TerrainCppWasmExports,
} from "../lib/load-wasm";

type Driver = "js" | "wat" | "cpp";

type TerrainVertex = {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
};

const WORLD_SIZE = 8.4;
const WORLD_HALF = WORLD_SIZE * 0.5;
const POSITION_STRIDE = 3;

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function triangleWave(value: number): number {
  const fractional = value - Math.floor(value);
  return Math.abs(fractional * 2 - 1);
}

function terrainHeight(
  x: number,
  z: number,
  phase: number,
  amplitude: number,
  roughness: number,
): number {
  const ridgeA =
    1 -
    triangleWave(
      x * 0.34 +
        phase * 0.11 +
        triangleWave(z * 0.16 + phase * 0.07 + 0.35) * (0.28 + roughness * 0.1),
    );
  const ridgeB =
    1 -
    triangleWave(
      z * (0.37 + roughness * 0.04) -
        phase * 0.09 +
        triangleWave((x - z) * 0.12 + 0.9) * (0.24 + roughness * 0.08),
    );
  const shelves =
    1 - triangleWave((x + z) * (0.19 + roughness * 0.03) + phase * 0.05 + ridgeA * 0.18);
  const basin = (x * x + z * z) * 0.018;
  const terraceSteps = 5 + roughness * 8;
  const base = ridgeA * 0.54 + ridgeB * 0.32 + shelves * 0.24;
  const terraced = Math.floor(base * terraceSteps) / terraceSteps;

  return (terraced * (0.95 + roughness * 0.42) - basin) * amplitude;
}

function writeTerrainVertex(
  vertexIndex: number,
  resolution: number,
  phase: number,
  amplitude: number,
  roughness: number,
  positions: Float32Array,
  normals: Float32Array,
  colors: Float32Array,
): void {
  const span = resolution + 1;
  const xIndex = vertexIndex % span;
  const zIndex = Math.floor(vertexIndex / span);
  const cellSize = WORLD_SIZE / resolution;
  const worldX = xIndex * cellSize - WORLD_HALF;
  const worldZ = zIndex * cellSize - WORLD_HALF;
  const height = terrainHeight(worldX, worldZ, phase, amplitude, roughness);

  const heightL = terrainHeight(worldX - cellSize, worldZ, phase, amplitude, roughness);
  const heightR = terrainHeight(worldX + cellSize, worldZ, phase, amplitude, roughness);
  const heightD = terrainHeight(worldX, worldZ - cellSize, phase, amplitude, roughness);
  const heightU = terrainHeight(worldX, worldZ + cellSize, phase, amplitude, roughness);

  let nx = heightL - heightR;
  let ny = cellSize * 2;
  let nz = heightD - heightU;
  const normalLength = Math.hypot(nx, ny, nz) || 1;
  nx /= normalLength;
  ny /= normalLength;
  nz /= normalLength;

  const slope = 1 - ny;
  const height01 = clamp(0.5 + height / Math.max(amplitude * 2.35, 0.001), 0, 1);
  const snow = clamp((height01 - 0.68) * 2.2 + slope * 0.12, 0, 1);
  const warm = clamp(0.12 + height01 * 0.22 + slope * 0.09, 0, 1);
  const green = clamp(0.22 + height01 * 0.44 - slope * 0.1 + snow * 0.08, 0, 1);
  const blue = clamp(0.18 + height01 * 0.26 + slope * 0.14 + snow * 0.18, 0, 1);

  const offset = vertexIndex * POSITION_STRIDE;
  positions[offset] = worldX;
  positions[offset + 1] = height;
  positions[offset + 2] = worldZ;

  normals[offset] = nx;
  normals[offset + 1] = ny;
  normals[offset + 2] = nz;

  colors[offset] = warm;
  colors[offset + 1] = green;
  colors[offset + 2] = blue;
}

function buildTerrainTyped(
  resolution: number,
  phase: number,
  amplitude: number,
  roughness: number,
  positions: Float32Array,
  normals: Float32Array,
  colors: Float32Array,
  indices: Uint32Array,
): { vertexCount: number; indexCount: number } {
  const span = resolution + 1;
  const vertexCount = span * span;

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    writeTerrainVertex(vertexIndex, resolution, phase, amplitude, roughness, positions, normals, colors);
  }

  let indexCursor = 0;
  for (let z = 0; z < resolution; z += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const a = z * span + x;
      const b = a + 1;
      const c = a + span;
      const d = c + 1;

      indices[indexCursor] = a;
      indices[indexCursor + 1] = c;
      indices[indexCursor + 2] = b;
      indices[indexCursor + 3] = b;
      indices[indexCursor + 4] = c;
      indices[indexCursor + 5] = d;
      indexCursor += 6;
    }
  }

  return { vertexCount, indexCount: indexCursor };
}

function buildTerrainObjects(
  resolution: number,
  phase: number,
  amplitude: number,
  roughness: number,
  positions: Float32Array,
  normals: Float32Array,
  colors: Float32Array,
  indices: Uint32Array,
): { vertexCount: number; indexCount: number } {
  const span = resolution + 1;
  const vertices: TerrainVertex[] = [];
  const faces: number[] = [];
  const cellSize = WORLD_SIZE / resolution;

  for (let zIndex = 0; zIndex <= resolution; zIndex += 1) {
    for (let xIndex = 0; xIndex <= resolution; xIndex += 1) {
      const worldX = xIndex * cellSize - WORLD_HALF;
      const worldZ = zIndex * cellSize - WORLD_HALF;
      const height = terrainHeight(worldX, worldZ, phase, amplitude, roughness);

      const heightL = terrainHeight(worldX - cellSize, worldZ, phase, amplitude, roughness);
      const heightR = terrainHeight(worldX + cellSize, worldZ, phase, amplitude, roughness);
      const heightD = terrainHeight(worldX, worldZ - cellSize, phase, amplitude, roughness);
      const heightU = terrainHeight(worldX, worldZ + cellSize, phase, amplitude, roughness);

      let nx = heightL - heightR;
      let ny = cellSize * 2;
      let nz = heightD - heightU;
      const normalLength = Math.hypot(nx, ny, nz) || 1;
      nx /= normalLength;
      ny /= normalLength;
      nz /= normalLength;

      const slope = 1 - ny;
      const height01 = clamp(0.5 + height / Math.max(amplitude * 2.35, 0.001), 0, 1);
      const snow = clamp((height01 - 0.68) * 2.2 + slope * 0.12, 0, 1);

      vertices.push({
        position: { x: worldX, y: height, z: worldZ },
        normal: { x: nx, y: ny, z: nz },
        color: {
          r: clamp(0.12 + height01 * 0.22 + slope * 0.09, 0, 1),
          g: clamp(0.22 + height01 * 0.44 - slope * 0.1 + snow * 0.08, 0, 1),
          b: clamp(0.18 + height01 * 0.26 + slope * 0.14 + snow * 0.18, 0, 1),
        },
      });
    }
  }

  for (let z = 0; z < resolution; z += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const a = z * span + x;
      const b = a + 1;
      const c = a + span;
      const d = c + 1;

      faces.push(a, c, b, b, c, d);
    }
  }

  for (let index = 0; index < vertices.length; index += 1) {
    const vertex = vertices[index];
    const offset = index * POSITION_STRIDE;

    positions[offset] = vertex.position.x;
    positions[offset + 1] = vertex.position.y;
    positions[offset + 2] = vertex.position.z;

    normals[offset] = vertex.normal.x;
    normals[offset + 1] = vertex.normal.y;
    normals[offset + 2] = vertex.normal.z;

    colors[offset] = vertex.color.r;
    colors[offset + 1] = vertex.color.g;
    colors[offset + 2] = vertex.color.b;
  }

  for (let index = 0; index < faces.length; index += 1) {
    indices[index] = faces[index];
  }

  return { vertexCount: vertices.length, indexCount: faces.length };
}

function getBenchmarkSteps(resolution: number): number {
  if (resolution >= 320) {
    return 2;
  }
  if (resolution >= 256) {
    return 4;
  }
  if (resolution >= 192) {
    return 6;
  }
  if (resolution >= 160) {
    return 8;
  }
  if (resolution >= 128) {
    return 10;
  }
  if (resolution >= 96) {
    return 14;
  }
  return 20;
}

export class TerrainMeshingDemo extends BaseDemo {
  private readonly driverOutput: HTMLElement;
  private readonly resolutionOutput: HTMLElement;
  private readonly liveOutput: HTMLElement;
  private readonly compareOutput: HTMLElement;
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly geometry: THREE.BufferGeometry;
  private readonly renderPositions = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly renderNormals = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly renderColors = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly renderIndices = new Uint32Array(TERRAIN_MAX_INDICES);
  private readonly jsPositions = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly jsNormals = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly jsColors = new Float32Array(TERRAIN_MAX_VERTICES * POSITION_STRIDE);
  private readonly jsIndices = new Uint32Array(TERRAIN_MAX_INDICES);
  private readonly wasmPositions: Float32Array;
  private readonly wasmNormals: Float32Array;
  private readonly wasmColors: Float32Array;
  private readonly wasmIndices: Uint32Array;
  private readonly cppPositions: Float32Array;
  private readonly cppNormals: Float32Array;
  private readonly cppColors: Float32Array;
  private readonly cppIndices: Uint32Array;

  private resolution = 128;
  private phase = 0.3;
  private amplitude = 1.6;
  private roughness = 0.75;
  private driver: Driver = "cpp";
  private lastBuildMs = 0;

  constructor(
    root: HTMLElement,
    private readonly wasm: LabWasmExports,
    private readonly cppWasm: TerrainCppWasmExports,
  ) {
    super(root);

    this.driverOutput = requireElement(root, "[data-terrain-driver]");
    this.resolutionOutput = requireElement(root, "[data-terrain-resolution]");
    this.liveOutput = requireElement(root, "[data-terrain-live]");
    this.compareOutput = requireElement(root, "[data-terrain-compare]");

    this.wasmPositions = new Float32Array(
      this.wasm.memory.buffer,
      WASM_LAYOUT.terrainPositions,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.wasmNormals = new Float32Array(
      this.wasm.memory.buffer,
      WASM_LAYOUT.terrainNormals,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.wasmColors = new Float32Array(
      this.wasm.memory.buffer,
      WASM_LAYOUT.terrainColors,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.wasmIndices = new Uint32Array(
      this.wasm.memory.buffer,
      WASM_LAYOUT.terrainIndices,
      TERRAIN_MAX_INDICES,
    );
    this.cppPositions = new Float32Array(
      this.cppWasm.memory.buffer,
      WASM_LAYOUT.terrainPositions,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.cppNormals = new Float32Array(
      this.cppWasm.memory.buffer,
      WASM_LAYOUT.terrainNormals,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.cppColors = new Float32Array(
      this.cppWasm.memory.buffer,
      WASM_LAYOUT.terrainColors,
      TERRAIN_MAX_VERTICES * POSITION_STRIDE,
    );
    this.cppIndices = new Uint32Array(
      this.cppWasm.memory.buffer,
      WASM_LAYOUT.terrainIndices,
      TERRAIN_MAX_INDICES,
    );

    this.scene.fog = new THREE.Fog(0x07101b, 7, 18);

    const ambient = new THREE.AmbientLight(0x95b0ff, 0.64);
    const hemisphere = new THREE.HemisphereLight(0xaad0ff, 0x152132, 0.82);
    const directional = new THREE.DirectionalLight(0xffddbf, 1.7);
    directional.position.set(5.4, 6.3, 2.2);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 96),
      new THREE.MeshStandardMaterial({
        color: 0x091425,
        roughness: 0.98,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.renderPositions, POSITION_STRIDE));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.renderNormals, POSITION_STRIDE));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.renderColors, POSITION_STRIDE));
    this.geometry.setIndex(new THREE.BufferAttribute(this.renderIndices, 1));

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.86,
        metalness: 0.08,
        flatShading: false,
      }),
    );

    this.scene.add(floor, ambient, hemisphere, directional, this.mesh);

    this.camera.position.set(5.8, 3.4, 5.8);
    this.controls.target.set(0, 0.35, 0);
    this.controls.autoRotateSpeed = 0.65;

    this.bindSelect("terrain-driver", (value) => {
      if (value === "js") {
        this.driver = "js";
      } else if (value === "wat") {
        this.driver = "wat";
      } else {
        this.driver = "cpp";
      }
      this.rebuildMesh();
    });
    this.bindCheckbox("terrain-wireframe", (value) => {
      this.mesh.material.wireframe = value;
    });
    this.bindRange("terrain-resolution", (value) => {
      this.resolution = Math.round(value);
      this.rebuildMesh();
    }, (value) => `${Math.round(value)}`);
    this.bindRange("terrain-phase", (value) => {
      this.phase = value;
      this.rebuildMesh();
    }, (value) => value.toFixed(2));
    this.bindRange("terrain-amplitude", (value) => {
      this.amplitude = value;
      this.rebuildMesh();
    }, (value) => value.toFixed(2));
    this.bindRange("terrain-roughness", (value) => {
      this.roughness = value;
      this.rebuildMesh();
    }, (value) => value.toFixed(2));

    requireElement<HTMLButtonElement>(root, '[data-action="terrain-compare"]').addEventListener("click", () => {
      this.runBenchmark();
    });

    this.rebuildMesh();
  }

  protected update(_delta: number, _elapsed: number): void {
    this.mesh.rotation.y += 0.0015;
  }

  private rebuildMesh(): void {
    const start = performance.now();

    let vertexCount = 0;
    let indexCount = 0;

    if (this.driver === "js") {
      const result = buildTerrainTyped(
        this.resolution,
        this.phase,
        this.amplitude,
        this.roughness,
        this.jsPositions,
        this.jsNormals,
        this.jsColors,
        this.jsIndices,
      );
      vertexCount = result.vertexCount;
      indexCount = result.indexCount;
      this.copyIntoRenderBuffers(this.jsPositions, this.jsNormals, this.jsColors, this.jsIndices, vertexCount, indexCount);
    } else if (this.driver === "wat") {
      this.wasm.build_terrain_mesh(
        WASM_LAYOUT.terrainPositions,
        WASM_LAYOUT.terrainNormals,
        WASM_LAYOUT.terrainColors,
        WASM_LAYOUT.terrainIndices,
        this.resolution,
        this.phase,
        this.amplitude,
        this.roughness,
      );

      vertexCount = (this.resolution + 1) * (this.resolution + 1);
      indexCount = this.resolution * this.resolution * 6;
      this.copyIntoRenderBuffers(
        this.wasmPositions,
        this.wasmNormals,
        this.wasmColors,
        this.wasmIndices,
        vertexCount,
        indexCount,
      );
    } else {
      this.cppWasm.build_terrain_mesh(
        WASM_LAYOUT.terrainPositions,
        WASM_LAYOUT.terrainNormals,
        WASM_LAYOUT.terrainColors,
        WASM_LAYOUT.terrainIndices,
        this.resolution,
        this.phase,
        this.amplitude,
        this.roughness,
      );

      vertexCount = (this.resolution + 1) * (this.resolution + 1);
      indexCount = this.resolution * this.resolution * 6;
      this.copyIntoRenderBuffers(
        this.cppPositions,
        this.cppNormals,
        this.cppColors,
        this.cppIndices,
        vertexCount,
        indexCount,
      );
    }

    this.lastBuildMs = performance.now() - start;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.index!.needsUpdate = true;
    this.geometry.setDrawRange(0, indexCount);
    this.geometry.computeBoundingSphere();

    this.driverOutput.textContent =
      this.driver === "cpp" ? "WASM C++" : this.driver === "wat" ? "WASM WAT" : "JS typed";
    this.resolutionOutput.textContent = `${this.resolution} x ${this.resolution}`;
    this.liveOutput.textContent = `${this.lastBuildMs.toFixed(2)} ms / build`;
  }

  private runBenchmark(): void {
    const scales = Array.from(new Set([48, 80, 112, this.resolution]))
      .filter((value) => value >= 32 && value <= TERRAIN_MAX_RESOLUTION)
      .sort((left, right) => left - right);

    const lines = scales.map((resolution) => {
      const steps = getBenchmarkSteps(resolution);

      const objectPositions = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const objectNormals = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const objectColors = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const objectIndices = new Uint32Array(resolution * resolution * 6);
      const objectStart = performance.now();
      for (let index = 0; index < steps; index += 1) {
        buildTerrainObjects(
          resolution,
          this.phase,
          this.amplitude,
          this.roughness,
          objectPositions,
          objectNormals,
          objectColors,
          objectIndices,
        );
      }
      const objectAverage = (performance.now() - objectStart) / steps;

      const typedPositions = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const typedNormals = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const typedColors = new Float32Array((resolution + 1) * (resolution + 1) * POSITION_STRIDE);
      const typedIndices = new Uint32Array(resolution * resolution * 6);
      const typedStart = performance.now();
      for (let index = 0; index < steps; index += 1) {
        buildTerrainTyped(
          resolution,
          this.phase,
          this.amplitude,
          this.roughness,
          typedPositions,
          typedNormals,
          typedColors,
          typedIndices,
        );
      }
      const typedAverage = (performance.now() - typedStart) / steps;

      const wasmWatStart = performance.now();
      for (let index = 0; index < steps; index += 1) {
        this.wasm.build_terrain_mesh(
          WASM_LAYOUT.terrainPositions,
          WASM_LAYOUT.terrainNormals,
          WASM_LAYOUT.terrainColors,
          WASM_LAYOUT.terrainIndices,
          resolution,
          this.phase,
          this.amplitude,
          this.roughness,
        );
      }
      const wasmWatAverage = (performance.now() - wasmWatStart) / steps;

      const wasmCppStart = performance.now();
      for (let index = 0; index < steps; index += 1) {
        this.cppWasm.build_terrain_mesh(
          WASM_LAYOUT.terrainPositions,
          WASM_LAYOUT.terrainNormals,
          WASM_LAYOUT.terrainColors,
          WASM_LAYOUT.terrainIndices,
          resolution,
          this.phase,
          this.amplitude,
          this.roughness,
        );
      }
      const wasmCppAverage = (performance.now() - wasmCppStart) / steps;

      const vertexCount = (resolution + 1) * (resolution + 1);
      const triangleCount = resolution * resolution * 2;
      const ratio =
        typedAverage > wasmCppAverage
          ? `WASM C++ ${(typedAverage / wasmCppAverage).toFixed(2)}x faster than JS typed`
          : `JS typed ${(wasmCppAverage / typedAverage).toFixed(2)}x faster than WASM C++`;
      const compilerDelta =
        wasmWatAverage > wasmCppAverage
          ? `Compiled C++ ${(wasmWatAverage / wasmCppAverage).toFixed(2)}x faster than WAT`
          : `WAT ${(wasmCppAverage / wasmWatAverage).toFixed(2)}x faster than compiled C++`;

      return (
        `${resolution} x ${resolution} (${vertexCount.toLocaleString()} verts, ${triangleCount.toLocaleString()} tris, ${steps} runs): ` +
        `JS objects ${objectAverage.toFixed(2)} ms, JS typed ${typedAverage.toFixed(2)} ms, ` +
        `WASM WAT ${wasmWatAverage.toFixed(2)} ms, WASM C++ ${wasmCppAverage.toFixed(2)} ms. ${ratio}. ${compilerDelta}.`
      );
    });

    this.compareOutput.textContent =
      `Terrain meshing sweep:\n${lines.join("\n")}\n` +
      `This benchmark measures chunk generation only: height sampling, normals, colors, and index-buffer writes.\n` +
      `Three.js rendering stays shared, so this is much closer to the real "should this kernel live in WASM?" question.\n` +
      `The extra comparison also shows the difference between handwritten WAT and a compiled C++ kernel.`;

    this.rebuildMesh();
  }

  private copyIntoRenderBuffers(
    positions: Float32Array,
    normals: Float32Array,
    colors: Float32Array,
    indices: Uint32Array,
    vertexCount: number,
    indexCount: number,
  ): void {
    const vertexLength = vertexCount * POSITION_STRIDE;
    this.renderPositions.set(positions.subarray(0, vertexLength), 0);
    this.renderNormals.set(normals.subarray(0, vertexLength), 0);
    this.renderColors.set(colors.subarray(0, vertexLength), 0);
    this.renderIndices.set(indices.subarray(0, indexCount), 0);
  }
}
