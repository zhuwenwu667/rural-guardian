module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.min.js'],
  rules: {
    // Vue 规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'off',
    'vue/require-explicit-emits': 'warn',
    'vue/component-tags-order': ['error', { order: ['script', 'template', 'style'] }],
    'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],

    // 代码风格规则 - 降级为警告
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'warn',
    'prefer-template': 'warn',

    // 安全规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-param-reassign': 'warn',
    'no-prototype-builtins': 'warn',

    // 最佳实践
    'array-callback-return': 'warn',
    'consistent-return': 'warn',
    'default-case': 'warn',
    'eqeqeq': ['warn', 'always'],
    'no-else-return': 'warn',
    'prefer-regex-literals': ['warn', { disallowRedundantWrapping: true }],
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
