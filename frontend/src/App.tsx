import Features from '@features';
import { platform } from './core/platform';
import type { LoadingTask } from '@features';
//import DiscordRpc from './utils/discordrpc';

function App() {
  //DiscordRpc("hola", "Testeando funcion");
  const initTasks: LoadingTask[] = [
    {
      name: 'Comprobando entorno de ejecución...',
      action: async () => {
        const version = await platform.getVersion();
        console.log(`Ejecutando Weekbox v${version} en ${platform.platformName}`);
      }
    }
  ];

  return (
    <Features.Layout loadingTasks={initTasks} />
  );
}

export default App;