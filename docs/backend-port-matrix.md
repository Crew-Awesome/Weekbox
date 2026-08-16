# Backend port matrix

Source: `C:\Users\Administrator\Documents\GitHub\Weekbox` (`main`)

Target: `C:\Users\Administrator\Documents\GitHub\Weekbox2` (`rew`)

The backend lives behind the Weekbox2 Node extension. React code reaches it
through the platform bridge and `Core`; DOM/UI modules are not copied into the
Node backend.

| Source files | Native target | Status |
| --- | --- | --- |
| `providers/gamebanana/**`, `services/gamebanana/**`, `utils/gamebanana/**`, `config/discovery.config.js` | `extensions/node/backend/src/backend/{providers,services,utils,config}` | Complete |
| `providers/peo/**`, `services/peo/**`, `utils/peo/**` | `extensions/node/backend/src/backend/{providers,services,utils}` | Complete |
| `providers/github/**`, `config/engine-release-sources.config.js` | `extensions/node/backend/src/backend/{providers,config}` | Complete |
| `services/downloads/**`, `services/network/**` | `extensions/node/backend/src/backend/services/{downloads,network}` | Complete; fixture-checked |
| `services/filesystem.js`, `services/filesystem/**`, `config/engines.config.js`, `data/engines-router.json` | `extensions/node/backend/src/backend/{services,config,data}` | Complete; exposed through `filesystem.call` |
| `services/processes/**`, `core/system/network-status.service.js` | `extensions/node/backend/src/backend/{services,core}` | Partial; Windows spawn path works, process recovery is host-limited |
| `core/state/**`, `core/system/{settings,windows-protocol}.service.js` | `extensions/node/backend/src/backend/core` | Complete |
| `core/updates/**` | `extensions/node/backend/src/backend/core/updates` | Partial; install handoff needs target app lifecycle integration |
| `core/routing/deep-links.service.js` | `extensions/node/backend/deep-links.mjs` | Complete; UI router/startup events remain target-owned |
| Neutralino/Node IPC request and event routing | `extensions/node` + platform bridge | Complete; live `backend.health` bridge smoke |

The source tree contains 56 backend files. Forty-seven capability files map
one-for-one by relative path under `extensions/node/backend/src/backend`.
The nine intentionally excluded files are `core/index-core.js`,
`core/native/pc/*`, `core/routing/events.service.js`,
`core/routing/router.service.js`, `core/system/production-shortcuts.util.js`,
and `core/system/{startup-loader.service.js,startup.js}`; they own DOM startup,
browser routing, or UI event registration and remain in the Weekbox2 React
shell/platform bridge.

The backend has no `legacy` directory or production import path. The React
facade and typed platform bridge remain the only UI-facing boundary.

## Verification

Temporary backend and bridge smoke harnesses were run before cleanup; they are
intentionally not retained as production scripts.

- `npm run build:frontend` - TypeScript and Vite production build.
- `node --check extensions/node/main.js` and backend modules.

Known target limits: the Node runtime supplies Neutralino-style
filesystem/process APIs. It emits an app-exit request for updater handoff and
does not reconstruct already-running native processes after extension restart.
The old DOM startup/router/event-registration modules are intentionally not
executed from Node; React owns those concerns in Weekbox2.
