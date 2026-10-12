// El renderer se sirve por app://openword/ en vez de file:// para tener un origen seguro y
// estable, y para que fetch() pueda cargar harfbuzz.wasm y las fuentes empaquetadas.
import { net, protocol } from 'electron';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_SCHEME, CONTENT_SECURITY_POLICY, resolveAppPath } from './app-url';

export { APP_HOST, APP_ORIGIN, APP_SCHEME } from './app-url';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** Debe llamarse antes de `app.ready`. */
export function registerAppSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
    },
  ]);
}

export function handleAppProtocol(rendererDir: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response('Method not allowed', { status: 405 });
    const target = resolveAppPath(request.url, rendererDir);
    if (!target) return new Response('Not found', { status: 404 });
    let res: Response;
    try {
      res = await net.fetch(pathToFileURL(target).toString());
    } catch {
      return new Response('Not found', { status: 404 }); // archivo inexistente o ilegible
    }
    if (!res.ok) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    headers.set('Content-Type', MIME[extname(target).toLowerCase()] ?? 'application/octet-stream');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (target.endsWith('.html')) headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    return new Response(res.body, { status: 200, headers });
  });
}
