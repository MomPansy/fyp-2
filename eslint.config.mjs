import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import eslintPluginImportX from 'eslint-plugin-import-x';
import tsParser from '@typescript-eslint/parser';
import drizzlePlugin from 'eslint-plugin-drizzle';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['node_modules', 'dist', '**/*.gen.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintPluginImportX.flatConfigs.recommended,
      eslintPluginImportX.flatConfigs.typescript,
      eslintPluginPrettierRecommended,
    ],
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
      drizzle: drizzlePlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import-x/resolver': 'oxc',
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'import-x/extensions': ['error', 'ignorePackages'],
      'import-x/order': ['error'],
      'import-x/no-named-as-default-member': ['off'],
      'drizzle/enforce-delete-with-where': ['error'],
      'drizzle/enforce-update-with-where': ['error'],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/no-floating-promises": ["off"],
    },
  },
);
