const fs = require('node:fs');
const path = require('node:path');

async function removeIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
    console.log(`[electron:afterPack] removed ${filePath}`);
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }
}

/**
 * electron-builder afterPack hook.
 * Ensures debug-only steam_appid.txt never leaks into production artifacts.
 */
module.exports = async function afterPack(context) {
  const candidates = [
    path.join(context.appOutDir, 'steam_appid.txt'),
    path.join(context.appOutDir, 'resources', 'steam_appid.txt'),
    path.join(context.appOutDir, 'resources', 'app', 'steam_appid.txt'),
    path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'steam_appid.txt'),
  ];

  for (const filePath of candidates) {
    await removeIfExists(filePath);
  }
};

