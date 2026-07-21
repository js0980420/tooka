import type { IncomingMessage, ServerResponse } from 'node:http';
import chalk from 'chalk';
import { createServer, mergeConfig } from 'vite';
import { configureAllowedOrigins, normalizedOrigin } from '../http/request-guard.ts';
import { createViteConfig } from '../vite/config.ts';

const DEFAULT_PORT = 4983;

export interface CompanionFlags {
  port?: number;
  origin?: string[];
}

// The companion is the full dev server — compiled slides, HMR, and every
// /__* API — bound to loopback, with the hosted web app's origin allowed
// through CORS and the mutation guard.
export async function companion(flags: CompanionFlags, coreVersion: string): Promise<void> {
  const allowedOrigins = (flags.origin ?? [])
    .map((origin) => normalizedOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  if (flags.origin?.length && allowedOrigins.length !== flags.origin.length) {
    throw new Error('Invalid --origin value; expected e.g. https://app.example.com');
  }
  configureAllowedOrigins(allowedOrigins);

  const base = await createViteConfig({ userCwd: process.cwd() });
  const config = mergeConfig(base, {
    server: {
      port: flags.port ?? DEFAULT_PORT,
      strictPort: true,
      host: '127.0.0.1',
      open: false,
      ...(allowedOrigins.length ? { cors: { origin: [...allowedOrigins] } } : {}),
    },
  });

  const server = await createServer(config);
  // Plugin-registered /__* middlewares run before Vite's own cors handler, so
  // CORS (and Chrome's Private Network Access preflight) must sit in front of
  // everything.
  server.middlewares.stack.unshift({
    route: '',
    handle: (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      const origin = req.headers.origin;
      if (origin && allowedOrigins.includes(normalizedOrigin(origin) ?? '')) {
        res.setHeader('access-control-allow-origin', origin);
        res.setHeader('vary', 'origin');
      }
      if (req.method === 'OPTIONS') {
        res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('access-control-allow-headers', 'content-type');
        res.setHeader('access-control-allow-private-network', 'true');
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    },
  });
  await server.listen();

  process.stdout.write(
    [
      `${chalk.green('tooka companion')} v${coreVersion}`,
      `  studio:  ${chalk.bold(`http://127.0.0.1:${flags.port ?? DEFAULT_PORT}`)}`,
      `  project: ${process.cwd()}`,
      allowedOrigins.length
        ? `  allowed origins: ${allowedOrigins.join(', ')}`
        : `  allowed origins: ${chalk.dim('(none — same-machine callers only)')}`,
      '',
    ].join('\n'),
  );
}
