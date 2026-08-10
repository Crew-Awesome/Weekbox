import { Layout } from './features/layout';
import Card from './shared/components/atoms/card-mainmenu/card';
import Titles from './shared/components/atoms/titles/titles';
import Searchbar from './shared/components/organisms/sidebar/searchbar/searchbar';
//import DiscordRpc from './utils/discordrpc';

function App() {
//  DiscordRpc("hola", "Testeando funcion");
  return (
    <Layout>
      <div className="items-center -m-8 justify-center text-white font-sans  ">
        <div className='relative '>
          <Searchbar></Searchbar>
          <Titles title='All Mods'></Titles>
          <Card></Card>
          <div className="fixed bottom-0 left-0 right-0 h-32 bg-linear-to-t  from-[#1c1c1ce9] to-transparent" />
        </div>
        {/* <h1 className="text-4xl md:text-6xl font-semibold text-slate-800 dark:text-white">
          Welcome to Weekbox
        </h1>*/}
  
      </div>
    </Layout>
  );
}

export default App;