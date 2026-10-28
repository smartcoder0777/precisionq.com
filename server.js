/**
 * cPanel / Phusion Passenger "Application startup file".
 * In "Setup Node.js App", set:  Application startup file  →  server.js
 *
 * Loads `.env*` the same way as `next start` (custom server does not do this by default).
 *
 * Behaviour is aligned with `next start`: port from `PORT` or **3000**, bind on **0.0.0.0**,
 * and `hostname` + `port` passed into `next()` so routing and URLs match the stock server.
 */
const path = require("path");
const { loadEnvConfig } = require("@next/env");

const projectDir = path.resolve(__dirname);

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");

const http = require("http");
const { parse } = require("url");
const next = require("next");

/** Port for `listen()` — same rule as `next start` (only `PORT`, default 3000). */
function resolvePort() {
  const p = parseInt(process.env.PORT, 10) || 3000;
  return p;
}

/**
 * Host header / URL generation for Next (not the same as bind address).
 * Use `localhost` when unset so local links match what you open in the browser.
 */
function resolveNextHostname() {
  const raw = (process.env.NEXT_HOST || process.env.HOSTNAME || "").trim();
  if (raw && !raw.includes("://")) {
    return raw.replace(/:\d+$/, "");
  }
  const urlRaw = (process.env.HOST_URL || process.env.HOST || "").trim();
  if (urlRaw.includes("://")) {
    try {
      return new URL(urlRaw).hostname || "localhost";
    } catch {
      return "localhost";
    }
  }
  if (urlRaw) {
    return urlRaw.replace(/:\d+$/, "");
  }
  return "localhost";
}

/** Where the HTTP server listens (all interfaces = same reachability as `next start`). */
function resolveBindHost() {
  const raw = (process.env.BIND_HOST || process.env.LISTEN_HOST || "").trim();
  if (!raw) return "0.0.0.0";
  if (raw.includes("://")) {
    try {
      return new URL(raw).hostname || "0.0.0.0";
    } catch {
      return "0.0.0.0";
    }
  }
  return raw;
}

const dev = process.env.NODE_ENV !== "production";
const port = resolvePort();
const nextHostname = resolveNextHostname();
const bindHost = resolveBindHost();

const app = next({
  dev,
  dir: projectDir,
  hostname: nextHostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl).catch(err => {
        console.error("Request handler error", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    })
    .listen(port, bindHost, err => {
      if (err) throw err;
      console.log(`> Ready on http://${nextHostname}:${port} (bind ${bindHost}:${port})`);
    });
});
