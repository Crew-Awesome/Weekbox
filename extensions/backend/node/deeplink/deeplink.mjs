import http from "http";

let deeplinkServer = null;

export const deeplinkApi = {
  isPrimary: true,
  startServer: (extContext) => {
    if (deeplinkServer) return;

    deeplinkServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/deeplink') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const parsedArgs = JSON.parse(body);
            if (extContext) {
              extContext.sendMessage("deeplinkArgs", parsedArgs);
            }
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.writeHead(400);
            res.end();
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    deeplinkServer.listen(45555, '127.0.0.1', () => {
      console.log("Deeplink server listening on 45555");
    });

    deeplinkServer.on('error', (e) => {
      // Ignoramos el error, la instancia secundaria se suicidará desde el frontend
      if (e.code === 'EADDRINUSE') {
        deeplinkApi.isPrimary = false;
        console.log("Deeplink server port in use. Secondary instance will be killed by frontend.");
      }
    });
  }
};
