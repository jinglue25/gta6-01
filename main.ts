import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Package Port Solana's static browser files and the accompanying gallery.
const source = fileURLToPath(new URL('.', import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (destination === resolve(source) || destination.startsWith(resolve(source) + '/')) {
  throw new Error('Choose an output directory outside the entry repository.');
}
const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};
// Validate the input before copying; the same caps verify the finished package.
buildDossier(source, limits);
mkdirSync(destination, { recursive: true });
cpSync(join(source, 'game'), join(destination, 'game'), { recursive: true });
if (existsSync(join(source, 'screenshots'))) {
  cpSync(join(source, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}
writeFileSync(join(destination, 'dossier.json'), buildDossier(destination, limits));
console.log('Port Solana packaged successfully: ' + join(destination, 'dossier.json'));
const countFiles = (directory: string): number => readdirSync(directory, { withFileTypes: true })
  .reduce((count, entry) => count + (entry.isDirectory() ? countFiles(join(directory, entry.name)) : entry.isFile() ? 1 : 0), 0);
console.log(`Copied ${countFiles(join(destination, 'game'))} game files and ${countFiles(join(destination, 'screenshots'))} screenshots; dossier: ${statSync(join(destination, 'dossier.json')).size} bytes.`);
