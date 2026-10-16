import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.FRONT_PORT || 5501);
const backend = new URL(process.env.BACKEND_URL || "http://127.0.0.1:3000");
if (!["http:", "https:"].includes(backend.protocol)) {
  throw new Error("BACKEND_URL debe usar http o https.");
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function proxyApi(request, response) {
  const transport = backend.protocol === "https:" ? https : http;
  // El destino siempre es el backend configurado; solo se reenvían rutas /api/.
  const upstream = transport.request({
    protocol: backend.protocol,
    hostname: backend.hostname,
    port: backend.port || (backend.protocol === "https:" ? 443 : 80),
    path: request.url,
    method: request.method,
    headers: { ...request.headers, host: backend.host }
  }, incoming => {
    response.writeHead(incoming.statusCode, incoming.headers);
    incoming.on("error", () => response.destroy());
    incoming.pipe(response);
  });

  upstream.setTimeout(15000, () => upstream.destroy(new Error("Backend timeout")));
  upstream.on("error", () => {
    if (response.destroyed) return;
    if (response.headersSent) return response.destroy();
    response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      success: false,
      error: {
        code: "BACKEND_UNAVAILABLE",
        message: "No fue posible conectar con el backend. Inicia studentFlow_back y comprueba BACKEND_URL."
      }
    }));
  });
  request.on("aborted", () => upstream.destroy());
  request.pipe(upstream);
}

const server = http.createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400).end("Ruta inválida");
    return;
  }

  if (pathname.startsWith("/api/")) return proxyApi(request, response);
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end("Método no permitido");
    return;
  }

  const filePath = path.resolve(publicDir, `.${pathname === "/" ? "/index.html" : pathname}`);
  const relativePath = path.relative(publicDir, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath) || filePath.includes("\0")) {
    response.writeHead(403).end("Ruta no permitida");
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    const missing = ["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code);
    response.writeHead(missing ? 404 : 500).end(missing ? "Archivo no encontrado" : "Error al leer el archivo");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`StudentFlow front: http://127.0.0.1:${server.address().port}`);
  console.log(`API: ${backend.origin}/api/v1`);
});
