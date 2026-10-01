#!/usr/bin/env node
// Local preview that mirrors docker/default.conf's routing, for when Docker
// isn't available: landing (landing/) at "/", the app (repo root) at "/app/",
// the old-URL redirects, and the same security headers (so CSP problems show
// up locally). Dependency-free.
//
//   node tools/serve-like-nginx.mjs [port]     (default 8080)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LANDING = join(ROOT, "landing");
const PORT = Number(process.argv[2]) || 8080;

const headersConf = await readFile(join(ROOT, "docker", "security-headers.conf"), "utf8");
const SECURITY = [...headersConf.matchAll(/^add_header\s+(\S+)\s+"(.*)"\s+always;/gm)].map((m) => [m[1], m[2]]);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".mjs": "application/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain",
};

function send(res, status, headers, body) {
  for (const [k, v] of SECURITY) res.setHeader(k, v);
  res.writeHead(status, headers);
  res.end(body);
}
function redirect(res, status, to) { send(res, status, { Location: to }, ""); }

async function file(res, path, cache) {
  try {
    const s = await stat(path);
    if (!s.isFile()) throw new Error("not a file");
    const body = await readFile(path);
    const h = { "Content-Type": TYPES[extname(path)] || "application/octet-stream" };
    if (cache) h["Cache-Control"] = cache;
    send(res, 200, h, body);
  } catch {
    send(res, 404, { "Content-Type": "text/plain" }, "404\n");
  }
}

// Join a URL path under a base dir without escaping it.
function under(base, urlPath) {
  const p = normalize(join(base, decodeURIComponent(urlPath)));
  return p.startsWith(base) ? p : null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;
  const q = url.search;

  if (p === "/healthz") return send(res, 200, { "Content-Type": "text/plain" }, "ok\n");

  // landing
  if (p === "/") {
    if (url.searchParams.get("reset_token")) return redirect(res, 302, "/app/" + q);
    return file(res, join(LANDING, "index.html"), "no-cache");
  }
  if (p === "/index.html") return redirect(res, 301, "/app/" + q);
  if (p === "/manifest.json") return redirect(res, 301, "/app/manifest.json");
  if (p === "/admin.html") return redirect(res, 301, "/app/admin.html");
  if (p === "/reset-password") return redirect(res, 302, "/app/reset-password" + q);
  if (p === "/service-worker.js") return file(res, join(LANDING, "service-worker.js"), "no-cache");

  // app
  if (p === "/app") return redirect(res, 301, "/app/");
  if (p.startsWith("/app/")) {
    const rest = p.slice(4); // keeps leading "/"
    if (rest === "/" || rest === "/index.html") return file(res, join(ROOT, "index.html"), "no-cache");
    if (rest === "/reset-password") return file(res, join(ROOT, "index.html"), "no-cache");
    if (/^\/admin\.(html|js|css)$/.test(rest)) return file(res, join(ROOT, rest), "no-store");
    const f = under(ROOT, rest);
    if (!f || f.startsWith(LANDING)) return send(res, 404, {}, "404\n");
    return file(res, f, null);
  }

  // root static: icons/ from the repo, everything else from landing/
  // (nginx serves icons/ and assets/ immutable; left uncached here so local
  // edits show up on reload.)
  const f = p.startsWith("/icons/") ? under(ROOT, p) : under(LANDING, p);
  if (!f) return send(res, 404, {}, "404\n");
  return file(res, f, null);
}).listen(PORT, () => console.log(`serve-like-nginx: http://localhost:${PORT}/ (landing)  /app/ (app)`));
