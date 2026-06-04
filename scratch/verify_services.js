const http = require('http');

const services = [
  { name: 'NestJS Backend API', url: 'http://localhost:3000/test-api' },
  { name: 'NestJS WebSocket Server (Socket.io)', url: 'http://localhost:3001/socket.io/?EIO=4&transport=polling' },
  { name: 'Notification Service', url: 'http://localhost:4000/' },
  { name: 'Vite dev server (ticket-web)', url: 'http://localhost:5173/' },
  { name: 'Metro Bundler (app)', url: 'http://localhost:8081/' }
];

async function checkService(service) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(service.url);
    const options = {
      method: 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          name: service.name,
          url: service.url,
          status: 'UP',
          statusCode: res.statusCode,
          responseSnippet: data.substring(0, 100).trim()
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: service.name,
        url: service.url,
        status: 'DOWN',
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        url: service.url,
        status: 'TIMEOUT'
      });
    });

    req.end();
  });
}

async function run() {
  console.log('=== VERIFYING PEIAPP SERVICES ===');
  const results = [];
  for (const s of services) {
    const res = await checkService(s);
    results.push(res);
  }
  console.table(results);
}

run();
