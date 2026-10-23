import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Create transparent presentation copies from the restaurants' own raster logos.
// The original media files are read only; opaque mark pixels retain their RGB values.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = resolve(repo, '..');
const logos = [
  {
    name: 'Isabella’s',
    source: resolve(workspace, 'isabellas-preview/snapshot/isabellascr.com/wp-content/uploads/2026/05/LOGO-NEW.jpg'),
    targets: [resolve(repo, 'preview-a/central/assets/isabella-logo-transparent.png')],
    alpha(red, green, blue) {
      const difference = 255 - Math.min(red, green, blue);
      if (difference <= 12) return 0;
      if (difference >= 205) return 1;
      return (difference - 12) / 193;
    },
    background: [255, 255, 255],
  },
  {
    name: 'Boccantina',
    // Unmodified copy of https://boccantina.com/wp-content/uploads/2026/05/LOGO-BC-MOBILE.png.
    source: resolve(workspace, 'boccantina-preview/preview-src/admin-login/assets/boccantina-official-original.png'),
    targets: [
      resolve(repo, 'preview-a/central/assets/boccantina-logo-transparent.png'),
      resolve(workspace, 'boccantina-preview/snapshot/boccantina.com/preview/assets/boccantina-logo-transparent.png'),
    ],
    alpha(red, green, blue) {
      const goldAgainstBlue = red - blue;
      if (goldAgainstBlue <= 5) return 0;
      if (goldAgainstBlue >= 156) return 1;
      return (goldAgainstBlue + 14) / 170;
    },
    background: [19, 21, 37],
  },
];

function channel(value) { return Math.max(0, Math.min(255, Math.round(value))); }

for (const logo of logos) {
  const { data, info } = await sharp(logo.source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const input = (y * info.width + x) * 3;
      const output = (y * info.width + x) * 4;
      const red = data[input];
      const green = data[input + 1];
      const blue = data[input + 2];
      const opacity = logo.alpha(red, green, blue);
      rgba[output + 3] = channel(opacity * 255);
      if (!rgba[output + 3]) continue;
      for (let channelIndex = 0; channelIndex < 3; channelIndex++) {
        const sourceColor = data[input + channelIndex];
        rgba[output + channelIndex] = opacity === 1
          ? sourceColor
          : channel((sourceColor - (1 - opacity) * logo.background[channelIndex]) / opacity);
      }
      if (opacity >= 0.08) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (left > right || top > bottom) throw new Error(`No se detectó la marca de ${logo.name}.`);
  const inset = 3;
  left = Math.max(0, left - inset);
  top = Math.max(0, top - inset);
  right = Math.min(info.width - 1, right + inset);
  bottom = Math.min(info.height - 1, bottom + inset);
  const png = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  for (const target of logo.targets) {
    await mkdir(dirname(target), { recursive: true });
    await sharp(png).toFile(target);
  }
  console.log(`${logo.name}: ${right - left + 1} × ${bottom - top + 1}, copia transparente.`);
}
