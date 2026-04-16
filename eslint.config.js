const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

module.exports = defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
]);
