const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev =
  process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEBUG === 'true';

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 900;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 820;
const DESKTOP_DIAG_LOG = 'desktop-diagnostics.log';

function appendDesktopDiagLog(message) {
  try {
    const logPath = path.join(app.getPath('userData'), DESKTOP_DIAG_LOG);
    const line = `[${new Date().toISOString()}] ${String(message)}\n`;
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // never block app startup for diagnostics
  }
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'ZoneHub',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
    // Electron 开发模式下默认跳转到桌面专用首页路由，不影响 Web 端 /
    mainWindow.loadURL(devServerUrl.replace(/\/$/, '') + '/desktop');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    appendDesktopDiagLog(`loadFile -> ${indexPath}`);
    // 打包版与 electron:dev 保持一致：默认进入桌面壳路由 /desktop。
    mainWindow.loadFile(indexPath, { hash: '/desktop' }).catch((error) => {
      appendDesktopDiagLog(`loadFile failed: ${error?.stack || error?.message || String(error)}`);
    });
  }

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url, isMainFrame) => {
    appendDesktopDiagLog(`did-fail-load code=${code} desc=${desc} url=${url} mainFrame=${isMainFrame}`);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appendDesktopDiagLog(`render-process-gone reason=${details?.reason} exitCode=${details?.exitCode}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    appendDesktopDiagLog(`renderer-console level=${level} source=${sourceId}:${line} msg=${message}`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    appendDesktopDiagLog(`did-finish-load url=${mainWindow.webContents.getURL()}`);
  });
}

app.whenReady().then(async () => {
  appendDesktopDiagLog(`app-ready isDev=${isDev}`);
  session.defaultSession.webRequest.onErrorOccurred((details) => {
    const target = String(details.url || '');
    if (target.startsWith('file://') || target.includes('app.asar') || target.includes('/assets/')) {
      appendDesktopDiagLog(
        `request-error method=${details.method} type=${details.resourceType} error=${details.error} url=${target}`
      );
    }
  });
  session.defaultSession.webRequest.onCompleted((details) => {
    const target = String(details.url || '');
    if (
      target.startsWith('file://') ||
      target.includes('app.asar') ||
      target.includes('/assets/index-') ||
      target.includes('/assets/vendor-')
    ) {
      appendDesktopDiagLog(
        `request-complete status=${details.statusCode} fromCache=${details.fromCache} type=${details.resourceType} url=${target}`
      );
    }
  });
  // Vite dev server 为 FFmpeg (SharedArrayBuffer) 设置了 COEP: require-corp，
  // 但 Steam CDN 没有 Cross-Origin-Resource-Policy 响应头，导致 Electron 渲染进程
  // 按 COEP 规则拒绝加载图片（ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep）。
  // 解决方案：在 Electron session 拦截 Steam CDN 响应，注入 CORP: cross-origin 头，
  // 让 COEP 允许这些跨域资源加载，同时不影响 FFmpeg 的 SharedArrayBuffer 功能。
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const url = details.url;
    const isSteamCdn =
      url.includes('steamstatic.com') ||
      url.includes('steamusercontent.com') ||
      url.includes('akamaihd.net') ||
      url.includes('steamcommunity.com');
    if (isSteamCdn) {
      const headers = Object.assign({}, details.responseHeaders);
      // 告知浏览器：允许任何跨域上下文嵌入此资源
      headers['cross-origin-resource-policy'] = ['cross-origin'];
      callback({ responseHeaders: headers });
    } else {
      callback({});
    }
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

process.on('uncaughtException', (error) => {
  appendDesktopDiagLog(`main-uncaughtException ${error?.stack || error?.message || String(error)}`);
});
process.on('unhandledRejection', (reason) => {
  appendDesktopDiagLog(`main-unhandledRejection ${reason instanceof Error ? reason.stack : String(reason)}`);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

