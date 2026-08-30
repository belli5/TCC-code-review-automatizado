module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
  ],
  root: true,
  env: {
    node: true,
  },
  // `src/generated` é o client do Prisma: código gerado, não versionado e já
  // marcado com @ts-nocheck — não faz sentido lintar.
  ignorePatterns: ['.eslintrc.js', 'dist', 'src/generated'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};