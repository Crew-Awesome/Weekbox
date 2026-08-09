import { useEffect, useState } from 'react';
import { platform } from './core/platform';

/**
 * Maqueta básica de Weekbox conectada a la capa unificada de Platform Bridge.
 * @returns {JSX.Element} Interfaz básica de prueba con botones agnósticos de plataforma.
 */
function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [pingCount, setPingCount] = useState<number>(0);

  /**
   * Agrega un mensaje a la consola de la maqueta.
   * @param {string} msg - Texto a registrar.
   */
  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  /**
   * Inicialización del puente de plataforma y suscripción a eventos.
   */
  useEffect(() => {
    platform.initialize();
    addLog(`Plataforma detectada: [${platform.platformName.toUpperCase()}]`);

    const unsubscribePing = platform.onEvent('pingResult', (data: string) => {
      addLog(`Respuesta: ${data}`);
    });

    const unsubscribeReady = platform.onEvent('ready', () => {
      addLog('Plataforma inicializada y lista.');
    });

    return () => {
      unsubscribePing();
      unsubscribeReady();
    };
  }, []);

  /**
   * Envía una señal de Ping a través del adaptador de plataforma activo.
   */
  const handlePing = () => {
    const next = pingCount + 1;
    setPingCount(next);
    platform.sendPing(`Ping #${next}`);
    platform.triggerFeedback('light');
    addLog(`Enviando Ping #${next}...`);
  };

  /**
   * Solicita una tarea pesada en segundo plano.
   */
  const handleLongTask = () => {
    platform.runLongTask(5);
    platform.triggerFeedback('warning');
    addLog('Iniciando tarea en segundo plano...');
  };

  /**
   * Actualiza el estado de Discord Rich Presence (en Desktop).
   */
  const handleDiscordRPC = () => {
    platform.setDiscordActivity({
      details: 'Desarrollando Weekbox',
      state: 'Probando Platform Bridge',
    });
    platform.triggerFeedback('success');
    addLog('Actualización de Discord RPC solicitada.');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '650px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Cabecera básica */}
      <header style={{ marginBottom: '16px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '20px', margin: 0, color: '#333' }}>Weekbox - Maqueta Base</h2>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
          Plataforma Activa:{' '}
          <strong style={{ color: platform.platformName === 'desktop' ? '#16a34a' : '#2563eb' }}>
            {platform.platformName.toUpperCase()}
          </strong>
        </p>
      </header>

      {/* Botones de acción */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handlePing}
          style={{ padding: '8px 14px', border: '1px solid #999', borderRadius: '4px', background: '#f5f5f5' }}
        >
          Mandar Ping ({pingCount})
        </button>

        <button
          onClick={handleLongTask}
          style={{ padding: '8px 14px', border: '1px solid #999', borderRadius: '4px', background: '#f5f5f5' }}
        >
          Ejecutar Tarea Larga
        </button>

        <button
          onClick={handleDiscordRPC}
          style={{ padding: '8px 14px', border: '1px solid #999', borderRadius: '4px', background: '#f5f5f5' }}
        >
          Probar Discord RPC
        </button>

        <button
          onClick={() => setLogs([])}
          style={{ padding: '8px 14px', border: '1px solid #bbb', borderRadius: '4px', background: '#fff', color: '#666' }}
        >
          Limpiar Log
        </button>
      </section>

      {/* Consola de registros básica */}
      <section>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#444' }}>
          Registro de Eventos:
        </div>
        <div
          style={{
            height: '240px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            background: '#fafafa',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#222',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: '#888' }}>Sin eventos todavía...</span>
          ) : (
            logs.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                {entry}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;