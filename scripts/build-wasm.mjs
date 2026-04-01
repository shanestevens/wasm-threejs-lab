import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import wabt from "wabt";

const root = process.cwd();
const inputDir = path.join(root, "wasm");
const outputDir = path.join(root, "public", "wasm");

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
