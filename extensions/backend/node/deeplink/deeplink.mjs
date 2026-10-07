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

      if (req.method === 'GET' && req.url === '/status') {
        import('../zombie-manager.mjs').then(({ zombieManager }) => {
          const timeSinceLastPing = Date.now() - zombieManager.lastPingTime;
          // If frontend hasn't pinged in 15 seconds, it's probably dead (zombie)
          const frontendAlive = zombieManager.receivedFirstPing ? (timeSinceLastPing < 15000) : true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ frontendAlive }));
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/kill') {
        res.writeHead(200);
        res.end();
        console.log("[Deeplink] Received kill signal from secondary instance. Exiting...");
        process.exit(0);
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

    deeplinkServer.listen(45556, '127.0.0.1', () => {
      console.log("Deeplink server listening on 45556");
    });

    deeplinkServer.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        deeplinkApi.isPrimary = false;
        console.log("[Deeplink] Port 45556 is in use. Checking if primary is a zombie...");

        const reqStatus = http.request({
          hostname: '127.0.0.1', port: 45556, path: '/status', method: 'GET'
        }, (resStatus) => {
          let body = '';
          resStatus.on('data', d => body += d.toString());
          resStatus.on('end', () => {
            try {
              const status = JSON.parse(body);
              if (!status.frontendAlive) {
                console.log("[Deeplink] Primary instance is a zombie (frontend dead). Sending kill signal...");
                const reqKill = http.request({ hostname: '127.0.0.1', port: 45556, path: '/kill', method: 'POST' });
                reqKill.on('error', () => {});
                reqKill.end();
                
                // Retry listening after 1 second
                setTimeout(() => {
                  deeplinkApi.isPrimary = true;
                  deeplinkServer.listen(45556, '127.0.0.1');
                }, 1000);
                return;
              }
            } catch (e) {}

            // Primary is alive, forward args
            console.log("[Deeplink] Primary is alive. Forwarding args...");
            const argsToForward = process.argv.slice(2);
            const postData = JSON.stringify(argsToForward);
            const req = http.request({
              hostname: '127.0.0.1', port: 45556, path: '/deeplink', method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
            }, () => {
              console.log("[Deeplink] Args forwarded. Terminating secondary app.");
              if (extContext) extContext.callApi("app.exit").catch(() => process.exit(0));
              else process.exit(0);
            });
            req.on('error', () => process.exit(0));
            req.write(postData);
            req.end();
          });
        });

        reqStatus.on('error', () => {
          // If we can't connect, just retry listening
          setTimeout(() => {
            deeplinkApi.isPrimary = true;
            deeplinkServer.listen(45556, '127.0.0.1');
          }, 1000);
        });
        reqStatus.end();
      }
    });
  }
};
