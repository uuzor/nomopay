const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': status === 200 ? 'no-cache' : 'no-store',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!req.url) return send(res, 400, 'Bad request');

  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/health') {
    return send(res, 200, JSON.stringify({ status: 'ok', app: 'splitlink-frontend' }), 'application/json; charset=utf-8');
  }

  if (url.pathname === '/frontend-config.json') {
    return send(
      res,
      200,
      JSON.stringify({
        clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
        apiBaseUrl: '',
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      }),
      'application/json; charset=utf-8'
    );
  }

  if (url.pathname.startsWith('/api/')) {
    const apiBaseUrl = process.env.API_BASE_URL;
    if (!apiBaseUrl) {
      return send(
        res,
        503,
        JSON.stringify({ error: 'API_BASE_URL is not configured for frontend API proxying' }),
        'application/json; charset=utf-8'
      );
    }

    const targetUrl = new URL(url.pathname + url.search, apiBaseUrl);
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            ...req.headers,
            host: targetUrl.host,
          },
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
        });
        const body = Buffer.from(await response.arrayBuffer());
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        res.end(body);
      } catch (error) {
        send(
          res,
          502,
          JSON.stringify({ error: 'Unable to reach configured API backend' }),
          'application/json; charset=utf-8'
        );
      }
    });
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^\.\.(\/|\\|$)/, '');
  let filePath = path.join(FRONTEND_DIR, safePath);

  if (!filePath.startsWith(FRONTEND_DIR)) {
    return send(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 500, 'Server error');
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log(`SplitLink frontend running on port ${PORT}`);
});