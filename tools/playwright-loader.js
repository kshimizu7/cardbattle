const path = require('path');
const { execFileSync } = require('child_process');

try {
  module.exports = require('playwright');
} catch (normalError) {
  const modulesDir = process.env.CARDBATTLE_NODE_MODULES;
  if (modulesDir) {
    try {
      module.exports = require(path.join(modulesDir, 'playwright'));
      return;
    } catch (configuredPathError) {}
  }

  try {
    const globalRoot = (process.platform === 'win32'
      ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm root --global'], { encoding: 'utf8' })
      : execFileSync('npm', ['root', '--global'], { encoding: 'utf8' })).trim();
    module.exports = require(path.join(globalRoot, 'playwright'));
  } catch (globalPathError) {
    throw new Error(
      'Playwright が見つかりません。次を実行してください: ' +
      'npm install --global playwright / playwright install chromium',
      { cause: globalPathError }
    );
  }
}
