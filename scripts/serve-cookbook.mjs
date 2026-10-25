import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../docs/', import.meta.url);
const types = { html: 'text/html; charset=utf-8', mjs: 'text/javascript; charset=utf-8', txt: 'text/plain; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4', xml: 'application/xml; charset=utf-8' };

export function cookbookServer() {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      // The public docs are flat. Never expose repository or local workspace files.
      if (!/^\/[a-z0-9-]+\.(html|mjs|txt|png|jpg|mp4|xml)$/.test(path) && path !== '/') {
        response.writeHead(404).end('Not found');
        return;
      }
      const name = path === '/' ? 'index.html' : path.slice(1);
      const body = await readFile(new URL(name, root));
      const type = types[name.split('.').pop()];
      const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Length': body.length };
      if (type === 'video/mp4') {
        headers['Accept-Ranges'] = 'bytes';
        if (request.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
          const suffix = match && !match[1] && match[2];
          const start = suffix ? Math.max(0, body.length - Number(match[2])) : Number(match?.[1]);
          const end = suffix || !match?.[2] ? body.length - 1 : Math.min(Number(match[2]), body.length - 1);
          if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start)
              || !Number.isSafeInteger(end) || start < 0 || start >= body.length || end < start) {
            response.writeHead(416, { 'Content-Range': `bytes */${body.length}` }).end();
            return;
          }
          response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1 });
          response.end(request.method === 'HEAD' ? undefined : body.subarray(start, end + 1));
          return;
        }
      }
      response.writeHead(200, headers);
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
