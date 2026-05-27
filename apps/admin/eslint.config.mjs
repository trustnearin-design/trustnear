import next from '@sevalink/eslint-config/next.js';

export default [
  ...next,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
