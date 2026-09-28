module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:node/recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Node.js 规则
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'warn',

    // 代码风格规则
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-template': 'error',
    'object-shorthand': 'error',
    'quote-props': ['error', 'as-needed'],

    // 格式化规则
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],

    // 安全规则
    'no-process-env': 'error',
    'no-path-concat': 'error',

    // 最佳实践
    'array-callback-return': 'error',
    'consistent-return': 'warn',
    'default-case': 'warn',
    'eqeqeq': ['error', 'always'],
    'no-else-return': 'warn',
    'no-implicit-coercion': 'warn',
    'no-return-await': 'error',
    'require-await': 'warn',
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};
