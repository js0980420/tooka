import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ensureEnvGitignored,
  maskSecret,
  readEnvValues,
  upsertEnvValues,
  validateEnvValue,
} from './env.ts';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'oc-env-'));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe('validateEnvValue', () => {
  it('accepts token-like strings and trims whitespace', () => {
    expect(validateEnvValue('EAAG.abc-123_x')).toBe('EAAG.abc-123_x');
    expect(validateEnvValue('  17841400000000  ')).toBe('17841400000000');
  });

  it('rejects empties, spaces, quotes, and newlines', () => {
    expect(validateEnvValue('')).toBeNull();
    expect(validateEnvValue('   ')).toBeNull();
    expect(validateEnvValue('a b')).toBeNull();
    expect(validateEnvValue('a"b')).toBeNull();
    expect(validateEnvValue('a\nb')).toBeNull();
    expect(validateEnvValue(42)).toBeNull();
    expect(validateEnvValue('x'.repeat(513))).toBeNull();
  });
});

describe('upsertEnvValues / readEnvValues', () => {
  it('creates .env when missing', async () => {
    await upsertEnvValues(dir, { IG_ACCESS_TOKEN: 'tok123', IG_USER_ID: '178414' });
    const content = await fs.readFile(path.join(dir, '.env'), 'utf8');
    expect(content).toBe('IG_ACCESS_TOKEN=tok123\nIG_USER_ID=178414\n');
  });

  it('updates existing keys and preserves unrelated lines', async () => {
    await fs.writeFile(
      path.join(dir, '.env'),
      '# comment\nOTHER=keep\nIG_ACCESS_TOKEN=old\n',
      'utf8',
    );
    await upsertEnvValues(dir, { IG_ACCESS_TOKEN: 'new' });
    const content = await fs.readFile(path.join(dir, '.env'), 'utf8');
    expect(content).toBe('# comment\nOTHER=keep\nIG_ACCESS_TOKEN=new\n');
  });

  it('round-trips through readEnvValues', async () => {
    await upsertEnvValues(dir, { IG_ACCESS_TOKEN: 'tok123' });
    await upsertEnvValues(dir, { IG_USER_ID: '178414' });
    const values = await readEnvValues(dir, ['IG_ACCESS_TOKEN', 'IG_USER_ID']);
    expect(values).toEqual({ IG_ACCESS_TOKEN: 'tok123', IG_USER_ID: '178414' });
  });

  it('removes keys assigned an empty value', async () => {
    await upsertEnvValues(dir, { IG_ACCESS_TOKEN: 'tok123', OTHER: 'keep' });
    await upsertEnvValues(dir, { IG_ACCESS_TOKEN: '' });

    expect(await fs.readFile(path.join(dir, '.env'), 'utf8')).toBe('OTHER=keep\n');
  });

  it('returns empty object when .env is missing', async () => {
    expect(await readEnvValues(dir, ['IG_ACCESS_TOKEN'])).toEqual({});
  });
});

describe('ensureEnvGitignored', () => {
  it('creates .gitignore with .env when missing', async () => {
    await ensureEnvGitignored(dir);
    expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('.env\n');
  });

  it('appends .env once to an existing .gitignore', async () => {
    await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist', 'utf8');
    await ensureEnvGitignored(dir);
    expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe(
      'node_modules\ndist\n.env\n',
    );
    await ensureEnvGitignored(dir);
    expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe(
      'node_modules\ndist\n.env\n',
    );
  });

  it('leaves .gitignore alone when .env is already covered', async () => {
    await fs.writeFile(path.join(dir, '.gitignore'), '.env*\n', 'utf8');
    await ensureEnvGitignored(dir);
    expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('.env*\n');
  });
});

describe('maskSecret', () => {
  it('masks all but the last four characters', () => {
    expect(maskSecret('EAAG1234567890')).toBe('••••7890');
    expect(maskSecret(undefined)).toBeNull();
  });
});
