import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import wabt from "wabt";

const root = process.cwd();
const inputDir = path.join(root, "wasm");
const outputDir = path.join(root, "public", "wasm");
const execFileAsync = promisify(execFile);

const modules = ["lab.wat"];
const compiler = await wabt();

await mkdir(outputDir, { recursive: true });

for (const fileName of modules) {
  const sourcePath = path.join(inputDir, fileName);
  const outputPath = path.join(outputDir, fileName.replace(/\.wat$/i, ".wasm"));
  const source = await readFile(sourcePath, "utf8");
  const module = compiler.parseWat(sourcePath, source);
  module.resolveNames();
  module.validate();
  const { buffer } = module.toBinary({
    log: false,
    write_debug_names: true,
  });

  await writeFile(outputPath, Buffer.from(buffer));
}

const llvmCandidates = [
  process.env.LLVM_BIN ? path.join(process.env.LLVM_BIN, "clang++.exe") : null,
  path.join(root, "tools", "clang+llvm-22.1.2-x86_64-pc-windows-msvc", "bin", "clang++.exe"),
  "clang++.exe",
].filter(Boolean);

async function findClang() {
  for (const candidate of llvmCandidates) {
    try {
      if (candidate.includes(path.sep)) {
        await access(candidate, fsConstants.X_OK);
      }
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

const clangPath = await findClang();
const cppSource = path.join(inputDir, "terrain-kernel.cpp");
const cppOutput = path.join(outputDir, "terrain-cpp.wasm");

if (clangPath) {
  await execFileAsync(clangPath, [
    "--target=wasm32",
    "-O3",
    "-std=c++20",
    "-ffreestanding",
    "-fno-exceptions",
    "-fno-rtti",
    "-nostdlib",
    "-Wl,--no-entry",
    "-Wl,--export=build_terrain_mesh",
    "-Wl,--export-memory",
    "-Wl,--initial-memory=16777216",
    "-Wl,--max-memory=16777216",
    cppSource,
    "-o",
    cppOutput,
  ]);
} else {
  try {
    await access(cppOutput, fsConstants.F_OK);
    console.warn("Skipping terrain-kernel.cpp rebuild because clang++ was not found. Reusing existing public/wasm/terrain-cpp.wasm.");
  } catch {
    throw new Error("Unable to build terrain-kernel.cpp because clang++ was not found and no prebuilt public/wasm/terrain-cpp.wasm exists.");
  }
}
