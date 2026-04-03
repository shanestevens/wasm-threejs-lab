import "./styles.css";

import { CausticRelicDemo } from "./demos/caustic-relic-demo";
import { IndexedGeometryDemo } from "./demos/indexed-geometry-demo";
import { FrostedBlurLensDemo } from "./demos/frosted-blur-lens-demo";
import { LightingStudioDemo } from "./demos/lighting-studio-demo";
import { PbrLookdevBoardDemo } from "./demos/pbr-lookdev-board-demo";
import { ShaderFxBenchDemo } from "./demos/shader-fx-bench-demo";
import { ShadowPlaygroundDemo } from "./demos/shadow-playground-demo";
import { TerrainMeshingDemo } from "./demos/terrain-meshing-demo";
import { TextureDemo } from "./demos/texture-demo";
import { TriangleDemo } from "./demos/triangle-demo";
import { TERRAIN_MAX_RESOLUTION, loadLabWasm, loadTerrainCppWasm } from "./lib/load-wasm";

type DemoConfig = {
  id: string;
  step: string;
  title: string;
  lede: string;
  note: string;
  controls: string;
  tags: string[];
};

function renderCameraModeRow(): string {
  return `
    <label class="control-row">
      <span>camera</span>
      <select data-control="camera-mode">
        <option value="orbit" selected>Orbit</option>
        <option value="fps">FPS</option>
      </select>
    </label>
  `;
}

