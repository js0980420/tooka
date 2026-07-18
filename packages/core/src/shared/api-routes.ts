// Single source of truth for the dev-server API mount points. The app
// fetches these paths and the Vite middlewares mount on them — both sides
// import from here so a rename can't silently break the other side.
export const API = {
  assets: '/__assets',
  comments: '/__comments',
  connects: '/__connects',
  design: '/__design',
  edit: '/__edit',
  folders: '/__folders',
  notes: '/__notes',
  publish: '/__publish',
  restartServer: '/__restart-server',
  serverStatus: '/__server-status',
  slides: '/__slides',
  svgl: '/__svgl',
  updateCheck: '/__update-check',
  updatePackage: '/__update-package',
} as const;
