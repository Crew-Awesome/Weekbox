import Features from "@features";
import Core from "@core";
import type { LoadingTask } from "@features";
//import DiscordRpc from './utils/discordrpc';

function App() {
  //DiscordRpc("hola", "Testeando funcion");
  const initTasks: LoadingTask[] = [
    {
      name: "Comprobando entorno de ejecución...",
      action: async () => {
        try {
          await Core.os.syncProtocolRegistration(true);
        } catch (e) {
          console.warn("Error en la inicialización nativa:", e);
        }
      },
    },
    {
      name: "Obtaining Mods...",
      action: async () => {
        // Pre-carga los mods populares para guardarlos en el caché de la API
        // Así cuando la UI inicie, los mostrará instantáneamente.
        await Core.services.gamebanana.getMods("popular", 1, 15);
      },
    },
  ];

  return <Features.Layout loadingTasks={initTasks} />;
}

export default App;
