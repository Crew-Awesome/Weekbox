import { useEffect, useState } from 'react';

// Declaramos las variables globales para que TypeScript no marque error
declare global {
  interface Window {
    NODE: any;
    Neutralino: any;
    NodeExtension: any; // aki mas q nada xd
  }
}

function App() {
  const [contador, setContador] = useState(0);
  const [respuestaNode, setRespuestaNode] = useState('Esperando a Node...');

  useEffect(() => {
    //
    if (typeof window.Neutralino !== 'undefined' && typeof window.NodeExtension !== 'undefined') {
      
      // init neu y node
      window.Neutralino.init();
      window.NODE = new window.NodeExtension(true);
      
      // back ping pong
      window.Neutralino.events.on("pingResult", (e: any) => {
        console.log("Respuesta de Node:", e.detail);
        setRespuestaNode(e.detail);
      });

    } else {
      console.error("e conexión. Revisa la consola.");
    }
  }, []);

  const mandarPing = () => {
    if (typeof window.NODE !== 'undefined') {
      window.NODE.run('ping', `¡React dice PING! Contador actual: ${contador}`);
    } else {
      alert("Los scripts no han cargado. Node.js no está conectado todavía.");
    }
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Prueba de Vite HMR</h1>
      
      <div style={{ marginBottom: '30px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>1. Prueba de Estado (React)</h2>
        <p>Haz clic varias veces para subir el contador:</p>
        <button 
          onClick={() => setContador(contador + 1)}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Contador: {contador}
        </button>
      </div>

      <div style={{ padding: '15px', border: '2px solid #007bff', borderRadius: '8px' }}>
        <h2>2. Prueba de Backend (Node.js)</h2>
        <button 
          onClick={mandarPing}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Enviar señal a Node.js
        </button>
        <p style={{ marginTop: '15px', fontSize: '18px' }}>
          <strong>Node responde:</strong> {respuestaNode}
        </p>
      </div>
    </div>
  );
}

export default App;