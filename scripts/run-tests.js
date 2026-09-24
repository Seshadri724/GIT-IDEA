import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test');
const testFiles = readdirSync(testDir, { recursive: true })
  .filter((f) => typeof f === 'string' && f.endsWith('.test.js'))
  .map((f) => path.join('test', f));

const extraArgs = process.argv.slice(2);
const args = ['--test', ...testFiles, ...extraArgs];

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('exit', (code) => {
  process.exit(code ?? 0);
});
