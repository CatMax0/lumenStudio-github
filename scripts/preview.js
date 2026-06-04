// Electron-based IDEs (Windsurf, VS Code) set ELECTRON_RUN_AS_NODE=1
// which forces Electron to run as plain Node. Strip it before preview.
delete process.env.ELECTRON_RUN_AS_NODE;
require('child_process').execSync('npx electron-vite preview', {
  stdio: 'inherit',
  cwd: __dirname + '/..'
});
