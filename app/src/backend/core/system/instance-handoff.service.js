import { appSettings } from "./settings.service.js";
import { isDevelopmentRun } from "./production-shortcuts.util.js";
import {
  getWeekboxLinkFromArgs,
  openWeekboxLink,
  parseWeekboxLink,
} from "../routing/deep-links.service.js";
import { FS } from "../../services/filesystem/index.js";
import {
  getStoragePaths,
  getStorageRootFromSettingsPath,
} from "../../services/filesystem/storage-paths.js";

const SINGLE_INSTANCE_MUTEX = "Global\\WeekBox-com.weekbox.app";
async function getRuntimeHandoffPaths() {
  const defaultStoragePath = await FS.getDefaultStoragePath();
  const settingsPath = await appSettings.resolveDataPath(defaultStoragePath);
  const paths = getStoragePaths(getStorageRootFromSettingsPath(settingsPath));
  const legacyApplicationPath = String(window.NL_DATAPATH || "").trim();
  // Neutralino must hand off before the user-selected library is known.
  return [
    paths.deeplinkFile,
    paths.legacyDeeplinkFile,
    legacyApplicationPath && `${legacyApplicationPath}/weekbox-deeplink.json`,
  ].filter((path, index, allPaths) => path && allPaths.indexOf(path) === index);
}

function encodePowerShellCommand(script) {
  const bytes = new Uint8Array(script.length * 2);
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  return btoa(String.fromCharCode(...bytes));
}

export async function focusWeekBoxWindow() {
  try {
    if (typeof Neutralino.window.unminimize === "function") {
      await Neutralino.window.unminimize();
    }
    if (typeof Neutralino.window.show === "function") {
      await Neutralino.window.show();
    }
    await Neutralino.window.focus();
  } catch {}
}

export async function ensureSingleInstance() {
  if (window.NL_SINGLE_INSTANCE_OWNER) return true;
  if (isDevelopmentRun() || window.NL_OS !== "Windows") return true;
  const parentPid = Number(window.NL_PID);
  if (!Number.isInteger(parentPid) || parentPid <= 0) return true;

  const script = `$created = $false\n$mutex = [System.Threading.Mutex]::new($false, '${SINGLE_INSTANCE_MUTEX}', [ref]$created)\n$owned = $false\ntry { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }\nif (-not $owned) { [Console]::Out.WriteLine('duplicate'); exit 2 }\n[Console]::Out.WriteLine('acquired')\ntry { while (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 } } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }`;
  let resolveGuard;
  const guardResult = new Promise((resolve) => {
    resolveGuard = resolve;
  });
  let processId = null;
  let timeoutHandle;
  let settled = false;
  let outputBuffer = "";
  const pendingEvents = [];
  const finish = (isPrimary) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    Neutralino.events.off("spawnedProcess", handler);
    resolveGuard(isPrimary);
  };
  const handleEvent = (event) => {
    if (processId === null) {
      pendingEvents.push(event);
      return;
    }
    if (event.detail.id !== processId) return;
    if (event.detail.action === "stdOut") {
      outputBuffer += String(event.detail.data || "").toLowerCase();
    }
    if (event.detail.action === "stdOut" && outputBuffer.includes("acquired")) {
      finish(true);
    } else if (
      event.detail.action === "stdOut" &&
      outputBuffer.includes("duplicate")
    ) {
      finish(false);
    } else if (event.detail.action === "exit") {
      finish(Number(event.detail.data) === 2 ? false : true);
    }
  };
  const handler = (event) => handleEvent(event);

  try {
    await Neutralino.events.on("spawnedProcess", handler);
    const process = await Neutralino.os.spawnProcess(
      `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShellCommand(script)}`,
    );
    processId = process.id;
    timeoutHandle = setTimeout(() => {
      console.warn("The WeekBox single-instance guard did not respond in time");
      finish(false);
    }, 5000);
    pendingEvents.splice(0).forEach(handleEvent);
  } catch (error) {
    console.warn("Could not start the WeekBox single-instance guard", error);
    finish(false);
  }
  return guardResult;
}

export async function handoffToPrimaryInstance() {
  const link = getWeekboxLinkFromArgs();
  const handoffPaths = await getRuntimeHandoffPaths().catch(() => []);
  if (handoffPaths[0]) {
    await FS.api
      .writeAtomic(
        handoffPaths[0],
        JSON.stringify({ link, timestamp: Date.now() }),
      )
      .catch(() => {});
  }
  await Neutralino.window.hide().catch(() => {});
  if (link) {
    await Neutralino.app
      .broadcast("weekbox:deep-link", { link })
      .catch(() => {});
  } else {
    await Neutralino.app.broadcast("weekbox:focus").catch(() => {});
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  await Neutralino.app.exit().catch(() => {});
}

export async function readPendingHandoff() {
  try {
    for (const path of await getRuntimeHandoffPaths()) {
      const raw = await Neutralino.filesystem.readFile(path).catch(() => "");
      if (raw) {
        await Neutralino.filesystem.remove(path).catch(() => {});
        return JSON.parse(raw);
      }
    }
  } catch {}
  return null;
}

export function createStartupDeepLinkState() {
  let ready = false;
  let queued = null;
  let lastLink = null;
  let lastLinkAt = 0;
  let primary = false;
  let checkingHandoff = false;
  const handle = (link) => {
    if (!parseWeekboxLink(link)) return;
    const now = Date.now();
    if (link === lastLink && now - lastLinkAt < 2000) return;
    lastLink = link;
    lastLinkAt = now;
    if (!ready) {
      queued = link;
      return;
    }
    void focusWeekBoxWindow();
    void openWeekboxLink(link).catch((error) =>
      console.warn("Could not open the WeekBox link", error),
    );
  };
  const checkPendingHandoff = async () => {
    if (!primary || checkingHandoff) return;
    checkingHandoff = true;
    const pendingHandoff = await readPendingHandoff();
    checkingHandoff = false;
    const isFresh =
      pendingHandoff?.timestamp &&
      Date.now() - Number(pendingHandoff.timestamp) < 10000;
    if (isFresh && pendingHandoff.link) handle(pendingHandoff.link);
    else if (isFresh) void focusWeekBoxWindow();
  };
  return {
    handle,
    checkPendingHandoff,
    setPrimary: () => {
      primary = true;
    },
    markReady: () => {
      ready = true;
      const link = queued;
      queued = null;
      return link;
    },
  };
}
