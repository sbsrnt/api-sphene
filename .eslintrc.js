module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', "simple-import-sort"],
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    "sort-imports": 0,
    "import/order": 0,
    "@typescript-eslint/no-unused-vars": [
      1,
      {
        "args": "all",
        "ignoreRestSiblings": true,
        "argsIgnorePattern": "^_"
      }
    ],
    "simple-import-sort/sort": [
      2,
      {
        "groups": [
          // Side effect imports.
          [
            "^\\u0000"
          ],
          // Config files
          [
            "^@nest/config",
            "^@nest/typeorm",
          ],
          // Packages. `nest` related packages come first.
          [
            "^@nest",
            "^@?\\w"
          ],
          // Internal packages.
          // Absolute imports and other imports such as Vue-style `@/foo`.
          // Anything that does not start with a dot.
          [
            "^(__mocks__)(/.*|$)",
            "^(constants)(/.*|$)",
            "^(test-helpers)(/.*|$)",
            "^[^.]"
          ],
          // Relative imports.
          // Anything that starts with a dot.
          [
            "^\\."
          ],
        ]
      }
    ]
  },
};
