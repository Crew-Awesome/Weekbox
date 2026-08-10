import { Layout } from './features/layout';
import Card from './shared/components/atoms/card-mainmenu/card';
import Titles from './shared/components/atoms/titles/titles';
import Searchbar from './shared/components/organisms/sidebar/searchbar/searchbar';
import { platform } from './core/platform';
import type { LoadingTask } from './features/loading/loading-screen';
//import DiscordRpc from './utils/discordrpc';

function App() {
//  DiscordRpc("hola", "Testeando funcion");
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
    <Layout loadingTasks={initTasks}>
      <div className="items-center -m-8 justify-center text-white font-sans  ">
        <div className='relative '>
          <Searchbar></Searchbar>
          <Titles title='All Mods'></Titles>
          <Card></Card>
          <div className="fixed bottom-0 left-0 right-0 h-32 bg-linear-to-t  from-[#1c1c1ce9] to-transparent" />
        </div>
      </div>
    </Layout>
  );
}

export default App;