/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semi-colons, etc.
        'refactor', // Neither fix nor feature
        'perf',     // Performance improvement
        'test',     // Adding / correcting tests
        'build',    // Build system or dependency changes
        'ci',       // CI configuration
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Revert a previous commit
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
};
