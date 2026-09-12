console.log("STARTING NODE MAIN.JS");

const NeutralinoExtension = require("./neutralino-extension");
const discordRPC = require("./discord/discordRPC");
const DEBUG = false;
const backendModule = import("../host.mjs");

discordRPC.init();

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
  if (ext.isEvent(data, "runNode")) {
    const eventName = data.data.function;
    const eventData = data.data.parameter;

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
      } catch (error) {
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

const ext = new NeutralinoExtension(true);
console.log("---");
console.log("NodeJS Version:", process.version);
console.log("NodeJS Path:", process.execPath);
console.log("---");
ext.run(processAppEvent);
