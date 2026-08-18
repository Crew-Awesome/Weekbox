console.log("STARTING NODE MAIN.JS");
// main.js 1.0.3
//
// Neutralino NodeExtension.
//
// (c)2023-2024 Harald Schneider - marketmix.com

const NeutralinoExtension = require("./neutralino-extension");
const discordRPC = require("./discord/discordRPC");
const DEBUG = true; // Print incoming event messages to the console
const backendModule = import("../host.mjs");

// Initialize Discord RPC
discordRPC.init();

// This simulates a long-running task, reporting its progress to the frontend.
//
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
  //
  // Send some data to the Neutralino app

  ext.sendMessage("pingResult", `Node says PONG, in reply to "${d}"`);
}

async function processAppEvent(data) {
  // Handle Neutralino app events.
  // :param d: data package as JSON dict.
  // :return: ---
  // nya
  //el evento siempre es run node, tenemos que descomponerlo
  if (ext.isEvent(data, "runNode")) {
    const eventName = data.data.function;
    const eventData = data.data.parameter;

    if (eventName === "backend.call") {
      const requestId = eventData?.requestId || null;
      try {
        const { handleRequest, setExtensionContext } = await backendModule;
        // Inject ext context so host operations can use callApi
        if (setExtensionContext) {
          setExtensionContext(ext);
        }

        const result = await handleRequest(
          eventData?.operation,
          eventData?.params,
          (downloaded, total) => {
            ext.sendMessage("download:progress", {
              requestId,
              downloaded,
              total,
            });
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

// Activate Extension
//
const ext = new NeutralinoExtension(true);
console.log("---");
console.log("NodeJS Version:", process.version);
console.log("NodeJS Path:", process.execPath);
console.log("---");
ext.run(processAppEvent);
