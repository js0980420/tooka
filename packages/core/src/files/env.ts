import fs from 'node:fs/promises';
import path from 'node:path';

export const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;
// Printable ASCII, no spaces or quotes — rejects newlines that would break the file.
export const ENV_VALUE_RE = /^[!#-~]+$/;
export const ENV_VALUE_MAX_LENGTH = 512;

export function validateEnvValue(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length < 1 || trimmed.length > ENV_VALUE_MAX_LENGTH) return null;
  if (!ENV_VALUE_RE.test(trimmed)) return null;
  return trimmed;
}

async function getEnvPaths(userCwd: string): Promise<string[]> {
  const dirs = [userCwd];
  let curr = userCwd;
  while (true) {
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
    try {
      const hasWorkspace = await fs
        .access(path.join(curr, 'pnpm-workspace.yaml'))
        .then(() => true)
        .catch(() => false);
      const hasGit = await fs
        .access(path.join(curr, '.git'))
        .then(() => true)
        .catch(() => false);
      if (hasWorkspace || hasGit) {
        dirs.push(curr);
        break;
      }
    } catch {}
  }
  return dirs;
}

export async function readEnvValues(
  userCwd: string,
  keys: string[],
): Promise<Record<string, string>> {
  const paths = await getEnvPaths(userCwd);
  const out: Record<string, string> = {};
  for (const dir of [...paths].reverse()) {
    let content: string;
    try {
      content = await fs.readFile(path.join(dir, '.env'), 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split(/\r?\n/)) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!keys.includes(key)) continue;
      out[key] = line.slice(eq + 1).trim();
    }
  }
  return out;
}

export async function upsertEnvValues(
  userCwd: string,
  entries: Record<string, string>,
): Promise<void> {
  const dirs = await getEnvPaths(userCwd);
  for (const dir of dirs) {
    const file = path.join(dir, '.env');
    let content = '';
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {}
    const lines = content.length > 0 ? content.replace(/\n+$/, '').split(/\r?\n/) : [];
    for (const [key, value] of Object.entries(entries)) {
      const idx = lines.findIndex((l) => l.trimStart().startsWith(`${key}=`));
      if (value === '') {
        if (idx >= 0) {
          lines.splice(idx, 1);
        }
      } else {
        const next = `${key}=${value}`;
        if (idx >= 0) lines[idx] = next;
        else lines.push(next);
      }
    }
    await fs.writeFile(file, `${lines.join('\n')}\n`, 'utf8');
  }
}

export async function ensureEnvGitignored(userCwd: string): Promise<void> {
  const dirs = await getEnvPaths(userCwd);
  for (const dir of dirs) {
    const file = path.join(dir, '.gitignore');
    let content = '';
    try {
      content = await fs.readFile(file, 'utf8');
    } catch {}
    const covered = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .some((l) => l === '.env' || l === '.env*' || l === '*.env' || l === '/.env');
    if (covered) continue;
    const prefix = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
    await fs.writeFile(file, `${content}${prefix}.env\n`, 'utf8');
  }
}

export function maskSecret(value: string | undefined): string | null {
  if (!value) return null;
  const tail = value.slice(-4);
  return `••••${tail}`;
}
