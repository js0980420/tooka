import path from 'node:path';
import { searchForWorkspaceRoot } from 'vite';
import { describe, expect, it } from 'vitest';
import { createViteConfig } from './config.ts';

describe('createViteConfig', () => {
  it('allows dependencies resolved from the consumer workspace root', async () => {
    const userCwd = path.resolve('apps/studio');
    const config = await createViteConfig({
      userCwd,
      config: {},
      mode: 'serve',
    });

    expect(config.server?.fs?.allow).toContain(searchForWorkspaceRoot(userCwd));
  });
});
