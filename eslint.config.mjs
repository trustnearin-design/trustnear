// Root ESLint flat config — minimal, runs only on root-level JS (commitlint.config.js etc).
// Apps and packages provide their own eslint.config.js that imports from @sevalink/eslint-config.
import nodeConfig from '@sevalink/eslint-config/node';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
      // Skip workspaces — they have their own eslint configs
      'apps/**',
      'packages/**',
      // The eslint config files themselves don't need linting
      '**/*.config.{js,mjs,cjs}',
    ],
  },
  ...nodeConfig,
];
