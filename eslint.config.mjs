import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['out/**', 'release/**', 'node_modules/**', '**/*.tsbuildinfo', '.claude/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      react
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // CLAUDE.md: components are function declarations, callbacks are arrows.
      'react/function-component-definition': [
        'error',
        { namedComponents: 'function-declaration', unnamedComponents: 'arrow-function' }
      ]
    }
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...reactHooks.configs['recommended-latest']
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // CLAUDE.md: consider splitting a file once it passes 300 lines.
      'max-lines': ['error', { max: 300 }]
    }
  },
  {
    // Already over the limit. Remove an entry once that file has been split.
    files: [
      'src/renderer/src/components/ThumbnailGrid.tsx',
      'src/renderer/src/hooks/useFolderNavigation.ts'
    ],
    rules: {
      'max-lines': 'off'
    }
  },
  // Each process only talks to the others through preload / IPC.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'レンダラーから electron は使えません。preload の window.photoCollection を経由してください。'
            }
          ],
          patterns: [
            {
              group: ['**/main/**'],
              message:
                'レンダラーからメインプロセスのコードは import できません。IPC を経由してください。'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/renderer/**'],
              message: 'メインプロセスからレンダラーのコードは import できません。'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/preload/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/main/**', '**/renderer/**'],
              message: 'preload からメインプロセス・レンダラーのコードは import できません。'
            }
          ]
        }
      ]
    }
  },
  eslintConfigPrettier
)
