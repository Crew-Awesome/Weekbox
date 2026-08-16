console.log('STARTING NODE MAIN.JS');
// main.js 1.0.3
//
// Neutralino NodeExtension.
//
// (c)2023-2024 Harald Schneider - marketmix.com

const NeutralinoExtension = require('./neutralino-extension');
const DEBUG = true;     // Print incoming event messages to the console
const { Client } = require("@xhayper/discord-rpc");
const backendModule = import('../host.mjs');
const DISCORD_ID = "1535155487056732160";
let isdiscordready = false;

const cliente = new Client({ clientId: DISCORD_ID });
cliente.on("ready", () => {
    isdiscordready = true;

});



cliente.login().catch((err) => { console.log(err, "error ayuda"); });
// This simulates a long-running task, reporting its progress to the frontend.
//
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function longRun(d) {
    for (let i = 1; i <= 5; i++) {
        ext.sendMessage('pingResult', `Long-running task ${i}/5`);
        await delay(1000);
    }
}

function ping(d) {
    //
    // Send some data to the Neutralino app

    ext.sendMessage('pingResult', `Node says PONG, in reply to "${d}"`);
}
function loading(time = 5000) {
    return new Promise((resolve, reject) => {
        if (isdiscordready) return resolve();

        const start = Date.now();
        const interval = setInterval(() => {
            console.log("discord carga", time, interval);

            if (isdiscordready) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > time) {
                clearInterval(interval);
                reject(new Error("Discord RPC timeout"));
            }
        }, 100);


    })

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
                const { handleRequest } = await backendModule;
                const result = await handleRequest(eventData?.operation, eventData?.params);
                ext.sendMessage('backend:response', {
                    requestId,
                    ok: true,
                    data: result,
                });
            } catch (error) {
                ext.sendMessage('backend:response', {
                    requestId,
                    ok: false,
                    error: {
                        name: error?.name || 'Error',
                        message: error?.message || String(error),
                    },
                });
            }
            return;
        }

        if (eventName === "setActivity") {
            try {
                await loading();
                cliente.user.setActivity(eventData);
            } catch (err) {
                console.error("Discortd no cargo a tiempo", err);
            }
        }


        if (eventName === "clearActivity") {
            try {
                await loading();
                cliente.user.clearActivity();
            } catch (err) {
                console.error("Discortd no cargo para eliminar actividad a tiempo", err);
            }
        }

    }
}

// Activate Extension
//
const ext = new NeutralinoExtension(true);
console.log('---')
console.log('NodeJS Version:', process.version);
console.log('NodeJS Path:', process.execPath);
console.log('---')
ext.run(processAppEvent);
