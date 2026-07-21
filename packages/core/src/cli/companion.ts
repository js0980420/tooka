import { createServer } from 'node:http';
import chalk from 'chalk';
import { normalizedOrigin } from '../http/request-guard.ts';
import { API } from '../shared/api-routes.ts';
import { createAgentMiddleware } from '../vite/routes/agent.ts';
import { makeContext } from '../vite/routes/context.ts';

const DEFAULT_PORT = 4983;

export interface CompanionFlags {
  port?: number;
  origin?: string[];
}

export async function companion(flags: CompanionFlags, coreVersion: string): Promise<void> {
  const allowedOrigins = (flags.origin ?? [])
    .map((origin) => normalizedOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));
  if (flags.origin?.length && allowedOrigins.length !== flags.origin.length) {
    throw new Error('Invalid --origin value; expected e.g. https://app.example.com');
  }

  const ctx = makeContext({ userCwd: process.cwd(), coreVersion });
  const agent = createAgentMiddleware(ctx, { allowedOrigins });
  const port = flags.port ?? DEFAULT_PORT;

  const server = createServer((req, res) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(normalizedOrigin(origin) ?? '')) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
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
    if (req.url?.startsWith(API.agent)) {
      req.url = req.url.slice(API.agent.length) || '/';
      void agent(req, res, notFound);
      return;
    }
    notFound();
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
