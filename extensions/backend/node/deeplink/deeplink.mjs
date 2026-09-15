import http from "http";

let deeplinkServer = null;

export const deeplinkApi = {
  isPrimary: true,
  startServer: (extContext) => {
    if (deeplinkServer) return;

    deeplinkServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/deeplink') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const parsedArgs = JSON.parse(body);
            if (extContext) {
              extContext.sendMessage("deeplinkArgs", parsedArgs);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
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
      if (e.code === 'EADDRINUSE') {
        deeplinkApi.isPrimary = false;
        console.log("Deeplink server port in use. Secondary instance will be killed by frontend.");
      }
    });
  }
};
