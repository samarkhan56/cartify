const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { EventEmitter } = require("events");
const { Writable } = require("stream");
const path = require("path");
const { healthy, ensureMl, stopOwnedMl } = require("../scripts/start-local");

const listen = async (handler) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/health` };
};
const close = (server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });

test("healthy existing ML is reused without spawning, even when a local venv is missing", async () => {
  const { server, url } = await listen((_req, res) => res.end('{"status":"healthy"}'));
  try {
    const messages = [];
    const child = await ensureMl({ url, python: "missing-python.exe", write: (message) => messages.push(message),
      startProcess: () => assert.fail("Must not start a duplicate ML service") });
    assert.equal(child, null);
    await stopOwnedMl(child);
    assert.equal(await healthy(url), true);
    assert.match(messages[0], /Reusing existing ML/);
  } finally { await close(server); }
});

test("an occupied unhealthy port fails clearly without spawning another service", async () => {
  const { server, url } = await listen((_req, res) => res.end('{"status":"unhealthy"}'));
  try {
    await assert.rejects(ensureMl({ url, startProcess: () => assert.fail("Duplicate spawn") }), /occupied/);
  } finally { await close(server); }
});

test("missing local Python produces setup instructions before a process is started", async () => {
  const { server, url } = await listen((_req, res) => res.end());
  await close(server);
  await assert.rejects(ensureMl({ url, python: path.join(__dirname, "missing-python.exe") }), /README.md/);
});

test("Python startup failure is detected without waiting for the full startup timeout", async () => {
  const { server, url } = await listen((_req, res) => res.end());
  await close(server);
  const child = new EventEmitter();
  let owned;
  await assert.rejects(ensureMl({ url, python: process.execPath, write: () => {}, timeoutMs: 2000,
    onSpawn: (process) => { owned = process; },
    startProcess: () => { setImmediate(() => child.emit("exit", 1)); return child; },
  }), /exited before readiness/);
  assert.equal(owned, child);
});

test("owned Python receives a graceful shutdown command and is awaited", async () => {
  const child = new EventEmitter();
  child.pid = 123456;
  child.exitCode = null;
  child.signalCode = null;
  let command;
  child.stdin = new Writable({ write(chunk, _encoding, done) {
    command = chunk.toString();
    setImmediate(() => { child.exitCode = 0; child.emit("exit", 0); });
    done();
  } });
  await stopOwnedMl(child, () => {});
  assert.equal(command, "shutdown\n");
  assert.equal(child.exitCode, 0);
});
