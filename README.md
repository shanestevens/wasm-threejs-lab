# WASM x Three.js Lab

An interactive learning page that shows how WebAssembly can feed data into Three.js in the browser.

## Run it

```bash
npm install
npm run dev
```

## Build it

```bash
npm run build
```

`npm run build` compiles `wasm/lab.wat` into `public/wasm/lab.wasm` before Vite builds the app.

## What to study

- `src/main.ts`: page structure and demo wiring
- `src/lib/load-wasm.ts`: browser-side WASM loading and memory layout
- `wasm/lab.wat`: the actual WebAssembly text module
- `src/demos/triangle-demo.ts`: vertex buffers from WASM
- `src/demos/indexed-surface-demo.ts`: indexed geometry buffers
- `src/demos/texture-demo.ts`: RGBA texture bytes
- `src/demos/particles-demo.ts`: per-frame simulation

## Mental model

1. JavaScript fetches and instantiates the module.
2. WASM exports functions and linear memory.
3. JS creates typed-array views over that memory.
4. Three.js uploads those arrays to GPU buffers or textures.

WASM helps with CPU-side work. Three.js and WebGL still own rendering.
