import pretierPlugin from "eslint-plugin-prettier/recommended";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import pluginPromise from "eslint-plugin-promise";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  ...tseslint.config(js.configs.recommended, ...tseslint.configs.recommended),
  eslintConfigPrettier,
  pretierPlugin,
  eslintPluginUnicorn.configs["flat/recommended"],
  pluginPromise.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es6,
        ...globals.es2021,
        ...globals.es2022,
      },
    },
    rules: {
      "linebreak-style": [2, "unix"],
      semi: [2, "always"],
      strict: [2, "function"],
      "no-multiple-empty-lines": [2, { max: 1 }],
      "max-len": [
        "error",
        {
          code: 140,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      "no-underscore-dangle": ["error", { allow: ["_id"] }],
      "import/prefer-default-export": "off",
      "import/no-cycle": "off",
      "import/no-extraneous-dependencies": "off",
      "prettier/prettier": [
        "error",
        {
          singleQuote: true,
          printWidth: 140,
          tabWidth: 2,
          bracketSpacing: true,
          indent: 2,
          trailingComma: "none",
        },
      ],
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-process-exit": "off",
      "unicorn/no-array-callback-reference": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "unicorn/no-null": "warn",
      "unicorn/no-array-reduce": "warn",
      /*
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error'],
      'import/no-nodejs-modules': 'off',
      'no-return-await': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            kebabCase: true
          }
        }
      ],
      'unicorn/consistent-function-scoping': 'warn',
      'unicorn/no-null': 'warn'
      */
    },
  },
];
