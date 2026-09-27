import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Lets components pull props out of ...rest so they don't reach the DOM
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // Raw number inputs have spinner arrows and no max. Use <Input type="number" max={…}> from
      // components/ui/Input.jsx, or a text input with sanitizeNumber() from utils/limits.js
      'no-restricted-syntax': ['error', {
        selector: "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value='number']",
        message: 'Use <Input type="number" max={…}> or sanitizeNumber() from utils/limits.js instead of a raw number input.',
      }],
    },
  },
])
