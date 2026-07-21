import { API } from '../../shared/api-routes';

// Build-time switch for hosted deployments: VITE_TOOKA_COMPANION=1 points the
// agent API at the default local companion; any other value is used verbatim
// as the companion origin. Unset (the dev server) keeps same-origin paths.
const raw = (import.meta.env.VITE_TOOKA_COMPANION as string | undefined)?.trim();

export const COMPANION_ORIGIN =
  !raw || raw === '0' || raw === 'false'
    ? null
    : raw === '1' || raw === 'true'
      ? 'http://127.0.0.1:4983'
      : raw.replace(/\/+$/, '');

export const companionEnabled = COMPANION_ORIGIN !== null;

export function agentApi(path: string): string {
  return `${COMPANION_ORIGIN ?? ''}${API.agent}${path}`;
}

export function companionCommand(): string {
  return `tooka companion --origin ${window.location.origin}`;
}
