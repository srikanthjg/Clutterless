import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Build background script with AWS SDK bundled
await esbuild.build({
  entryPoints: ['background/background.js'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  external: ['chrome'],
  minify: false,
  sourcemap: true,
});

// Copy other necessary files to dist
const filesToCopy = [
  { from: 'manifest.json', to: 'dist/manifest.json' },
  { from: 'popup', to: 'dist/popup' },
  { from: 'content', to: 'dist/content' },
  { from: 'icons', to: 'dist/icons' },
];

function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

filesToCopy.forEach(({ from, to }) => {
  copyRecursive(from, to);
});

// Fix manifest.json paths in dist
const manifestPath = 'dist/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.background.service_worker = 'background.js';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Build complete!');
