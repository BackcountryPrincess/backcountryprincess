import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

async function findPkg(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findPkg(fullPath);
      if (found) return found;
    } else if (entry.isFile() && entry.name.endsWith(".pkg")) {
      return fullPath;
    }
  }

  return null;
}

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function hasXcrunTool(tool) {
  const result = spawnSync("xcrun", ["-f", tool], { encoding: "utf8" });
  return result.status === 0;
}

const pkg = await findPkg(dist);
if (!pkg) {
  throw new Error("No .pkg artifact found under dist/. Run npm run build:mas first.");
}

await access(pkg, constants.R_OK);
requireEnv("ASC_API_KEY_ID");
requireEnv("ASC_API_ISSUER_ID");

if (!hasXcrunTool("altool")) {
  throw new Error("xcrun altool is unavailable. Install full Xcode or Apple Transporter tooling before upload.");
}

const result = spawnSync("xcrun", [
  "altool",
  "--upload-app",
  "--type",
  "osx",
  "--file",
  pkg,
  "--apiKey",
  process.env.ASC_API_KEY_ID,
  "--apiIssuer",
  process.env.ASC_API_ISSUER_ID
], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
