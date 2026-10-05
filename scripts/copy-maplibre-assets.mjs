import { copyFile,mkdir } from "node:fs/promises";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const src=join(root,"node_modules","maplibre-gl","dist");
const dest=join(root,"public","maplibre");

await mkdir(dest,{recursive:true});
for(const file of ["maplibre-gl-worker.mjs","maplibre-gl-shared.mjs"]){
  await copyFile(join(src,file),join(dest,file));
}
console.log("MapLibre worker assets copied to public/maplibre");
