import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'tmp/**'],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
]);
