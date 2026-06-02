const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const workspaceRoot = process.cwd();
const sourceGifPath = path.join(workspaceRoot, 'public', 'images', 'logo.gif');
const buildDir = path.join(workspaceRoot, 'build');
const iconPngPath = path.join(buildDir, 'icon.png');
const iconIcoPath = path.join(buildDir, 'icon.ico');

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function ensureSourceExists() {
  if (!fs.existsSync(sourceGifPath)) {
    throw new Error(`Source icon not found: ${sourceGifPath}`);
  }
}

async function ensureBuildDir() {
  await fs.promises.mkdir(buildDir, { recursive: true });
}

async function generateBasePng() {
  await sharp(sourceGifPath, { animated: true })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(iconPngPath);
}

async function generateIcoFromPng() {
  const iconVariants = await Promise.all(
    ICO_SIZES.map(async (size) => {
      const outputPath = path.join(buildDir, `icon-${size}.png`);
      await sharp(iconPngPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      return outputPath;
    })
  );

  const icoBuffer = await pngToIco(iconVariants);
  await fs.promises.writeFile(iconIcoPath, icoBuffer);
}

async function main() {
  await ensureSourceExists();
  await ensureBuildDir();
  await generateBasePng();
  await generateIcoFromPng();
  console.log(`[electron:prepare-icons] Generated ${iconPngPath}`);
  console.log(`[electron:prepare-icons] Generated ${iconIcoPath}`);
}

main().catch((error) => {
  console.error('[electron:prepare-icons] Failed to generate icons.');
  console.error(error);
  process.exit(1);
});
