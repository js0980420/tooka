import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import chalk from 'chalk';
import type { ViteDevServer } from 'vite';
import { configureAllowedOrigins, normalizedOrigin } from '../http/request-guard.ts';
import { registerAgentRoutes } from '../vite/routes/agent.ts';
import { registerAssetRoutes } from '../vite/routes/assets.ts';
import { registerCommentRoutes } from '../vite/routes/comments.ts';
import { registerConnectRoutes } from '../vite/routes/connects.ts';
import { makeContext } from '../vite/routes/context.ts';
import { registerEditRoutes } from '../vite/routes/edit.ts';
import { registerFolderRoutes } from '../vite/routes/folders.ts';
import { registerPublishRoutes } from '../vite/routes/publish.ts';
import { registerRestartRoutes } from '../vite/routes/restart.ts';
import { registerSlideRoutes } from '../vite/routes/slides.ts';
import { registerSvglRoutes } from '../vite/routes/svgl.ts';
import { registerUpdateRoutes } from '../vite/routes/update.ts';

const DEFAULT_PORT = 4983;

export interface CompanionFlags {
  port?: number;
  origin?: string[];
}

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => unknown;

// A connect-compatible prefix router so the vite route registrars mount
// unchanged; ws/watcher are inert because there is no HMR to drive.
function createViteShim(): {
  shim: ViteDevServer;
  dispatch: (req: IncomingMessage, res: ServerResponse, fallback: () => void) => void;
} {
  const mounts: Array<{ prefix: string; handler: Middleware }> = [];
  const shim = {
    middlewares: {
      use(prefix: string, handler: Middleware) {
        mounts.push({ prefix, handler });
      },
    },
    ws: { send() {} },
    watcher: { add() {}, on() {} },
  } as unknown as ViteDevServer;

  const dispatch = (req: IncomingMessage, res: ServerResponse, fallback: () => void) => {
    const url = req.url ?? '/';
    let index = 0;
    const tryNext = (): void => {
      while (index < mounts.length) {
        const { prefix, handler } = mounts[index++];
        if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)) {
          req.url = url.slice(prefix.length) || '/';
          void handler(req, res, () => {
            req.url = url;
            tryNext();
          });
          return;
        }
      }
      fallback();
    };
    tryNext();
  };

  return { shim, dispatch };
}

export async function companion(flags: CompanionFlags, coreVersion: string): Promise<void> {
  const allowedOrigins = (flags.origin ?? [])
    .map((origin) => normalizedOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  if (flags.origin?.length && allowedOrigins.length !== flags.origin.length) {
    throw new Error('Invalid --origin value; expected e.g. https://app.example.com');
  }
  configureAllowedOrigins(allowedOrigins);

  const ctx = makeContext({ userCwd: process.cwd(), coreVersion });
  const { shim, dispatch } = createViteShim();
  registerEditRoutes(shim, ctx);
  registerCommentRoutes(shim, ctx);
  registerSlideRoutes(shim, ctx);
  registerAssetRoutes(shim, ctx);
  registerSvglRoutes(shim);
  registerFolderRoutes(shim, ctx);
  registerConnectRoutes(shim, ctx);
  registerAgentRoutes(shim, ctx);
  registerPublishRoutes(shim, ctx);
  registerUpdateRoutes(shim, ctx);
  registerRestartRoutes(shim);

  const port = flags.port ?? DEFAULT_PORT;

  const server = createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(normalizedOrigin(origin) ?? '')) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type');
      // Chrome's Private Network Access preflight for public→localhost calls.
      res.setHeader('access-control-allow-private-network', 'true');
      res.statusCode = 204;
      return res.end();
    }

    const notFound = () => {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'not_found' }));
    };

    if (req.url === '/' && req.method === 'GET') {
      res.setHeader('content-type', 'application/json');
      return res.end(
        JSON.stringify({ ok: true, service: 'tooka-companion', version: coreVersion }),
      );
    }
    dispatch(req, res, notFound);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  process.stdout.write(
    [
      `${chalk.green('tooka companion')} listening on ${chalk.bold(`http://127.0.0.1:${port}`)}`,
      `  project: ${ctx.userCwd}`,
      allowedOrigins.length
        ? `  allowed origins: ${allowedOrigins.join(', ')}`
        : `  allowed origins: ${chalk.dim('(none — same-machine callers only)')}`,
      '',
    ].join('\n'),
  );
}
