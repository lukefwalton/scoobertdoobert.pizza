import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config. Intentionally lean: tsc --strict already owns type errors and
// unused locals/params, so ESLint here is for the things the compiler can't see
// — chiefly the React Hooks rules (stale-closure / dependency bugs that an r3f
// codebase full of useFrame/useEffect invites). Formatting is Prettier's job
// (eslint-config-prettier turns off any rule that would fight it).
export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.shots', '.vercel', 'public', 'media'] },

  // App source (browser).
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // tsc's noUnusedLocals/noUnusedParameters already cover this; don't double-report.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Node tooling: Vercel function + the build/verify scripts + root config.
  {
    files: ['api/**/*.ts', 'scripts/**/*.{js,mjs}', '*.{js,mjs,ts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  prettier,
);
