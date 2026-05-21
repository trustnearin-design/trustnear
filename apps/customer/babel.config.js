/**
 * Babel config for the Expo customer app.
 *
 * - `babel-preset-expo` with `jsxImportSource: 'nativewind'` is what makes
 *   `className=""` work on RN primitives. It must run BEFORE other JSX plugins.
 * - `nativewind/babel` rewrites styled components and global.css imports.
 * - `react-native-worklets/plugin` MUST be last — Reanimated v4 moved the
 *   worklet AST rewrite into the worklets package; nothing may run after it.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
  };
};
