const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const backendDir = path.resolve(__dirname, "..");
const serviceDir = path.resolve(backendDir, "../ml-service");
const pythonPath = path.join(serviceDir, ".venv", "Scripts", "python.exe");
const healthUrl = "http://127.0.0.1:8001/health";
const log = (message) => console.log(`[Cartify] ${message}`);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const probe = (url, accepts) => new Promise((resolve) => {
  let settled = false;
  const finish = (ready) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(ready);
  };
  const request = http.get(url, { agent: false }, (response) => {
    let body = "";
    response.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8192) request.destroy();
    });
    response.on("end", () => {
      try { finish(response.statusCode === 200 && accepts(body)); }
      catch { finish(false); }
    });
    response.on("error", () => finish(false));
  });
  const timer = setTimeout(() => request.destroy(), 1000);
  request.on("error", () => finish(false));
});

const healthy = (url) => probe(url, (body) => JSON.parse(body).status === "healthy");
const portInUse = (url) => new Promise((resolve) => {
  const target = new URL(url);
  const socket = net.connect(Number(target.port), target.hostname);
  const finish = (used) => { socket.destroy(); resolve(used); };
  socket.setTimeout(500);
  socket.once("connect", () => finish(true));
  socket.once("error", () => finish(false));
  socket.once("timeout", () => finish(false));
});

async function ensureMl({ url = healthUrl, python = pythonPath, directory = serviceDir,
  startProcess = spawn, onSpawn = () => {}, cancelled = () => false, timeoutMs = 120000,
  write = log } = {}) {
  if (await healthy(url)) {
    write("Reusing existing ML service; it will not be stopped by this launcher.");
    return null;
  }
  if (await portInUse(url)) throw new Error("Port 8001 is occupied, but ML /health is not healthy. No duplicate service was started.");
  if (!fs.existsSync(python)) throw new Error("Missing ml-service/.venv/Scripts/python.exe. Follow ml-service/README.md to create its Python 3.12 environment.");
  if (cancelled()) throw new Error("Startup cancelled.");

  write("Starting ML service...");
  const child = startProcess(python, ["local_runner.py"], {
    // A detached Windows console process can create its own visible window.
    // Keep the worker attached, hidden, and controlled through its stdin pipe.
    cwd: directory, windowsHide: true, detached: false, stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONDONTWRITEBYTECODE: "1" },
  });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  onSpawn(child);
  let failure;
  child.once("error", (error) => { failure = error; });
  child.once("exit", (code) => { failure = new Error(`ML service exited before readiness (code ${code}).`); });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cancelled()) throw new Error("Startup cancelled.");
    if (failure) throw failure;
    if (await healthy(url)) return child;
    await pause(250);
  }
  throw new Error("ML service did not become healthy within 120 seconds. Check the Python output above.");
}

async function stopOwnedMl(child, write = log) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode !== null) return;
  write("Stopping managed ML service...");
  let timer;
  const exited = new Promise((resolve) => child.once("exit", () => resolve(true)));
  child.stdin.on("error", () => {});
  child.stdin.end("shutdown\n");
  const stopped = await Promise.race([exited, new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), 10000);
  })]);
  clearTimeout(timer);
  if (!stopped && child.exitCode === null && child.signalCode === null) {
    // Windows venv python.exe can have a base-python child: kill only this owned tree.
    write("ML shutdown timed out; stopping its owned process tree.");
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    });
  }
}

async function runLocal() {
  process.chdir(backendDir);
  require("dotenv").config();
  require("dotenv").config({ path: path.join(backendDir, "config/.env"), override: false });
  let mlChild = null;
  let server = null;
  let stopping = false;

  const shutdown = async (code) => {
    if (stopping) return;
    stopping = true;
    if (server) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { server.closeAllConnections?.(); resolve(); }, 3000);
        server.close(() => { clearTimeout(timer); resolve(); });
      });
      await require("mongoose").disconnect();
    }
    await stopOwnedMl(mlChild);
    process.exit(code);
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, () => { void shutdown(0); });

  try {
    await ensureMl({ cancelled: () => stopping, onSpawn: (child) => {
      mlChild = child;
      child.once("exit", (code) => {
        if (!stopping) {
          log(`Managed ML service stopped unexpectedly (code ${code}). Stopping backend.`);
          void shutdown(1);
        }
      });
    } });
    if (stopping) return;
    log("ML service ready on http://127.0.0.1:8001");

    const expressUrl = `http://localhost:${process.env.PORT || 8000}`;
    if (await probe(`${expressUrl}/test`, (body) => body.trim() === "Hello World!")) {
      log("Reusing existing Express server; it will not be stopped by this launcher.");
    } else {
      if (await portInUse(expressUrl)) throw new Error("Express port is already occupied by another server.");
      if (stopping) return;
      server = require("../server");
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        if (server.listening) resolve();
        else server.once("listening", resolve);
      });
      server.once("close", () => { if (!stopping) void shutdown(0); });
    }
    log(`Express server ready on ${expressUrl}`);
    // Keep a launcher that reused both services alive until Ctrl+C.
    const keepAlive = setInterval(() => {}, 60000);
    process.once("exit", () => clearInterval(keepAlive));
  } catch (error) {
    if (!stopping) log(`Startup failed: ${error.message}`);
    await shutdown(1);
  }
}

if (require.main === module) void runLocal();
module.exports = { healthy, ensureMl, stopOwnedMl };
