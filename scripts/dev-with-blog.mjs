import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { resolve } from 'node:path';

const site = resolve(import.meta.dirname, '..');
const blog = resolve(site, '..', 'toprepet-blog');
const vite = resolve(site, 'node_modules', 'vite', 'bin', 'vite.js');
const next = resolve(blog, 'node_modules', 'next', 'dist', 'bin', 'next');

if (!existsSync(next) || !existsSync(vite)) {
  console.error('Нужны соседние папки toprepet и toprepet-blog с установленными зависимостями.');
  process.exit(1);
}

function portOpen(port) {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

const [siteRunning, blogRunning] = await Promise.all([
  portOpen(5173),
  portOpen(3001),
]);
const children = [];

function start(label, cli, args, cwd) {
  const child = spawn(process.execPath, [cli, ...args], { cwd, stdio: 'inherit' });
  children.push(child);
  child.on('error', error => console.error(`${label}: ${error.message}`));
  child.on('exit', code => {
    if (code && code !== 0) {
      console.error(`${label} завершился с кодом ${code}`);
      children.forEach(other => { if (other !== child) other.kill(); });
      process.exitCode = code;
    }
  });
}

if (!blogRunning) start('Блог', next, ['dev', '-p', '3001', '-H', '127.0.0.1'], blog);
if (!siteRunning) start('Основной сайт', vite, ['--host', '127.0.0.1', '--port', '5173', '--strictPort'], site);

console.log('Откройте http://127.0.0.1:5173/blog');
if (siteRunning && blogRunning) console.log('Оба локальных сервера уже работают.');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    children.forEach(child => child.kill());
    process.exit(0);
  });
}
