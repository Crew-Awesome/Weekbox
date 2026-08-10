import { Layout } from './features/layout';

function App() {

  return (
    <Layout>
      <div className="flex items-center justify-center text-white font-sans w-full h-full">
        <h1 className="text-4xl md:text-6xl font-semibold text-slate-800 dark:text-white">
          Welcome to Weekbox
        </h1>
      </div>
    </Layout>
  );
}

export default App;