import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const packageName = `${path.basename(projectRoot)}-safe.zip`;
const outputPath = path.join(projectRoot, packageName);

const excludedSegments = new Set([
  ".git",
  ".secrets",
  "node_modules",
  ".next",
  ".next-dev",
  "dist",
  "build",
  "coverage",
  "reports",
]);

const excludedBasenames = new Set([
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
]);

function isExcluded(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const basename = path.posix.basename(normalized);
  const segments = normalized.split("/");

  if (!normalized || normalized.startsWith("../") || path.isAbsolute(normalized)) return true;
  if (normalized === ".env" || normalized.startsWith(".env.")) return true;
  if (segments.some((segment) => excludedSegments.has(segment))) return true;
  if (excludedBasenames.has(basename)) return true;
  if (basename.endsWith(".tsbuildinfo")) return true;
  if (basename.endsWith(".zip")) return true;
  if (basename.endsWith(".log")) return true;
  if (basename.endsWith(".tmp")) return true;
  if (basename.endsWith(".temp")) return true;
  if (basename.endsWith(".swp") || basename.endsWith(".swo")) return true;
  if (basename.endsWith("~")) return true;

  return false;
}

function listProjectFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "No se pudo listar archivos del proyecto con git.");
  }

  return result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isExcluded(item));
}

function assertNoUnsafeFiles(files) {
  const unsafe = files.filter(isExcluded);
  if (unsafe.length > 0) {
    throw new Error(`El paquete contiene rutas excluidas: ${unsafe.join(", ")}`);
  }
}

const files = listProjectFiles();
assertNoUnsafeFiles(files);

if (files.length === 0) {
  throw new Error("No hay archivos seguros para empaquetar.");
}

if (existsSync(outputPath)) {
  rmSync(outputPath, { force: true });
}

const zipResult = spawnSync("zip", ["-q", "-X", packageName, ...files], {
  cwd: projectRoot,
  encoding: "utf8",
});

if (zipResult.status !== 0) {
  throw new Error(zipResult.stderr || "No se pudo crear el ZIP seguro. Verifica que el comando zip este instalado.");
}

console.log(`ZIP seguro creado: ${packageName}`);
console.log(`Archivos incluidos: ${files.length}`);
