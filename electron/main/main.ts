import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isDev =
  process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEBUG === 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 以当前 Web 版的设计稿尺寸作为基准，用缩放适配不同窗口大小
const BASE_WIDTH = 1440;
const BASE_HEIGHT = 900;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 820;

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const updateZoomFactor = () => {
    const { width, height } = mainWindow.getContentBounds();
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    const zoomFactor = Math.min(scaleX, scaleY);
    mainWindow.webContents.setZoomFactor(zoomFactor);
  };

  mainWindow.on('resize', updateZoomFactor);
  updateZoomFactor();

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';
    void mainWindow.loadURL(devServerUrl.replace(/\/$/, '') + '/desktop');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    void mainWindow.loadFile(indexPath, { hash: '/desktop' });
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