const demos: DemoConfig[] = [
  {
    id: "triangle",
    step: "Step 01",
    title: "Triangle",
    lede: "Start from raw positions and vertex colors so the scene graph stays out of the way.",
    note: "WASM writes 9 floats of position data and 9 floats of RGB data into linear memory. JavaScript turns those bytes into BufferAttributes, and Three.js sends them to the GPU.",
    tags: ["BufferGeometry", "Vertex colors", "Shared memory"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="triangle-wireframe" />
          </label>
          <label class="control-row">
            <span>spin speed</span>
            <input type="range" min="0" max="0.8" step="0.02" value="0.18" data-control="triangle-spin" />
            <output>0.18</output>
          </label>
        </div>
        <div class="control-group">
          <h3>WASM</h3>
          <label class="control-row">
            <span>pulse speed</span>
            <input type="range" min="0.2" max="2.4" step="0.1" value="1.1" data-control="triangle-pulse" />
            <output>1.1x</output>
          </label>
          <label class="control-row">
            <span>amplitude</span>
            <input type="range" min="0" max="1" step="0.05" value="0.3" data-control="triangle-amplitude" />
            <output>30%</output>
          </label>
        </div>
      </details>
    `,
  },
  {
    id: "indexed",
    step: "Step 02",
    title: "Indexed Geometry",
    lede: "Move from three handmade vertices to a reusable primitive with positions, colors, and indexed faces.",
    note: "WASM emits a box-like mesh as flat buffers: 24 vertices, 24 colors, and 36 indices. JavaScript reuses those arrays, computes normals, and hands the indexed geometry to Three.js.",
    tags: ["Index buffer", "Vertex reuse", "Normals"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="indexed-wireframe" />
          </label>
        </div>
        <div class="control-group">
          <h3>WASM</h3>
          <label class="control-row">
            <span>profile</span>
            <input type="range" min="0" max="1" step="0.05" value="0" data-control="indexed-profile" />
            <output>0%</output>
          </label>
        </div>
      </details>
    `,
  },
  {
    id: "texture",
    step: "Step 03",
    title: "UVs & Textures",
    lede: "Generate RGBA pixels in WASM, then map the resulting DataTexture onto ordinary Three.js geometry.",
    note: "WASM fills 65,536 texture bytes per update. JavaScript wraps that shared memory in a DataTexture, and Three.js samples those bytes through each mesh's UV coordinates.",
    tags: ["DataTexture", "UVs", "GPU upload"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="texture-wireframe" />
          </label>
          <label class="control-row">
            <span>filter</span>
            <select data-control="texture-filter">
              <option value="linear" selected>Linear</option>
              <option value="nearest">Nearest</option>
            </select>
          </label>
        </div>
        <div class="control-group">
          <h3>WASM</h3>
          <label class="control-row">
            <span>pattern speed</span>
            <input type="range" min="0" max="3" step="0.1" value="1.1" data-control="texture-speed" />
            <output>1.1x</output>
          </label>
        </div>
      </details>
    `,
  },
  {
    id: "lighting",
    step: "Step 04",
    title: "Lighting Studio",
    lede: "Use one PBR scene and a preset dropdown to isolate ambient, hemisphere, directional, point, and spot lighting without jumping to a second card.",
    note: "WASM computes a packed block of light intensities and light positions. JavaScript reads that state back out, applies it to real Three.js lights, and the renderer does the actual shading.",
    tags: ["Scene state", "PBR lighting", "Host + module"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="lighting-wireframe" />
          </label>
        </div>
        <div class="control-group">
          <h3>Lighting</h3>
          <label class="control-row">
            <span>setup</span>
            <select data-control="lighting-setup">
              <option value="all" selected>All types</option>
              <option value="ambient">Ambient</option>
              <option value="hemisphere">Hemisphere</option>
              <option value="directional">Directional</option>
              <option value="point">Point</option>
              <option value="spot">Spot</option>
            </select>
          </label>
          <label class="control-row">
            <span>helpers</span>
            <input type="checkbox" data-control="lighting-helpers" />
          </label>
          <label class="control-row">
            <span>ambient</span>
            <input type="range" min="0" max="1.2" step="0.01" value="0.25" data-control="lighting-ambient" />
            <output>0.25</output>
          </label>
          <label class="control-row">
            <span>hemisphere</span>
            <input type="range" min="0" max="1.4" step="0.01" value="0.68" data-control="lighting-hemisphere" />
            <output>0.68</output>
          </label>
          <label class="control-row">
            <span>directional</span>
            <input type="range" min="0" max="2.2" step="0.01" value="1.5" data-control="lighting-directional" />
            <output>1.50</output>
          </label>
          <label class="control-row">
            <span>point</span>
            <input type="range" min="0" max="2.2" step="0.01" value="1.08" data-control="lighting-point" />
            <output>1.08</output>
          </label>
          <label class="control-row">
            <span>spot</span>
            <input type="range" min="0" max="2.2" step="0.01" value="0.92" data-control="lighting-spot" />
            <output>0.92</output>
          </label>
        </div>
      </details>
    `,
  },
  {
    id: "shadow",
    step: "Step 04B",
    title: "Shadow Playground",
    lede: "Compare shadow casters, helper frusta, shadow map modes, and bias tuning in one controllable scene.",
    note: "This card is intentionally renderer-side. No new WASM needed here: once your scene data exists, this is pure Three.js light and shadow debugging work.",
    tags: ["Shadow maps", "Bias", "Helpers"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="shadow-wireframe" />
          </label>
          <label class="control-row">
            <span>helpers</span>
            <input type="checkbox" data-control="shadow-helpers" />
          </label>
        </div>
        <div class="control-group">
          <h3>Shadow</h3>
          <label class="control-row">
            <span>map type</span>
            <select data-control="shadow-type">
              <option value="pcf" selected>PCF</option>
              <option value="basic">Basic</option>
              <option value="vsm">VSM</option>
            </select>
          </label>
          <label class="control-row">
            <span>bias</span>
            <input type="range" min="-0.01" max="0.002" step="0.0002" value="-0.0008" data-control="shadow-bias" />
            <output>-0.0008</output>
          </label>
          <label class="control-row">
            <span>blur</span>
            <input type="range" min="0" max="8" step="0.5" value="3" data-control="shadow-blur" />
            <output data-output="shadow-blur">3.0</output>
          </label>
        </div>
      </details>
    `,
  },
  {
    id: "shaderfx",
    step: "Step 04D",
    title: "Shader FX Bench",
    lede: "Stage neon hologram, molten core, contour x-ray, and aurora-shell looks under one camera so custom shader surfaces feel like a real FX lab, not a flat material swap.",
    note: "This is where GLSL takes over. JavaScript still drives time and control values, but the actual look now lives in the shader: fresnel shells, scanlines, warped normals, additive glows, and procedural bands.",
    tags: ["ShaderMaterial", "Additive shells", "Procedural FX"],
    controls: `
      <details class="debug-panel" open>
        <summary>Debug</summary>
        <div class="control-group">
          <h3>View</h3>
          ${renderCameraModeRow()}
          <label class="control-row">
            <span>focus</span>
            <select data-control="shader-focus">
              <option value="all" selected>All effects</option>
              <option value="hologram">Hologram</option>
              <option value="lava">Molten core</option>
              <option value="contour">Contour x-ray</option>
              <option value="aurora">Aurora shell</option>
            </select>
          </label>
        </div>
        <div class="control-group">
          <h3>Shader</h3>
          <label class="control-row">
            <span>pulse</span>
            <input type="range" min="0.2" max="2.4" step="0.05" value="1.1" data-control="shader-pulse" />
            <output>1.10x</output>
          </label>
          <label class="control-row">
            <span>distortion</span>
            <input type="range" min="0" max="1.2" step="0.05" value="0.35" data-control="shader-distortion" />
            <output>0.35</output>
          </label>
          <label class="control-row">
            <span>rim</span>
            <input type="range" min="0.2" max="2.4" step="0.05" value="1.35" data-control="shader-rim" />
            <output>1.35</output>
          </label>
          <label class="control-row">
            <span>glow</span>
            <input type="range" min="0.4" max="2.6" step="0.05" value="1.25" data-control="shader-glow" />
            <output>1.25</output>
          </label>
        </div>
      </details>
    `,
  },
];

function renderDemoCard(demo: DemoConfig): string {
  return `
    <article class="demo-card" data-demo="${demo.id}">
      <div class="demo-card__top">
        <span class="demo-card__step">${demo.step}</span>
        <button class="demo-card__fullscreen" type="button" data-action="fullscreen">Full screen</button>
      </div>
      <h2>${demo.title}</h2>
      <p class="demo-card__lede">${demo.lede}</p>
      <div class="demo-card__stage">
        <canvas aria-label="${demo.title} demo"></canvas>
        <span class="demo-card__fps">0 FPS</span>
      </div>
      ${demo.controls}
      <p class="demo-card__note">${demo.note}</p>
      <div class="demo-card__tags">
        ${demo.tags.map((tag) => `<span class="demo-card__tag">${tag}</span>`).join("")}
      </div>
    </article>
  `;
}

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Unable to find #app");
}

app.innerHTML = `
  <div class="app-shell">
    <header class="hero">
      <div class="hero__copy">
        <p class="hero__eyebrow">WASM x Three.js best practices page</p>
        <h1>Learn WebAssembly by piping its memory into real Three.js demos.</h1>
        <p class="hero__lede">
          WebAssembly is a compact binary format that the browser validates, compiles, and runs beside JavaScript. JS still owns the page and browser APIs,
          but WASM is a great fit for dense math, buffer generation, and packed scene state that Three.js can upload or render.
        </p>
        <div class="hero__chips">
          <span>Triangle data</span>
          <span>Indexed mesh buffers</span>
          <span>Texture bytes</span>
          <span>Lighting state</span>
          <span>Shadow rigs</span>
          <span>PBR lookdev</span>
          <span>Shader FX</span>
          <span>Frosted glass</span>
          <span>Caustic relic</span>
        </div>
      </div>
      <aside class="hero__snippet">
        <p class="hero__snippet-label">Minimal browser handshake</p>
        <pre><code>const wasmUrl = new URL(
  \`\${import.meta.env.BASE_URL}wasm/lab.wasm\`,
  window.location.origin
);

const { instance } = await WebAssembly.instantiateStreaming(
  fetch(wasmUrl)
);

const memory = instance.exports.memory;
const positions = new Float32Array(memory.buffer, ptr, count * 3);

geometry.attributes.position.needsUpdate = true;</code></pre>
        <p class="hero__status" data-load-state="loading">Loading WebAssembly module...</p>
      </aside>
    </header>

    <section class="info-grid">
      <article class="info-card">
        <p class="info-card__label">What WASM is</p>
        <p>Think of WASM as a compact, native-style compute guest. It is good at loops, pointer-friendly data, and packed structs, but it still relies on JavaScript to talk to browser APIs.</p>
      </article>
      <article class="info-card">
        <p class="info-card__label">What gets compiled</p>
        <p>This project starts from a <code>.wat</code> text file, builds a <code>.wasm</code> binary, then the browser compiles that binary to machine code when the page loads.</p>
      </article>
      <article class="info-card">
        <p class="info-card__label">Where Three.js fits</p>
        <p>Three.js remains the renderer and scene manager. WASM only produces data: positions, colors, indices, pixels, or lighting values that JS passes into the scene.</p>
      </article>
      <article class="info-card">
        <p class="info-card__label">Boundary rule</p>
        <p>Batch your work. One host call that fills a whole buffer is useful. Thousands of tiny JS-to-WASM calls per frame usually erase the benefit.</p>
      </article>
    </section>

    <section class="pipeline">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Browser pipeline</p>
        <h2>What the browser is doing under the hood</h2>
      </div>
      <div class="pipeline__steps">
        <article>
          <span>01</span>
          <h3>Fetch</h3>
          <p>The dev server ships <code>/wasm/lab.wasm</code> like any other static asset.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Compile</h3>
          <p><code>instantiateStreaming()</code> lets the browser validate and compile the module while bytes arrive.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Instantiate</h3>
          <p>Exports become callable functions, and the module's linear memory becomes an <code>ArrayBuffer</code> that JS can view with typed arrays.</p>
        </article>
        <article>
          <span>04</span>
          <h3>Render</h3>
          <p>Three.js reads those views, uploads buffers or textures to the GPU, and renders the result. WASM never touches the DOM or WebGL API directly.</p>
        </article>
      </div>
    </section>

    <section class="principles">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Best practices</p>
        <h2>Rules worth keeping in your head while you learn</h2>
      </div>
      <div class="principles__grid">
        <article>
          <h3>Let JS orchestrate</h3>
          <p>Keep DOM work, async loading, browser APIs, and scene setup in JavaScript. Use WASM for compute kernels and buffer generation.</p>
        </article>
        <article>
          <h3>Prefer shared buffers</h3>
          <p>Expose memory once, then reuse <code>Float32Array</code>, <code>Uint8Array</code>, or <code>Uint32Array</code> views instead of copying data between heaps.</p>
        </article>
        <article>
          <h3>Cross the boundary in chunks</h3>
          <p>One call per frame can be great. One call per vertex, pixel, or object usually is not. The demos below all batch work into a few big writes.</p>
        </article>
        <article>
          <h3>Move hotspots, not everything</h3>
          <p>WASM is not a blanket speed button. Use it where the work already looks like C or C++: flat data, tight loops, and predictable memory access.</p>
        </article>
      </div>
    </section>

    <section class="demos">
      <div class="section-heading">
        <p class="section-heading__eyebrow">Interactive demos</p>
        <h2>Core demos and renderer-side follow-ups</h2>
      </div>
      <div class="demo-grid">
        ${demos.map(renderDemoCard).join("")}
      </div>
    </section>

    <section class="pbr-showcase swarm-lab" data-demo="pbrlab">
      <div class="swarm-lab__top">
        <span class="demo-card__step">Step 04C</span>
        <button class="demo-card__fullscreen" type="button" data-action="fullscreen">Full screen</button>
      </div>
      <div class="section-heading section-heading--compact">
        <p class="section-heading__eyebrow">PBR Lab</p>
        <h2>PBR Lookdev Board</h2>
      </div>
      <p class="swarm-lab__lede">
        Lay out a full material-ball board so roughness, metalness, transmission, clearcoat, and shader-authored surfaces can be compared under one studio rig.
      </p>
      <div class="pbr-showcase__grid">
        <div class="pbr-showcase__viewer">
          <div class="demo-card__stage">
            <canvas aria-label="PBR lookdev board demo"></canvas>
            <span class="demo-card__fps">0 FPS</span>
          </div>
        </div>
        <div class="pbr-showcase__sidebar">
          <details class="debug-panel" open>
            <summary>Debug</summary>
            <div class="control-group">
              <h3>View</h3>
              ${renderCameraModeRow()}
              <label class="control-row">
                <span>wireframe</span>
                <input type="checkbox" data-control="pbr-wireframe" />
              </label>
            </div>
            <div class="control-group">
              <h3>PBR lab</h3>
              <label class="control-row">
                <span>theme</span>
                <select data-control="pbr-theme">
                  <option value="dark" selected>Dark</option>
                  <option value="light">Light</option>
                  <option value="warm">Warm</option>
                </select>
              </label>
              <label class="control-row">
                <span>env intensity</span>
                <input type="range" min="0.2" max="1.6" step="0.02" value="0.62" data-control="pbr-env" />
                <output>0.62</output>
              </label>
              <label class="control-row">
                <span>exposure</span>
                <input type="range" min="0.55" max="1.4" step="0.01" value="0.95" data-control="pbr-exposure" />
                <output>0.95</output>
              </label>
              <label class="control-row">
                <span>key</span>
                <input type="range" min="0.4" max="2.4" step="0.02" value="1.18" data-control="pbr-key" />
                <output>1.18</output>
              </label>
              <label class="control-row">
                <span>fill</span>
                <input type="range" min="0" max="1.2" step="0.02" value="0.10" data-control="pbr-fill" />
                <output>0.10</output>
              </label>
              <label class="control-row">
                <span>rim</span>
                <input type="range" min="0" max="1.4" step="0.02" value="0.62" data-control="pbr-rim" />
                <output>0.62</output>
              </label>
              <label class="control-row">
                <span>accent</span>
                <input type="range" min="0" max="2" step="0.02" value="0.80" data-control="pbr-accent" />
                <output>0.80</output>
              </label>
            </div>
          </details>
          <p class="demo-card__note">
            This is the kind of scene you use to judge whether a material is actually good. The board sweeps dielectrics, metals, clearcoat,
            transmission, and more stylized surfaces while sharing the same environment, exposure, and lights.
          </p>
          <div class="demo-card__tags">
            <span class="demo-card__tag">MeshPhysicalMaterial</span>
            <span class="demo-card__tag">PMREM</span>
            <span class="demo-card__tag">Lookdev board</span>
            <span class="demo-card__tag">Studio rig</span>
          </div>
        </div>
      </div>
    </section>

    <section class="frosted-showcase swarm-lab" data-demo="frostlab">
      <div class="swarm-lab__top">
        <span class="demo-card__step">Step 04E</span>
        <button class="demo-card__fullscreen" type="button" data-action="fullscreen">Full screen</button>
      </div>
      <div class="section-heading section-heading--compact">
        <p class="section-heading__eyebrow">GPU Lab</p>
        <h2>Frosted Blur Lens</h2>
      </div>
      <p class="swarm-lab__lede">
        Use transmission, roughness, thickness, and a little vertex wobble to turn one mesh into a frosted lens that blurs and bends the readback board behind it.
      </p>
      <div class="frosted-showcase__grid">
        <div class="frosted-showcase__viewer">
          <div class="demo-card__stage">
            <canvas aria-label="Frosted blur lens demo"></canvas>
            <span class="demo-card__fps">0 FPS</span>
          </div>
        </div>
        <div class="frosted-showcase__sidebar">
          <details class="debug-panel" open>
            <summary>Debug</summary>
            <div class="control-group">
              <h3>View</h3>
              ${renderCameraModeRow()}
              <label class="control-row">
                <span>wireframe</span>
                <input type="checkbox" data-control="frost-wireframe" />
              </label>
            </div>
            <div class="control-group">
              <h3>Frosted glass</h3>
              <label class="control-row">
                <span>frost</span>
                <input type="range" min="0.02" max="0.85" step="0.01" value="0.42" data-control="frost-roughness" />
                <output>0.42</output>
              </label>
              <label class="control-row">
                <span>thickness</span>
                <input type="range" min="0.2" max="2.4" step="0.05" value="1.4" data-control="frost-thickness" />
                <output>1.40</output>
              </label>
              <label class="control-row">
                <span>ior</span>
                <input type="range" min="1" max="1.8" step="0.01" value="1.14" data-control="frost-ior" />
                <output>1.14</output>
              </label>
              <label class="control-row">
                <span>wobble</span>
                <input type="range" min="0" max="0.28" step="0.01" value="0.11" data-control="frost-wobble" />
                <output>0.11</output>
              </label>
              <label class="control-row">
                <span>animate</span>
                <input type="checkbox" checked data-control="frost-animate" />
              </label>
            </div>
          </details>
          <p class="demo-card__note">
            This one is about reading through the material instead of just at it. The colored bars and test board behind the lens make blur,
            refraction, and thickness much easier to judge than an isolated hero object or plain environment map.
          </p>
          <div class="demo-card__tags">
            <span class="demo-card__tag">MeshPhysicalMaterial</span>
            <span class="demo-card__tag">Transmission</span>
            <span class="demo-card__tag">Frosted glass</span>
            <span class="demo-card__tag">Vertex wobble</span>
          </div>
        </div>
      </div>
    </section>

    <section class="relic-showcase swarm-lab" data-demo="reliclab">
      <div class="swarm-lab__top">
        <span class="demo-card__step">Step 04F</span>
        <button class="demo-card__fullscreen" type="button" data-action="fullscreen">Full screen</button>
      </div>
      <div class="section-heading section-heading--compact">
        <p class="section-heading__eyebrow">Hero Study</p>
        <h2>Caustic Glass / Iridescent Relic</h2>
      </div>
      <p class="swarm-lab__lede">
        Build one cinematic hero shot around transmission, thin-film iridescence, and projected caustic light so the material feels premium instead of merely transparent.
      </p>
      <div class="relic-showcase__grid">
        <div class="relic-showcase__viewer">
          <div class="demo-card__stage">
            <canvas aria-label="Caustic glass relic demo"></canvas>
            <span class="demo-card__fps">0 FPS</span>
          </div>
        </div>
        <div class="relic-showcase__sidebar">
          <details class="debug-panel" open>
            <summary>Debug</summary>
            <div class="control-group">
              <h3>View</h3>
              ${renderCameraModeRow()}
              <label class="control-row">
                <span>wireframe</span>
                <input type="checkbox" data-control="relic-wireframe" />
              </label>
            </div>
            <div class="control-group">
              <h3>Relic</h3>
              <label class="control-row">
                <span>theme</span>
                <select data-control="relic-theme">
                  <option value="aqua" selected>Aqua</option>
                  <option value="opal">Opal</option>
                  <option value="amber">Amber</option>
                </select>
              </label>
              <label class="control-row">
                <span>roughness</span>
                <input type="range" min="0.02" max="0.38" step="0.01" value="0.12" data-control="relic-roughness" />
                <output>0.12</output>
              </label>
              <label class="control-row">
                <span>thickness</span>
                <input type="range" min="0.4" max="2.6" step="0.05" value="1.7" data-control="relic-thickness" />
                <output>1.70</output>
              </label>
              <label class="control-row">
                <span>iridescence</span>
                <input type="range" min="0" max="1" step="0.02" value="0.92" data-control="relic-iridescence" />
                <output>0.92</output>
              </label>
            </div>
            <div class="control-group">
              <h3>Light</h3>
              <label class="control-row">
                <span>caustics</span>
                <input type="range" min="0" max="1.8" step="0.02" value="1.15" data-control="relic-caustics" />
                <output>1.15</output>
              </label>
              <label class="control-row">
                <span>distortion</span>
                <input type="range" min="0" max="0.95" step="0.01" value="0.38" data-control="relic-distortion" />
                <output>0.38</output>
              </label>
              <label class="control-row">
                <span>glow</span>
                <input type="range" min="0.2" max="1.8" step="0.02" value="1.05" data-control="relic-glow" />
                <output>1.05</output>
              </label>
              <label class="control-row">
                <span>animate</span>
                <input type="checkbox" checked data-control="relic-animate" />
              </label>
            </div>
          </details>
          <p class="demo-card__note">
            This is a pure renderer-side beauty pass. The caustic projections are shader-authored light patterns, the relic itself is a transmitted
            mesh with iridescence and clearcoat, and the shell is there to push the silhouette into something that feels precious instead of generic.
          </p>
          <div class="demo-card__tags">
            <span class="demo-card__tag">MeshPhysicalMaterial</span>
            <span class="demo-card__tag">Iridescence</span>
            <span class="demo-card__tag">Caustic shader</span>
            <span class="demo-card__tag">Hero lookdev</span>
          </div>
        </div>
      </div>
    </section>

    <section class="swarm-section swarm-lab" data-demo="terrain">
      <div class="swarm-lab__top">
        <span class="demo-card__step">Benchmark</span>
        <button class="demo-card__fullscreen" type="button" data-action="fullscreen">Full screen</button>
      </div>
      <div class="section-heading section-heading--compact">
        <p class="section-heading__eyebrow">Engine-style example</p>
        <h2>Terrain chunk meshing: one preview, three builders, two benchmarks</h2>
      </div>
      <div class="swarm-lab__grid">
        <div class="swarm-lab__copy">
          <p class="swarm-lab__lede">
            This is much closer to real engine-side C++ work: take a scalar field, generate packed vertex, normal, color, and index buffers,
            then hand those buffers to one shared Three.js mesh. The renderer stays exactly the same while the builder changes underneath it.
            The preview palette can flip into height bands, slope heat, or normal view so the denser chunks still read clearly at the top end.
          </p>
          <div class="swarm-metrics">
            <article class="swarm-metric">
              <span>Active driver</span>
              <strong data-terrain-driver>WASM C++</strong>
            </article>
            <article class="swarm-metric">
              <span>Resolution</span>
              <strong data-terrain-resolution>128 x 128</strong>
            </article>
            <article class="swarm-metric">
              <span>Triangles</span>
              <strong data-terrain-tris>32,768 tris</strong>
            </article>
            <article class="swarm-metric">
              <span>Live build</span>
              <strong data-terrain-live>0.00 ms / build</strong>
            </article>
          </div>
          <p class="swarm-lab__note" data-terrain-compare>
            Run compare to benchmark both a single chunk sweep and a streaming chunk-pack sweep. The preview render path stays shared across all modes.
            The live toggle lets you switch between JS typed arrays, handwritten WAT, and a real compiled C++ WASM kernel.
            The single chunk sweep includes a JS-object baseline so you can see where object-heavy code falls away first, while the chunk-pack sweep leans into the more engine-like "stream a patch" case.
          </p>
          <button class="swarm-lab__button" type="button" data-action="terrain-compare">Compare chunk + patch</button>
        </div>
        <div class="swarm-lab__viewer">
          <div class="demo-card__stage">
            <canvas aria-label="Terrain chunk benchmark demo"></canvas>
            <span class="demo-card__fps">0 FPS</span>
          </div>
          <details class="debug-panel" open>
            <summary>Debug</summary>
            <div class="control-group">
              <h3>View</h3>
              ${renderCameraModeRow()}
              <label class="control-row">
                <span>display</span>
                <select data-control="terrain-display">
                  <option value="terrain" selected>Terrain palette</option>
                  <option value="height">Height bands</option>
                  <option value="slope">Slope heatmap</option>
                  <option value="normal">Normal view</option>
                </select>
              </label>
              <label class="control-row">
                <span>wireframe</span>
                <input type="checkbox" data-control="terrain-wireframe" />
              </label>
            </div>
            <div class="control-group">
              <h3>Driver</h3>
              <label class="control-row">
                <span>mode</span>
                <select data-control="terrain-driver">
                  <option value="cpp" selected>WASM C++</option>
                  <option value="wat">WASM WAT</option>
                  <option value="js">JS typed</option>
                </select>
              </label>
              <label class="control-row">
                <span>resolution</span>
                <input type="range" min="48" max="${TERRAIN_MAX_RESOLUTION}" step="16" value="128" data-control="terrain-resolution" />
                <output>128</output>
              </label>
            </div>
            <div class="control-group">
              <h3>Field</h3>
              <label class="control-row">
                <span>phase</span>
                <input type="range" min="0" max="2" step="0.05" value="0.3" data-control="terrain-phase" />
                <output>0.30</output>
              </label>
              <label class="control-row">
                <span>amplitude</span>
                <input type="range" min="0.8" max="2.4" step="0.05" value="1.6" data-control="terrain-amplitude" />
                <output>1.60</output>
              </label>
              <label class="control-row">
                <span>roughness</span>
                <input type="range" min="0.2" max="1.2" step="0.05" value="0.75" data-control="terrain-roughness" />
                <output>0.75</output>
              </label>
            </div>
          </details>
        </div>
      </div>
    </section>

    <section class="inspect">
      <div class="section-heading">
        <p class="section-heading__eyebrow">DevTools ideas</p>
        <h2>Good things to inspect while this page is open</h2>
      </div>
      <div class="inspect__grid">
        <article>
          <h3>Network tab</h3>
          <p>Look for <code>/wasm/lab.wasm</code>, its byte size, and the request timing. That confirms the browser is loading a real module asset.</p>
        </article>
        <article>
          <h3>Sources panel</h3>
          <p>Open the <code>.wasm</code> file directly. You can inspect exported function names and step through the generated binary view while the page is running.</p>
        </article>
        <article>
          <h3>Memory mental model</h3>
          <p>Remember that shared CPU memory is only part of the story. Three.js still uploads geometry and texture data to the GPU after JS marks those resources dirty.</p>
        </article>
      </div>
    </section>
  </div>
`;

const status = app.querySelector<HTMLElement>("[data-load-state]");

try {
  const [wasm, terrainCppWasm] = await Promise.all([loadLabWasm(), loadTerrainCppWasm()]);

  status?.setAttribute("data-load-state", "ready");
  if (status) {
    status.textContent = "Module ready. Inspect /wasm/lab.wasm in DevTools to see the real binary and exported functions.";
  }

  const instances = [
    new TriangleDemo(document.querySelector<HTMLElement>('[data-demo="triangle"]')!, wasm),
    new IndexedGeometryDemo(document.querySelector<HTMLElement>('[data-demo="indexed"]')!, wasm),
    new TextureDemo(document.querySelector<HTMLElement>('[data-demo="texture"]')!, wasm),
    new LightingStudioDemo(document.querySelector<HTMLElement>('[data-demo="lighting"]')!, wasm),
    new ShadowPlaygroundDemo(document.querySelector<HTMLElement>('[data-demo="shadow"]')!),
    new PbrLookdevBoardDemo(document.querySelector<HTMLElement>('[data-demo="pbrlab"]')!),
    new ShaderFxBenchDemo(document.querySelector<HTMLElement>('[data-demo="shaderfx"]')!),
    new FrostedBlurLensDemo(document.querySelector<HTMLElement>('[data-demo="frostlab"]')!),
    new CausticRelicDemo(document.querySelector<HTMLElement>('[data-demo="reliclab"]')!),
    new TerrainMeshingDemo(document.querySelector<HTMLElement>('[data-demo="terrain"]')!, wasm, terrainCppWasm),
  ];

  let previous = performance.now();

  const frame = (now: number): void => {
    const delta = Math.min((now - previous) / 1000, 0.05);
    const elapsed = now / 1000;
    previous = now;

    for (const instance of instances) {
      instance.tick(delta, elapsed);
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  status?.setAttribute("data-load-state", "error");
  if (status) {
    status.textContent = "The WASM module failed to load. Check the console for details.";
  }
}
