console.log("STARTING NODE MAIN.JS");
const fs = require("fs");
const logPath = require("path").join(require("os").homedir(), "weekbox_ext_debug.log");
try { fs.writeFileSync(logPath, "STARTING NODE MAIN.JS\nArgs: " + JSON.stringify(process.argv) + "\n"); } catch(e) {}
function logFile(msg) {
  try { fs.appendFileSync(logPath, msg + "\n"); } catch(e) {}
}
process.on("uncaughtException", (err) => {
  logFile("[NodeBackend] Uncaught Exception: " + err?.stack);
});

process.on("unhandledRejection", (reason) => {
  logFile("[NodeBackend] Unhandled Rejection: " + String(reason));
});

const NeutralinoExtension = require("./neutralino-extension");
const discordRPC = require("./discord/discordRPC");
const DEBUG = false;
const backendModule = import("../host.mjs");

logFile("Initializing discordRPC...");
try {
  discordRPC.init();
  logFile("discordRPC initialized.");
} catch(e) {
  logFile("discordRPC crashed: " + e);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function longRun(d) {
  for (let i = 1; i <= 5; i++) {
    ext.sendMessage("pingResult", `Long-running task ${i}/5`);
    await delay(1000);
  }
}

function ping(d) {

  ext.sendMessage("pingResult", `Node says PONG, in reply to "${d}"`);
}

const activeRequests = new Map();

async function processAppEvent(data) {
  logFile("RECEIVED DATA: " + JSON.stringify(data));
  if (ext.isEvent(data, "runNode")) {
    const eventName = data.data.function;
    const eventData = data.data.parameter;
    logFile("EventName: " + eventName + ", EventData: " + JSON.stringify(eventData));

    if (eventName === "backend.cancel") {
      const requestId = eventData?.requestId;
      if (requestId && activeRequests.has(requestId)) {
        activeRequests.get(requestId).abort();
        activeRequests.delete(requestId);
      }
      return;
    }

    if (eventName === "backend.call") {
      const requestId = eventData?.requestId || null;
      const controller = new AbortController();
      if (requestId) {
        activeRequests.set(requestId, controller);
      }
      
      try {
        const { handleRequest, setExtensionContext } = await backendModule;
        if (setExtensionContext) {
          setExtensionContext(ext);
        }

        const params = eventData?.params || {};
        params.signal = controller.signal;

        const result = await handleRequest(
          eventData?.operation,
          params,
          (payloadOrDownloaded, totalOpt) => {
            if (typeof payloadOrDownloaded === 'object' && payloadOrDownloaded !== null) {
              ext.sendMessage("download:progress", {
                requestId,
                ...payloadOrDownloaded
              });
            } else {
              ext.sendMessage("download:progress", {
                requestId,
                downloaded: payloadOrDownloaded,
                total: totalOpt,
              });
            }
          },
        );
        ext.sendMessage("backend:response", {
          requestId,
          ok: true,
          data: result,
        });
        logFile("backend:response sent ok for: " + requestId);
      } catch (error) {
        logFile("backend:response error for: " + requestId + " error: " + String(error));
        ext.sendMessage("backend:response", {
          requestId,
          ok: false,
          error: {
            name: error?.name || "Error",
            message: error?.message || String(error),
          },
        });
      } finally {
        if (requestId) {
          activeRequests.delete(requestId);
        }
      }
      return;
    }

    if (eventName === "setActivity") {
      await discordRPC.setActivity(eventData);
    }

    if (eventName === "clearActivity") {
      await discordRPC.clearActivity();
    }
  }
}

const ext = new NeutralinoExtension(DEBUG);
logFile("Extension instance created.");

backendModule
  .then(({ setExtensionContext }) => {
    logFile("backendModule imported successfully.");
    if (setExtensionContext) {
      setExtensionContext(ext);
    }
  })
  .catch((err) => {
    logFile("backendModule import failed: " + err);
  });

logFile("Calling ext.run...");
ext.run(processAppEvent);
