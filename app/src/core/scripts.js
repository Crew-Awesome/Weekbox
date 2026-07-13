const ScriptLoader = {
    async init() {
        try {
            Neutralino.init();
            Neutralino.events.on("windowClose", () => {
                Neutralino.app.exit();
            });
            
            const response = await fetch('src/core/scripts.jsonc');
            if (!response.ok) throw new Error(`Error al leer scripts.jsonc: HTTP ${response.status}`);
            
            const text = await response.text();
            const cleanJsonString = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
            const scriptsList = JSON.parse(cleanJsonString);
            
            for (const scriptPath of scriptsList) {
                await this.loadScript(scriptPath);
            }
            console.log("WeekBox: Módulos JS cargados.");
            
            if (window.Router) await window.Router.init();
            
        } catch (error) {
            console.error("Error crítico:", error);
            const main = document.getElementById('main-content');
            if (main) {
                main.innerHTML = `<div style="padding: 24px; color: #ff4a4a;"><h2>Error de carga</h2><p>${error.message}</p></div>`;
            }
        }
    },
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.type = 'module';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`No se encontró el archivo: ${src}`));
            document.body.appendChild(script);
        });
    }
};
ScriptLoader.init();
