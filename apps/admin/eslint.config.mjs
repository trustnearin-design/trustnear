import next from '@sevalink/eslint-config/next';

export default [
  ...next,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
