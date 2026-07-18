// Contract between the CLI supervisor (cli/dev.ts) and the in-app restart
// endpoint (vite/routes/restart.ts): the supervised child exits with
// RESTART_EXIT_CODE to request a respawn against the freshly installed package.
export const RESTART_EXIT_CODE = 52;
export const DEV_SUPERVISED_ENV = 'TOOKA_DEV_SUPERVISED';
