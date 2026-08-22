import Features from "@features";
import Core from "@core";
import type { LoadingTask } from "@features";

function App() {
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
        await Core.services.gamebanana.getMods("popular", 1, 15);
      },
    },
  ];

  return <Features.Layout loadingTasks={initTasks} />;
}

export default App;
