import { spawn, spawnSync } from 'child_process';

function runNpmScript(scriptName) {
  if (process.platform === 'win32') {
    return spawn(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', `npm.cmd run ${scriptName}`],
      { stdio: 'inherit', windowsHide: true }
    );
  }

  return spawn('npm', ['run', scriptName], { stdio: 'inherit' });
}

const processes = [runNpmScript('server:dev'), runNpmScript('client')];

let shuttingDown = false;

function stopAll(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          stdio: 'ignore'
        });
      } else {
        child.kill();
      }
    }
  }

  process.exit(code);
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      stopAll(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
