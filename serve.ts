// Kota Raya — server statis kecil untuk pengembangan dan play-test.
// Menyajikan game/ di http://127.0.0.1:PORT (default 8901).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const gameDir = join(repoDir, 'game');

let port = 8901;
const portFlag = process.argv.indexOf('--port');
if (portFlag >= 0 && process.argv[portFlag + 1]) {
  const parsed = Number(process.argv[portFlag + 1]);
  if (Number.isFinite(parsed)) port = parsed;
}

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const filePath = join(gameDir, rawPath === '/' ? 'index.html' : rawPath);
  if (!filePath.startsWith(gameDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Kota Raya disajikan di http://127.0.0.1:${port}/`);
});
