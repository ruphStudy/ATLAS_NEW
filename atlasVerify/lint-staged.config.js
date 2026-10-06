/** @type {import('lint-staged').Config} */
module.exports = {
  '**/*.{ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '**/*.{js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '**/*.{json,md,yml,yaml}': ['prettier --write'],
};
