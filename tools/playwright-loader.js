const path = require('path');

try {
  module.exports = require('playwright');
} catch (normalError) {
  const modulesDir = process.env.CARDBATTLE_NODE_MODULES;
  if (!modulesDir) {
    throw new Error(
      'Playwright が見つかりません。npm install --global playwright を実行し、' +
      'CARDBATTLE_NODE_MODULES に npm root --global の結果を設定してください。',
      { cause: normalError }
    );
  }

  try {
    module.exports = require(path.join(modulesDir, 'playwright'));
  } catch (configuredPathError) {
    throw new Error(
      'CARDBATTLE_NODE_MODULES から Playwright を読み込めません: ' + modulesDir,
      { cause: configuredPathError }
    );
  }
}
