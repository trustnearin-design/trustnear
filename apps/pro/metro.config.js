/**
 * Metro config for the Expo customer app inside the SEVALINK monorepo.
 *
 * Two non-default things matter here:
 *   1. `watchFolders` — Metro must see the workspace root so it can resolve
 *      `@sevalink/types`, `@sevalink/utils`, etc. (internal-packages pattern,
 *      no build step → Metro reads their `src/` directly).
 *   2. `nodeModulesPaths` — pnpm hoists most deps to the workspace root,
 *      but app-local deps live in `apps/customer/node_modules`. Metro must
 *      look in both.
 *
 * `withNativeWind` wraps the config so `className=""` produces RN styles.
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
