import { API as MOUNTS } from '../../shared/api-routes';
import { COMPANION_ORIGIN } from './companion';

// Same shape as the shared mount table, but in a companion build every path
// is absolute against the local companion origin. App code imports API from
// here; the server keeps importing the shared table directly.
export const API = COMPANION_ORIGIN
  ? (Object.fromEntries(
      Object.entries(MOUNTS).map(([key, path]) => [key, `${COMPANION_ORIGIN}${path}`]),
    ) as typeof MOUNTS)
  : MOUNTS;
