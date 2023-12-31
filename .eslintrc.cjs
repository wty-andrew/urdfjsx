module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': ['off'],
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true,
  },
}
