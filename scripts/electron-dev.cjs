const { spawn } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const DEFAULT_DEV_SERVER_URL = 'http://127.0.0.1:5173';
const devServerUrl = process.env.VITE_DEV_SERVER_URL || DEFAULT_DEV_SERVER_URL;
const serverUrl = new URL(devServerUrl);
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const devServerPort = Number(serverUrl.port) || (serverUrl.protocol === 'https:' ? 443 : 80);
const DEV_SERVER_WAIT_MS = 30000;
const DEV_SERVER_POLL_INTERVAL_MS = 500;

function runElectron() {
  return spawn(`${npmCmd} run electron:dev:main`, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development',
      ELECTRON_DEBUG: process.env.ELECTRON_DEBUG || 'true',
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });
}

function isDevServerReady(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const requestLib = serverUrl.protocol === 'https:' ? https : http;
    const req = requestLib.request(
      {
        hostname: serverUrl.hostname,
        port: devServerPort,
        path: '/',
        method: 'GET',
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function waitForDevServer(maxWaitMs = DEV_SERVER_WAIT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    if (await isDevServerReady()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, DEV_SERVER_POLL_INTERVAL_MS));
  }
  return false;
}

async function main() {
  let viteProcess = null;
  let electronProcess = null;
  let shuttingDown = false;

  const cleanup = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill();
    }
    if (viteProcess && !viteProcess.killed) {
      viteProcess.kill();
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  const hasExistingServer = await isDevServerReady();
  if (hasExistingServer) {
    console.log(`[electron:dev] Reusing existing Vite dev server: ${devServerUrl}`);
  } else {
    console.log(`[electron:dev] Starting Vite dev server: ${devServerUrl}`);
    viteProcess = spawn(
      `${npmCmd} run dev -- --host ${serverUrl.hostname} --port ${devServerPort} --strictPort`,
      {
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_DEV_SERVER_URL: devServerUrl,
        },
      }
    );

    const ready = await waitForDevServer();
    if (!ready) {
      console.error(
        `[electron:dev] Vite dev server is not reachable at ${devServerUrl}. If port ${devServerPort} is occupied by another process, stop it and retry.`
      );
      cleanup();
      process.exit(1);
      return;
    }
  }

  electronProcess = runElectron();
  electronProcess.on('exit', (code) => {
    if (viteProcess && !viteProcess.killed) {
      viteProcess.kill();
    }
    process.exit(code ?? 0);
  });
}

void main();
