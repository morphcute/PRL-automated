import { spawn } from "node:child_process";
import { access, mkdir, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backupRoot = resolve(repoRoot, ".static-build-backup");
const staticIncompatiblePaths = ["app/api", "app/dashboard", "app/jobs"];
const movedPaths = [];

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const moveIncompatiblePaths = async () => {
  await rm(backupRoot, { recursive: true, force: true });

  for (const relPath of staticIncompatiblePaths) {
    const sourcePath = resolve(repoRoot, relPath);
    const backupPath = resolve(backupRoot, relPath);

    if (!(await pathExists(sourcePath))) {
      continue;
    }

    await mkdir(dirname(backupPath), { recursive: true });
    await rename(sourcePath, backupPath);
    movedPaths.push({ sourcePath, backupPath, relPath });
    console.log(`[build:firebase] temporarily moved ${relPath}`);
  }
};

const restoreMovedPaths = async () => {
  for (const entry of movedPaths.reverse()) {
    const { sourcePath, backupPath, relPath } = entry;
    if (await pathExists(backupPath)) {
      await mkdir(dirname(sourcePath), { recursive: true });
      await rename(backupPath, sourcePath);
      console.log(`[build:firebase] restored ${relPath}`);
    }
  }

  await rm(backupRoot, { recursive: true, force: true });
};

const runStaticBuild = async () => {
  const pnpmCommand = process.platform === "win32" ? "pnpm" : "pnpm";
  await rm(resolve(repoRoot, ".next"), { recursive: true, force: true });

  await new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(pnpmCommand, ["exec", "next", "build"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        STATIC_EXPORT: "true",
        NEXT_PUBLIC_STATIC_EXPORT: "true",
      },
    });

    child.on("error", rejectBuild);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveBuild();
      } else {
        rejectBuild(new Error(`Static build failed with exit code ${code ?? "unknown"}`));
      }
    });
  });
};

try {
  await moveIncompatiblePaths();
  await runStaticBuild();
} finally {
  await restoreMovedPaths();
}
