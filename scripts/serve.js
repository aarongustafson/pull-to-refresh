import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.md': 'text/plain',
};

createServer(async (request, response) => {
	try {
		const path = resolve(
			root,
			`.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`,
		);
		if (
			!path.startsWith(`${resolve(root)}${sep}`) ||
			path.includes(`${sep}.`)
		) {
			response.writeHead(403).end();
			return;
		}
		if (!(await stat(path)).isFile()) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'content-type': types[extname(path)] || 'application/octet-stream',
			'cache-control': 'no-store',
		});
		if (request.method === 'HEAD') response.end();
		else
			createReadStream(path)
				.on('error', () => response.destroy())
				.pipe(response);
	} catch (error) {
		response.writeHead(error.code === 'ENOENT' ? 404 : 400).end();
	}
}).listen(Number(process.env.PORT || 4185), '127.0.0.1');
