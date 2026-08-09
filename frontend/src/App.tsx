import { useEffect } from 'react';
import { platform } from './core/platform';

function App() {
  useEffect(() => {
    platform.initialize();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
      <h1 className="text-4xl md:text-6xl font-semibold">
        Im write with one of my hands ahhhh
      </h1>
    </div>
  );
}

export default App;