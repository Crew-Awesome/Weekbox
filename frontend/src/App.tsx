import Features from '@features';
import Core from '@core';
import type { LoadingTask } from '@features';
//import DiscordRpc from './utils/discordrpc';

function App() {
  //DiscordRpc("hola", "Testeando funcion");
  const initTasks: LoadingTask[] = [
    {
      name: 'Comprobando entorno de ejecución...',
      action: async () => {
        const version = await Core.platform.getVersion();
        console.log(`Ejecutando Weekbox v${version} en ${Core.platform.platformName}`);
      }
    }
  ];

  return (
    <Features.Layout loadingTasks={initTasks} />
  );
}

export default App;