const { Client } = require("@xhayper/discord-rpc");

const DISCORD_ID = "1535155487056732160";
let isdiscordready = false;
const cliente = new Client({ clientId: DISCORD_ID });

cliente.on("ready", () => {
    isdiscordready = true;
});

function init() {
    cliente.login().catch((err) => { 
        console.log("Discord RPC Login Error:", err.message || err); 
    });
}

function loading(time = 5000) {
    return new Promise((resolve, reject) => {
        if (isdiscordready) return resolve();

        const start = Date.now();
        const interval = setInterval(() => {
            if (isdiscordready) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > time) {
                clearInterval(interval);
                reject(new Error("Discord RPC timeout"));
            }
        }, 100);
    });
}

async function setActivity(eventData) {
    try {
        await loading();
        cliente.user.setActivity(eventData);
    } catch (err) {
        console.error("Discord no cargó a tiempo", err);
    }
}

async function clearActivity() {
    try {
        await loading();
        cliente.user.clearActivity();
    } catch (err) {
        console.error("Discord no cargó para eliminar actividad a tiempo", err);
    }
}

module.exports = {
    init,
    setActivity,
    clearActivity
};
