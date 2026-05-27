import config from '@sevalink/eslint-config/node';

export default [
  ...config,
  {
    // scripts/ holds one-off ops + admin utilities that aren't part of the
    // build graph (not in tsconfig.json include). Skip lint for them so the
    // typed-rules parser doesn't error on "file not in project".
    ignores: ['dist/**', 'scripts/**'],
  },
];
