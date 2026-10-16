import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../docs/', import.meta.url);
const types = { html: 'text/html; charset=utf-8', mjs: 'text/javascript; charset=utf-8', txt: 'text/plain; charset=utf-8', png: 'image/png', xml: 'application/xml; charset=utf-8' };

export function cookbookServer() {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      // The public docs are flat. Never expose repository or local workspace files.
      if (!/^\/[a-z0-9-]+\.(html|mjs|txt|png|xml)$/.test(path) && path !== '/') {
        response.writeHead(404).end('Not found');
        return;
      }
      const name = path === '/' ? 'index.html' : path.slice(1);
      const body = await readFile(new URL(name, root));
      response.writeHead(200, { 'Content-Type': types[name.split('.').pop()], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  const server = cookbookServer();
  server.listen(port, '0.0.0.0', () => console.log(`Cookbook preview: http://localhost:${server.address().port}`));
}
