import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resources = path.join(root, "buildResources");
const source = path.join(resources, "icon-source.svg");
const png = path.join(resources, "icon-source.png");
const iconset = path.join(resources, "icon.iconset");
const icns = path.join(resources, "icon.icns");

if (!existsSync(source)) {
  throw new Error(`Missing icon source: ${source}`);
}

await rm(iconset, { recursive: true, force: true });
await mkdir(iconset, { recursive: true });

execFileSync("qlmanage", ["-t", "-s", "1024", "-o", resources, source], { stdio: "ignore" });

const generated = path.join(resources, "icon-source.svg.png");
if (existsSync(generated)) {
  execFileSync("mv", [generated, png]);
}

if (!existsSync(png)) {
  throw new Error("Unable to generate 1024px app icon PNG from SVG source.");
}

const sizes = [
  ["16", "icon_16x16.png"],
  ["32", "icon_16x16@2x.png"],
  ["32", "icon_32x32.png"],
  ["64", "icon_32x32@2x.png"],
  ["128", "icon_128x128.png"],
  ["256", "icon_128x128@2x.png"],
  ["256", "icon_256x256.png"],
  ["512", "icon_256x256@2x.png"],
  ["512", "icon_512x512.png"],
  ["1024", "icon_512x512@2x.png"]
];

for (const [size, name] of sizes) {
  execFileSync("sips", ["-z", size, size, png, "--out", path.join(iconset, name)], { stdio: "ignore" });
}

execFileSync("iconutil", ["-c", "icns", iconset, "-o", icns], { stdio: "inherit" });
console.log(icns);
