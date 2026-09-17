const { spawn } = require('child_process');
const fs = require('fs');

const jbrCandidates = [
  process.env.JAVA_HOME,
  'C:\\Program Files\\Android\\Android Studio\\jbr',
  'C:\\Program Files\\Android\\Android Studio\\jre',
];

for (const candidate of jbrCandidates) {
  if (candidate && fs.existsSync(candidate)) {
    process.env.JAVA_HOME = candidate;
    break;
  }
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['cap', 'run', 'android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
