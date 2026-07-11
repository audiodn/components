import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'

export default defineConfig([
  // Never lint build output or coverage — these are generated artifacts.
  { ignores: ['dist/', 'demo-dist/', 'coverage/'] },
  ...neostandard(),
  { files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], plugins: { js }, extends: ['js/recommended'] },
  { files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  // Tests legitimately use `any` for mocks/fixtures and rely on chai-style
  // assertions (`expect(x).to.be.true`) that read as unused expressions.
  {
    files: ['tests/**/*.{ts,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
])
