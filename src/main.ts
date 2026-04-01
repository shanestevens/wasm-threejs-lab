import "./styles.css";

import { IndexedGeometryDemo } from "./demos/indexed-geometry-demo";
import { LightingStudioDemo } from "./demos/lighting-studio-demo";
import { TextureDemo } from "./demos/texture-demo";
import { TriangleDemo } from "./demos/triangle-demo";
import { loadLabWasm } from "./lib/load-wasm";

type DemoConfig = {
  id: string;
  step: string;
  title: string;
  lede: string;
  note: string;
  controls: string;
  tags: string[];
};

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
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="indexed-wireframe" />
          </label>
          <label class="control-row">
            <span>auto rotate</span>
            <input type="checkbox" checked data-control="indexed-auto-rotate" />
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
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="texture-wireframe" />
          </label>
          <label class="control-row">
            <span>auto rotate</span>
            <input type="checkbox" checked data-control="texture-auto-rotate" />
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
          <label class="control-row">
            <span>wireframe</span>
            <input type="checkbox" data-control="lighting-wireframe" />
          </label>
          <label class="control-row">
            <span>auto rotate</span>
            <input type="checkbox" checked data-control="lighting-auto-rotate" />
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
          <p>Exports become callable functions, and the module’s linear memory becomes an <code>ArrayBuffer</code> that JS can view with typed arrays.</p>
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
        <h2>Four ways to connect WASM to a Three.js scene</h2>
      </div>
      <div class="demo-grid">
        ${demos.map(renderDemoCard).join("")}
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
  const wasm = await loadLabWasm();

  status?.setAttribute("data-load-state", "ready");
  if (status) {
    status.textContent = "Module ready. Inspect /wasm/lab.wasm in DevTools to see the real binary and exported functions.";
  }

  const instances = [
    new TriangleDemo(document.querySelector<HTMLElement>('[data-demo="triangle"]')!, wasm),
    new IndexedGeometryDemo(document.querySelector<HTMLElement>('[data-demo="indexed"]')!, wasm),
    new TextureDemo(document.querySelector<HTMLElement>('[data-demo="texture"]')!, wasm),
    new LightingStudioDemo(document.querySelector<HTMLElement>('[data-demo="lighting"]')!, wasm),
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
