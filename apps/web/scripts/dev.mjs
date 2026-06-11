import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lockPath = path.join(root, '.next', 'dev', 'lock');

function isProcessAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid() {
  try {
    const raw = fs.readFileSync(lockPath, 'utf8');
    const j = JSON.parse(raw);
    const pid = typeof j.pid === 'number' ? j.pid : Number(j.pid);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

async function stopStaleNextDev() {
  const pid = readLockPid();
  if (pid == null || !isProcessAlive(pid)) return;

  const lockRel = path.relative(process.cwd(), lockPath) || lockPath;
  console.warn(
    `[@coursebridge/web] Stopping existing next dev (PID ${pid}, lock ${lockRel}) so this run can start.`,
  );

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // ignore
  }

  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && isProcessAlive(pid)) {
    await delay(100);
  }

  if (isProcessAlive(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // ignore
    }
  }
}

const require = createRequire(path.join(root, 'package.json'));
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next', { paths: [root] });
} catch {
  console.error('[dev] Could not resolve `next` from', root);
  process.exit(1);
}

await stopStaleNextDev();

const extraArgs = process.argv.slice(2);
const result = spawnSync(process.execPath, [nextBin, 'dev', ...extraArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
