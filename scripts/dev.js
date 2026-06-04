// Electron-based IDEs (Windsurf, VS Code) set ELECTRON_RUN_AS_NODE=1
// which forces Electron to run as plain Node. Strip it before dev.
delete process.env.ELECTRON_RUN_AS_NODE;
require('child_process').execSync('npx electron-vite dev', {
  stdio: 'inherit',
  cwd: __dirname + '/..'
});
