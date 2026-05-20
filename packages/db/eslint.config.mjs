import config from '@sevalink/eslint-config/node';

export default [
  ...config,
  {
    ignores: ['dist/**', 'prisma/migrations/**'],
  },
];
