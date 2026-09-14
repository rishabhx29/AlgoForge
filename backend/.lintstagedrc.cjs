module.exports = {
  '*.{ts,tsx,js,jsx,cjs,mjs}': ['prettier --write', 'eslint --fix'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
